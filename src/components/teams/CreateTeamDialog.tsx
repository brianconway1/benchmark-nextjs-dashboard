'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Step1CreateTeam from '@/components/teams/Step1CreateTeam';
import Step2AddMembers from '@/components/teams/Step2AddMembers';
import { useToast } from '@/contexts/ToastContext';
import { appColors } from '@/theme';

const steps = ['Create Team', 'Add Members'];

interface TeamFormData {
  name: string;
  ageGroup: string;
  sportCategory: string;
  logoFile: File | null;
  logoPreview: string | null;
  logoUrl: string | null;
}

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onTeamCreated: (teamId: string) => void;
  clubId: string;
  clubName: string;
}

export default function CreateTeamDialog({
  open,
  onClose,
  onTeamCreated,
  clubId,
  clubName,
}: CreateTeamDialogProps) {
  const { showSuccess, showError } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamFormData | null>(null);

  const handleStep1Complete = async (data: TeamFormData) => {
    try {
      setIsCreating(true);

      // Create team in Firestore
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: data.name.trim(),
        clubId: clubId,
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
      showError('Failed to create team. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStep2Complete = () => {
    showSuccess('Team created successfully!');
    if (teamId) {
      onTeamCreated(teamId);
    }
    handleClose();
  };

  const handleBack = () => {
    if (activeStep === 0) {
      handleClose();
    } else {
      // Note: Can't go back after team is created since it's already in Firestore
      // Just close the dialog
      handleClose();
    }
  };

  const handleSkip = () => {
    handleStep2Complete();
  };

  const handleClose = () => {
    if (isCreating) return;
    // Reset state when closing
    setActiveStep(0);
    setTeamId(null);
    setTeamData(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ 
        fontWeight: 'bold', 
        color: appColors.textPrimary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        Create New Team
        <IconButton
          onClick={handleClose}
          disabled={isCreating}
          sx={{ color: appColors.textSecondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {isCreating ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ minHeight: '400px' }}>
            {activeStep === 0 && (
              <Step1CreateTeam
                clubId={clubId}
                onComplete={handleStep1Complete}
                onBack={handleClose}
              />
            )}
            {activeStep === 1 && teamId && teamData && (
              <Step2AddMembers
                clubId={clubId}
                clubName={clubName}
                teamId={teamId}
                teamName={teamData.name}
                onComplete={handleStep2Complete}
                onBack={handleBack}
                onSkip={handleSkip}
              />
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
