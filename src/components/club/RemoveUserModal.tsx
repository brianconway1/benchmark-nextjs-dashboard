'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';
import { appColors } from '@/theme';

interface RemoveUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserRemoved: () => void;
  user: User | null;
  clubId: string;
}

export default function RemoveUserModal({
  open,
  onClose,
  onUserRemoved,
  user,
  clubId,
}: RemoveUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRemove = async () => {
    if (!user) return;

    setError('');

    try {
      setIsSubmitting(true);

      // Remove user from club by clearing clubId
      await updateDoc(doc(db, 'users', user.id), {
        clubId: null,
        teamId: null,
        updatedAt: serverTimestamp(),
      });

      // Also remove from club's memberIds array if it exists
      const clubRef = doc(db, 'sports_clubs', clubId);
      await updateDoc(clubRef, {
        memberIds: (await import('firebase/firestore')).arrayRemove(user.id),
        updatedAt: serverTimestamp(),
      });

      onUserRemoved();
      onClose();
    } catch (err) {
      console.error('Error removing user:', err);
      setError('Failed to remove user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError('');
    onClose();
  };

  if (!user) return null;

  const displayName =
    user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
        Remove Member
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to remove <strong>{displayName}</strong> from this club?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This will remove them from the club and all associated teams. They will no longer have
          access to club resources.
        </Typography>
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
          onClick={handleRemove}
          variant="contained"
          disabled={isSubmitting}
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
              Removing...
            </Box>
          ) : (
            'Remove'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}



