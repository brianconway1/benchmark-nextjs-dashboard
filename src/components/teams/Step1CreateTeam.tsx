'use client';

import { useState, useRef } from 'react';
import {
  Box,
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
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { AGE_GROUPS, SPORT_CATEGORIES, AGE_GROUP_LABELS } from '@/constants/teams';
import { appColors } from '@/theme';
import { compressImage } from '@/utils/imageCompression';

interface TeamFormData {
  name: string;
  ageGroup: string;
  sportCategory: string;
  logoFile: File | null;
  logoPreview: string | null;
}

interface Step1CreateTeamProps {
  clubId: string;
  onComplete: (teamData: TeamFormData & { logoUrl: string | null }) => void;
  onBack?: () => void;
}

export default function Step1CreateTeam({ clubId, onComplete, onBack }: Step1CreateTeamProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    ageGroup: '',
    sportCategory: '',
    logoFile: null,
    logoPreview: null,
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    try {
      // Compress the image for logo use (small display size)
      const compressedFile = await compressImage(file, {
        maxSizeMB: 0.2, // 200KB max for logos
        maxWidthOrHeight: 512, // Logos don't need to be large
      });

      setFormData((prev) => ({
        ...prev,
        logoFile: compressedFile,
        logoPreview: URL.createObjectURL(compressedFile),
      }));
      setError('');
    } catch {
      setError('Failed to process image');
    }
  };

  const handleRemoveLogo = () => {
    if (formData.logoPreview && formData.logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setFormData((prev) => ({
      ...prev,
      logoFile: null,
      logoPreview: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = async () => {
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

    setError('');
    setUploading(true);

    try {
      let logoUrl: string | null = null;

      // Upload logo if provided
      if (formData.logoFile && user) {
        try {
          const storagePath = `uploads/user:${user.uid}/team-logos/${Date.now()}_${formData.logoFile.name}`;
          const logoRef = ref(storage, storagePath);
          await uploadBytes(logoRef, formData.logoFile);
          logoUrl = await getDownloadURL(logoRef);
        } catch (uploadErr) {
          console.error('Error uploading logo:', uploadErr);
          const errMessage = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
          setError(`Failed to upload logo: ${errMessage}`);
          setUploading(false);
          return;
        }
      }

      onComplete({
        ...formData,
        logoUrl,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to proceed');
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Create Team
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the team details below. You can add members in the next step.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
          disabled={uploading}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ flex: 1 }} required>
            <InputLabel>Sport Category</InputLabel>
            <Select
              value={formData.sportCategory}
              label="Sport Category"
              onChange={(e) => setFormData((prev) => ({ ...prev, sportCategory: e.target.value }))}
              disabled={uploading}
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
              disabled={uploading}
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
                disabled={uploading}
                ref={fileInputRef}
              />
              <label htmlFor="logo-upload">
                <Button
                  component="span"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                  sx={{
                    borderColor: appColors.textPrimary,
                    color: appColors.textPrimary,
                    '&:hover': {
                      borderColor: appColors.textPrimary,
                      backgroundColor: appColors.backgroundGrey,
                    },
                  }}
                >
                  {formData.logoFile ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </label>
              {formData.logoFile && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {formData.logoFile.name}
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                    sx={{ mt: 0.5 }}
                  >
                    Remove
                  </Button>
                </>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Max 10MB. JPG, PNG, or GIF
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        {onBack && (
          <Button onClick={onBack} disabled={uploading}>
            Back
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={uploading || !formData.name.trim() || !formData.ageGroup || !formData.sportCategory}
          startIcon={uploading ? <CircularProgress size={20} /> : null}
          sx={{
            backgroundColor: appColors.primary,
            color: appColors.primaryText,
            fontWeight: 'bold',
            '&:hover': { backgroundColor: appColors.primaryHover },
            '&:disabled': { backgroundColor: '#e0e0e0', color: appColors.disabledText },
          }}
        >
          {uploading ? 'Uploading...' : 'Next: Add Members'}
        </Button>
      </Box>
    </Box>
  );
}

