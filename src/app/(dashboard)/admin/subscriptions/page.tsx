'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/permissions';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SubscriptionList from '@/components/admin/SubscriptionList';
import { appColors } from '@/theme';
import type { FirestoreTimestamp } from '@/types';

interface Subscription {
  id: string;
  clubId?: string;
  clubName?: string;
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

export default function AdminSubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!user || authLoading) return;

      try {
        const hasAccess = await isSuperAdmin(user.uid);
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        await loadSubscriptions();
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load subscriptions');
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [user, authLoading]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all subscriptions
      const subscriptionsSnapshot = await getDocs(collection(db, 'subscriptions'));
      const subscriptionsData: Subscription[] = [];

      // Load club names for each subscription
      for (const docSnap of subscriptionsSnapshot.docs) {
        const subscriptionData = docSnap.data();
        const subscription: Subscription = {
          id: docSnap.id,
          ...subscriptionData,
        };

        // Fetch club name if clubId exists
        if (subscription.clubId) {
          try {
            const clubDoc = await getDoc(doc(db, 'sports_clubs', subscription.clubId));
            if (clubDoc.exists()) {
              subscription.clubName = clubDoc.data().name || 'Unknown Club';
            } else {
              subscription.clubName = 'Club Not Found';
            }
          } catch (err) {
            console.error('Error loading club name:', err);
            subscription.clubName = 'Error Loading Club';
          }
        } else {
          subscription.clubName = 'No Club';
        }

        subscriptionsData.push(subscription);
      }

      setSubscriptions(subscriptionsData);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

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

  if (accessDenied) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. You must be a super admin to view this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          All Subscriptions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage all subscriptions across the system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {subscriptions.length === 0 && !loading ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center">
            No subscriptions found.
          </Typography>
        </Box>
      ) : (
        <SubscriptionList subscriptions={subscriptions} loading={loading} showClubName={true} />
      )}
    </Container>
  );
}

