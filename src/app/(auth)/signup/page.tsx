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
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import { signupAdmin } from '@/lib/auth';
import {
  signInWithGoogle,
  signInWithApple,
  completePendingOAuthSignup,
  hasPendingOAuthSignup,
  getPendingOAuthEmail,
  clearPendingOAuth,
} from '@/lib/oauthSignIn';
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
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOAuthFlow, setIsOAuthFlow] = useState(false);

  // Initialize state from URL params after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Decode email and names (they're URL-encoded) and convert code to uppercase
    const firstNameParam = searchParams.get('firstName');
    const lastNameParam = searchParams.get('lastName');
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    const oauthParam = searchParams.get('oauth');
    
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
    
    // Check if this is an OAuth flow (user came from login page after OAuth)
    if (oauthParam === 'true') {
      setIsOAuthFlow(true);
      // If there's a pending OAuth, get the email from it
      if (hasPendingOAuthSignup()) {
        const pendingEmail = getPendingOAuthEmail();
        if (pendingEmail) {
          setEmail(pendingEmail);
        }
      }
    }
  }, [searchParams]);

  // Cleanup pending OAuth on unmount if not completing signup
  useEffect(() => {
    return () => {
      // Only clear if we're navigating away without completing
      // The OAuth completion will clear it on success
    };
  }, []);

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

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);

    try {
      const signInFn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const result = await signInFn(referralCode || null);

      if (result.needsReferralCode) {
        // Stay on this page but mark as OAuth flow
        setIsOAuthFlow(true);
        if (result.email) {
          setEmail(result.email);
        }
        setOauthLoading(null);
        setError('Please enter a referral code to complete your registration.');
        return;
      }

      // Success - redirect to onboarding
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
      setOauthLoading(null);
    }
  };

  const handleOAuthSignupWithCode = async () => {
    setError('');

    if (!referralCode) {
      setError('Referral code is required');
      return;
    }

    setLoading(true);

    try {
      await completePendingOAuthSignup(referralCode);
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

          {isOAuthFlow && hasPendingOAuthSignup() ? (
            // OAuth flow - user needs to provide referral code only
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Almost there! Enter your referral code to complete registration.
              </Alert>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                margin="normal"
                disabled
              />
              <TextField
                fullWidth
                label="Referral Code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                margin="normal"
                required
                autoFocus
              />
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                onClick={handleOAuthSignupWithCode}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Creating Account...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  clearPendingOAuth();
                  setIsOAuthFlow(false);
                  router.push('/login');
                }}
              >
                Cancel and return to login
              </Button>
            </Box>
          ) : (
            // Standard signup flow
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
                disabled={loading || oauthLoading !== null}
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

              <Divider sx={{ my: 2 }}>or sign up with</Divider>

              <Button
                fullWidth
                variant="outlined"
                startIcon={oauthLoading === 'google' ? <CircularProgress size={20} /> : <GoogleIcon />}
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading || oauthLoading !== null}
                sx={{ mb: 1 }}
              >
                {oauthLoading === 'google' ? 'Signing up...' : 'Google'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={oauthLoading === 'apple' ? <CircularProgress size={20} /> : <AppleIcon />}
                onClick={() => handleOAuthSignIn('apple')}
                disabled={loading || oauthLoading !== null}
                sx={{ 
                  mb: 2,
                  bgcolor: 'black',
                  color: 'white',
                  borderColor: 'black',
                  '&:hover': {
                    bgcolor: '#333',
                    borderColor: '#333',
                  },
                  '&:disabled': {
                    bgcolor: 'grey.300',
                    borderColor: 'grey.300',
                  },
                }}
              >
                {oauthLoading === 'apple' ? 'Signing up...' : 'Apple'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => router.push('/login')}
              >
                Already have an account? Log in
              </Button>
            </Box>
          )}
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

