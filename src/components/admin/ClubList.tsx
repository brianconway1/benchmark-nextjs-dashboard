'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Visibility as ViewIcon } from '@mui/icons-material';
import type { Club } from '@/types';
import { formatDate } from '@/utils/dateHelpers';

interface ClubListProps {
  clubs: Club[];
  loading?: boolean;
}

export default function ClubList({ clubs, loading = false }: ClubListProps) {
  const router = useRouter();

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
        headerName: 'Sport',
        width: 150,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'clubAdminIds',
        headerName: 'Admins',
        width: 120,
        valueGetter: (value: unknown) => {
          if (!value || !Array.isArray(value)) return '0';
          return value.length.toString();
        },
      },
      {
        field: 'memberIds',
        headerName: 'Members',
        width: 120,
        valueGetter: (value: unknown) => {
          if (!value || !Array.isArray(value)) return '0';
          return value.length.toString();
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        valueGetter: (value: unknown) => (value as string) || 'Active',
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
        width: 100,
        getActions: (params) => {
          const club = params.row as Club;
          return [
            <GridActionsCellItem
              key="view"
              icon={<ViewIcon />}
              label="View Details"
              onClick={() => router.push(`/admin/clubs/${club.id}`)}
            />,
          ];
        },
      },
    ],
    [router]
  );

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={clubs}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        disableRowSelectionOnClick
        onRowClick={(params) => {
          router.push(`/admin/clubs/${params.row.id}`);
        }}
        sx={{
          '& .MuiDataGrid-cell': {
            cursor: 'pointer',
            // Color is handled globally in theme
          },
          // Other DataGrid styling is now handled globally in theme
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}

