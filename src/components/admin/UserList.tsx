'use client';

import { useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import type { User } from '@/types';
import { formatDate } from '@/utils/dateHelpers';

interface UserListProps {
  users: User[];
  loading?: boolean;
}

export default function UserList({ users, loading = false }: UserListProps) {
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'displayName',
        headerName: 'Name',
        flex: 1,
        minWidth: 200,
        valueGetter: (value, row: User) => {
          if (row.displayName) return row.displayName;
          const firstName = row.firstName || '';
          const lastName = row.lastName || '';
          return `${firstName} ${lastName}`.trim() || 'Unknown';
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
        field: 'clubId',
        headerName: 'Club ID',
        width: 150,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'teamId',
        headerName: 'Team ID',
        width: 150,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 150,
        valueGetter: (value: unknown) => formatDate(value),
      },
    ],
    []
  );

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={users}
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
    </div>
  );
}

