'use client';

import { useState } from 'react';
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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidEmail } from '@/utils/validation';
import { appColors } from '@/theme';
import { validateUserLimit } from '@/lib/subscriptionValidation';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface UserToAdd {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Step2ManageMembersProps {
  clubId: string;
  clubName: string;
  teamId: string;
  teamName: string;
  existingMembers: Member[];
  onComplete: () => void;
  onBack: () => void;
}

export default function Step2ManageMembers({
  clubId,
  teamId,
  teamName,
  existingMembers: initialMembers,
  onComplete,
  onBack,
}: Step2ManageMembersProps) {
  const [existingMembers, setExistingMembers] = useState<Member[]>(initialMembers);
  const [usersToAdd, setUsersToAdd] = useState<UserToAdd[]>([]);
  const [currentUser, setCurrentUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'coach',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddNewUser = () => {
    if (!currentUser.firstName || !currentUser.lastName || !currentUser.email) {
      setError('All fields are required');
      return;
    }

    // Validate email format
    if (!isValidEmail(currentUser.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check for duplicate email in usersToAdd
    if (usersToAdd.some((u) => u.email.toLowerCase() === currentUser.email.toLowerCase())) {
      setError('This email has already been added');
      return;
    }

    // Check if user already exists in team
    const existingMemberEmails = existingMembers.map(m => m.email.toLowerCase());
    if (existingMemberEmails.includes(currentUser.email.toLowerCase())) {
      setError('This user is already a member of the team');
      return;
    }

    const newUser: UserToAdd = {
      id: `temp-${Date.now()}`,
      firstName: currentUser.firstName.trim(),
      lastName: currentUser.lastName.trim(),
      email: currentUser.email.trim().toLowerCase(),
      role: currentUser.role,
    };

    setUsersToAdd((prev) => [...prev, newUser]);
    setCurrentUser({
      firstName: '',
      lastName: '',
      email: '',
      role: 'coach',
    });
    setError('');
  };

  const handleRemoveNewUser = (id: string) => {
    setUsersToAdd((prev) => prev.filter((user) => user.id !== id));
  };

  const handleRemoveExistingMember = (userId: string) => {
    setExistingMembers((prev) => prev.filter((member) => member.userId !== userId));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (!teamDoc.exists()) {
        setError('Team not found');
        setLoading(false);
        return;
      }

      // Validate limits before adding users
      // Group users by role to check limits efficiently
      const coachUsers = usersToAdd.filter(u => u.role === 'coach' || u.role === 'club_admin_coach');
      const viewOnlyUsers = usersToAdd.filter(u => u.role === 'view_only');
      
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

      // Create new users if any
      const createdUserIds: string[] = [];
      
      for (const user of usersToAdd) {
        const referralCode = generateReferralCode();
        const userRef = doc(collection(db, 'users'));
        const userId = userRef.id;

        await runTransaction(db, async (tx) => {
          // Create referral code
          const refRef = doc(db, 'referral_codes', referralCode);
          tx.set(refRef, {
            code: referralCode,
            clubId: clubId,
            teamId: teamId,
            intendedRole: user.role,
            adminEmail: user.email,
            isMemberInvitation: true,
            maxUses: 1,
            usesCount: 0,
            active: true,
            createdAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });

          // Create user document
          tx.set(userRef, {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: `${user.firstName} ${user.lastName}`.trim(),
            clubId: clubId,
            teamId: teamId,
            role: user.role,
            referralCode: referralCode,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        
        createdUserIds.push(userId);
      }

      // Build final members array
      const finalMembers: Member[] = [...existingMembers];
      
      // Add new members
      usersToAdd.forEach((user, index) => {
        finalMembers.push({
          userId: createdUserIds[index],
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          role: user.role || 'view_only',
        });
      });

      // Update team with final members array
      await updateDoc(teamRef, {
        members: finalMembers,
        memberIds: finalMembers.map(m => m.userId),
        memberCount: finalMembers.length,
        updatedAt: serverTimestamp(),
      });

      onComplete();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to update members');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Manage Members for {teamName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View, add, or remove team members. New members will receive an invitation email.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Existing Members */}
      {existingMembers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Current Members ({existingMembers.length})
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
                {existingMembers.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveExistingMember(member.userId)}
                        color="error"
                        disabled={loading}
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

      {/* Add New Members */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Add New Members
        </Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
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
                    handleAddNewUser();
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
                    handleAddNewUser();
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
                onChange={(e) => setCurrentUser((prev) => ({ ...prev, email: e.target.value }))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewUser();
                  }
                }}
                required
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
              onClick={handleAddNewUser}
              startIcon={<AddIcon />}
              fullWidth
              disabled={!currentUser.firstName || !currentUser.lastName || !currentUser.email || loading}
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
      </Box>

      {/* Members to Add List */}
      {usersToAdd.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            New Members to Add ({usersToAdd.length})
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
                {usersToAdd.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveNewUser(user.id)}
                        color="error"
                        disabled={loading}
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button onClick={onBack} disabled={loading}>
          Back
        </Button>
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
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
}

