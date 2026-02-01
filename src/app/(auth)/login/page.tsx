'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginWithPassword } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/errorMessages';
import { getEmailValidationError } from '@/utils/validation';

export default function LoginPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const handleRedirect = async () => {
      if (!user || !userData || redirecting) return;

      // Super admins go to admin dashboard
      if (userData.role === 'super_admin') {
        router.push('/admin');
        return;
      }

      // For club admins, check if they have existing teams
      if (userData.clubId) {
        setRedirecting(true);
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
        } catch (err) {
          console.error('Error checking teams:', err);
          router.push('/onboarding'); // Fallback to onboarding on error
        }
      } else {
        router.push('/onboarding');
      }
    };

    handleRedirect();
  }, [user, userData, router, redirecting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);

    try {
      await loginWithPassword(email, password);
      // Redirect will happen via useEffect when user state updates
      // The useEffect will check the role and redirect appropriately
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to access your admin console
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => router.push('/signup')}
            >
              Don&apos;t have an account? Sign up
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

