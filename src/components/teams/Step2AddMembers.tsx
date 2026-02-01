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
import { collection, doc, setDoc, updateDoc, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidEmail } from '@/utils/validation';
import { appColors } from '@/theme';
import { validateUserLimit } from '@/lib/subscriptionValidation';

interface UserToAdd {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
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
  const [loading, setLoading] = useState(false);

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

    // Check for duplicate email
    if (users.some((u) => u.email.toLowerCase() === currentUser.email.toLowerCase())) {
      setError('This email has already been added');
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

      // Create users and referral codes, collect user IDs
      const createdUserIds: string[] = [];
      
      for (const user of users) {
        const referralCode = generateReferralCode();

        // Create user document first to get the ID
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
            isMemberInvitation: true, // Flag to trigger email
            maxUses: 1,
            usesCount: 0,
            active: true,
            createdAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });

          // Create user document (without Firebase Auth - they'll sign up later)
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
        
        // Store user ID for team members array
        createdUserIds.push(userId);
      }

      // Update team's members array with the created user IDs
      if (createdUserIds.length > 0) {
        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);
        
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          const existingMembers = teamData.members || [];
          
          // Create member objects with user info
          const newMembers = users.map((user, index) => ({
            userId: createdUserIds[index],
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: user.role || 'view_only',
          }));
          
          // Merge with existing members (avoid duplicates)
          const allMembers = [...existingMembers];
          newMembers.forEach(newMember => {
            if (!allMembers.find(m => m.userId === newMember.userId)) {
              allMembers.push(newMember);
            }
          });
          
          // Update team with members array and memberCount
          await updateDoc(teamRef, {
            members: allMembers,
            memberIds: allMembers.map(m => m.userId),
            memberCount: allMembers.length,
            updatedAt: serverTimestamp(),
          });
        }
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
              onChange={(e) => setCurrentUser((prev) => ({ ...prev, email: e.target.value }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUser();
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

      {users.length === 0 && (
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
            No members added yet. Add members above or skip to finish.
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
            {loading ? 'Adding Members...' : users.length === 0 ? 'Finish' : `Finish (${users.length} member${users.length !== 1 ? 's' : ''})`}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

