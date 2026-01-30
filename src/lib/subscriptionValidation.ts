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

    // If no subscriptions exist, allow access (backward compatibility)
    if (subscriptionsSnapshot.empty) {
      return {
        valid: true,
        reason: undefined,
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
    // On error, allow access (fail open) - you may want to change this to fail closed
    return {
      valid: true,
      reason: undefined,
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
export async function getClubLimits(clubId: string): Promise<{maxCoachAccounts: number | null, maxViewOnlyUsers: number | null}> {
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
 * Validate if adding a user with a specific role would exceed subscription limits
 * @param {string} clubId - Club ID
 * @param {string} role - Role to be assigned ('coach', 'club_admin_coach', or 'view_only')
 * @param {number} additionalCount - Number of additional users being added (default: 1)
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
export async function validateUserLimit(
  clubId: string, 
  role: string, 
  additionalCount: number = 1
): Promise<{valid: boolean, reason?: string}> {
  try {
    // Get club limits
    const limits = await getClubLimits(clubId);
    
    // If no limits set, allow (backward compatibility)
    if (limits.maxCoachAccounts === null && limits.maxViewOnlyUsers === null) {
      return { valid: true };
    }
    
    // Validate coach account limit
    if (role === 'coach' || role === 'club_admin_coach') {
      if (limits.maxCoachAccounts === null) {
        // No coach account subscription, but allow if no limit is set
        return { valid: true };
      }
      
      const currentCount = await getCurrentCoachCount(clubId);
      const newCount = currentCount + additionalCount;
      
      if (newCount > limits.maxCoachAccounts) {
        return {
          valid: false,
          reason: `Cannot add ${additionalCount} coach account(s). You have ${currentCount} of ${limits.maxCoachAccounts} coach accounts used. Please upgrade your subscription to add more coaches.`
        };
      }
    }
    
    // Validate view-only limit
    if (role === 'view_only') {
      if (limits.maxViewOnlyUsers === null) {
        // No view-only subscription, but allow if no limit is set
        return { valid: true };
      }
      
      const currentCount = await getCurrentViewOnlyCount(clubId);
      const newCount = currentCount + additionalCount;
      
      if (newCount > limits.maxViewOnlyUsers) {
        return {
          valid: false,
          reason: `Cannot add ${additionalCount} view-only user(s). You have ${currentCount} of ${limits.maxViewOnlyUsers} view-only slots used. Please upgrade your subscription to add more view-only users.`
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating user limit:', error);
    // On error, allow (fail open) - you may want to change this to fail closed
    return { valid: true };
  }
}

