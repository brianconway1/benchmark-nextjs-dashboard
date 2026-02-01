'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const determineRedirect = async () => {
      if (loading || checking) return;
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (!userData) return;

      // Super admins go to admin dashboard
      if (userData.role === 'super_admin') {
        router.push('/admin');
        return;
      }

      // For club admins, check if they have existing teams
      if (userData.clubId) {
        setChecking(true);
        try {
          const teamsQuery = query(
            collection(db, 'teams'),
            where('clubId', '==', userData.clubId)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          const hasTeams = !teamsSnapshot.empty;

          if (hasTeams) {
            router.push('/club'); // Go to dashboard
          } else {
            router.push('/onboarding'); // New user needs setup
          }
        } catch (error) {
          console.error('Error checking teams:', error);
          router.push('/onboarding'); // Fallback to onboarding on error
        } finally {
          setChecking(false);
        }
      } else {
        router.push('/onboarding');
      }
    };

    determineRedirect();
  }, [user, userData, loading, checking, router]);

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
