'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club } from '@/types';
import ReferralCodesTable from '@/components/shared/ReferralCodesTable';
import { appColors } from '@/theme';

export default function ReferralCodesPage() {
  const { userData, loading: authLoading } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClub = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        const clubDoc = await getDoc(doc(db, 'sports_clubs', userData.clubId));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }
      } catch (err) {
        console.error('Error loading club:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [userData?.clubId, authLoading]);

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

  if (!userData?.clubId || !club) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Club not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Referral Codes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage referral codes for inviting members to your club
        </Typography>
      </Box>

      <ReferralCodesTable
        clubId={userData.clubId}
        clubName={club.name || 'Club'}
        showHeader={true}
        height={600}
      />
    </Container>
  );
}

