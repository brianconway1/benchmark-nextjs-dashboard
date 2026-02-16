'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import Step2ManageMembers from '@/components/teams/Step2ManageMembers';
import { AGE_GROUPS, SPORT_CATEGORIES, AGE_GROUP_LABELS } from '@/constants/teams';
import { appColors } from '@/theme';
import type { Team, Club } from '@/types';

const steps = ['Edit Team Details', 'Manage Members'];


export default function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.teamId as string;
  const { userData, user, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<Club | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    ageGroup: '',
    sportCategory: '',
    logoFile: null as File | null,
    logoPreview: null as string | null,
    existingLogoUrl: null as string | null,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!userData?.clubId || authLoading || !teamId) return;

      try {
        setLoading(true);
        setError('');

        // Load club
        const clubDoc = await getDoc(doc(db, 'sports_clubs', userData.clubId));
        if (!clubDoc.exists()) {
          showError('Club not found');
          router.push('/club/teams');
          return;
        }
        setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);

        // Load team
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (!teamDoc.exists()) {
          showError('Team not found');
          router.push('/club/teams');
          return;
        }

        const teamDataRaw = teamDoc.data();
        const teamData = { 
          id: teamDoc.id, 
          ...teamDataRaw,
          // Ensure members is an array of objects, not strings
          members: Array.isArray(teamDataRaw.members) 
            ? teamDataRaw.members.map((m: unknown) => 
                typeof m === 'string' 
                  ? { userId: m, name: '', email: '', role: 'view_only' }
                  : (m as { userId: string; name: string; email: string; role: string })
              )
            : []
        } as Team & { members: Array<{ userId: string; name: string; email: string; role: string }> };
        
        // Check if team belongs to club
        if (teamData.clubId !== userData.clubId) {
          showError('You do not have permission to edit this team');
          router.push('/club/teams');
          return;
        }

        // Check if team is deleted
        if (teamData.deletedAt) {
          showError('Cannot edit a deleted team');
          router.push('/club/teams');
          return;
        }

        setTeam(teamData as Team);

        // Populate form with existing data
        // Handle multiple field names: sports (array), sport (string), sportCategories (array)
        let sportCategory = '';
        if (teamData.sports && teamData.sports.length > 0) {
          sportCategory = teamData.sports[0];
        } else if (teamData.sport) {
          sportCategory = teamData.sport;
        } else if ((teamData as any).sportCategories && (teamData as any).sportCategories.length > 0) {
          sportCategory = (teamData as any).sportCategories[0];
        }

        setFormData({
          name: teamData.name || '',
          ageGroup: teamData.ageGroup || '',
          sportCategory,
          logoFile: null,
          logoPreview: teamData.logoUrl || null,
          existingLogoUrl: teamData.logoUrl || null,
        });
      } catch (err) {
        console.error('Error loading data:', err);
        showError('Failed to load team data');
        router.push('/club/teams');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userData?.clubId, authLoading, teamId, router, showError]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setFormData((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    }));
    setError('');
  };

  const handleRemoveLogo = () => {
    if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setFormData((prev) => ({
      ...prev,
      logoFile: null,
      logoPreview: null,
      existingLogoUrl: null,
    }));
  };

  const handleStep1Complete = async () => {
    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (!formData.ageGroup) {
      setError('Age group is required');
      return;
    }

    if (!formData.sportCategory) {
      setError('Sport category is required');
      return;
    }

    if (!team || !club || !user) {
      setError('Missing required data');
      return;
    }

    setError('');
    setSaving(true);

    try {
      let logoUrl: string | null = formData.existingLogoUrl;

      // Upload new logo if provided
      if (formData.logoFile) {
        try {
          const logoRef = ref(storage, `teams/${club.id}/${Date.now()}_${formData.logoFile.name}`);
          await uploadBytes(logoRef, formData.logoFile);
          logoUrl = await getDownloadURL(logoRef);
        } catch (uploadErr) {
          console.error('Error uploading logo:', uploadErr);
          showError('Failed to upload logo. Please try again.');
          setSaving(false);
          return;
        }
      }

      // Update team in Firestore
      await updateDoc(doc(db, 'teams', team.id), {
        name: formData.name.trim(),
        ageGroup: formData.ageGroup,
        sport: formData.sportCategory,
        sports: [formData.sportCategory],
        logoUrl,
        updatedAt: serverTimestamp(),
      });

      // Move to step 2
      setActiveStep(1);
      setSaving(false);
    } catch (err: unknown) {
      console.error('Error updating team:', err);
      const error = err as Error;
      showError(error.message || 'Failed to update team. Please try again.');
      setSaving(false);
    }
  };

  const handleStep2Complete = () => {
    // Redirect back to teams page with success message
    router.push('/club/teams?success=Team updated successfully');
  };

  const handleBack = () => {
    if (activeStep === 0) {
      router.push('/club/teams');
    } else {
      setActiveStep(0);
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

  if (!team || !club) {
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
            <>
              <Typography variant="h5" gutterBottom>
                Edit Team Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Update the team details below.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="Team Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
            placeholder="e.g., U12 Boys"
            disabled={saving}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ flex: 1 }} required>
              <InputLabel>Sport Category</InputLabel>
              <Select
                value={formData.sportCategory}
                label="Sport Category"
                onChange={(e) => setFormData((prev) => ({ ...prev, sportCategory: e.target.value }))}
                disabled={saving}
              >
                {SPORT_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1 }} required>
              <InputLabel>Age Group</InputLabel>
              <Select
                value={formData.ageGroup}
                label="Age Group"
                onChange={(e) => setFormData((prev) => ({ ...prev, ageGroup: e.target.value }))}
                disabled={saving}
              >
                {AGE_GROUPS.map((age) => (
                  <MenuItem key={age} value={age}>
                    {AGE_GROUP_LABELS[age] || age}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Team Logo Upload */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: appColors.textPrimary, fontWeight: 'medium' }}>
              Team Logo (Optional)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {formData.logoPreview ? (
                <Avatar
                  src={formData.logoPreview}
                  alt="Logo preview"
                  sx={{ width: 80, height: 80, border: '2px solid #e0e0e0' }}
                />
              ) : (
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    border: '2px dashed #e0e0e0',
                    backgroundColor: appColors.backgroundGrey,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CloudUploadIcon sx={{ color: '#999999' }} />
                </Avatar>
              )}
              <Box>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="logo-upload"
                  type="file"
                  onChange={handleLogoChange}
                  disabled={saving}
                />
                <label htmlFor="logo-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    disabled={saving}
                    sx={{
                      borderColor: appColors.textPrimary,
                      color: appColors.textPrimary,
                      '&:hover': {
                        borderColor: appColors.textPrimary,
                        backgroundColor: appColors.backgroundGrey,
                      },
                    }}
                  >
                    {formData.logoFile || formData.existingLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                </label>
                {(formData.logoFile || formData.existingLogoUrl) && (
                  <>
                    {formData.logoFile && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {formData.logoFile.name}
                      </Typography>
                    )}
                    <Button
                      size="small"
                      onClick={handleRemoveLogo}
                      disabled={saving}
                      sx={{ mt: 0.5 }}
                    >
                      Remove
                    </Button>
                  </>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Max 5MB. JPG, PNG, or GIF
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={handleBack} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStep1Complete}
                  disabled={saving || !formData.name.trim() || !formData.ageGroup || !formData.sportCategory}
                  startIcon={saving ? <CircularProgress size={20} /> : null}
                  sx={{
                    backgroundColor: appColors.primary,
                    color: appColors.primaryText,
                    fontWeight: 'bold',
                    '&:hover': { backgroundColor: appColors.primaryHover },
                    '&:disabled': { backgroundColor: '#e0e0e0', color: '#999999' },
                  }}
                >
                  {saving ? 'Saving...' : 'Next: Manage Members'}
                </Button>
              </Box>
            </>
          )}

          {activeStep === 1 && team && club && (
            <Step2ManageMembers
              clubId={club.id}
              clubName={club.name}
              teamId={team.id}
              teamName={team.name}
              existingMembers={((team as unknown as { members?: Array<{ userId: string; name: string; email: string; role: string } | string> }).members || []).filter((m: unknown) => {
                if (!m) return false;
                if (typeof m === 'object' && m !== null && 'userId' in m) {
                  return !!(m as { userId: string }).userId;
                }
                return false;
              }).map((m: unknown) => m as { userId: string; name: string; email: string; role: string })}
              onComplete={handleStep2Complete}
              onBack={handleBack}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
}

