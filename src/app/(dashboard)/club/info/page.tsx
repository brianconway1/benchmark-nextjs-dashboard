'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club } from '@/types';
import { appColors } from '@/theme';
import { formatDate } from '@/utils/dateHelpers';

export default function ClubInfoPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // DataGrid columns
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Club Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'sport',
        headerName: 'Sport Type',
        flex: 1,
        minWidth: 150,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
        width: 150,
        valueGetter: (value: unknown) => formatDate(value),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        width: 150,
        valueGetter: (value: unknown) => formatDate(value),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'id',
        headerName: 'Club ID',
        width: 200,
        valueGetter: (_value: unknown, row: { id?: string }) => row.id || 'N/A',
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 100,
        getActions: () => [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon sx={{ color: appColors.textSecondary }} />}
            label="Edit"
            onClick={() => router.push('/club/info')}
          />,
        ],
      },
    ],
    [router]
  );

  useEffect(() => {
    const loadClubInfo = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        setError('');

        // Load club
        const clubDoc = await getDoc(doc(db, 'sports_clubs', userData.clubId));
        if (!clubDoc.exists()) {
          setError('Club not found');
          return;
        }
        const clubData = { id: clubDoc.id, ...clubDoc.data() } as Club;
        setClub(clubData);
      } catch (err) {
        console.error('Error loading club info:', err);
        setError('Failed to load club information');
      } finally {
        setLoading(false);
      }
    };

    loadClubInfo();
  }, [userData?.clubId, authLoading]);

  // Prepare data for DataGrid (single row for the club)
  const clubRows = useMemo(
    () => {
      if (!club) return [];
      return [
        {
          id: club.id,
          name: club.name,
          sport: club.sport,
          createdAt: club.createdAt,
          updatedAt: club.updatedAt,
          status: club.status || 'active',
        },
      ];
    },
    [club]
  );

  if (authLoading || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!club) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Club not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Club Information
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your club details
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Club Information Table */}
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={clubRows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          sx={{
            // DataGrid styling is now handled globally in theme
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>
    </Container>
  );
}

