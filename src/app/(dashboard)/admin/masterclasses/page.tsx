'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Alert } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import PageLoader from '@/components/shared/PageLoader';
import MasterclassesPage from '../../../../../admin-tool/pages/MasterclassesPage';

export default function AdminMasterclassesPage() {
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
        setAccessDenied(true);
      } finally {
        setCheckingAccess(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }
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

  return (
    <MasterclassesPage onNavigateBack={() => router.push('/admin')} />
  );
}
