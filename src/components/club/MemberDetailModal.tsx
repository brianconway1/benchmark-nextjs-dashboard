'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { appColors } from '@/theme';
import { formatDate, formatDateTime } from '@/utils/dateHelpers';
import {
  getActivityStatus,
  getActivityStatusConfig,
  formatLastActive,
  getActivityDescription,
  getActivityColor,
} from '@/utils/engagementHelpers';
import { getRoleLabel } from '@/config/roles';
import type { User, ActivityLogEntry, FirestoreTimestamp } from '@/types';

interface MemberWithActivity extends User {
  lastActivity?: FirestoreTimestamp;
}

interface MemberDetailModalProps {
  open: boolean;
  onClose: () => void;
  member: MemberWithActivity | null;
}

export default function MemberDetailModal({
  open,
  onClose,
  member,
}: MemberDetailModalProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMemberActivities = async () => {
      if (!member || !open) return;

      setLoading(true);
      try {
        // Try to query by email in data field
        const activitiesQuery = query(
          collection(db, 'activity_log'),
          where('data.email', '==', member.email),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(activitiesQuery);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActivityLogEntry[];
        setActivities(data);
      } catch (error) {
        console.error('Error fetching member activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberActivities();
  }, [member, open]);

  if (!member) return null;

  const status = getActivityStatus(member.lastActivity);
  const statusConfig = getActivityStatusConfig(status);
  const displayName =
    member.displayName ||
    `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
    member.email;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Activity Status Banner */}
      <Box
        sx={{
          backgroundColor: statusConfig.backgroundColor,
          color: statusConfig.color,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Member Details
        </Typography>
        <Chip
          label={statusConfig.label}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: statusConfig.color,
            fontWeight: 'bold',
          }}
        />
      </Box>

      <DialogContent>
        {/* Member Info Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {member.email}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
            <Chip
              label={getRoleLabel(member.role)}
              size="small"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Joined: {formatDate(member.createdAt)}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ color: statusConfig.backgroundColor, fontWeight: 'medium' }}
          >
            {formatLastActive(member.lastActivity)}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Recent Activity Section */}
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Recent Activity
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : activities.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No recent activity recorded.
          </Typography>
        ) : (
          <List dense sx={{ p: 0 }}>
            {activities.map((activity) => (
              <ListItem
                key={activity.id}
                sx={{
                  px: 0,
                  py: 1,
                  borderBottom: `1px solid ${appColors.backgroundGrey}`,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={activity.type.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          backgroundColor: getActivityColor(activity.type),
                          color: '#fff',
                          fontSize: '0.6rem',
                          height: 20,
                        }}
                      />
                      <Typography variant="body2">
                        {getActivityDescription(activity.type, activity.data)}
                      </Typography>
                    </Box>
                  }
                  secondary={formatDateTime(activity.timestamp)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          sx={{ color: appColors.textSecondary }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
