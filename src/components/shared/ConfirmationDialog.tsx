'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { appColors } from '@/theme';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'primary' | 'error' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  disabled?: boolean;
}

export default function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor = 'primary',
  isLoading = false,
  disabled = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleClose = () => {
    if (isLoading || disabled) return;
    onClose();
  };

  // Always use yellow primary color for confirm button (app's primary color)
  const getButtonStyles = () => {
    return {
      backgroundColor: appColors.primary,
      color: appColors.primaryText,
      fontWeight: 'bold',
      '&:hover': { backgroundColor: appColors.primaryHover },
      '&:disabled': { backgroundColor: '#e0e0e0', color: appColors.disabledText },
    };
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {typeof message === 'string' ? (
          <Typography variant="body1">{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isLoading || disabled} sx={{ color: appColors.textSecondary }}>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isLoading || disabled}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
          sx={getButtonStyles()}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

