'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && userData) {
        // Super admins go to admin dashboard, others go to onboarding
        if (userData.role === 'super_admin') {
          router.push('/admin');
        } else {
          router.push('/onboarding');
        }
      } else if (!user) {
        router.push('/login');
      }
    }
  }, [user, userData, loading, router]);

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
