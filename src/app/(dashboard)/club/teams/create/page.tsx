'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Paper, Stepper, Step, StepLabel, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Step1CreateTeam from '@/components/teams/Step1CreateTeam';
import Step2AddMembers from '@/components/teams/Step2AddMembers';
import type { Club } from '@/types';

const steps = ['Create Team', 'Add Members'];

interface TeamFormData {
  name: string;
  ageGroup: string;
  sportCategory: string;
  logoUrl: string | null;
}

export default function CreateTeamPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamFormData | null>(null);

  useEffect(() => {
    const loadClub = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        const clubDoc = await getDoc(doc(db, 'sports_clubs', userData.clubId));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        } else {
          router.push('/club/teams');
        }
      } catch (error) {
        console.error('Error loading club:', error);
        router.push('/club/teams');
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [userData?.clubId, authLoading, router]);

  const handleStep1Complete = async (data: TeamFormData & { logoUrl: string | null }) => {
    if (!club) return;

    try {
      setLoading(true);

      // Create team in Firestore
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: data.name.trim(),
        clubId: club.id,
        ageGroup: data.ageGroup,
        sport: data.sportCategory,
        sports: [data.sportCategory],
        logoUrl: data.logoUrl,
        members: [],
        memberIds: [],
        memberCount: 0,
        coaches: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
      });

      setTeamId(teamRef.id);
      setTeamData(data);
      setActiveStep(1);
    } catch (error) {
      console.error('Error creating team:', error);
      // Handle error - could show error message
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Complete = () => {
    // Redirect back to teams page with success message
    router.push('/club/teams?success=Team created successfully');
  };

  const handleBack = () => {
    if (activeStep === 0) {
      router.push('/club/teams');
    } else {
      setActiveStep(0);
    }
  };

  const handleSkip = () => {
    handleStep2Complete();
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

  if (!club) {
    return null;
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
            <Step1CreateTeam
              clubId={club.id}
              onComplete={handleStep1Complete}
              onBack={handleBack}
            />
          )}
          {activeStep === 1 && teamId && teamData && (
            <Step2AddMembers
              clubId={club.id}
              clubName={club.name}
              teamId={teamId}
              teamName={teamData.name}
              onComplete={handleStep2Complete}
              onBack={handleBack}
              onSkip={handleSkip}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
}

