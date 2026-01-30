'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Club } from '@/types';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import PageLoader from '@/components/shared/PageLoader';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { appColors } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/utils/dateHelpers';

export default function UserManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<(User & { clubName?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];

      // Fetch club names in parallel for users with clubId
      const clubPromises = new Map<string, Promise<Club | null>>();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as Omit<User, 'id'>;
        const userId = userDoc.id;

        // Prepare club fetch if needed
        if (userData.clubId && !clubPromises.has(userData.clubId)) {
          clubPromises.set(
            userData.clubId,
            getDoc(doc(db, 'sports_clubs', userData.clubId))
              .then((doc) => (doc.exists() ? ({ id: doc.id, ...doc.data() } as Club) : null))
              .catch(() => null)
          );
        }

        usersData.push({
          ...userData,
          id: userId,
        });
      }

      // Wait for all club fetches
      const clubResults = await Promise.all(Array.from(clubPromises.values()));
      const clubMap = new Map<string, string>();
      clubResults.forEach((club) => {
        if (club) clubMap.set(club.id, club.name);
      });

      // Add club names to users
      const usersWithClubs = usersData.map((user) => ({
        ...user,
        clubName: user.clubId ? clubMap.get(user.clubId) || 'Unknown' : null,
      }));

      setUsers(usersWithClubs);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!user || authLoading) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid);
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        await loadUsers();
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load users');
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [user, authLoading, loadUsers]);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'users', userToDelete.id));
      showToast('User deleted successfully', 'success');
      await loadUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('Failed to delete user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'displayName',
        headerName: 'Name',
        flex: 1,
        minWidth: 150,
        valueGetter: (value, row: User) => {
          if (row.displayName) return row.displayName;
          const firstName = row.firstName || '';
          const lastName = row.lastName || '';
          return `${firstName} ${lastName}`.trim() || row.email || 'Unknown';
        },
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 150,
        valueGetter: (value: unknown) => {
          const roleMap: Record<string, string> = {
            coach: 'Coach',
            club_admin: 'Club Admin',
            club_admin_coach: 'Admin Coach',
            view_only: 'View Only',
            super_admin: 'Super Admin',
          };
          return roleMap[value as string] || value;
        },
      },
      {
        field: 'clubName',
        headerName: 'Club',
        width: 200,
        valueGetter: (value, row: User & { clubName?: string | null }) => row.clubName || 'None',
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 150,
        valueGetter: (value: unknown) => formatDate(value),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 120,
        getActions: (params) => {
          const user = params.row as User;
          return [
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => handleDeleteClick(user)}
            />,
          ];
        },
      },
    ],
    []
  );

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Access denied. You must be a super admin to view this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          User Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all system users
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={
          <Typography>
            Delete user <strong>{userToDelete?.email}</strong>? This cannot be undone.
          </Typography>
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </Container>
  );
}
