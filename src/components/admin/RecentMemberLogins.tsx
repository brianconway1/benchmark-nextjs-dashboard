'use client';

import { Box, Typography, Avatar, Stack, Chip } from '@mui/material';
import {
  getActivityStatus,
  getActivityStatusConfig,
  formatLastActive,
} from '@/utils/engagementHelpers';
import { appColors } from '@/theme';
import type { User, FirestoreTimestamp } from '@/types';

interface MemberWithActivity extends User {
  lastActivity?: FirestoreTimestamp;
}

interface RecentMemberLoginsProps {
  members: MemberWithActivity[];
  limit?: number;
  onMemberClick?: (member: MemberWithActivity) => void;
}

export default function RecentMemberLogins({
  members,
  limit = 5,
  onMemberClick,
}: RecentMemberLoginsProps) {
  // Sort members by last activity (most recent first, no activity at end)
  const sortedMembers = [...members]
    .sort((a, b) => {
      const dateA = a.lastActivity ? new Date(a.lastActivity as string | number | Date).getTime() : 0;
      const dateB = b.lastActivity ? new Date(b.lastActivity as string | number | Date).getTime() : 0;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
    })
    .slice(0, limit);

  if (sortedMembers.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No members yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {sortedMembers.map((member) => {
        const status = getActivityStatus(member.lastActivity);
        const statusConfig = getActivityStatusConfig(status);
        const displayName =
          member.displayName ||
          `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
          member.email;

        const roleLabel =
          {
            club_admin: 'Admin',
            club_admin_coach: 'Admin Coach',
            coach: 'Coach',
            view_only: 'View Only',
            super_admin: 'Super Admin',
          }[member.role] || member.role;

        return (
          <Box
            key={member.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1,
              borderRadius: 1,
              cursor: onMemberClick ? 'pointer' : 'default',
              '&:hover': onMemberClick
                ? { backgroundColor: appColors.backgroundGrey }
                : {},
            }}
            onClick={() => onMemberClick?.(member)}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: appColors.primary }}>
                {displayName?.charAt(0).toUpperCase()}
              </Avatar>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: statusConfig.backgroundColor,
                  border: '2px solid white',
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 'medium',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </Typography>
                <Chip
                  label={roleLabel}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatLastActive(member.lastActivity)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
