'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Autocomplete,
  Checkbox,
} from '@mui/material';
import { CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Club } from '@/types';
import { appColors } from '@/theme';

const AVAILABLE_SPORTS = ["Men's Football", "Ladies' Football"];

interface Step1ClubSetupProps {
  clubData: Partial<Club>;
  clubId: string | null;
  isExistingClub: boolean;
  onComplete: (clubData: Partial<Club>, clubId: string | null) => void;
  onBack: () => void;
}

export default function Step1ClubSetup({
  clubData,
  clubId,
  isExistingClub,
  onComplete,
  onBack,
}: Step1ClubSetupProps) {
  const [name, setName] = useState(clubData.name || '');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clubData.name) {
      setName(clubData.name);
    }
    // Handle both 'sport' and 'Sport' field names (case-insensitive)
    const sportValue = clubData.sport || (clubData as any).Sport || null;
    if (sportValue) {
      // Parse sport string (could be comma-separated or single value)
      const sports = String(sportValue)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => AVAILABLE_SPORTS.includes(s));
      setSelectedSports(sports);
      console.log('Loaded sports from club data:', sports, 'from value:', sportValue);
    } else {
      console.log('No sport found in club data:', clubData);
    }
  }, [clubData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Club name is required');
      return;
    }

    setLoading(true);

    try {
      const sportValue = selectedSports.length > 0 ? selectedSports.join(', ') : undefined;
      
      if (isExistingClub && clubId) {
        // Update existing club
        const clubRef = doc(db, 'sports_clubs', clubId);
        await updateDoc(clubRef, {
          name: name.trim(),
          sport: sportValue,
          updatedAt: serverTimestamp(),
        });
        onComplete({ name: name.trim(), sport: sportValue }, clubId);
      } else {
        // Create new club (for super admin)
        const clubsRef = collection(db, 'sports_clubs');
        const newClubData = {
          name: name.trim(),
          sport: sportValue,
          clubAdminIds: [],
          clubAdminCoachIds: [],
          memberIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(clubsRef, newClubData);
        onComplete({ name: name.trim(), sport: sportValue }, docRef.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save club');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {isExistingClub ? 'Review Club Information' : 'Create Your Club'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isExistingClub
          ? 'Review and update your club details below.'
          : 'Set up your club information to get started.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Club Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
          <Autocomplete
            multiple
            options={AVAILABLE_SPORTS}
            value={selectedSports}
            onChange={(_, newValue) => setSelectedSports(newValue)}
            disableCloseOnSelect
            getOptionLabel={(option) => option}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox
                  icon={<CheckBoxOutlineBlank fontSize="small" />}
                  checkedIcon={<CheckBox fontSize="small" />}
                  style={{ marginRight: 8 }}
                  checked={selected}
                />
                {option}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sport Types"
                placeholder="Select sports"
                disabled={loading}
              />
            )}
            renderTags={(value) =>
              value.map((option) => (
                <Box
                  key={option}
                  component="span"
                  sx={{
                    display: 'inline-block',
                    backgroundColor: appColors.primary,
                    color: appColors.primaryText,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    margin: '2px',
                  }}
                >
                  {option}
                </Box>
              ))
            }
          />
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : 'Next: Create Teams'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

