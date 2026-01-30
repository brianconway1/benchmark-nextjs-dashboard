// TypeScript type definitions
import type { Timestamp } from 'firebase/firestore';

export type FirestoreTimestamp = Timestamp | Date | string | number | null | undefined;

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  clubId?: string;
  teamId?: string;
  role: 'super_admin' | 'club_admin' | 'club_admin_coach' | 'coach' | 'view_only';
  referralCode?: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Club {
  id: string;
  name: string;
  sport?: string;
  clubAdminIds: string[];
  clubAdminCoachIds: string[];
  memberIds?: string[];
  maxCoachAccounts?: number | null;
  maxViewOnlyUsers?: number | null;
  maxUses?: number;
  usedCount?: number;
  status?: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  ownerId?: string;
  ageGroup?: string;
  logoUrl?: string | null;
  sport?: string;
  sports?: string[];
  coaches?: Array<{
    userId: string;
    role: string;
    assignedAt?: FirestoreTimestamp;
    assignedBy?: string;
  }>;
  members: string[];
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  deletedAt?: FirestoreTimestamp; // Soft delete timestamp
}

export interface ReferralCode {
  id: string;
  code: string;
  clubId?: string;
  teamId?: string;
  intendedRole?: string;
  adminEmail?: string;
  maxUses: number;
  usesCount: number;
  active: boolean;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  expiresAt?: FirestoreTimestamp;
}

