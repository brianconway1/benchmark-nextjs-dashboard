'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SubscriptionList from '@/components/admin/SubscriptionList';
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
  maxViewOnlyUsers?: number;
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
        <SubscriptionList subscriptions={subscriptions} loading={loading} />
      )}
    </Container>
  );
}

