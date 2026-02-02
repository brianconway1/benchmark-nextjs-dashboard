// Subscription validation utilities
'use client';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

interface Subscription {
  id: string;
  status: string;
  subscriptionType?: string;
  maxViewOnlyUsers?: number;
  [key: string]: unknown;
}

interface SubscriptionValidationResult {
  valid: boolean;
  reason?: string;
  subscriptions?: Subscription[];
  maxViewOnlyUsers?: number | null;
  hasCoachAccount?: boolean;
  error?: string;
}

/**
 * Check if a subscription is valid for login
 * Now supports multiple subscriptions per club (coach_account + view_only)
 * @param {string} clubId - Club ID to check subscription for
 * @returns {Promise<SubscriptionValidationResult>}
 */
export async function validateSubscriptionForLogin(clubId: string | null | undefined): Promise<SubscriptionValidationResult> {
  if (!clubId) {
    return {
      valid: false,
      reason: 'No club associated with your account. Please contact support.',
    };
  }

  try {
    // Get all subscriptions for this club
    const subscriptionsRef = collection(db, 'subscriptions');
    const subscriptionsQuery = query(subscriptionsRef, where('clubId', '==', clubId));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

    // If no subscriptions exist, deny access - subscription required
    if (subscriptionsSnapshot.empty) {
      return {
        valid: false,
        reason: 'No active subscription found. Please purchase a subscription to access the dashboard.',
        subscriptions: [],
        maxViewOnlyUsers: null,
      };
    }

    const subscriptions: Subscription[] = subscriptionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      status: '',
      ...doc.data(),
    } as Subscription));

    // Check if at least one subscription is active
    const validStatuses = ['trialing', 'active'];
    const activeSubscriptions = subscriptions.filter((sub) => validStatuses.includes(sub.status));

    // Invalid subscription statuses
    const invalidStatuses: Record<string, string> = {
      canceled: 'Your subscription has been canceled. Please renew your subscription to continue using the admin dashboard.',
      past_due: 'Your subscription payment is past due. Please update your payment method to continue using the admin dashboard.',
      unpaid: 'Your subscription payment failed. Please update your payment method to continue using the admin dashboard.',
      incomplete: 'Your subscription setup is incomplete. Please complete your subscription to continue using the admin dashboard.',
      incomplete_expired: 'Your subscription setup has expired. Please create a new subscription to continue using the admin dashboard.',
    };

    // If at least one subscription is active, allow access
    if (activeSubscriptions.length > 0) {
      // Calculate combined limits
      const viewOnlySubscription = activeSubscriptions.find((sub) => sub.subscriptionType === 'view_only');
      const maxViewOnlyUsers = viewOnlySubscription?.maxViewOnlyUsers || null;
      const hasCoachAccount = activeSubscriptions.some((sub) => sub.subscriptionType === 'coach_account');

      return {
        valid: true,
        reason: undefined,
        subscriptions: activeSubscriptions,
        maxViewOnlyUsers,
        hasCoachAccount,
      };
    }

    // Check if all subscriptions are in invalid states
    const allInvalid = subscriptions.every((sub) => invalidStatuses[sub.status]);
    if (allInvalid && subscriptions.length > 0) {
      const firstInvalid = subscriptions.find((sub) => invalidStatuses[sub.status]);
      if (firstInvalid) {
        return {
          valid: false,
          reason: invalidStatuses[firstInvalid.status],
          subscriptions: subscriptions,
        };
      }
    }

    // Unknown status - default to invalid for safety
    return {
      valid: false,
      reason: 'Your subscription status is not valid. Please contact support.',
      subscriptions: subscriptions,
    };
  } catch (error: unknown) {
    console.error('Error checking subscription:', error);
    // Fail closed - reject on error for security
    return {
      valid: false,
      reason: 'Unable to verify subscription status. Please try again or contact support.',
      subscriptions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user should bypass subscription check (e.g., super admin)
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {boolean}
 */
export function shouldBypassSubscriptionCheck(email: string | null | undefined, role: string | null | undefined): boolean {
  // Super admins bypass subscription check
  if (role === 'super_admin') {
    return true;
  }

  return false;
}

/**
 * Get club subscription limits from sports_clubs document
 * @param {string} clubId - Club ID
 * @returns {Promise<{maxCoachAccounts: number | null, maxViewOnlyUsers: number | null}>}
 */
export async function getClubLimits(clubId: string): Promise<{ maxCoachAccounts: number | null, maxViewOnlyUsers: number | null }> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    const clubDoc = await getDoc(doc(db, 'sports_clubs', clubId));
    if (!clubDoc.exists()) {
      return { maxCoachAccounts: null, maxViewOnlyUsers: null };
    }

    const clubData = clubDoc.data();
    return {
      maxCoachAccounts: clubData.maxCoachAccounts || null,
      maxViewOnlyUsers: clubData.maxViewOnlyUsers || null
    };
  } catch (error) {
    console.error('Error fetching club limits:', error);
    return { maxCoachAccounts: null, maxViewOnlyUsers: null };
  }
}

/**
 * Get current count of coaches (coach OR club_admin_coach roles)
 * @param {string} clubId - Club ID
 * @returns {Promise<number>}
 */
export async function getCurrentCoachCount(clubId: string): Promise<number> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    const usersQuery = query(
      collection(db, 'users'),
      where('clubId', '==', clubId)
    );
    const usersSnapshot = await getDocs(usersQuery);

    let count = 0;
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.role === 'coach' || userData.role === 'club_admin_coach') {
        count++;
      }
    });

    return count;
  } catch (error) {
    console.error('Error counting coaches:', error);
    return 0;
  }
}

/**
 * Get count of pending coach invites (active, unused referral codes for coach roles)
 * @param {string} clubId - Club ID
 * @returns {Promise<number>}
 */
export async function getPendingCoachInvites(clubId: string): Promise<number> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    // Query active referral codes for this club with coach roles
    const codesQuery = query(
      collection(db, 'referral_codes'),
      where('clubId', '==', clubId),
      where('active', '==', true)
    );
    const codesSnapshot = await getDocs(codesQuery);

    let count = 0;
    const now = new Date();
    codesSnapshot.forEach((doc) => {
      const codeData = doc.data();
      // Only count codes for coach roles that haven't been fully used
      const isCoachRole = codeData.intendedRole === 'coach' || codeData.intendedRole === 'club_admin_coach';
      const usesRemaining = (codeData.maxUses || 1) - (codeData.usesCount || 0);
      const isExpired = codeData.expiresAt && codeData.expiresAt.toDate() < now;

      if (isCoachRole && usesRemaining > 0 && !isExpired) {
        count += usesRemaining;
      }
    });

    return count;
  } catch (error) {
    console.error('Error counting pending coach invites:', error);
    return 0;
  }
}

/**
 * Get current count of view-only users
 * @param {string} clubId - Club ID
 * @returns {Promise<number>}
 */
export async function getCurrentViewOnlyCount(clubId: string): Promise<number> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    const usersQuery = query(
      collection(db, 'users'),
      where('clubId', '==', clubId)
    );
    const usersSnapshot = await getDocs(usersQuery);

    let count = 0;
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.role === 'view_only') {
        count++;
      }
    });

    return count;
  } catch (error) {
    console.error('Error counting view-only users:', error);
    return 0;
  }
}

/**
 * Get count of pending view-only invites (active, unused referral codes for view_only role)
 * @param {string} clubId - Club ID
 * @returns {Promise<number>}
 */
export async function getPendingViewOnlyInvites(clubId: string): Promise<number> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    // Query active referral codes for this club with view_only role
    const codesQuery = query(
      collection(db, 'referral_codes'),
      where('clubId', '==', clubId),
      where('active', '==', true)
    );
    const codesSnapshot = await getDocs(codesQuery);

    let count = 0;
    const now = new Date();
    codesSnapshot.forEach((doc) => {
      const codeData = doc.data();
      // Only count codes for view_only role that haven't been fully used
      const isViewOnlyRole = codeData.intendedRole === 'view_only';
      const usesRemaining = (codeData.maxUses || 1) - (codeData.usesCount || 0);
      const isExpired = codeData.expiresAt && codeData.expiresAt.toDate() < now;

      if (isViewOnlyRole && usesRemaining > 0 && !isExpired) {
        count += usesRemaining;
      }
    });

    return count;
  } catch (error) {
    console.error('Error counting pending view-only invites:', error);
    return 0;
  }
}

/**
 * Validate if adding a user with a specific role would exceed subscription limits
 * Includes both signed-up users AND pending invites (unused referral codes)
 * @param {string} clubId - Club ID
 * @param {string} role - Role to be assigned ('coach', 'club_admin_coach', or 'view_only')
 * @param {number} additionalCount - Number of additional users being added (default: 1)
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
export async function validateUserLimit(
  clubId: string,
  role: string,
  additionalCount: number = 1
): Promise<{ valid: boolean, reason?: string }> {
  try {
    // Get club limits
    const limits = await getClubLimits(clubId);

    // Validate coach account limit
    if (role === 'coach' || role === 'club_admin_coach') {
      if (limits.maxCoachAccounts === null) {
        // No coach subscription - cannot add coaches
        return {
          valid: false,
          reason: 'No coach account subscription found. Please purchase a coach account subscription to add coaches.'
        };
      }

      const currentCount = await getCurrentCoachCount(clubId);
      const pendingInvites = await getPendingCoachInvites(clubId);
      const totalCommitted = currentCount + pendingInvites;
      const newTotal = totalCommitted + additionalCount;

      if (newTotal > limits.maxCoachAccounts) {
        // Provide helpful message based on what's taking up the slots
        if (pendingInvites > 0) {
          return {
            valid: false,
            reason: `Cannot add ${additionalCount} coach account(s). You have ${currentCount} coach(es) signed up and ${pendingInvites} pending invite(s) (${totalCommitted} of ${limits.maxCoachAccounts} slots committed). Delete unused referral codes or upgrade your subscription.`
          };
        }
        return {
          valid: false,
          reason: `Cannot add ${additionalCount} coach account(s). You have ${currentCount} of ${limits.maxCoachAccounts} coach accounts used. Please upgrade your subscription to add more coaches.`
        };
      }
    }

    // Validate view-only limit
    if (role === 'view_only') {
      if (limits.maxViewOnlyUsers === null) {
        // No view-only subscription - cannot add view-only users
        return {
          valid: false,
          reason: 'No view-only subscription found. Please purchase a view-only subscription to add view-only users.'
        };
      }

      const currentCount = await getCurrentViewOnlyCount(clubId);
      const pendingInvites = await getPendingViewOnlyInvites(clubId);
      const totalCommitted = currentCount + pendingInvites;
      const newTotal = totalCommitted + additionalCount;

      if (newTotal > limits.maxViewOnlyUsers) {
        // Provide helpful message based on what's taking up the slots
        if (pendingInvites > 0) {
          return {
            valid: false,
            reason: `Cannot add ${additionalCount} view-only user(s). You have ${currentCount} user(s) signed up and ${pendingInvites} pending invite(s) (${totalCommitted} of ${limits.maxViewOnlyUsers} slots committed). Delete unused referral codes or upgrade your subscription.`
          };
        }
        return {
          valid: false,
          reason: `Cannot add ${additionalCount} view-only user(s). You have ${currentCount} of ${limits.maxViewOnlyUsers} view-only slots used. Please upgrade your subscription to add more view-only users.`
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating user limit:', error);
    // Fail closed - reject on error for security
    return {
      valid: false,
      reason: 'Unable to validate subscription limits. Please try again or contact support.'
    };
  }
}

