'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getEmailValidationError } from '@/utils/validation';
import { validateUserLimit } from '@/lib/subscriptionValidation';
import { appColors } from '@/theme';
import { ROLE_CONFIG, INVITABLE_ROLES, type ClubRole } from '@/config/roles';
import type { Team } from '@/types';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInviteSent: () => void;
  clubId: string;
  clubName: string;
}

export default function InviteMemberModal({
  open,
  onClose,
  onInviteSent,
  clubId,
  clubName,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClubRole>('coach');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch teams for this club
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        const teamsQuery = query(
          collection(db, 'teams'),
          where('clubId', '==', clubId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        const fetchedTeams = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[];
        setTeams(fetchedTeams);
        // Auto-select if only one team
        if (fetchedTeams.length === 1) {
          setSelectedTeamId(fetchedTeams[0].id);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoadingTeams(false);
      }
    };

    if (open && clubId) {
      fetchTeams();
    }
  }, [open, clubId]);

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }

    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      setIsSubmitting(true);

      // Validate subscription limits before creating referral code
      const validation = await validateUserLimit(clubId, role, 1);
      if (!validation.valid) {
        setError(validation.reason || 'Cannot invite member: subscription limit exceeded');
        setIsSubmitting(false);
        return;
      }

      const referralCode = generateReferralCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const selectedTeam = teams.find(t => t.id === selectedTeamId);

      // Create referral code with isMemberInvitation flag
      // This will trigger the email Cloud Function
      await setDoc(doc(db, 'referral_codes', referralCode), {
        code: referralCode,
        clubId,
        clubName,
        teamId: selectedTeamId,
        teamName: selectedTeam?.name || '',
        intendedRole: role,
        adminEmail: email.trim().toLowerCase(),
        isMemberInvitation: true, // Flag to trigger email
        maxUses: 1,
        usesCount: 0,
        active: true,
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        expiresAt,
      });

      setSuccess(true);
      setEmail('');
      setRole('coach');
      setSelectedTeamId(teams.length === 1 ? teams[0].id : '');

      // Close modal after 2 seconds
      setTimeout(() => {
        onInviteSent();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error creating referral code:', err);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setEmail('');
    setRole('coach');
    setSelectedTeamId(teams.length === 1 ? teams[0].id : '');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
          Invite Member
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Invitation sent successfully! An email with a referral code has been sent to {email}.
            </Alert>
          )}
          {!loadingTeams && teams.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No teams found. Please create a team before inviting members.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              disabled={isSubmitting || success || teams.length === 0}
              placeholder="member@example.com"
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as ClubRole)}
                disabled={isSubmitting || success || teams.length === 0}
              >
                {INVITABLE_ROLES.map((roleKey) => (
                  <MenuItem key={roleKey} value={roleKey}>
                    <Box>
                      <Typography variant="body1">
                        {ROLE_CONFIG[roleKey].label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ROLE_CONFIG[roleKey].description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Team</InputLabel>
              <Select
                value={selectedTeamId}
                label="Team"
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={isSubmitting || success || loadingTeams || teams.length === 0}
              >
                {loadingTeams ? (
                  <MenuItem disabled>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Loading teams...
                  </MenuItem>
                ) : (
                  teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Box sx={{ bgcolor: appColors.backgroundGrey, p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>How it works:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • A unique referral code will be generated
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • An invitation email will be sent automatically
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • The code expires in 7 days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • They can use the code to sign up in the mobile app
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{ color: appColors.textSecondary }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || success || !email.trim() || !selectedTeamId || teams.length === 0}
            sx={{
              backgroundColor: appColors.primary,
              color: appColors.primaryText,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: appColors.primaryHover },
              '&:disabled': { backgroundColor: '#e0e0e0', color: appColors.disabledText },
            }}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: appColors.primaryText }} />
                Sending...
              </Box>
            ) : success ? (
              'Sent!'
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}



