'use client';

import { useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { formatDate } from '@/utils/dateHelpers';

import type { Timestamp } from 'firebase/firestore';

interface Subscription {
  id: string;
  clubId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionType?: string;
  productName?: string;
  planName?: string;
  maxCoachAccounts?: number;
  maxViewOnlyUsers?: number;
  status?: string;
  planType?: string;
  price?: number;
  trialEnabled?: boolean;
  trialStartDate?: Timestamp | Date | string | number | null;
  trialEndDate?: Timestamp | Date | string | number | null;
  currentPeriodStart?: Timestamp | Date | string | number | null;
  currentPeriodEnd?: Timestamp | Date | string | number | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Timestamp | Date | string | number | null;
  createdAt?: Timestamp | Date | string | number | null;
  updatedAt?: Timestamp | Date | string | number | null;
}

interface SubscriptionListProps {
  subscriptions: Subscription[];
  loading?: boolean;
  showClubName?: boolean;
}

export default function SubscriptionList({ 
  subscriptions, 
  loading = false,
  showClubName = false 
}: SubscriptionListProps) {
  const columns: GridColDef[] = useMemo(() => {
    const baseColumns: GridColDef[] = [
      {
        field: 'planName',
        headerName: 'Plan',
        flex: 1,
        minWidth: 150,
        valueGetter: (value, row: Subscription) => {
          return value || row.productName || 'N/A';
        },
      },
      {
        field: 'subscriptionType',
        headerName: 'Type',
        width: 130,
        valueGetter: (value: unknown) => {
          if (!value) return 'N/A';
          const typeMap: Record<string, string> = {
            coach_account: 'Coach Account',
            view_only: 'View Only',
            unknown: 'Unknown',
          };
          return typeMap[value as string] || value;
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        valueGetter: (value: unknown) => {
          if (!value) return 'N/A';
          const statusMap: Record<string, string> = {
            trialing: 'Trialing',
            active: 'Active',
            canceled: 'Canceled',
            past_due: 'Past Due',
            unpaid: 'Unpaid',
            incomplete: 'Incomplete',
            incomplete_expired: 'Expired',
          };
          return statusMap[value as string] || value;
        },
      },
      {
        field: 'price',
        headerName: 'Price',
        width: 120,
        valueGetter: (value: unknown) => {
          if (!value && value !== 0) return 'N/A';
          return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
          }).format(value as number);
        },
      },
      {
        field: 'planType',
        headerName: 'Billing',
        width: 100,
        valueGetter: (value: unknown) => {
          if (!value) return 'N/A';
          return (value as string).charAt(0).toUpperCase() + (value as string).slice(1);
        },
      },
      {
        field: 'maxCoachAccounts',
        headerName: 'Max Coaches',
        width: 130,
        valueGetter: (value: unknown) => {
          if (!value && value !== 0) return 'N/A';
          return (value as number).toString();
        },
      },
      {
        field: 'maxViewOnlyUsers',
        headerName: 'Max View Only',
        width: 130,
        valueGetter: (value: unknown) => {
          if (!value && value !== 0) return 'N/A';
          return (value as number).toString();
        },
      },
      {
        field: 'trialEndDate',
        headerName: 'Trial Ends',
        width: 150,
        valueGetter: (value: unknown) => formatDate(value),
      },
      {
        field: 'currentPeriodEnd',
        headerName: 'Next Billing',
        width: 150,
        valueGetter: (value: unknown) => formatDate(value),
      },
      {
        field: 'cancelAtPeriodEnd',
        headerName: 'Cancels',
        width: 100,
        valueGetter: (value: unknown) => {
          return value ? 'Yes' : 'No';
        },
      },
      {
        field: 'stripeSubscriptionId',
        headerName: 'Stripe ID',
        width: 200,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      },
    ];

    // Add club name column if showClubName is true
    if (showClubName) {
      baseColumns.unshift({
        field: 'clubName',
        headerName: 'Club',
        flex: 1,
        minWidth: 200,
        valueGetter: (value: unknown) => (value as string) || 'N/A',
      });
    }

    return baseColumns;
  }, [showClubName]);

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={subscriptions}
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

