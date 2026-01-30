'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import PageLoader from '@/components/shared/PageLoader';
import { Analytics as AnalyticsIcon } from '@mui/icons-material';
import { appColors } from '@/theme';

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

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
        setLoading(false);
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
        <Alert severity="error">Access denied. You must be a super admin to view this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View system analytics and insights
        </Typography>
      </Box>

      <Paper sx={{ p: 8, textAlign: 'center' }}>
        <AnalyticsIcon sx={{ fontSize: 80, color: appColors.textSecondary, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 1 }}>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This feature is coming soon!
        </Typography>
      </Paper>
    </Container>
  );
}

