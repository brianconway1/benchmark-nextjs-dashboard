'use client';

import { Box, CircularProgress } from '@mui/material';
import { appColors } from '@/theme';

export default function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress sx={{ color: appColors.primary }} />
    </Box>
  );
}

