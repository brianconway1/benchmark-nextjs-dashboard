'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club, Team, User } from '@/types';
import { People as PeopleIcon, Groups as GroupsIcon, CreditCard as CreditCardIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { appColors } from '@/theme';

interface Subscription {
  id: string;
  clubId?: string;
  status?: string;
  maxViewOnlyUsers?: number;
  [key: string]: unknown;
}

export default function ClubDashboardPage() {
  const { userData, loading: authLoading } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadClubData = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        setError('');

        // Load club
        const clubDoc = await getDoc(doc(db, 'sports_clubs', userData.clubId));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        } else {
          setError('Club not found');
          return;
        }

        // Load teams
        const teamsQuery = query(
          collection(db, 'teams'),
          where('clubId', '==', userData.clubId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[];
        setTeams(teamsData);

        // Load members
        const membersQuery = query(
          collection(db, 'users'),
          where('clubId', '==', userData.clubId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        const membersData = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setMembers(membersData);

        // Load subscriptions
        const subscriptionsQuery = query(
          collection(db, 'subscriptions'),
          where('clubId', '==', userData.clubId)
        );
        const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
        const subscriptionsData = subscriptionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Subscription[];
        setSubscriptions(subscriptionsData);
      } catch (err) {
        console.error('Error loading club data:', err);
        setError('Failed to load club data');
      } finally {
        setLoading(false);
      }
    };

    loadClubData();
  }, [userData?.clubId, authLoading]);

  // Calculate stats
  const totalMembers = members.length;
  const activeTeams = teams.filter((team) => !team.deletedAt).length;
  const activeSubscriptions = subscriptions.filter((sub) => 
    sub.status === 'active' || sub.status === 'trialing'
  ).length;
  
  // Get limits from club document (aggregated from subscriptions)
  const maxCoachAccounts = club?.maxCoachAccounts || null;
  const maxViewOnlyUsers = club?.maxViewOnlyUsers || null;
  
  // Calculate coach accounts used (coach OR club_admin_coach roles)
  const coachMembers = members.filter((m) => 
    m.role === 'coach' || m.role === 'club_admin_coach'
  ).length;
  const coachAccountsUsed = maxCoachAccounts !== null 
    ? `${coachMembers} / ${maxCoachAccounts}` 
    : coachMembers.toString();
  
  // Calculate member slots used (view_only users)
  const viewOnlyMembers = members.filter((m) => m.role === 'view_only').length;
  const memberSlotsUsed = maxViewOnlyUsers !== null 
    ? `${viewOnlyMembers} / ${maxViewOnlyUsers}` 
    : viewOnlyMembers.toString();
  
  // Check if approaching limits (> 80% usage)
  const coachWarning = maxCoachAccounts !== null && coachMembers / maxCoachAccounts > 0.8;
  const viewOnlyWarning = maxViewOnlyUsers !== null && viewOnlyMembers / maxViewOnlyUsers > 0.8;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!club) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Club Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your club information and statistics
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon sx={{ fontSize: 40, color: appColors.primary, mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                  {totalMembers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Members
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <GroupsIcon sx={{ fontSize: 40, color: appColors.primary, mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                  {activeTeams}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Teams
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%', border: coachWarning ? '2px solid #ff9800' : 'none' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonAddIcon sx={{ fontSize: 40, color: coachWarning ? '#ff9800' : appColors.primary, mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                  {coachAccountsUsed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Coach Accounts Used
                </Typography>
                {coachWarning && (
                  <Typography variant="caption" sx={{ color: '#ff9800', mt: 0.5, display: 'block' }}>
                    Approaching limit
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%', border: viewOnlyWarning ? '2px solid #ff9800' : 'none' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonAddIcon sx={{ fontSize: 40, color: viewOnlyWarning ? '#ff9800' : appColors.primary, mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                  {memberSlotsUsed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View Only Slots Used
                </Typography>
                {viewOnlyWarning && (
                  <Typography variant="caption" sx={{ color: '#ff9800', mt: 0.5, display: 'block' }}>
                    Approaching limit
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

