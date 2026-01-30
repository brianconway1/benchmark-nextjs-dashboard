'use client';

import { useMemo } from 'react';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Team } from '@/types';
import { appColors } from '@/theme';
import { formatDate } from '@/utils/dateHelpers';

interface TeamListProps {
  teams: Team[];
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
  loading?: boolean;
}

export default function TeamList({ teams, onEdit, onDelete, loading = false }: TeamListProps) {
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Team Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'ageGroup',
        headerName: 'Age Group',
        width: 120,
      },
      {
        field: 'sport',
        headerName: 'Sport',
        flex: 1,
        minWidth: 150,
        valueGetter: (value, row: Team) => {
          if (row.sports && Array.isArray(row.sports)) {
            return row.sports.join(', ');
          }
          return row.sport || 'N/A';
        },
      },
      {
        field: 'memberCount',
        headerName: 'Members',
        width: 100,
        valueGetter: (value, row: Team) => {
          if (row.members && Array.isArray(row.members)) {
            return row.members.length;
          }
          return 0;
        },
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
        width: 150,
        getActions: (params) => {
          const team = params.row as Team;
          const actions = [];

          if (onEdit) {
            actions.push(
              <GridActionsCellItem
                key="edit"
                icon={<EditIcon sx={{ color: appColors.textSecondary }} />}
                label="Edit"
                onClick={() => onEdit(team)}
              />
            );
          }

          if (onDelete) {
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={<DeleteIcon sx={{ color: appColors.textSecondary }} />}
                label="Delete"
                onClick={() => onDelete(team)}
                showInMenu
              />
            );
          }

          return actions;
        },
      },
    ],
    [onEdit, onDelete]
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

