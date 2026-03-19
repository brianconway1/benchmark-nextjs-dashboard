import { toDate } from './dateHelpers';
import { appColors } from '@/theme';
import type { FirestoreTimestamp } from '@/types';

// Activity Status Types
export type ActivityStatus = 'active' | 'inactive' | 'at_risk';

export interface ActivityStatusConfig {
  status: ActivityStatus;
  label: string;
  color: string;
  backgroundColor: string;
}

// Thresholds (in days)
export const ACTIVITY_THRESHOLDS = {
  ACTIVE: 7, // Last activity within 7 days
  INACTIVE: 30, // Last activity 7-30 days ago
  // AT_RISK: > 30 days or no activity
} as const;

/**
 * Calculate activity status based on last activity timestamp
 */
export function getActivityStatus(lastActivity: FirestoreTimestamp): ActivityStatus {
  const activityDate = toDate(lastActivity);

  if (!activityDate) {
    return 'at_risk'; // No activity recorded
  }

  const now = new Date();
  const diffMs = now.getTime() - activityDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= ACTIVITY_THRESHOLDS.ACTIVE) {
    return 'active';
  } else if (diffDays <= ACTIVITY_THRESHOLDS.INACTIVE) {
    return 'inactive';
  }
  return 'at_risk';
}

/**
 * Get status configuration for display
 */
export function getActivityStatusConfig(status: ActivityStatus): ActivityStatusConfig {
  const configs: Record<ActivityStatus, ActivityStatusConfig> = {
    active: {
      status: 'active',
      label: 'Active',
      color: '#ffffff',
      backgroundColor: appColors.success,
    },
    inactive: {
      status: 'inactive',
      label: 'Inactive',
      color: '#ffffff',
      backgroundColor: appColors.warning,
    },
    at_risk: {
      status: 'at_risk',
      label: 'At Risk',
      color: '#ffffff',
      backgroundColor: appColors.error,
    },
  };
  return configs[status];
}

/**
 * Format relative time for last activity
 */
export function formatLastActive(lastActivity: FirestoreTimestamp): string {
  const activityDate = toDate(lastActivity);

  if (!activityDate) {
    return 'No activity';
  }

  const now = new Date();
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return '1d ago';
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Get human-readable description for activity type
 */
export function getActivityDescription(
  type: string,
  data?: Record<string, unknown>
): string {
  const userName = (data?.userName as string) || (data?.email as string) || 'A user';

  const descriptions: Record<string, string> = {
    user_created: `${userName} joined`,
    user_updated: `${userName} updated their profile`,
    team_created: `${userName} created team "${data?.teamName || 'Unknown'}"`,
    team_deleted: `${userName} deleted a team`,
    member_invited: `${userName} invited ${data?.invitedEmail || 'a member'}`,
    member_joined: `${userName} joined the club`,
    member_removed: `${userName} was removed`,
    role_changed: `${userName}'s role was changed`,
    session_created: `${userName} created a training session`,
    drill_uploaded: `${userName} uploaded a drill`,
    drill_deleted: `${userName} deleted a drill`,
    team_drill_uploaded: `${userName} uploaded a team drill`,
    club_created: `${userName} created the club`,
    club_updated: `${userName} updated club settings`,
    settings_updated: `${userName} updated settings`,
  };

  return (
    descriptions[type] ||
    type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * Get color for activity type
 */
export function getActivityColor(type: string): string {
  if (
    type.includes('created') ||
    type.includes('uploaded') ||
    type.includes('joined')
  ) {
    return appColors.success;
  }
  if (type.includes('deleted') || type.includes('removed')) {
    return appColors.error;
  }
  if (type.includes('updated') || type.includes('changed')) {
    return appColors.info;
  }
  if (type.includes('invited')) {
    return appColors.warning;
  }
  return appColors.textSecondary;
}
