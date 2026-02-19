'use client';

import { useState, useEffect } from 'react';
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
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Stack,
  Checkbox,
  Chip,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidEmail } from '@/utils/validation';
import { appColors } from '@/theme';
import { validateUserLimit } from '@/lib/subscriptionValidation';
import type { User, ReferralCode } from '@/types';

interface UserToAdd {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface ClubMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isPending: boolean;
  referralCodeId?: string; // For pending members
}

interface Step2AddMembersProps {
  clubId: string;
  clubName: string;
  teamId: string;
  teamName: string;
  onComplete: () => void;
  onBack: () => void;
  onSkip?: () => void;
}

export default function Step2AddMembers({
  clubId,
  clubName,
  teamId,
  teamName,
  onComplete,
  onBack,
  onSkip,
}: Step2AddMembersProps) {
  const [users, setUsers] = useState<UserToAdd[]>([]);
  const [currentUser, setCurrentUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'coach',
  });
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Fetch existing club members and pending invitations
  useEffect(() => {
    const fetchClubMembers = async () => {
      try {
        const members: ClubMember[] = [];

        // Fetch existing users in this club
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('clubId', '==', clubId))
        );
        usersSnapshot.forEach((doc) => {
          const data = doc.data() as User;
          members.push({
            id: doc.id,
            name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
            email: data.email,
            role: data.role,
            isPending: false,
          });
        });

        // Fetch pending referral codes for this club
        const codesSnapshot = await getDocs(
          query(collection(db, 'referral_codes'), where('clubId', '==', clubId), where('active', '==', true))
        );
        const now = new Date();
        codesSnapshot.forEach((docSnap) => {
          const data = docSnap.data() as ReferralCode;
          // Handle Firestore Timestamp or Date or number
          let expiresAt: Date | null = null;
          if (data.expiresAt) {
            if (typeof (data.expiresAt as { toDate?: () => Date }).toDate === 'function') {
              expiresAt = (data.expiresAt as { toDate: () => Date }).toDate();
            } else if (data.expiresAt instanceof Date) {
              expiresAt = data.expiresAt;
            } else {
              expiresAt = new Date(data.expiresAt as unknown as number);
            }
          }
          const isExpired = expiresAt && expiresAt < now;
          const isUsed = data.usesCount >= data.maxUses;

          if (!isExpired && !isUsed && data.adminEmail) {
            // Skip if email already exists as a member
            if (!members.some(m => m.email.toLowerCase() === data.adminEmail?.toLowerCase())) {
              members.push({
                id: `pending-${docSnap.id}`,
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.adminEmail,
                email: data.adminEmail,
                role: data.intendedRole || 'view_only',
                isPending: true,
                referralCodeId: docSnap.id,
              });
            }
          }
        });

        setClubMembers(members);
      } catch (err) {
        console.error('Error fetching club members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchClubMembers();
  }, [clubId]);

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const checkEmailExists = (email: string): string | null => {
    const normalized = email.toLowerCase().trim();
    const existing = clubMembers.find(m => m.email.toLowerCase() === normalized);
    if (existing) {
      return existing.isPending
        ? 'This user has a pending invitation. Select them from the list above.'
        : 'This user is already a club member. Select them from the list above.';
    }
    if (users.some(u => u.email.toLowerCase() === normalized)) {
      return 'This email has already been added.';
    }
    return null;
  };

  const handleAddUser = () => {
    if (!currentUser.firstName || !currentUser.lastName || !currentUser.email) {
      setError('All fields are required');
      return;
    }

    // Validate email format
    if (!isValidEmail(currentUser.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check for duplicate email (existing, pending, or already added)
    const emailCheck = checkEmailExists(currentUser.email);
    if (emailCheck) {
      setError(emailCheck);
      return;
    }

    const newUser: UserToAdd = {
      id: `temp-${Date.now()}`,
      firstName: currentUser.firstName.trim(),
      lastName: currentUser.lastName.trim(),
      email: currentUser.email.trim().toLowerCase(),
      role: currentUser.role,
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser({
      firstName: '',
      lastName: '',
      email: '',
      role: 'coach',
    });
    setError('');
  };

  const handleRemoveUser = (id: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== id));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate limits before adding users
      // Group users by role to check limits efficiently
      const coachUsers = users.filter(u => u.role === 'coach' || u.role === 'club_admin_coach');
      const viewOnlyUsers = users.filter(u => u.role === 'view_only');
      
      if (coachUsers.length > 0) {
        const validation = await validateUserLimit(clubId, 'coach', coachUsers.length);
        if (!validation.valid) {
          setError(validation.reason || 'Cannot add coaches: subscription limit exceeded');
          setLoading(false);
          return;
        }
      }
      
      if (viewOnlyUsers.length > 0) {
        const validation = await validateUserLimit(clubId, 'view_only', viewOnlyUsers.length);
        if (!validation.valid) {
          setError(validation.reason || 'Cannot add view-only users: subscription limit exceeded');
          setLoading(false);
          return;
        }
      }

      // Generate referral code helper
      const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Create referral codes only - DO NOT create user documents
      // User documents will be created by the mobile app's Cloud Function (completeUserSignup)
      // when the user actually signs up with their Firebase Auth UID
      for (const user of users) {
        const referralCode = generateReferralCode();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create referral code with all info needed for signup
        const refRef = doc(db, 'referral_codes', referralCode);
        await setDoc(refRef, {
          code: referralCode,
          clubId: clubId,
          clubName: clubName,
          teamId: teamId,
          intendedRole: user.role,
          adminEmail: user.email,
          // Store name for mobile signup to use
          firstName: user.firstName,
          lastName: user.lastName,
          isMemberInvitation: true, // Flag to trigger email
          maxUses: 1,
          usesCount: 0,
          active: true,
          createdAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          expiresAt,
        });
      }

      onComplete();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to add members');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add Members to {teamName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add members to this team. They will receive an invitation email with a referral code. You can skip this step and add members later.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Club Members Selection */}
      {loadingMembers ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : clubMembers.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add from Club Members
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select existing or pending club members to add to this team.
          </Typography>
          <Stack spacing={1} sx={{ maxHeight: 200, overflow: 'auto' }}>
            {clubMembers.map((member) => (
              <Box
                key={member.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: member.isPending ? 'transparent' : appColors.backgroundGrey },
                  opacity: member.isPending ? 0.6 : 1,
                }}
              >
                <Checkbox
                  checked={selectedMemberIds.has(member.id)}
                  onChange={() => toggleMemberSelection(member.id)}
                  size="small"
                  disabled={member.isPending}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    {member.name} ({member.email})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {member.isPending
                      ? 'This user must sign up before you can add them to another team'
                      : member.role
                    }
                  </Typography>
                </Box>
                {member.isPending && (
                  <Chip label="Pending" size="small" color="warning" variant="outlined" />
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Or invite new members
        </Typography>
      </Divider>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="First Name"
              value={currentUser.firstName}
              onChange={(e) => setCurrentUser((prev) => ({ ...prev, firstName: e.target.value }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUser();
                }
              }}
              required
            />
            <TextField
              sx={{ flex: 1 }}
              label="Last Name"
              value={currentUser.lastName}
              onChange={(e) => setCurrentUser((prev) => ({ ...prev, lastName: e.target.value }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUser();
                }
              }}
              required
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="Email"
              type="email"
              value={currentUser.email}
              onChange={(e) => {
                const email = e.target.value;
                setCurrentUser((prev) => ({ ...prev, email }));
                if (email && isValidEmail(email)) {
                  setEmailWarning(checkEmailExists(email) || '');
                } else {
                  setEmailWarning('');
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUser();
                }
              }}
              required
              error={!!emailWarning}
              helperText={emailWarning}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={currentUser.role}
                label="Role"
                onChange={(e) => setCurrentUser((prev) => ({ ...prev, role: e.target.value }))}
              >
                <MenuItem value="club_admin">Club Admin</MenuItem>
                <MenuItem value="club_admin_coach">Admin Coach</MenuItem>
                <MenuItem value="coach">Coach</MenuItem>
                <MenuItem value="view_only">View Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            onClick={handleAddUser}
            startIcon={<AddIcon />}
            fullWidth
            disabled={!currentUser.firstName || !currentUser.lastName || !currentUser.email}
            sx={{
              backgroundColor: appColors.primary,
              color: appColors.primaryText,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: appColors.primaryHover },
            }}
          >
            Add Member
          </Button>
        </Stack>
      </Paper>

      {users.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Members to Add ({users.length})
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveUser(user.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {users.length === 0 && selectedMemberIds.size === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: 'center',
            backgroundColor: appColors.backgroundGrey,
            mb: 3,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No members added yet. Select from club members above or invite new members.
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Stack direction="row" spacing={2}>
          {onSkip && (
            <Button onClick={onSkip} disabled={loading} variant="outlined">
              Skip
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleComplete}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{
              backgroundColor: appColors.primary,
              color: appColors.primaryText,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: appColors.primaryHover },
            }}
          >
            {loading ? 'Adding Members...' : (() => {
              const total = users.length + selectedMemberIds.size;
              return total === 0 ? 'Finish' : `Finish (${total} member${total !== 1 ? 's' : ''})`;
            })()}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

