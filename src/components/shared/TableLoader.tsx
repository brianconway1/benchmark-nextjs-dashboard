'use client';

import { Box, CircularProgress, Typography } from '@mui/material';
import { appColors } from '@/theme';

interface TableLoaderProps {
  message?: string;
}

export default function TableLoader({ message = 'Loading data...' }: TableLoaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <CircularProgress sx={{ color: appColors.primary }} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}

