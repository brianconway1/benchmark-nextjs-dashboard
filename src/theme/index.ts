// MUI Theme Configuration
import { createTheme, Components, Theme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

// Centralized color palette - update colors here to change them app-wide
export const appColors = {
  // Primary colors
  primary: '#D4E33B', // Yellow/Lime green for CTAs
  primaryHover: '#C4D32B', // Darker yellow on hover
  primaryText: '#000000', // Black text on primary buttons
  
  // Text colors
  textPrimary: '#000000', // Black
  textSecondary: '#666666', // Grey for secondary text and icons
  
  // Background colors
  backgroundDefault: '#FFFFFF', // White
  backgroundPaper: '#FFFFFF', // White
  backgroundGrey: '#f5f5f5', // Light grey for headers
  backgroundHover: '#f9f9f9', // Light grey for hover states
  
  // Status colors
  success: '#2e7d32', // Green for success states
  error: '#c62828', // Red for error states
  warning: '#ed6c02', // Orange for warnings
  info: '#0288d1', // Blue for info
  
  // Disabled states
  disabled: '#bdbdbd', // Light grey for disabled elements
  disabledText: '#999999', // Grey text for disabled elements
} as const;

// Custom theme with centralized colors
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: appColors.primary,
      contrastText: appColors.primaryText,
    },
    secondary: {
      main: appColors.textSecondary,
      contrastText: '#FFFFFF',
    },
    background: {
      default: appColors.backgroundDefault,
      paper: appColors.backgroundPaper,
    },
    text: {
      primary: appColors.textPrimary,
      secondary: appColors.textSecondary,
    },
    action: {
      active: appColors.primary,
      hover: appColors.primaryHover,
    },
    success: {
      main: appColors.success,
    },
    error: {
      main: appColors.error,
    },
    warning: {
      main: appColors.warning,
    },
    info: {
      main: appColors.info,
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      color: appColors.textPrimary,
    },
    h2: {
      fontWeight: 700,
      color: appColors.textPrimary,
    },
    h3: {
      fontWeight: 600,
      color: appColors.textPrimary,
    },
    h4: {
      fontWeight: 600,
      color: appColors.textPrimary,
    },
    h5: {
      fontWeight: 600,
      color: appColors.textPrimary,
    },
    h6: {
      fontWeight: 600,
      color: appColors.textPrimary,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Don't uppercase buttons
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
        },
        containedPrimary: {
          backgroundColor: appColors.primary,
          color: appColors.primaryText,
          '&:hover': {
            backgroundColor: appColors.primaryHover,
          },
        },
        outlinedPrimary: {
          borderColor: appColors.primary,
          color: appColors.primaryText,
          '&:hover': {
            borderColor: appColors.primaryHover,
            backgroundColor: 'rgba(212, 227, 59, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    // DataGrid global styling
    MuiDataGrid: {
      styleOverrides: {
        root: {
          '& .MuiDataGrid-cell': {
            color: appColors.textPrimary,
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: appColors.backgroundGrey,
            color: appColors.textPrimary,
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: appColors.backgroundHover,
          },
          // Action icons styling
          '& .MuiDataGrid-actionsCell': {
            '& .MuiIconButton-root': {
              color: appColors.textSecondary,
              '&:hover': {
                backgroundColor: appColors.backgroundGrey,
              },
            },
          },
          // Menu button (3 dots) styling
          '& .MuiDataGrid-menuIconButton': {
            color: appColors.textSecondary,
            '&:hover': {
              backgroundColor: appColors.backgroundGrey,
            },
          },
        },
      },
    },
  },
});

export default theme;

