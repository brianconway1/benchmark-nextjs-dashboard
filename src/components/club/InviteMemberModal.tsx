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
  Typography,
} from '@mui/material';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getEmailValidationError } from '@/utils/validation';
import { appColors } from '@/theme';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInviteSent: () => void;
  clubId: string;
  clubName: string;
}

export default function InviteMemberModal({
  open,
  onClose,
  onInviteSent,
  clubId,
  clubName,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'coach' | 'club_admin' | 'club_admin_coach' | 'view_only'>('view_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    setSuccess(false);

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

      const referralCode = generateReferralCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create referral code with isMemberInvitation flag
      // This will trigger the email Cloud Function
      await setDoc(doc(db, 'referral_codes', referralCode), {
        code: referralCode,
        clubId,
        clubName,
        intendedRole: role,
        adminEmail: email.trim().toLowerCase(),
        isMemberInvitation: true, // Flag to trigger email
        maxUses: 1,
        usesCount: 0,
        active: true,
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        expiresAt,
      });

      setSuccess(true);
      setEmail('');
      setRole('view_only');

      // Close modal after 2 seconds
      setTimeout(() => {
        onInviteSent();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error creating referral code:', err);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setEmail('');
    setRole('view_only');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Invite Member
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Invitation sent successfully! An email with a referral code has been sent to {email}.
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
              disabled={isSubmitting || success}
              placeholder="member@example.com"
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as typeof role)}
                disabled={isSubmitting || success}
              >
                <MenuItem value="club_admin">Club Admin</MenuItem>
                <MenuItem value="club_admin_coach">Admin Coach</MenuItem>
                <MenuItem value="coach">Coach</MenuItem>
                <MenuItem value="view_only">View Only</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ bgcolor: appColors.backgroundGrey, p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>How it works:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • A unique referral code will be generated
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • An invitation email will be sent automatically
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • The code expires in 7 days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • They can use the code to sign up in the mobile app
              </Typography>
            </Box>
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
            disabled={isSubmitting || success || !email.trim()}
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
                Sending...
              </Box>
            ) : success ? (
              'Sent!'
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}



