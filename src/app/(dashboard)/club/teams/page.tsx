'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { isSuperAdmin, isClubAdmin } from '@/lib/permissions';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Team, Club } from '@/types';
import TeamList from '@/components/club/TeamList';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import { appColors } from '@/theme';

export default function TeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDeleteTeams, setCanDeleteTeams] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        setError('');

        // Check delete permissions
        if (userData.id) {
          const isAdmin = await isSuperAdmin(userData.id);
          const isClubAdminUser = await isClubAdmin(userData.id, userData.clubId);
          setCanDeleteTeams(isAdmin || isClubAdminUser);
        }

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
        // Filter out soft-deleted teams
        const activeTeams = teamsData.filter((team) => !team.deletedAt);
        setTeams(activeTeams);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userData?.clubId, userData?.id, authLoading]);

  // Check for success message from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      showSuccess(success);
      // Clear URL param
      router.replace('/club/teams', { scroll: false });
    }
  }, [searchParams, router, showSuccess]);


  const handleEdit = (team: Team) => {
    router.push(`/club/teams/${team.id}/edit`);
  };

  const handleDelete = async (team: Team) => {
    // Check permissions before showing dialog
    if (!userData?.id) {
      showError('You must be logged in to delete teams');
      return;
    }

    const isAdmin = await isSuperAdmin(userData.id);
    const isClubAdminUser = await isClubAdmin(userData.id, userData.clubId);

    if (!isAdmin && !isClubAdminUser) {
      showError('You do not have permission to delete teams. Only club admins and super admins can delete teams.');
      return;
    }

    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete || !club || !userData?.id) return;

    try {
      setIsDeleting(true);
      setError('');

      // Double-check permissions
      const isAdmin = await isSuperAdmin(userData.id);
      const isClubAdminUser = await isClubAdmin(userData.id, userData.clubId);

      if (!isAdmin && !isClubAdminUser) {
        showError('You do not have permission to delete teams.');
        setDeleteDialogOpen(false);
        setTeamToDelete(null);
        return;
      }

      // Fetch team to get clubId (for safety)
      const teamDoc = await getDoc(doc(db, 'teams', teamToDelete.id));
      if (!teamDoc.exists()) {
        showError('Team not found');
        setDeleteDialogOpen(false);
        setTeamToDelete(null);
        return;
      }

      const teamData = teamDoc.data();
      
      // Check if already deleted
      if (teamData.deletedAt) {
        showError('Team is already deleted');
        setDeleteDialogOpen(false);
        setTeamToDelete(null);
        return;
      }

      const teamClubId = teamData.clubId;

      // Soft delete: set deletedAt timestamp instead of removing document
      await updateDoc(doc(db, 'teams', teamToDelete.id), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Decrement club teamCount if clubId matches
      if (teamClubId && teamClubId === club.id) {
        await updateDoc(doc(db, 'sports_clubs', club.id), {
          teamCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }

      // Refresh teams list
      const teamsQuery = query(
        collection(db, 'teams'),
        where('clubId', '==', club.id)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Team[];
      const activeTeams = teamsData.filter((team) => !team.deletedAt);
      setTeams(activeTeams);
      
      showSuccess(`Team "${teamToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (err) {
      console.error('Error deleting team:', err);
      showError('Failed to delete team. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setTeamToDelete(null);
  };

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
            Teams
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage club teams
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/club/teams/create')}
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TeamList
        teams={teams}
        onEdit={handleEdit}
        onDelete={canDeleteTeams ? handleDelete : undefined}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Team"
        message={
          <Typography>
            Are you sure you want to delete <strong>&quot;{teamToDelete?.name}&quot;</strong>? 
            This will mark the team as deleted. The team data will be hidden but can be restored if needed.
          </Typography>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="primary"
        isLoading={isDeleting}
      />
    </Container>
  );
}

