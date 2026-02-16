'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin, canAccessClub } from '@/lib/permissions';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club, Team, User } from '@/types';
import {
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  Dashboard as DashboardIcon,
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PageLoader from '@/components/shared/PageLoader';
import ReferralCodesTable from '@/components/shared/ReferralCodesTable';
import InviteMemberModal from '@/components/club/InviteMemberModal';
import CreateTeamDialog from '@/components/teams/CreateTeamDialog';
import { appColors } from '@/theme';
import { formatDate } from '@/utils/dateHelpers';
import { AGE_GROUP_LABELS } from '@/constants/teams';

export default function ClubDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clubId = params?.clubId as string;
  const { user, loading: authLoading } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  const loadClubData = useCallback(async () => {
    if (!clubId) return;

    try {
      setLoading(true);
      setError('');

      // Load club, teams, and members in parallel for better performance
      const [clubDoc, teamsSnapshot, membersSnapshot] = await Promise.all([
        getDoc(doc(db, 'sports_clubs', clubId)),
        getDocs(query(collection(db, 'teams'), where('clubId', '==', clubId))),
        getDocs(query(collection(db, 'users'), where('clubId', '==', clubId))),
      ]);

      if (!clubDoc.exists()) {
        setError('Club not found');
        return;
      }
      setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);

      const teamsData = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Team[];
      setTeams(teamsData);

      const membersData = membersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setMembers(membersData);
    } catch (err) {
      console.error('Error loading club data:', err);
      setError('Failed to load club data');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!user || authLoading || !clubId) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid) || await canAccessClub(user.uid, clubId);
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        await loadClubData();
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load club data');
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [user, authLoading, clubId, loadClubData]);

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. You don't have permission to view this club.
        </Alert>
      </Container>
    );
  }

  if (!club) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Club not found</Alert>
      </Container>
    );
  }

  const teamColumns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Team Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'sport',
      headerName: 'Sport',
      width: 150,
      valueGetter: (value: unknown) => (value as string) || 'N/A',
    },
    {
      field: 'ageGroup',
      headerName: 'Age Group',
      width: 120,
      valueGetter: (value: unknown) => {
        const ageGroup = value as string;
        return AGE_GROUP_LABELS[ageGroup] || ageGroup || 'N/A';
      },
    },
    {
      field: 'memberCount',
      headerName: 'Members',
      width: 120,
      valueGetter: (value: unknown) => (value as number) || 0,
    },
  ];

  const memberColumns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      valueGetter: (value, row: User) => {
        return row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.email || 'N/A';
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      valueGetter: (value: unknown) => {
        const roleMap: Record<string, string> = {
          club_admin_coach: 'Admin Coach',
          club_admin: 'Club Admin',
          coach: 'Coach',
          player: 'Player',
        };
        return roleMap[value as string] || value || 'N/A';
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueGetter: (value: unknown) => formatDate(value),
    },
  ];

  const getUsagePercentage = (used: number, max: number): number => {
    if (!max || max === 0) return 0;
    return Math.round((used / max) * 100);
  };

  const usagePercentage = getUsagePercentage(club.usedCount || 0, club.maxUses || 0);

  const handleInviteSent = () => {
    loadClubData(); // Refresh data after invite
  };

  const handleTeamCreated = () => {
    loadClubData(); // Refresh data after team creation
  };

  const renderOverview = () => (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
          Club Information
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Sport Type
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {club.sport || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Status
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {(club.status || 'Active').replace('_', ' ')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Created
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {formatDate(club.createdAt)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
          Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Total Members
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              {members.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(() => {
                const maxCoach = club.maxCoachAccounts ?? null;
                const maxViewOnly = club.maxViewOnlyUsers ?? null;
                if (maxCoach !== null && maxViewOnly !== null) {
                  return `of ${maxCoach + maxViewOnly} subscription slots`;
                } else if (maxCoach !== null) {
                  return `of ${maxCoach} coach slots`;
                } else if (maxViewOnly !== null) {
                  return `of ${maxViewOnly} view-only slots`;
                }
                return 'No subscription limits';
              })()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Total Teams
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              {teams.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Account Usage
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              {club.usedCount || 0} / {club.maxUses || 0}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(usagePercentage, 100)}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: appColors.backgroundGrey,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor:
                      usagePercentage >= 90
                        ? appColors.error
                        : usagePercentage >= 70
                          ? appColors.warning
                          : appColors.success,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {usagePercentage}% used
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Stack>
  );

  const renderMembers = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Club Members ({members.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteMemberOpen(true)}
          sx={{
            backgroundColor: appColors.primary,
            color: appColors.primaryText,
            fontWeight: 'bold',
            '&:hover': { backgroundColor: appColors.primaryHover },
          }}
        >
          Invite Member
        </Button>
      </Box>
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={members}
          columns={memberColumns}
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
    </Box>
  );

  const renderTeams = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Teams ({teams.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateTeamOpen(true)}
          sx={{
            backgroundColor: appColors.primary,
            color: appColors.primaryText,
            fontWeight: 'bold',
            '&:hover': { backgroundColor: appColors.primaryHover },
          }}
        >
          Create Team
        </Button>
      </Box>
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={teams}
          columns={teamColumns}
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
    </Box>
  );

  const renderReferralCodes = () => {
    return (
      <ReferralCodesTable
        clubId={clubId}
        clubName={club.name || 'Club'}
        showHeader={true}
        titleVariant="section"
        height={600}
      />
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/clubs')}
          sx={{ color: appColors.textPrimary }}
        >
          Back to Clubs
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
            {club.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Club Management Console
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
          },
          '& .Mui-selected': {
            color: appColors.primary,
          },
          '& .MuiTabs-indicator': {
            backgroundColor: appColors.primary,
          },
        }}
      >
        <Tab icon={<DashboardIcon />} iconPosition="start" label="Overview" />
        <Tab icon={<PeopleIcon />} iconPosition="start" label="Members" />
        <Tab icon={<GroupsIcon />} iconPosition="start" label="Teams" />
        <Tab icon={<VpnKeyIcon />} iconPosition="start" label="Referral Codes" />
      </Tabs>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderMembers()}
        {activeTab === 2 && renderTeams()}
        {activeTab === 3 && renderReferralCodes()}
      </Box>

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={inviteMemberOpen}
        onClose={() => setInviteMemberOpen(false)}
        onInviteSent={handleInviteSent}
        clubId={clubId}
        clubName={club.name || 'Club'}
      />

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onTeamCreated={handleTeamCreated}
        clubId={clubId}
        clubName={club?.name || ''}
      />
    </Container>
  );
}

