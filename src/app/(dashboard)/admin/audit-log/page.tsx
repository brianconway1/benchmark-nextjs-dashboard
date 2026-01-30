'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PageLoader from '@/components/shared/PageLoader';
import { appColors } from '@/theme';
import { toDate } from '@/utils/dateHelpers';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  target: string;
  details: string;
  status: string;
}

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!user || authLoading) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid);
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        await loadAuditLogs();
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load audit logs');
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [user, authLoading]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch most recent 100 logs
      const logsQuery = query(collection(db, 'activity_log'), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(logsQuery);

      const logsData: AuditLogEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const userName = data.data?.userName || data.data?.email || 'System';
        const target = getTargetFromAction(data.type, data.data || {});
        const details = getDetailsFromAction(data.type, data.data || {});

        return {
          id: doc.id,
          timestamp: toDate(data.timestamp) || new Date(),
          user: userName,
          action: data.type || 'unknown',
          target: target,
          details: details,
          status: 'success',
        };
      });

      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely get string value from unknown data
  const getString = (value: unknown, defaultValue: string = ''): string => {
    return typeof value === 'string' ? value : defaultValue;
  };

  const getTargetFromAction = (action: string | undefined, data: Record<string, unknown>): string => {
    if (!action) return 'N/A';
    switch (action) {
      case 'team_created':
        return getString(data.teamName, 'Team');
      case 'member_invited':
        return getString(data.email, 'User');
      case 'member_removed':
        return getString(data.userName) || getString(data.email, 'User');
      case 'role_changed':
        return getString(data.userName) || getString(data.email, 'User');
      case 'team_deleted':
        return getString(data.teamName, 'Team');
      case 'session_created':
        return getString(data.sessionName, 'Session');
      case 'drill_uploaded':
        return getString(data.drillName, 'Drill');
      case 'drill_deleted':
        return getString(data.drillName, 'Drill');
      case 'team_drill_uploaded':
        return getString(data.drillName, 'Drill');
      default:
        return 'N/A';
    }
  };

  const getDetailsFromAction = (action: string | undefined, data: Record<string, unknown>): string => {
    if (!action) return 'Action performed';
    switch (action) {
      case 'team_created':
        return `Created team "${getString(data.teamName, 'Team')}"`;
      case 'member_invited':
        return `Invited ${getString(data.email, 'user')} as ${getString(data.role, 'member')}`;
      case 'member_removed':
        return `Removed member ${getString(data.userName) || getString(data.email, 'user')}`;
      case 'role_changed':
        return `Changed role from ${getString(data.oldRole, 'N/A')} to ${getString(data.newRole, 'unknown')}`;
      case 'team_deleted':
        return `Deleted team "${getString(data.teamName, 'Team')}"`;
      case 'session_created':
        return `Created session "${getString(data.sessionName, 'Session')}"`;
      case 'drill_uploaded':
        return `Uploaded drill "${getString(data.drillName, 'Drill')}"`;
      case 'drill_deleted':
        return `Deleted drill "${getString(data.drillName, 'Drill')}"`;
      case 'team_drill_uploaded':
        return `Uploaded team drill "${getString(data.drillName, 'Drill')}" to ${getString(data.teamName, 'team')}`;
      default:
        return 'Action performed';
    }
  };

  const getActionColor = (action: string | undefined): string => {
    if (!action) return appColors.textSecondary;
    switch (action) {
      case 'user_created':
      case 'club_created':
      case 'team_created':
      case 'member_joined':
      case 'session_created':
      case 'drill_uploaded':
      case 'team_drill_uploaded':
        return appColors.success;
      case 'user_updated':
      case 'club_updated':
      case 'settings_updated':
        return appColors.info;
      case 'user_deleted':
      case 'team_deleted':
      case 'member_removed':
      case 'drill_deleted':
        return appColors.error;
      case 'role_changed':
        return '#9c27b0';
      case 'member_invited':
        return appColors.warning;
      default:
        return appColors.textSecondary;
    }
  };

  const getActionName = (action: string): string => {
    if (!action) return 'Unknown Action';
    
    switch (action) {
      case 'user_created':
        return 'User Created';
      case 'user_updated':
        return 'User Updated';
      case 'user_deleted':
        return 'User Deleted';
      case 'club_created':
        return 'Club Created';
      case 'club_updated':
        return 'Club Updated';
      case 'team_created':
        return 'Team Created';
      case 'team_deleted':
        return 'Team Deleted';
      case 'settings_updated':
        return 'Settings Updated';
      case 'role_changed':
        return 'Role Changed';
      case 'member_invited':
        return 'Member Invited';
      case 'member_removed':
        return 'Member Removed';
      case 'member_joined':
        return 'Member Joined';
      case 'session_created':
        return 'Session Created';
      case 'drill_uploaded':
        return 'Drill Uploaded';
      case 'drill_deleted':
        return 'Drill Deleted';
      case 'team_drill_uploaded':
        return 'Team Drill Uploaded';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || log.action === filterType;

      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, filterType]);

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Time',
      width: 180,
      valueGetter: (value: unknown) => formatTimestamp(value as Date),
    },
    {
      field: 'user',
      headerName: 'User',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 200,
      renderCell: (params) => {
        const action = (params.value as string) || 'unknown';
        return (
          <Chip
            label={getActionName(action)}
            size="small"
            sx={{
              backgroundColor: getActionColor(action),
              color: '#fff',
              fontWeight: 'medium',
            }}
          />
        );
      },
    },
    {
      field: 'target',
      headerName: 'Target',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'details',
      headerName: 'Details',
      flex: 2,
      minWidth: 250,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              backgroundColor: appColors.success,
              color: '#fff',
              fontWeight: 'medium',
            }}
          />
        );
      },
    },
  ];

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Access denied. You must be a super admin to view this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Audit Log
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track all system changes and user actions
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Search logs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Action Type</InputLabel>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="Action Type">
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="user_created">User Created</MenuItem>
              <MenuItem value="user_updated">User Updated</MenuItem>
              <MenuItem value="user_deleted">User Deleted</MenuItem>
              <MenuItem value="club_created">Club Created</MenuItem>
              <MenuItem value="club_updated">Club Updated</MenuItem>
              <MenuItem value="team_created">Team Created</MenuItem>
              <MenuItem value="team_deleted">Team Deleted</MenuItem>
              <MenuItem value="member_invited">Member Invited</MenuItem>
              <MenuItem value="member_removed">Member Removed</MenuItem>
              <MenuItem value="member_joined">Member Joined</MenuItem>
              <MenuItem value="role_changed">Role Changed</MenuItem>
              <MenuItem value="session_created">Session Created</MenuItem>
              <MenuItem value="drill_uploaded">Drill Uploaded</MenuItem>
              <MenuItem value="drill_deleted">Drill Deleted</MenuItem>
              <MenuItem value="team_drill_uploaded">Team Drill Uploaded</MenuItem>
              <MenuItem value="settings_updated">Settings Updated</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Logs Table */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredLogs}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>System Activity Log:</strong> This audit log displays all system-wide activities across all clubs,
          including team creation, member management, role changes, and more.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Showing the most recent 100 activities. Activities are sorted by most recent first.
        </Typography>
      </Alert>
    </Container>
  );
}

