'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import PageLoader from '@/components/shared/PageLoader';
import CreateClubForm from '@/components/admin/CreateClubForm';
import { appColors } from '@/theme';

export default function CreateClubPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || authLoading) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid);
        if (!hasAccess) {
          setAccessDenied(true);
        }
      } catch (err) {
        console.error('Error checking access:', err);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, authLoading]);

  if (authLoading || checkingAccess) {
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

  const handleClubCreated = () => {
    router.push('/admin/clubs');
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Create New Club
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add a new sports club to the system
        </Typography>
      </Box>

      <CreateClubForm onClubCreated={handleClubCreated} onCancel={handleCancel} />
    </Container>
  );
}

