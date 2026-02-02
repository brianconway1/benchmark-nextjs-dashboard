'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getEmailValidationError } from '@/utils/validation';
import { validateUserLimit } from '@/lib/subscriptionValidation';
import { useToast } from '@/contexts/ToastContext';
import { appColors } from '@/theme';

interface GenerateReferralCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  clubId: string;
  clubName: string;
}

export default function GenerateReferralCodeDialog({
  open,
  onClose,
  onComplete,
  clubId,
  clubName,
}: GenerateReferralCodeDialogProps) {
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'coach' | 'club_admin' | 'club_admin_coach' | 'view_only'>('club_admin_coach');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      setIsSubmitting(true);

      // Validate subscription limits before creating referral code
      const validation = await validateUserLimit(clubId, role, 1);
      if (!validation.valid) {
        setError(validation.reason || 'Cannot generate code: subscription limit exceeded');
        setIsSubmitting(false);
        return;
      }

      const code = generateReferralCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Store referral code with code as document ID
      await setDoc(doc(db, 'referral_codes', code), {
        code,
        clubId,
        clubName,
        intendedRole: role,
        adminEmail: email.trim().toLowerCase(),
        isMemberInvitation: true, // Flag to trigger invitation email
        maxUses: 1,
        usesCount: 0,
        active: true,
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        expiresAt,
      });

      showSuccess('Referral code generated successfully!');
      setEmail('');
      setRole('club_admin_coach');
      onComplete();
    } catch (err) {
      console.error('Error generating referral code:', err);
      const error = err as Error;
      showError(error.message || 'Failed to generate referral code. Please try again.');
      setError(error.message || 'Failed to generate referral code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setEmail('');
    setRole('club_admin_coach');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Generate Referral Code
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              disabled={isSubmitting}
              placeholder="admin@club.com"
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as typeof role)}
                disabled={isSubmitting}
              >
                <MenuItem value="club_admin">Club Admin</MenuItem>
                <MenuItem value="club_admin_coach">Admin Coach</MenuItem>
                <MenuItem value="coach">Coach</MenuItem>
                <MenuItem value="view_only">View Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{ color: appColors.textSecondary }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !email.trim()}
            sx={{
              backgroundColor: appColors.primary,
              color: appColors.primaryText,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: appColors.primaryHover },
              '&:disabled': { backgroundColor: '#e0e0e0', color: appColors.disabledText },
            }}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: appColors.primaryText }} />
                Generating...
              </Box>
            ) : (
              'Generate Code'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

