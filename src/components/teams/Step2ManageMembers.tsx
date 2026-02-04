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
  Autocomplete,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isValidEmail } from '@/utils/validation';
import { appColors } from '@/theme';
import { validateUserLimit } from '@/lib/subscriptionValidation';
import type { User } from '@/types';

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
  clubName,
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

  // State for existing club members
  const [availableClubMembers, setAvailableClubMembers] = useState<User[]>([]);
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<User[]>([]);
  const [loadingClubMembers, setLoadingClubMembers] = useState(true);

  // Fetch existing club members who are not already on this team
  useEffect(() => {
    const fetchClubMembers = async () => {
      try {
        setLoadingClubMembers(true);
        const membersQuery = query(
          collection(db, 'users'),
          where('clubId', '==', clubId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        const allClubMembers = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];

        // Filter out members already on this team
        const existingMemberIds = new Set(initialMembers.map(m => m.userId));
        const availableMembers = allClubMembers.filter(
          member => !existingMemberIds.has(member.id)
        );

        setAvailableClubMembers(availableMembers);
      } catch (err) {
        console.error('Error fetching club members:', err);
      } finally {
        setLoadingClubMembers(false);
      }
    };

    fetchClubMembers();
  }, [clubId, initialMembers]);

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

  const handleAddExistingClubMember = (member: User | null) => {
    if (!member) return;

    // Check if already selected
    if (selectedExistingMembers.some(m => m.id === member.id)) {
      setError('This member has already been selected');
      return;
    }

    // Check if already on team (current members)
    if (existingMembers.some(m => m.userId === member.id)) {
      setError('This user is already a member of the team');
      return;
    }

    setSelectedExistingMembers(prev => [...prev, member]);
    // Remove from available list
    setAvailableClubMembers(prev => prev.filter(m => m.id !== member.id));
    setError('');
  };

  const handleRemoveSelectedExistingMember = (memberId: string) => {
    const removedMember = selectedExistingMembers.find(m => m.id === memberId);
    setSelectedExistingMembers(prev => prev.filter(m => m.id !== memberId));
    // Add back to available list
    if (removedMember) {
      setAvailableClubMembers(prev => [...prev, removedMember]);
    }
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

      // Create referral codes only - user documents will be created when they actually sign up
      // This prevents ID mismatch between pre-created docs and Firebase Auth UIDs
      for (const user of usersToAdd) {
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
          isMemberInvitation: true,
          maxUses: 1,
          usesCount: 0,
          active: true,
          createdAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          expiresAt,
        });
      }

      // Convert selected existing club members to Member format
      const existingClubMembersToAdd: Member[] = selectedExistingMembers.map(user => ({
        userId: user.id,
        name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        role: user.role,
      }));

      // Combine current members with newly selected existing club members
      const allMembers = [...existingMembers, ...existingClubMembersToAdd];

      // Update team with all members
      await updateDoc(teamRef, {
        members: allMembers,
        memberIds: allMembers.map(m => m.userId),
        memberCount: allMembers.length,
        updatedAt: serverTimestamp(),
      });

      // Update selected existing club members' teamId to link them to this team
      for (const user of selectedExistingMembers) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          teamId: teamId,
          updatedAt: serverTimestamp(),
        });
      }

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
        View, add, or remove team members. You can add existing club members or invite new people.
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

      {/* Add Existing Club Members */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Add Existing Club Members
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select from members who are already part of your club.
        </Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Autocomplete
            options={availableClubMembers}
            loading={loadingClubMembers}
            getOptionLabel={(option) => {
              const name = option.displayName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || 'Unknown';
              return `${name} (${option.email})`;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body1">
                    {option.displayName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email} - {option.role}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search existing club members"
                placeholder="Type to search..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingClubMembers ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            onChange={(_, value) => handleAddExistingClubMember(value)}
            value={null}
            disabled={loading}
            noOptionsText={loadingClubMembers ? "Loading..." : "No available club members"}
            sx={{ mb: 2 }}
          />

          {/* Selected existing members to add */}
          {selectedExistingMembers.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Club Members ({selectedExistingMembers.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedExistingMembers.map((member) => (
                  <Chip
                    key={member.id}
                    label={`${member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email} (${member.role})`}
                    onDelete={() => handleRemoveSelectedExistingMember(member.id)}
                    color="primary"
                    variant="outlined"
                    disabled={loading}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Add New Members */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Invite New Members
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Invite people who are not yet part of your club. They will receive an invitation email.
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

