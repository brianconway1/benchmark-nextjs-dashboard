// Role configuration for the club admin portal
// Centralizes role labels, descriptions, and seat information

export type ClubRole = 'club_admin' | 'club_admin_coach' | 'coach' | 'view_only';
export type AllRole = ClubRole | 'super_admin';

export interface RoleConfig {
  label: string;
  description: string;
  usesSeat: boolean;
  seatType: 'coach' | 'view_only' | null;
}

export const ROLE_CONFIG: Record<ClubRole, RoleConfig> = {
  club_admin: {
    label: 'Club Admin',
    description: 'Admin portal only. No mobile app. No paid seat.',
    usesSeat: false,
    seatType: null,
  },
  club_admin_coach: {
    label: 'Club Admin Coach',
    description: 'Admin portal + mobile app. Uses 1 coach seat.',
    usesSeat: true,
    seatType: 'coach',
  },
  coach: {
    label: 'Coach',
    description: 'Mobile app only. Uses 1 coach seat.',
    usesSeat: true,
    seatType: 'coach',
  },
  view_only: {
    label: 'View Only',
    description: 'Mobile app with limited access. Uses 1 view-only seat.',
    usesSeat: true,
    seatType: 'view_only',
  },
};

// Extended config including super_admin for admin panel displays
export const ALL_ROLE_LABELS: Record<AllRole, string> = {
  club_admin: ROLE_CONFIG.club_admin.label,
  club_admin_coach: ROLE_CONFIG.club_admin_coach.label,
  coach: ROLE_CONFIG.coach.label,
  view_only: ROLE_CONFIG.view_only.label,
  super_admin: 'Super Admin',
};

// Helper to get role label
export function getRoleLabel(role: string): string {
  return ALL_ROLE_LABELS[role as AllRole] || role;
}

// Helper to get role description (only for club roles)
export function getRoleDescription(role: string): string {
  return ROLE_CONFIG[role as ClubRole]?.description || '';
}

// Roles available for club member invitations (ordered for dropdown display)
export const INVITABLE_ROLES: ClubRole[] = ['club_admin_coach', 'club_admin', 'coach', 'view_only'];
