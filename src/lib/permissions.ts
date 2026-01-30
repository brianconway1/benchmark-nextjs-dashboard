// Permission checking utilities
'use client';

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Club } from '@/types';

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data();
    return userData.role === 'super_admin';
  } catch (error) {
    console.error('Error checking super admin:', error);
    return false;
  }
}

/**
 * Check if user can access a specific club
 */
export async function canAccessClub(userId: string, clubId: string): Promise<boolean> {
  try {
    // Super admin can access all clubs
    if (await isSuperAdmin(userId)) {
      return true;
    }

    // Get user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data();

    // Check if user's clubId matches
    if (userData.clubId === clubId) {
      return true;
    }

    // Check club admin arrays
    const clubDoc = await getDoc(doc(db, 'sports_clubs', clubId));
    if (!clubDoc.exists()) return false;
    const clubData = clubDoc.data();

    return (
      clubData.clubAdminIds?.includes(userId) ||
      clubData.clubAdminCoachIds?.includes(userId)
    );
  } catch (error) {
    console.error('Error checking club access:', error);
    return false;
  }
}

/**
 * Check if user is club admin or club admin coach
 */
export async function isClubAdmin(userId: string, clubId?: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data();

    const role = userData.role;
    if (role === 'club_admin' || role === 'club_admin_coach') {
      // If clubId provided, verify user belongs to that club
      if (clubId) {
        return userData.clubId === clubId;
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking club admin:', error);
    return false;
  }
}

/**
 * Get user's role
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    return userDoc.data().role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}



