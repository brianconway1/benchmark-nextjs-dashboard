'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Paper, Stepper, Step, StepLabel, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import Step1ClubSetup from '@/components/onboarding/Step1ClubSetup';
import Step2CreateTeams from '@/components/onboarding/Step2CreateTeams';
import Step3CreateUsers from '@/components/onboarding/Step3CreateUsers';
import type { Club, Team } from '@/types';

const steps = ['Club Setup', 'Create Teams', 'Create Users'];

interface OnboardingState {
  clubId: string | null;
  clubData: Partial<Club>;
  teams: Array<Partial<Team> & { tempId?: string }>;
  users: Array<{
    teamId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>;
  isExistingClub: boolean;
}

function OnboardingWizard() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OnboardingState>({
    clubId: null,
    clubData: {},
    teams: [],
    users: [],
    isExistingClub: false,
  });

  // Check if club exists on mount
  useEffect(() => {
    const checkExistingClub = async () => {
      if (!userData || authLoading) return;

      const clubId = userData.clubId;
      if (clubId) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const clubDoc = await getDoc(doc(db, 'sports_clubs', clubId));
          
          if (clubDoc.exists()) {
            setState((prev) => ({
              ...prev,
              clubId,
              clubData: { id: clubDoc.id, ...clubDoc.data() } as Club,
              isExistingClub: true,
            }));
          }
        } catch (error) {
          console.error('Error checking existing club:', error);
        }
      }
      setLoading(false);
    };

    checkExistingClub();
  }, [userData, authLoading]);


  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStep1Complete = (clubData: Partial<Club>, clubId: string | null) => {
    setState((prev) => ({
      ...prev,
      clubData,
      clubId,
    }));
    handleNext();
  };

  const handleStep2Complete = (teams: Array<Partial<Team> & { tempId?: string }>) => {
    setState((prev) => ({
      ...prev,
      teams,
    }));
    handleNext();
  };

  const handleStep3Complete = () => {
    // Onboarding complete - redirect to dashboard
    router.push('/club');
  };

  if (loading) {
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: '400px' }}>
          {activeStep === 0 && (
            <Step1ClubSetup
              clubData={state.clubData}
              clubId={state.clubId}
              isExistingClub={state.isExistingClub}
              onComplete={handleStep1Complete}
              onBack={handleBack}
            />
          )}
          {activeStep === 1 && (
            <Step2CreateTeams
              clubId={state.clubId}
              existingTeams={state.teams}
              onComplete={handleStep2Complete}
              onBack={handleBack}
            />
          )}
          {activeStep === 2 && (
            <Step3CreateUsers
              clubId={state.clubId}
              teams={state.teams}
              onComplete={handleStep3Complete}
              onBack={handleBack}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <OnboardingWizard />
    </Suspense>
  );
}

