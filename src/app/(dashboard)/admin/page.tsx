'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { useAdminStats } from '@/hooks/useAdminStats';
import SystemStats from '@/components/admin/SystemStats';
import PageLoader from '@/components/shared/PageLoader';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  FitnessCenter as FitnessCenterIcon,
  VideoLibrary as VideoLibraryIcon,
  SportsGymnastics as SportsGymnasticsIcon,
} from '@mui/icons-material';
import { appColors } from '@/theme';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    totalClubs,
    clubsThisMonth,
    activeUsers,
    usersThisMonth,
    sessionsCreated,
    sessionsThisMonth,
    totalTeams,
    totalAdmins,
    systemHealth,
    loading,
    error,
    formatUserChange,
    refetch,
  } = useAdminStats();
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || authLoading) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid);
        if (!hasAccess) {
          setAccessDenied(true);
          return;
        }
      } catch (err) {
        console.error('Error checking access:', err);
      }
    };

    checkAccess();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. You must be a super admin to view this page.
        </Alert>
      </Container>
    );
  }

  const stats = [
    {
      label: 'Total Clubs',
      value: loading ? '...' : totalClubs.toString(),
      change: loading ? '...' : formatUserChange(clubsThisMonth),
    },
    {
      label: 'Total Users',
      value: loading ? '...' : activeUsers.toLocaleString(),
      change: loading ? '...' : formatUserChange(usersThisMonth),
    },
    {
      label: 'Sessions Created',
      value: loading ? '...' : sessionsCreated.toString(),
      change: loading ? '...' : formatUserChange(sessionsThisMonth),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              Welcome to Super Admin Console
        </Typography>
        <Typography variant="body1" color="text.secondary">
              Manage your entire Benchmark Coach ecosystem
        </Typography>
      </Box>
          <Button
            variant="outlined"
            onClick={refetch}
            sx={{
              borderColor: appColors.primary,
              color: appColors.primaryText,
              '&:hover': { borderColor: appColors.primaryHover, backgroundColor: appColors.backgroundGrey },
            }}
          >
            Refresh Stats
          </Button>
        </Box>
      {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error loading statistics: {error}
        </Alert>
      )}
      </Box>

      {/* Stats grid */}
      <Box sx={{ mb: 4 }}>
        <SystemStats
          totalClubs={totalClubs}
          totalUsers={activeUsers}
          totalTeams={totalTeams}
          totalAdmins={totalAdmins}
          loading={loading}
        />
      </Box>

      {/* System Status Section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
        {/* Orphaned Records */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WarningIcon sx={{ mr: 1, color: appColors.warning }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              Orphaned Records
            </Typography>
            {systemHealth?.orphanedUsers?.total > 0 && (
              <Chip
                label={`${systemHealth.orphanedUsers.total} Issues`}
                size="small"
                sx={{
                  ml: 2,
                  backgroundColor: appColors.error,
                  color: '#fff',
                }}
              />
            )}
          </Box>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Users w/o club:
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: systemHealth?.orphanedUsers?.usersWithoutClub > 0 ? appColors.error : appColors.textSecondary,
                }}
              >
                {loading ? '...' : systemHealth?.orphanedUsers?.usersWithoutClub || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Users w/o team:
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: systemHealth?.orphanedUsers?.usersWithoutTeam > 0 ? appColors.error : appColors.textSecondary,
                }}
              >
                {loading ? '...' : systemHealth?.orphanedUsers?.usersWithoutTeam || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Sessions w/o team:
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: systemHealth?.orphanedUsers?.sessionsWithoutTeam > 0 ? appColors.error : appColors.textSecondary,
                }}
              >
                {loading ? '...' : systemHealth?.orphanedUsers?.sessionsWithoutTeam || 0}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Recent Activity */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon sx={{ mr: 1, color: appColors.info }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              Recent Activity (24h)
            </Typography>
            <Chip
              label={`${loading ? '...' : systemHealth?.systemActivity?.totalActivity || 0} Total`}
              size="small"
              sx={{
                ml: 2,
                backgroundColor: appColors.info,
                color: '#fff',
              }}
            />
          </Box>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                New users:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.info }}>
                {loading ? '...' : systemHealth?.systemActivity?.recentUsers || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                New sessions:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.info }}>
                {loading ? '...' : systemHealth?.systemActivity?.recentSessions || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                New clubs:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.info }}>
                {loading ? '...' : systemHealth?.systemActivity?.recentClubs || 0}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Quick actions */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
            Quick Actions
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/clubs/create')}
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
              fullWidth
            >
              Create New Club
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/clubs')}
              startIcon={<BusinessIcon />}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
              fullWidth
            >
              View All Clubs
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/users')}
              startIcon={<PeopleIcon />}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
              fullWidth
            >
              Manage Users
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
            System Management
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={() => router.push('/admin/analytics')}
              startIcon={<HistoryIcon />}
              sx={{
                borderColor: appColors.primary,
                color: appColors.primaryText,
                '&:hover': { borderColor: appColors.primaryHover, backgroundColor: appColors.backgroundGrey },
              }}
              fullWidth
            >
              View Analytics
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push('/admin/settings')}
              startIcon={<SettingsIcon />}
              sx={{
                borderColor: appColors.primary,
                color: appColors.primaryText,
                '&:hover': { borderColor: appColors.primaryHover, backgroundColor: appColors.backgroundGrey },
              }}
              fullWidth
            >
              System Settings
            </Button>
          </Stack>
        </Paper>
      </Box>

      {/* Content Management */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
            Content Management
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/benchmark-drills')}
              startIcon={<FitnessCenterIcon />}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
              fullWidth
            >
              Benchmark Drills
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/benchmark-exercises')}
              startIcon={<SportsGymnasticsIcon />}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
              fullWidth
            >
              Benchmark Exercises
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push('/admin/masterclasses')}
              startIcon={<VideoLibraryIcon />}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
              fullWidth
            >
              Masterclasses
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}

