'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { appColors } from '@/theme';
import { useToast } from '@/contexts/ToastContext';

const AVAILABLE_SPORTS = ["Men's Football", "Ladies' Football"];

interface Admin {
  email: string;
  role: 'club_admin_coach' | 'club_admin';
}

interface GeneratedCode {
  email: string;
  role: string;
  code: string;
  expiresAt: string;
}

interface CreateClubFormProps {
  onClubCreated: () => void;
  onCancel: () => void;
}

export default function CreateClubForm({ onClubCreated, onCancel }: CreateClubFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    sports: [] as string[],
    numberOfAccounts: '',
    admins: [{ email: '', role: 'club_admin_coach' as const }] as Admin[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);

  const generateReferralCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleSport = (sport: string) => {
    setFormData((prev) => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport],
    }));
  };

  const handleAdminChange = (index: number, field: keyof Admin, value: string) => {
    setFormData((prev) => ({
      ...prev,
      admins: prev.admins.map((admin, i) =>
        i === index ? { ...admin, [field]: value } : admin
      ),
    }));
  };

  const addAdmin = () => {
    if (formData.admins.length < 3) {
      setFormData((prev) => ({
        ...prev,
        admins: [...prev.admins, { email: '', role: 'club_admin_coach' }],
      }));
    }
  };

  const removeAdmin = (index: number) => {
    if (formData.admins.length > 1) {
      setFormData((prev) => ({
        ...prev,
        admins: prev.admins.filter((_, i) => i !== index),
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Club name is required');
      return false;
    }
    if (formData.sports.length === 0) {
      setError('At least one sport is required');
      return false;
    }
    if (formData.admins.length === 0) {
      setError('At least one admin is required');
      return false;
    }
    for (let i = 0; i < formData.admins.length; i++) {
      const admin = formData.admins[i];
      if (!admin.email.trim()) {
        setError(`Admin ${i + 1} email is required`);
        return false;
      }
      if (!admin.email.includes('@')) {
        setError(`Admin ${i + 1} email is invalid`);
        return false;
      }
      if (!admin.role) {
        setError(`Admin ${i + 1} role is required`);
        return false;
      }
    }
    if (!formData.numberOfAccounts || parseInt(formData.numberOfAccounts) < 1) {
      setError('Number of accounts must be at least 1');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create club document
      const clubData = {
        name: formData.name.trim(),
        sport: formData.sports.join(', '),
        clubAdminIds: [],
        memberIds: [],
        maxUses: parseInt(formData.numberOfAccounts),
        usedCount: 0,
        status: 'pending_admin_signup',
        createdAt: serverTimestamp(),
      };

      const clubRef = await addDoc(collection(db, 'sports_clubs'), clubData);
      const clubId = clubRef.id;

      // Generate referral codes for each admin
      const codes: GeneratedCode[] = [];
      for (const admin of formData.admins) {
        const code = generateReferralCode();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create referral code document
        await setDoc(doc(db, 'referral_codes', code), {
          code,
          clubId,
          clubName: formData.name.trim(),
          intendedRole: admin.role,
          adminEmail: admin.email.trim().toLowerCase(),
          maxUses: 1,
          usesCount: 0,
          active: true,
          createdAt: serverTimestamp(),
          expiresAt,
        });

        codes.push({
          email: admin.email.trim().toLowerCase(),
          role: admin.role,
          code,
          expiresAt: expiresAt.toLocaleDateString(),
        });
      }

      setGeneratedCodes(codes);
      setSuccess(true);
      showToast('Club created successfully!', 'success');

      // Show success message for 5 seconds then redirect
      setTimeout(() => {
        onClubCreated();
      }, 5000);
    } catch (err) {
      console.error('Error creating club:', err);
      setError('Failed to create club. Please try again.');
      showToast('Failed to create club', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Code copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (success) {
    return (
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              mx: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#d4edda',
              mb: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 32, color: appColors.success }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 1 }}>
            Club Created Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Referral codes have been generated for each admin. Send these codes to the respective admins.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
            Generated Referral Codes
          </Typography>
          <Stack spacing={2}>
            {generatedCodes.map((code, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, backgroundColor: appColors.backgroundGrey }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                      {code.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {code.role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expires: {code.expiresAt}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: appColors.info,
                        mb: 0.5,
                      }}
                    >
                      {code.code}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => copyToClipboard(code.code)}
                      sx={{ color: appColors.info }}
                    >
                      Copy
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Send these referral codes to the respective admins via email. They have 7
              days to sign up using these codes.
            </Typography>
          </Alert>
        </Paper>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            label="Club Name"
            name="name"
            required
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="Enter club name"
          />

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: appColors.textPrimary }}>
              Sports * (Select one or more)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {AVAILABLE_SPORTS.map((sport) => (
                <Chip
                  key={sport}
                  label={sport}
                  onClick={() => toggleSport(sport)}
                  color={formData.sports.includes(sport) ? 'primary' : 'default'}
                  sx={{
                    backgroundColor: formData.sports.includes(sport) ? appColors.primary : undefined,
                    color: formData.sports.includes(sport) ? appColors.primaryText : undefined,
                    '&:hover': {
                      backgroundColor: formData.sports.includes(sport) ? appColors.primaryHover : appColors.backgroundGrey,
                    },
                  }}
                  disabled={loading}
                />
              ))}
            </Box>
            {formData.sports.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Selected: {formData.sports.join(', ')}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 'medium', color: appColors.textPrimary }}>
              Club Admins (1-3) *
            </Typography>
            <Stack spacing={2}>
              {formData.admins.map((admin, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2, backgroundColor: appColors.backgroundGrey }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      Admin {index + 1}
                    </Typography>
                    {formData.admins.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => removeAdmin(index)}
                        disabled={loading}
                        sx={{ color: appColors.error }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  <Stack spacing={2}>
                    <TextField
                      label="Email Address"
                      type="email"
                      required
                      fullWidth
                      size="small"
                      placeholder="admin@club.com"
                      value={admin.email}
                      onChange={(e) => handleAdminChange(index, 'email', e.target.value)}
                      disabled={loading}
                    />
                    <TextField
                      label="Role"
                      select
                      required
                      fullWidth
                      size="small"
                      SelectProps={{
                        native: true,
                      }}
                      value={admin.role}
                      onChange={(e) => handleAdminChange(index, 'role', e.target.value as Admin['role'])}
                      disabled={loading}
                    >
                      <option value="club_admin_coach">Admin Coach</option>
                      <option value="club_admin">Club Admin</option>
                    </TextField>
                  </Stack>
                </Paper>
              ))}
              {formData.admins.length < 3 && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addAdmin}
                  disabled={loading}
                  sx={{
                    borderStyle: 'dashed',
                    borderColor: appColors.textSecondary,
                    color: appColors.textSecondary,
                  }}
                >
                  Add Another Admin
                </Button>
              )}
            </Stack>
            <Box sx={{ mt: 2, p: 2, backgroundColor: appColors.backgroundGrey, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Admin Coach:</strong> Can use the app and counts as a paid user
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                <strong>Club Admin:</strong> Administration only, cannot use the app, doesn&apos;t count as paid user
              </Typography>
            </Box>
          </Box>

          <TextField
            label="Number of Accounts"
            name="numberOfAccounts"
            type="number"
            required
            fullWidth
            inputProps={{ min: 1 }}
            value={formData.numberOfAccounts}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="10"
            helperText="Total number of user accounts for this club. Admin Coaches count as paid users, Club Admins do not."
          />

          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              fullWidth
              sx={{
                borderColor: appColors.textSecondary,
                color: appColors.textSecondary,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{
                backgroundColor: appColors.primary,
                color: appColors.primaryText,
                fontWeight: 'bold',
                '&:hover': { backgroundColor: appColors.primaryHover },
              }}
            >
              {loading ? 'Creating...' : 'Create Club'}
            </Button>
          </Box>
        </Stack>
      </form>
    </Paper>
  );
}

