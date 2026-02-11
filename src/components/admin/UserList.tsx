'use client';

import { useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import type { User } from '@/types';
import { formatDate } from '@/utils/dateHelpers';
import { getRoleLabel } from '@/config/roles';

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
        valueGetter: (value: unknown) => getRoleLabel(value as string),
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

