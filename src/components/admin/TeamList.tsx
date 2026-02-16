'use client';

import { useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import type { Team } from '@/types';
import { formatDate } from '@/utils/dateHelpers';
import { AGE_GROUP_LABELS } from '@/constants/teams';

interface TeamListProps {
  teams: Team[];
  loading?: boolean;
}

export default function TeamList({ teams, loading = false }: TeamListProps) {
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Team Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'clubId',
        headerName: 'Club ID',
        width: 150,
      },
      {
        field: 'sport',
        headerName: 'Sport',
        width: 150,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
      {
        field: 'ageGroup',
        headerName: 'Age Group',
        width: 120,
        valueGetter: (value: unknown) => {
          const ageGroup = value as string;
          return AGE_GROUP_LABELS[ageGroup] || ageGroup || 'N/A';
        },
      },
      {
        field: 'members',
        headerName: 'Members',
        width: 120,
        valueGetter: (value: unknown) => {
          if (!value || !Array.isArray(value)) return '0';
          return value.length.toString();
        },
      },
      {
        field: 'coaches',
        headerName: 'Coaches',
        width: 120,
        valueGetter: (value: unknown) => {
          if (!value || !Array.isArray(value)) return '0';
          return value.length.toString();
        },
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
        rows={teams}
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

