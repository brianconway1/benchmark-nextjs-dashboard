'use client';

import { Box, Typography, CircularProgress, Stack, Chip } from '@mui/material';
import { formatDateTime } from '@/utils/dateHelpers';
import {
  getActivityDescription,
  getActivityColor,
} from '@/utils/engagementHelpers';
import { appColors } from '@/theme';
import type { ActivityLogEntry } from '@/types';

interface RecentActivityFeedProps {
  activities: ActivityLogEntry[];
  loading?: boolean;
}

export default function RecentActivityFeed({
  activities,
  loading = false,
}: RecentActivityFeedProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recent activity.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {activities.map((activity) => (
        <Box
          key={activity.id}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            p: 1.5,
            borderRadius: 1,
            backgroundColor: appColors.backgroundGrey,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
              <Chip
                label={formatActivityType(activity.type)}
                size="small"
                sx={{
                  backgroundColor: getActivityColor(activity.type),
                  color: '#fff',
                  fontSize: '0.65rem',
                  height: 22,
                }}
              />
            </Box>
            <Typography variant="body2">
              {getActivityDescription(activity.type, activity.data)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(activity.timestamp)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function formatActivityType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
