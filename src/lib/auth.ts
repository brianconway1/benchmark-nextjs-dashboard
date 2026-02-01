// Authentication utilities
'use client';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  fetchSignInMethodsForEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '@/types';
import { validateSubscriptionForLogin, shouldBypassSubscriptionCheck } from './subscriptionValidation';

/**
 * Login with email and password (works for both club admin and super admin)
 * Validates subscription before allowing access for club admins
 */
export async function loginWithPassword(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
  const uid = userCredential.user.uid;

  // Get user data to check role and club
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    // Sign out if user document doesn't exist
    await firebaseSignOut(auth);
    throw new Error('User account not found. Please contact support.');
  }

  const userData = userDoc.data();
  const userRole = userData.role;
  const clubId = userData.clubId;

  // Check if user has an allowed role for the admin dashboard
  const allowedRoles = ['super_admin', 'club_admin', 'club_admin_coach'];
  if (!allowedRoles.includes(userRole)) {
    await firebaseSignOut(auth);
    throw new Error('Access denied. This dashboard is for club administrators only.');
  }

  // Check if user should bypass subscription check (super admin)
  if (!shouldBypassSubscriptionCheck(email.toLowerCase(), userRole)) {
    // Validate subscription for club admins
    const subscriptionCheck = await validateSubscriptionForLogin(clubId);

    if (!subscriptionCheck.valid) {
      // Sign out the user since subscription is invalid
      await firebaseSignOut(auth);
      throw new Error(subscriptionCheck.reason || 'Your subscription is not valid. Please contact support.');
    }
  }

  return userCredential.user;
}

/**
 * Signup for Admin (creates password - works for both club admin and super admin)
 * Role is determined by the referral code's intendedRole field
 */
export async function signupAdmin(
  email: string,
  password: string,
  referralCode: string,
  firstName: string,
  lastName: string
): Promise<FirebaseUser> {
  // 1. Validate referral code exists and is active
  const refDoc = await getDoc(doc(db, 'referral_codes', referralCode));
  if (!refDoc.exists()) {
    throw new Error('Invalid referral code');
  }

  const refData = refDoc.data();
  if (!refData.active) {
    throw new Error('Referral code is not active');
  }

  // 2. Check if account already exists
  try {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email.toLowerCase());
    if (signInMethods.length > 0) {
      throw new Error('Account already exists. Please log in.');
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    // Account doesn't exist, proceed
  }

  // 3. Create Firebase Auth account (password automatically hashed by Firebase)
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email.toLowerCase(),
    password
  );
  const uid = userCredential.user.uid;

  // Set display name in Firebase Auth profile
  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
  try {
    await updateProfile(userCredential.user, { displayName });
  } catch (error) {
    console.log('updateProfile failed:', error);
    // Non-fatal - continue with signup
  }

  // 4. Create/update user document in Firestore
  await runTransaction(db, async (tx) => {
    // Update referral code usage
    tx.update(refDoc.ref, {
      usesCount: increment(1),
      updated_at: serverTimestamp(),
    });

    // Create user document
    const userRef = doc(db, 'users', uid);
    tx.set(
      userRef,
      {
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName,
        clubId: refData.clubId || null,
        role: refData.intendedRole || 'club_admin',
        referralCode: referralCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Add to club admin arrays
    if (refData.clubId) {
      const clubRef = doc(db, 'sports_clubs', refData.clubId);
      tx.update(clubRef, {
        clubAdminIds: arrayUnion(uid),
        updatedAt: serverTimestamp(),
      });
    }
  });

  return userCredential.user;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get current user data from Firestore
 */
export async function getCurrentUserData(uid: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    return null;
  }
  return { id: userDoc.id, ...userDoc.data() } as User;
}

