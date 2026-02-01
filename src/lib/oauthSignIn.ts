// OAuth Sign-In utilities for Google and Apple authentication
// Adapts the mobile app's account linking logic for web-based Firebase OAuth

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  UserCredential,
  AuthCredential,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  increment,
  limit,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { validateSubscriptionForLogin, shouldBypassSubscriptionCheck } from './subscriptionValidation';

// Store pending OAuth credentials when referral code is needed
let pendingOAuthCredential: AuthCredential | null = null;
let pendingOAuthEmail: string | null = null;

export interface OAuthResult {
  user: UserCredential['user'] | null;
  isNewAccount: boolean;
  needsReferralCode: boolean;
  email?: string;
}

/**
 * Check if a user document exists in Firestore for the given email
 */
async function checkFirestoreUser(email: string) {
  const emailLower = email.toLowerCase().trim();
  const userQuery = query(
    collection(db, 'users'),
    where('email', '==', emailLower),
    limit(1)
  );
  const snapshot = await getDocs(userQuery);

  if (snapshot.empty) {
    return { exists: false };
  }

  const userDoc = snapshot.docs[0];
  return {
    exists: true,
    userDoc: userDoc.data(),
    userRef: userDoc.ref,
    userId: userDoc.id,
  };
}

/**
 * Check if a Firebase Auth account exists for the given email
 */
async function checkFirebaseAuthAccount(email: string) {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email.toLowerCase().trim());
    return {
      exists: methods.length > 0,
      methods,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'auth/user-not-found') {
      return { exists: false, methods: [] };
    }
    throw error;
  }
}

/**
 * Link an OAuth credential to an existing or new user
 * Handles subscription validation for admin users
 */
async function linkOAuthToUser(
  credential: AuthCredential,
  email: string,
  referralCode: string | null = null
): Promise<OAuthResult> {
  const emailLower = email.toLowerCase().trim();

  // 1. Check if Firebase Auth account exists
  const authCheck = await checkFirebaseAuthAccount(emailLower);

  if (authCheck.exists) {
    // Firebase Auth account exists - sign in with credential
    const currentUser = auth.currentUser;
    let userCredential: UserCredential;

    if (currentUser && currentUser.email?.toLowerCase() === emailLower) {
      // User is already signed in - try to link the new provider
      try {
        userCredential = await linkWithCredential(currentUser, credential);
      } catch (linkError: unknown) {
        const firebaseError = linkError as { code?: string };
        if (firebaseError.code === 'auth/provider-already-linked') {
          userCredential = { user: currentUser } as UserCredential;
        } else {
          throw linkError;
        }
      }
    } else {
      // Sign in with credential
      userCredential = await signInWithCredential(auth, credential);
    }

    const uid = userCredential.user.uid;

    // Get user document to check role and subscription
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // User has Firebase Auth but no Firestore doc - unusual state
      // Check if they exist by email instead
      const firestoreCheck = await checkFirestoreUser(emailLower);
      if (!firestoreCheck.exists) {
        // New user needs referral code
        await auth.signOut();
        return { user: null, isNewAccount: true, needsReferralCode: true, email: emailLower };
      }
    }

    const userData = userDocSnap.data();
    const userRole = userData?.role;
    const clubId = userData?.clubId;

    // Check if user has an allowed role for the admin dashboard
    const allowedRoles = ['super_admin', 'club_admin', 'club_admin_coach'];
    if (!allowedRoles.includes(userRole)) {
      await auth.signOut();
      throw new Error('Access denied. This dashboard is for club administrators only.');
    }

    // Validate subscription for club admins
    if (!shouldBypassSubscriptionCheck(emailLower, userRole)) {
      const subscriptionCheck = await validateSubscriptionForLogin(clubId);
      if (!subscriptionCheck.valid) {
        await auth.signOut();
        throw new Error(subscriptionCheck.reason || 'Your subscription is not valid. Please contact support.');
      }
    }

    // Update user document with OAuth provider info
    try {
      const existingProviders = Array.isArray(userData?.authProviders) ? userData.authProviders : [];
      const providerId = credential.providerId;
      const updatedProviders = existingProviders.includes(providerId)
        ? existingProviders
        : [...existingProviders, providerId];

      await setDoc(
        userDocRef,
        {
          authProviders: updatedProviders,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('[oauthSignIn] Error updating user with authProviders:', error);
    }

    return { user: userCredential.user, isNewAccount: false, needsReferralCode: false };
  }

  // 2. Check if Firestore user exists (pre-created by admin)
  const firestoreCheck = await checkFirestoreUser(emailLower);

  if (firestoreCheck.exists) {
    // Firestore user exists but no Firebase Auth account - link them
    const userCredential = await signInWithCredential(auth, credential);
    const newUid = userCredential.user.uid;

    // Update Firestore document
    try {
      await runTransaction(db, async (tx) => {
        const userRef = firestoreCheck.userRef!;
        const userSnap = await tx.get(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          if (userRef.id !== newUid) {
            // Create new document with correct UID
            const newUserRef = doc(db, 'users', newUid);
            tx.set(newUserRef, {
              ...userData,
              uid: newUid,
              authProviders: [credential.providerId],
              hasPassword: false,
              updatedAt: serverTimestamp(),
            });
          } else {
            tx.update(userRef, {
              uid: newUid,
              authProviders: [credential.providerId],
              hasPassword: false,
              updatedAt: serverTimestamp(),
            });
          }
        }
      });
    } catch (error) {
      console.error('[oauthSignIn] Error updating Firestore user:', error);
    }

    // Validate role and subscription
    const userData = firestoreCheck.userDoc;
    const userRole = userData?.role;
    const clubId = userData?.clubId;

    const allowedRoles = ['super_admin', 'club_admin', 'club_admin_coach'];
    if (!allowedRoles.includes(userRole)) {
      await auth.signOut();
      throw new Error('Access denied. This dashboard is for club administrators only.');
    }

    if (!shouldBypassSubscriptionCheck(emailLower, userRole)) {
      const subscriptionCheck = await validateSubscriptionForLogin(clubId);
      if (!subscriptionCheck.valid) {
        await auth.signOut();
        throw new Error(subscriptionCheck.reason || 'Your subscription is not valid. Please contact support.');
      }
    }

    return { user: userCredential.user, isNewAccount: false, needsReferralCode: false };
  }

  // 3. New user - require referral code
  if (!referralCode) {
    // Store credential for later use after collecting referral code
    pendingOAuthCredential = credential;
    pendingOAuthEmail = emailLower;
    return { user: null, isNewAccount: true, needsReferralCode: true, email: emailLower };
  }

  // Complete signup with referral code
  return completeOAuthSignup(credential, emailLower, referralCode);
}

/**
 * Complete OAuth signup with referral code
 */
async function completeOAuthSignup(
  credential: AuthCredential,
  email: string,
  referralCode: string
): Promise<OAuthResult> {
  const emailLower = email.toLowerCase().trim();

  // Validate referral code
  const referralRef = doc(db, 'referral_codes', referralCode);
  const referralSnap = await getDoc(referralRef);

  if (!referralSnap.exists()) {
    throw new Error('Invalid referral code. Please contact your club administrator.');
  }

  const referralData = referralSnap.data();
  if (!referralData.active) {
    throw new Error('This referral code is inactive. Please contact your club administrator.');
  }

  // Create Firebase Auth account with OAuth credential
  const userCredential = await signInWithCredential(auth, credential);
  const uid = userCredential.user.uid;

  // Create Firestore user document
  await runTransaction(db, async (tx) => {
    const refSnap = await tx.get(referralRef);
    if (!refSnap.exists()) throw new Error('Referral code no longer exists.');

    const refData = refSnap.data();
    const maxUses = typeof refData.maxUses === 'number' ? refData.maxUses : 100;
    const currentUses = typeof refData.usesCount === 'number' ? refData.usesCount : 0;

    if (refData.active === false) {
      throw new Error('Referral code is inactive.');
    }
    if (currentUses >= maxUses) {
      throw new Error('This referral code has reached its maximum uses.');
    }

    // Update referral usage
    tx.update(referralRef, {
      usesCount: currentUses + 1,
      updated_at: serverTimestamp(),
    });

    // Create user document
    const userRef = doc(db, 'users', uid);
    const userRole = refData.intendedRole || 'club_admin';

    tx.set(
      userRef,
      {
        email: emailLower,
        displayName: userCredential.user.displayName || '',
        firstName: userCredential.user.displayName?.split(' ')[0] || '',
        lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || '',
        clubId: refData.club_id || refData.clubId || null,
        role: userRole,
        referralCode: referralCode,
        hasPassword: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        authProviders: [credential.providerId],
      },
      { merge: true }
    );

    // If club admin, add to club
    if (refData.clubId && (userRole === 'club_admin' || userRole === 'club_admin_coach')) {
      const clubRef = doc(db, 'sports_clubs', refData.clubId);
      tx.update(clubRef, {
        clubAdminIds: arrayUnion(uid),
        usedCount: increment(1),
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    }
  });

  return { user: userCredential.user, isNewAccount: true, needsReferralCode: false };
}

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(referralCode: string | null = null): Promise<OAuthResult> {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;

    if (!email) {
      await auth.signOut();
      throw new Error('Google account does not have an email address');
    }

    // Get the credential for account linking
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential) {
      throw new Error('Failed to get Google credential');
    }

    return linkOAuthToUser(credential, email, referralCode);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled');
    }
    if (firebaseError.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked. Please allow popups for this site.');
    }
    throw error;
  }
}

/**
 * Sign in with Apple using popup
 */
export async function signInWithApple(referralCode: string | null = null): Promise<OAuthResult> {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');

  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;

    if (!email) {
      await auth.signOut();
      throw new Error('Apple account does not have an email address');
    }

    // Get the credential for account linking
    const credential = OAuthProvider.credentialFromResult(result);
    if (!credential) {
      throw new Error('Failed to get Apple credential');
    }

    return linkOAuthToUser(credential, email, referralCode);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled');
    }
    if (firebaseError.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked. Please allow popups for this site.');
    }
    throw error;
  }
}

/**
 * Complete pending OAuth signup with referral code
 * Used when user clicks OAuth, but needs to provide referral code first
 */
export async function completePendingOAuthSignup(referralCode: string): Promise<OAuthResult> {
  if (!pendingOAuthCredential || !pendingOAuthEmail) {
    throw new Error('No pending OAuth signup. Please try signing in again.');
  }

  const credential = pendingOAuthCredential;
  const email = pendingOAuthEmail;

  // Clear pending state
  pendingOAuthCredential = null;
  pendingOAuthEmail = null;

  return completeOAuthSignup(credential, email, referralCode);
}

/**
 * Check if there's a pending OAuth signup
 */
export function hasPendingOAuthSignup(): boolean {
  return pendingOAuthCredential !== null && pendingOAuthEmail !== null;
}

/**
 * Get pending OAuth email
 */
export function getPendingOAuthEmail(): string | null {
  return pendingOAuthEmail;
}

/**
 * Clear pending OAuth state
 */
export function clearPendingOAuth(): void {
  pendingOAuthCredential = null;
  pendingOAuthEmail = null;
}

