'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { ContentCopy as CopyIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useToast } from '@/contexts/ToastContext';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ReferralCode } from '@/types';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import GenerateReferralCodeDialog from '@/components/club/GenerateReferralCodeDialog';
import { appColors } from '@/theme';
import { formatDate, toDate } from '@/utils/dateHelpers';

interface ReferralCodesTableProps {
  clubId: string;
  clubName: string;
  /** Whether to show the header with title and generate button. Default true. */
  showHeader?: boolean;
  /** Custom height for the DataGrid. Default 600. */
  height?: number;
}

export default function ReferralCodesTable({
  clubId,
  clubName,
  showHeader = true,
  height = 600,
}: ReferralCodesTableProps) {
  const { showSuccess, showError } = useToast();
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<ReferralCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReferralCodes = useCallback(async () => {
    if (!clubId) return;

    try {
      setLoading(true);
      setError('');

      // Load referral codes
      const codesQuery = query(
        collection(db, 'referral_codes'),
        where('clubId', '==', clubId)
      );
      const codesSnapshot = await getDocs(codesQuery);
      const codesData = codesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ReferralCode[];

      setReferralCodes(codesData);
    } catch (err) {
      console.error('Error loading referral codes:', err);
      setError('Failed to load referral codes');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    loadReferralCodes();
  }, [clubId, loadReferralCodes]);

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showSuccess('Referral code copied to clipboard!');
    } catch {
      showError('Failed to copy code to clipboard');
    }
  }, [showSuccess, showError]);

  const handleDeleteClick = (code: ReferralCode) => {
    setCodeToDelete(code);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!codeToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'referral_codes', codeToDelete.id));
      showSuccess('Referral code deleted successfully');
      setDeleteDialogOpen(false);
      setCodeToDelete(null);
      await loadReferralCodes();
    } catch (err) {
      console.error('Error deleting referral code:', err);
      showError('Failed to delete referral code');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setCodeToDelete(null);
  };

  const handleGenerateComplete = () => {
    setGenerateDialogOpen(false);
    loadReferralCodes();
  };

  // Format date helper (using utility function)
  const formatDateHelper = (timestamp: unknown) => formatDate(timestamp);

  // Get role display name
  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'N/A';
    const roleMap: Record<string, string> = {
      club_admin_coach: 'Admin Coach',
      club_admin: 'Club Admin',
      coach: 'Coach',
      view_only: 'View Only',
    };
    return roleMap[role] || role;
  };

  // Check if code is expired
  const isExpired = (expiresAt: unknown) => {
    if (!expiresAt) return false;
    const expiry = toDate(expiresAt);
    if (!expiry) return false;
    return expiry < new Date();
  };

  // Check if code is used
  const isCodeUsed = (code: ReferralCode) => {
    return code.usesCount >= (code.maxUses || 0);
  };

  // DataGrid columns
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'code',
        headerName: 'Code',
        width: 150,
        renderCell: (params) => {
          const code = params.value as string;
          const row = params.row as ReferralCode;
          const isUsed = isCodeUsed(row);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ fontFamily: 'monospace' }}>
                {code}
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUsed) {
                    handleCopyCode(code);
                  }
                }}
                disabled={isUsed}
                sx={{
                  color: appColors.textSecondary,
                  '&:hover': {
                    backgroundColor: appColors.backgroundGrey,
                  },
                  '&.Mui-disabled': {
                    color: appColors.disabled,
                  },
                }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
      {
        field: 'adminEmail',
        headerName: 'Email',
        flex: 1,
        minWidth: 250,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'intendedRole',
        headerName: 'Role',
        width: 150,
        valueGetter: (value: unknown) => getRoleDisplayName(value as string),
      },
      {
        field: 'usesCount',
        headerName: 'Uses',
        width: 100,
        valueGetter: (value: unknown, row: ReferralCode) => {
          const usesCount = (value as number) || 0;
          const maxUses = row.maxUses || 0;
          return `${usesCount} / ${maxUses}`;
        },
      },
      {
        field: 'active',
        headerName: 'Status',
        width: 120,
        valueGetter: (value: unknown, row: ReferralCode) => {
          if (isExpired(row.expiresAt)) return 'Expired';
          if (row.usesCount >= (row.maxUses || 0)) return 'Used';
          return value ? 'Active' : 'Inactive';
        },
        renderCell: (params) => {
          const status = params.value;
          let chipColor: 'success' | 'default' | 'error' = 'default';
          if (status === 'Active') {
            chipColor = 'success';
          } else if (status === 'Used') {
            chipColor = 'default';
          } else {
            chipColor = 'error';
          }
          return (
            <Chip
              label={status}
              color={chipColor}
              size="small"
              sx={{ fontWeight: 'medium' }}
            />
          );
        },
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 150,
        valueGetter: (value: unknown) => formatDateHelper(value),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 150,
        getActions: (params) => {
          const code = params.row as ReferralCode;
          const isUsed = isCodeUsed(code);
          return [
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon sx={{ color: appColors.textSecondary }} />}
              label="Delete"
              onClick={() => handleDeleteClick(code)}
              disabled={isUsed}
              showInMenu
            />,
          ];
        },
      },
    ],
    [handleCopyCode]
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {showHeader && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
              Referral Codes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage referral codes for inviting members to this club
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setGenerateDialogOpen(true)}
            sx={{
              backgroundColor: appColors.primary,
              color: appColors.primaryText,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: appColors.primaryHover },
            }}
          >
            Generate Referral Code
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ height, width: '100%' }}>
        <DataGrid
          rows={referralCodes}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          getRowClassName={(params) => {
            const code = params.row as ReferralCode;
            return isCodeUsed(code) ? 'MuiDataGrid-row-disabled' : '';
          }}
          sx={{
            // Disabled row styling (component-specific)
            '& .MuiDataGrid-row-disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
              '&:hover': {
                backgroundColor: 'transparent',
              },
              '& .MuiDataGrid-cell': {
                color: appColors.disabledText,
              },
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>

      {/* Generate Referral Code Dialog */}
      <GenerateReferralCodeDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        onComplete={handleGenerateComplete}
        clubId={clubId}
        clubName={clubName}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Referral Code"
        message={
          <Typography>
            Are you sure you want to delete referral code <strong>&quot;{codeToDelete?.code}&quot;</strong>? 
            This action cannot be undone.
          </Typography>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="primary"
        isLoading={isDeleting}
      />
    </Box>
  );
}

