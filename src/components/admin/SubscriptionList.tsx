'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  CircularProgress,
  TablePagination,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { formatDate } from '@/utils/dateHelpers';
import { appColors } from '@/theme';

import type { Timestamp } from 'firebase/firestore';

interface Subscription {
  id: string;
  clubId?: string;
  clubName?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionType?: string;
  productName?: string;
  planName?: string;
  // Coach Account fields
  maxCoachAccounts?: number;
  coachAccountPlanName?: string;
  coachAccountPriceId?: string;
  coachAccountProductId?: string;
  coachAccountPrice?: number;
  coachAccountItemId?: string;
  // View Only fields
  maxViewOnlyUsers?: number;
  viewOnlyPlanName?: string;
  viewOnlyPriceId?: string;
  viewOnlyProductId?: string;
  viewOnlyPrice?: number;
  viewOnlyItemId?: string;
  // Status and billing
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

// Helper functions
function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function getStatusColor(status: string | undefined): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'success';
    case 'past_due':
      return 'warning';
    case 'canceled':
    case 'unpaid':
      return 'error';
    default:
      return 'default';
  }
}

function getStatusLabel(status: string | undefined): string {
  const statusMap: Record<string, string> = {
    trialing: 'Trialing',
    active: 'Active',
    canceled: 'Canceled',
    past_due: 'Past Due',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
  };
  return statusMap[status || ''] || status || 'Unknown';
}

// Expandable Row Component
function SubscriptionRow({
  subscription,
  showClubName
}: {
  subscription: Subscription;
  showClubName: boolean;
}) {
  const [open, setOpen] = useState(false);

  const hasCoachAccount = subscription.maxCoachAccounts !== undefined && subscription.maxCoachAccounts !== null;
  const hasViewOnly = subscription.maxViewOnlyUsers !== undefined && subscription.maxViewOnlyUsers !== null;
  const hasBothProducts = hasCoachAccount && hasViewOnly;

  const coachAccountPlanName = subscription.coachAccountPlanName || subscription.planName || 'Coach Account';
  const viewOnlyPlanName = subscription.viewOnlyPlanName || `${subscription.maxViewOnlyUsers} View Only Users`;

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          '&:hover': { bgcolor: 'grey.50' },
          cursor: hasBothProducts ? 'pointer' : 'default',
        }}
        onClick={() => hasBothProducts && setOpen(!open)}
      >
        <TableCell sx={{ width: 50 }}>
          {hasBothProducts && (
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              {open ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </TableCell>
        {showClubName && (
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {subscription.clubName || 'N/A'}
            </Typography>
          </TableCell>
        )}
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {subscription.planName || subscription.productName || 'N/A'}
            </Typography>
            {hasBothProducts && (
              <Typography variant="caption" color="text.secondary">
                Bundle: Coach + View Only
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={getStatusLabel(subscription.status)}
            color={getStatusColor(subscription.status)}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {formatCurrency(subscription.price)}/yr
          </Typography>
        </TableCell>
        <TableCell>
          {hasCoachAccount ? subscription.maxCoachAccounts : 'N/A'}
        </TableCell>
        <TableCell>
          {hasViewOnly ? subscription.maxViewOnlyUsers : 'N/A'}
        </TableCell>
        <TableCell>
          {formatDate(subscription.currentPeriodEnd)}
        </TableCell>
        <TableCell>
          {subscription.cancelAtPeriodEnd ? (
            <Chip label="Yes" color="warning" size="small" />
          ) : (
            <Typography variant="body2" color="text.secondary">No</Typography>
          )}
        </TableCell>
      </TableRow>

      {/* Expandable Detail Row */}
      {hasBothProducts && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={showClubName ? 10 : 9}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 2, px: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                  Subscription Line Items
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {/* Coach Account Item */}
                  <Box
                    sx={{
                      flex: '1 1 300px',
                      bgcolor: 'white',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon fontSize="small" sx={{ color: appColors.primary }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          Coach Account
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: appColors.primary }}>
                        {formatCurrency(subscription.coachAccountPrice)}/yr
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {coachAccountPlanName}
                    </Typography>
                    <Typography variant="body2">
                      Up to <strong>{subscription.maxCoachAccounts}</strong> coach{subscription.maxCoachAccounts !== 1 ? 'es' : ''}
                    </Typography>
                  </Box>

                  {/* View Only Item */}
                  <Box
                    sx={{
                      flex: '1 1 300px',
                      bgcolor: 'white',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VisibilityIcon fontSize="small" sx={{ color: appColors.primary }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          View Only Pack
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: appColors.primary }}>
                        {formatCurrency(subscription.viewOnlyPrice)}/yr
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {viewOnlyPlanName}
                    </Typography>
                    <Typography variant="body2">
                      Up to <strong>{subscription.maxViewOnlyUsers}</strong> user{subscription.maxViewOnlyUsers !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Stripe ID:</strong> {subscription.stripeSubscriptionId}
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function SubscriptionList({
  subscriptions,
  loading = false,
  showClubName = false
}: SubscriptionListProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedSubscriptions = subscriptions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 50 }} /> {/* Expand button column */}
              {showClubName && <TableCell sx={{ fontWeight: 'bold' }}>Club</TableCell>}
              <TableCell sx={{ fontWeight: 'bold' }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Total Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Max Coaches</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Max View Only</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Next Billing</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cancels</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSubscriptions.map((subscription) => (
              <SubscriptionRow
                key={subscription.id}
                subscription={subscription}
                showClubName={showClubName}
              />
            ))}
            {paginatedSubscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={showClubName ? 10 : 9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No subscriptions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={subscriptions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
