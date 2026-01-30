'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club } from '@/types';
import ClubList from '@/components/admin/ClubList';
import { appColors } from '@/theme';

export default function AdminClubsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

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

        await loadClubs();
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load clubs');
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [user, authLoading]);

  const loadClubs = async () => {
    try {
      setLoading(true);
      setError('');

      const clubsSnapshot = await getDocs(collection(db, 'sports_clubs'));
      const clubsData = clubsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Club[];

      setClubs(clubsData);
    } catch (err) {
      console.error('Error loading clubs:', err);
      setError('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
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

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. You must be a super admin to view this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          All Clubs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage all clubs in the system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <ClubList clubs={clubs} loading={loading} />
    </Container>
  );
}

