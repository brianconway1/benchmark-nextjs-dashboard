'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { signupAdmin } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/errorMessages';
import { getEmailValidationError } from '@/utils/validation';

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  
  // Initialize state with empty values to avoid hydration mismatch
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize state from URL params after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Decode email and names (they're URL-encoded) and convert code to uppercase
    const firstNameParam = searchParams.get('firstName');
    const lastNameParam = searchParams.get('lastName');
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    
    if (firstNameParam) {
      setFirstName(decodeURIComponent(firstNameParam));
    }
    if (lastNameParam) {
      setLastName(decodeURIComponent(lastNameParam));
    }
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (codeParam) {
      setReferralCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && userData) {
      // Super admins go to admin dashboard, others go to onboarding
      if (userData.role === 'super_admin') {
        router.push('/admin');
      } else {
        router.push('/onboarding');
      }
    }
  }, [user, userData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName || !lastName || !email || !referralCode || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await signupAdmin(email, password, referralCode, firstName, lastName);
      // Signup successful - redirect directly instead of waiting for useEffect
      // This avoids race condition where onAuthStateChanged fires before Firestore doc is ready
      router.push('/onboarding');
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
            Create Admin Account
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Set up your admin account to manage your club
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="First Name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Last Name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={mounted && !!searchParams.get('email')}
            />
            <TextField
              fullWidth
              label="Referral Code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              margin="normal"
              required
              disabled={mounted && !!searchParams.get('code')}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              helperText="Minimum 6 characters"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => router.push('/login')}
            >
              Already have an account? Log in
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}

