'use client';

import { CircularProgress, Box } from '@mui/material';
import { appColors } from '@/theme';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullHeight?: boolean;
}

export default function LoadingSpinner({ 
  size = 40, 
  color = appColors.primary,
  fullHeight = false 
}: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...(fullHeight && { minHeight: '200px' }),
      }}
    >
      <CircularProgress size={size} sx={{ color }} />
    </Box>
  );
}

