'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreTimestamp } from '@/types';
import { appColors } from '@/theme';

interface Subscription {
  id: string;
  clubId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionType?: string;
  productName?: string;
  planName?: string;
  // Coach Account fields (from coach_account line item)
  maxCoachAccounts?: number;
  coachAccountPlanName?: string;
  coachAccountPriceId?: string;
  coachAccountProductId?: string;
  coachAccountPrice?: number;
  coachAccountItemId?: string;
  // View Only fields (from view_only line item)
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
  trialStartDate?: FirestoreTimestamp;
  trialEndDate?: FirestoreTimestamp;
  currentPeriodStart?: FirestoreTimestamp;
  currentPeriodEnd?: FirestoreTimestamp;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: FirestoreTimestamp;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export default function ClubSubscriptionsPage() {
  const { userData, loading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        setError('');

        const subscriptionsQuery = query(
          collection(db, 'subscriptions'),
          where('clubId', '==', userData.clubId)
        );
        const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
        const subscriptionsData = subscriptionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Subscription[];

        setSubscriptions(subscriptionsData);
      } catch (err) {
        console.error('Error loading subscriptions:', err);
        setError('Failed to load subscriptions');
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptions();
  }, [userData?.clubId, authLoading]);

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Subscriptions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your club&apos;s subscription details
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {subscriptions.length === 0 && !loading ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center">
            No subscriptions found for your club.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {subscriptions.map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))}
        </Box>
      )}
    </Container>
  );
}

// Helper functions
function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function formatDate(timestamp: FirestoreTimestamp): string {
  if (!timestamp) return 'N/A';
  const date = typeof timestamp === 'object' && 'toDate' in timestamp
    ? (timestamp as { toDate: () => Date }).toDate()
    : new Date(timestamp as string | number);
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
    trialing: 'Trial Active',
    active: 'Active',
    canceled: 'Canceled',
    past_due: 'Past Due',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
  };
  return statusMap[status || ''] || status || 'Unknown';
}

// Subscription Card Component
function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const hasCoachAccount = subscription.maxCoachAccounts !== undefined && subscription.maxCoachAccounts !== null;
  const hasViewOnly = subscription.maxViewOnlyUsers !== undefined && subscription.maxViewOnlyUsers !== null;
  const hasBothProducts = hasCoachAccount && hasViewOnly;

  // Calculate individual prices (estimate based on known pricing if not stored separately)
  // In production, you'd store these separately in the subscription document
  const coachAccountPlanName = subscription.coachAccountPlanName || subscription.planName || 'Coach Account';
  const viewOnlyPlanName = subscription.viewOnlyPlanName || `${subscription.maxViewOnlyUsers} View Only Users`;

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CreditCardIcon sx={{ fontSize: 32, color: appColors.primary }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                Your Subscription
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subscription.planType === 'annual' ? 'Annual' : 'Monthly'} billing
              </Typography>
            </Box>
          </Box>
          <Chip
            label={getStatusLabel(subscription.status)}
            color={getStatusColor(subscription.status)}
            size="small"
          />
        </Box>

        {/* Line Items */}
        <Box sx={{ mb: 3 }}>
          {/* Coach Account Line Item */}
          {hasCoachAccount && (
            <Box
              sx={{
                bgcolor: 'grey.50',
                p: 2,
                borderRadius: 1,
                mb: hasViewOnly ? 2 : 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PeopleIcon sx={{ color: appColors.primary }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Coach Account
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {coachAccountPlanName} • Up to {subscription.maxCoachAccounts} coach{subscription.maxCoachAccounts !== 1 ? 'es' : ''}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(subscription.coachAccountPrice ?? subscription.price)}/yr
              </Typography>
            </Box>
          )}

          {/* View Only Line Item */}
          {hasViewOnly && (
            <Box
              sx={{
                bgcolor: 'grey.50',
                p: 2,
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <VisibilityIcon sx={{ color: appColors.primary }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    View Only Pack
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewOnlyPlanName} • Up to {subscription.maxViewOnlyUsers} user{subscription.maxViewOnlyUsers !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(subscription.viewOnlyPrice ?? subscription.price)}/yr
              </Typography>
            </Box>
          )}
        </Box>

        {/* Total (only show if both products) */}
        {hasBothProducts && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Total
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.primary }}>
                {formatCurrency(subscription.price)}/yr
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Billing Details */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          {subscription.trialEndDate && subscription.status === 'trialing' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">Trial Ends</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {formatDate(subscription.trialEndDate)}
                </Typography>
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {subscription.cancelAtPeriodEnd ? 'Cancels On' : 'Next Billing'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {formatDate(subscription.currentPeriodEnd)}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Subscription ID</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {subscription.stripeSubscriptionId?.substring(0, 20)}...
            </Typography>
          </Box>
        </Box>

        {subscription.cancelAtPeriodEnd && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This subscription is set to cancel at the end of the current billing period.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

