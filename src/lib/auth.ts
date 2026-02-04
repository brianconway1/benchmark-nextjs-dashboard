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
  doc,
  getDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
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
 *
 * Uses the completeUserSignup Cloud Function to handle Firestore writes
 * (bypasses security rules with Admin SDK for atomic operations)
 */
export async function signupAdmin(
  email: string,
  password: string,
  referralCode: string,
  firstName: string,
  lastName: string
): Promise<FirebaseUser> {
  // 1. Validate referral code exists and is active (read-only, allowed by rules)
  const refDoc = await getDoc(doc(db, 'referral_codes', referralCode));
  if (!refDoc.exists()) {
    throw new Error('Invalid referral code');
  }

  const refData = refDoc.data();
  if (!refData.active) {
    throw new Error('Referral code is not active');
  }

  // Check if code has been used up
  if (refData.usesCount >= (refData.maxUses || 1)) {
    throw new Error('Referral code has already been used');
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

  // Set display name in Firebase Auth profile
  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
  try {
    await updateProfile(userCredential.user, { displayName });
  } catch (error) {
    console.log('updateProfile failed:', error);
    // Non-fatal - continue with signup
  }

  // 4. Call Cloud Function to complete signup (creates user doc, updates referral code, etc.)
  // The Cloud Function uses Admin SDK which bypasses security rules
  try {
    const completeUserSignup = httpsCallable(functions, 'completeUserSignup');
    await completeUserSignup({
      referralCode,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      hasPassword: true,
    });
  } catch (error: unknown) {
    // If Cloud Function fails, delete the auth account to avoid orphaned accounts
    try {
      await userCredential.user.delete();
    } catch (deleteError) {
      console.error('Failed to cleanup auth account after signup error:', deleteError);
    }

    // Re-throw with a user-friendly message
    const err = error as { message?: string; code?: string };
    throw new Error(err.message || 'Failed to complete signup. Please try again.');
  }

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

