'use client';

import { useMemo } from 'react';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { User } from '@/types';
import { appColors } from '@/theme';
import { formatDate } from '@/utils/dateHelpers';

interface MemberListProps {
  members: User[];
  onEdit?: (member: User) => void;
  onRemove?: (member: User) => void;
  loading?: boolean;
}

export default function MemberList({ members, onEdit, onRemove, loading = false }: MemberListProps) {
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
          const member = params.row as User;
          const actions = [];

          if (onEdit) {
            actions.push(
              <GridActionsCellItem
                key="edit"
                icon={<EditIcon sx={{ color: appColors.textSecondary }} />}
                label="Edit"
                onClick={() => onEdit(member)}
              />
            );
          }

          if (onRemove) {
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={<DeleteIcon sx={{ color: appColors.textSecondary }} />}
                label="Remove"
                onClick={() => onRemove(member)}
                showInMenu
              />
            );
          }

          return actions;
        },
      },
    ],
    [onEdit, onRemove]
  );

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={members}
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

