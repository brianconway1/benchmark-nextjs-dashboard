'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import type { Team } from '@/types';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, doc, setDoc, updateDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidEmail } from '@/utils/validation';
import { appColors } from '@/theme';

interface UserToCreate {
  id: string;
  teamId: string;
  teamName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Step3CreateUsersProps {
  clubId: string | null;
  teams: Array<Partial<Team> & { tempId?: string; ageGroup?: string; logoUrl?: string | null }>;
  onComplete: () => void;
  onBack: () => void;
}

export default function Step3CreateUsers({
  clubId,
  teams,
  onComplete,
  onBack,
}: Step3CreateUsersProps) {
  const [users, setUsers] = useState<UserToCreate[]>([]);
  const [currentUser, setCurrentUser] = useState({
    teamId: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'coach',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddUser = () => {
    if (!currentUser.teamId || !currentUser.firstName || !currentUser.lastName || !currentUser.email) {
      setError('All fields are required');
      return;
    }

    if (!isValidEmail(currentUser.email)) {
      setError('Please enter a valid email address');
      return;
    }

    const selectedTeam = teams.find((t) => t.tempId === currentUser.teamId);
    if (!selectedTeam) {
      setError('Please select a team');
      return;
    }

    const newUser: UserToCreate = {
      id: `temp-${Date.now()}`,
      teamId: currentUser.teamId,
      teamName: selectedTeam.name || '',
      firstName: currentUser.firstName.trim(),
      lastName: currentUser.lastName.trim(),
      email: currentUser.email.trim().toLowerCase(),
      role: currentUser.role,
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser({
      teamId: '',
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
    if (users.length === 0) {
      setError('Please add at least one user');
      return;
    }

    if (!clubId) {
      setError('Club ID is missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create teams first (if they have tempIds)
      const teamIdMap: Record<string, string> = {};
      
      for (const team of teams) {
        if (team.tempId) {
          const teamRef = doc(collection(db, 'teams'));
          await setDoc(teamRef, {
            name: team.name,
            clubId: clubId,
            ageGroup: team.ageGroup || null,
            logoUrl: team.logoUrl || null,
            members: [],
            memberIds: [],
            memberCount: 0,
            coaches: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          teamIdMap[team.tempId] = teamRef.id;
        }
      }

      // Create users and referral codes, track user IDs by team
      const teamMembersMap: Record<string, Array<{ userId: string; name: string; email: string; role: string }>> = {};
      
      for (const user of users) {
        const actualTeamId = teamIdMap[user.teamId] || user.teamId;
        
        // Initialize team members array if needed
        if (!teamMembersMap[actualTeamId]) {
          teamMembersMap[actualTeamId] = [];
        }
        
        // Generate referral code
        const generateReferralCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let result = '';
          for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return result;
        };

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
            teamId: actualTeamId,
            intendedRole: user.role,
            adminEmail: user.email,
            isMemberInvitation: true, // Flag to indicate this is a member invitation (not admin signup)
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
            teamId: actualTeamId,
            role: user.role,
            referralCode: referralCode,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        
        // Track user for team members array
        teamMembersMap[actualTeamId].push({
          userId: userId,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          role: user.role || 'view_only',
        });
      }

      // Update teams with members arrays
      for (const [teamId, members] of Object.entries(teamMembersMap)) {
        if (members.length > 0) {
          const teamRef = doc(db, 'teams', teamId);
          const teamDoc = await getDoc(teamRef);
          
          if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            const existingMembers = teamData.members || [];
            
            // Merge with existing members (avoid duplicates)
            const allMembers = [...existingMembers];
            members.forEach(newMember => {
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
      }

      onComplete();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create users');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add Users to Teams
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add users to your teams. They will receive referral codes to sign up in the mobile app.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Autocomplete
              options={teams}
              getOptionLabel={(option) => option.name || ''}
              value={teams.find((t) => t.tempId === currentUser.teamId) || null}
              onChange={(_, value) =>
                setCurrentUser((prev) => ({
                  ...prev,
                  teamId: value?.tempId || '',
                }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Team" required />
              )}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="First Name"
              value={currentUser.firstName}
              onChange={(e) =>
                setCurrentUser((prev) => ({ ...prev, firstName: e.target.value }))
              }
              required
            />
            <TextField
              sx={{ flex: 1 }}
              label="Last Name"
              value={currentUser.lastName}
              onChange={(e) =>
                setCurrentUser((prev) => ({ ...prev, lastName: e.target.value }))
              }
              required
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="Email"
              type="email"
              value={currentUser.email}
              onChange={(e) =>
                setCurrentUser((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={currentUser.role}
                label="Role"
                onChange={(e) =>
                  setCurrentUser((prev) => ({ ...prev, role: e.target.value }))
                }
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
            disabled={!currentUser.teamId || !currentUser.firstName || !currentUser.lastName || !currentUser.email}
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
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Team</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.teamName}</TableCell>
                  <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveUser(user.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
            No users added yet. Add users above to get started.
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleComplete}
          disabled={loading || users.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Creating Users...' : 'Complete Onboarding'}
        </Button>
      </Box>
    </Box>
  );
}

