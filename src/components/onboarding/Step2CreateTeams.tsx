'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  CircularProgress,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { AGE_GROUPS } from '@/constants/teams';
import { appColors } from '@/theme';
import type { Team } from '@/types';

interface TeamFormData {
  name: string;
  ageGroup: string;
  logoUrl: string | null;
  logoFile: File | null;
}

interface Step2CreateTeamsProps {
  clubId: string | null;
  existingTeams: Array<Partial<Team> & { tempId?: string }>;
  onComplete: (teams: Array<Partial<Team> & { tempId?: string }>) => void;
  onBack: () => void;
}

export default function Step2CreateTeams({
  clubId,
  existingTeams,
  onComplete,
  onBack,
}: Step2CreateTeamsProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState<Array<Partial<Team> & { tempId?: string; logoFile?: File }>>(existingTeams);
  const [currentTeam, setCurrentTeam] = useState<TeamFormData>({
    name: '',
    ageGroup: '',
    logoUrl: null,
    logoFile: null,
  });
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setCurrentTeam((prev) => ({
      ...prev,
      logoFile: file,
      logoUrl: URL.createObjectURL(file), // Preview URL
    }));
    setError('');
  };

  const handleRemoveLogo = () => {
    if (currentTeam.logoUrl && currentTeam.logoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentTeam.logoUrl);
    }
    setCurrentTeam((prev) => ({
      ...prev,
      logoUrl: null,
      logoFile: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddTeam = () => {
    if (!currentTeam.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (!currentTeam.ageGroup) {
      setError('Age group is required');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setTeams((prev) => [
      ...prev,
      {
        tempId,
        name: currentTeam.name.trim(),
        ageGroup: currentTeam.ageGroup,
        logoUrl: currentTeam.logoUrl || null,
        logoFile: currentTeam.logoFile || undefined,
        clubId: clubId || undefined,
      },
    ]);
    setCurrentTeam({
      name: '',
      ageGroup: '',
      logoUrl: null,
      logoFile: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
  };

  const handleRemoveTeam = (tempId: string) => {
    setTeams((prev) => {
      const teamToRemove = prev.find((t) => t.tempId === tempId);
      // Clean up preview URL if it exists
      if (teamToRemove?.logoUrl && teamToRemove.logoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(teamToRemove.logoUrl);
      }
      return prev.filter((team) => team.tempId !== tempId);
    });
  };

  const handleNext = async () => {
    if (teams.length === 0) {
      setError('Please create at least one team');
      return;
    }

    // Upload logos for teams that have logo files
    setUploadingLogo(true);
    try {
      const teamsWithLogos = await Promise.all(
        teams.map(async (team) => {
          if (team.logoFile && user) {
            try {
              // Upload to Firebase Storage
              const timestamp = Date.now();
              const fileName = `${team.tempId}_${timestamp}.${team.logoFile.name.split('.').pop()}`;
              const storagePath = `uploads/user:${user.uid}/team-logos/${fileName}`;
              const storageRef = ref(storage, storagePath);

              await uploadBytesResumable(storageRef, team.logoFile);
              const downloadURL = await getDownloadURL(storageRef);

              return {
                ...team,
                logoUrl: downloadURL,
                logoFile: undefined, // Remove file reference
              };
            } catch (err) {
              console.error('Error uploading logo:', err);
              // Continue without logo if upload fails
              return { ...team, logoFile: undefined };
            }
          }
          return { ...team, logoFile: undefined };
        })
      );

      onComplete(teamsWithLogos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload logos');
      setUploadingLogo(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Create Teams
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add teams for your club. You can add multiple teams now or add more later.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="Team Name"
              value={currentTeam.name}
              onChange={(e) => setCurrentTeam((prev) => ({ ...prev, name: e.target.value }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTeam();
                }
              }}
              placeholder="e.g., Senior Team, U21 Team"
              required
            />

            <FormControl sx={{ flex: 1 }} required>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={currentTeam.ageGroup}
                label="Age Group"
                onChange={(e) => setCurrentTeam((prev) => ({ ...prev, ageGroup: e.target.value }))}
              >
                {AGE_GROUPS.map((ageGroup) => (
                  <MenuItem key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Team Logo (Optional)
            </Typography>
            {currentTeam.logoUrl ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={currentTeam.logoUrl}
                  alt="Team logo preview"
                  sx={{ width: 64, height: 64 }}
                  variant="rounded"
                />
                <Button
                  size="small"
                  onClick={handleRemoveLogo}
                  color="error"
                  variant="outlined"
                >
                  Remove Logo
                </Button>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Upload Logo
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </Button>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={handleAddTeam}
            startIcon={<AddIcon />}
            fullWidth
            disabled={!currentTeam.name.trim() || !currentTeam.ageGroup}
          >
            Add Team
          </Button>
        </Stack>
      </Paper>

      {teams.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Teams ({teams.length})
          </Typography>
          <Stack spacing={1}>
            {teams.map((team) => (
              <Paper
                key={team.tempId}
                variant="outlined"
                sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                  {team.logoUrl && (
                    <Avatar
                      src={team.logoUrl}
                      alt={team.name}
                      sx={{ width: 40, height: 40 }}
                      variant="rounded"
                    />
                  )}
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {team.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {team.ageGroup}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  size="small"
                  onClick={() => team.tempId && handleRemoveTeam(team.tempId)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {teams.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: 'center',
            backgroundColor: appColors.backgroundGrey,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No teams added yet. Add your first team above.
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button onClick={onBack} disabled={uploadingLogo}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={teams.length === 0 || uploadingLogo}
          startIcon={uploadingLogo ? <CircularProgress size={20} /> : null}
        >
          {uploadingLogo ? 'Uploading Logos...' : 'Next: Add Users'}
        </Button>
      </Box>
    </Box>
  );
}

