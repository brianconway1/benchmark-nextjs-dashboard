'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Club } from '@/types';
import MemberList from '@/components/club/MemberList';
import InviteMemberModal from '@/components/club/InviteMemberModal';
import EditUserModal from '@/components/club/EditUserModal';
import RemoveUserModal from '@/components/club/RemoveUserModal';
import { appColors } from '@/theme';

export default function MembersPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);


  useEffect(() => {
    const loadData = async () => {
      if (!userData?.clubId || authLoading) return;

      try {
        setLoading(true);
        setError('');

        // Load club
        const clubDoc = await getDoc(doc(db, 'sports_clubs', userData.clubId));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        } else {
          setError('Club not found');
          return;
        }

        // Load members
        await loadMembers();
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userData?.clubId, authLoading]);

  const loadMembers = async () => {
    if (!userData?.clubId) return;

    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('clubId', '==', userData.clubId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const membersData = membersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setMembers(membersData);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load members');
    }
  };

  const handleInvite = () => {
    setInviteModalOpen(true);
  };

  const handleEdit = (member: User) => {
    setSelectedUser(member);
    setEditModalOpen(true);
  };

  const handleRemove = (member: User) => {
    setSelectedUser(member);
    setRemoveModalOpen(true);
  };

  const handleInviteSent = () => {
    loadMembers();
  };

  const handleUserUpdated = () => {
    loadMembers();
  };

  const handleUserRemoved = () => {
    loadMembers();
  };

  if (loading) {
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

  if (!club) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
            Members
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage club members and send invitations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleInvite}
          sx={{
            backgroundColor: appColors.primary,
            color: appColors.primaryText,
            fontWeight: 'bold',
            '&:hover': { backgroundColor: appColors.primaryHover },
          }}
        >
          Invite Member
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <MemberList
        members={members}
        onEdit={handleEdit}
        onRemove={handleRemove}
        loading={loading}
      />

      <InviteMemberModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInviteSent={handleInviteSent}
        clubId={club.id}
        clubName={club.name}
      />

      <EditUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        onUserUpdated={handleUserUpdated}
        user={selectedUser}
      />

      <RemoveUserModal
        open={removeModalOpen}
        onClose={() => {
          setRemoveModalOpen(false);
          setSelectedUser(null);
        }}
        onUserRemoved={handleUserRemoved}
        user={selectedUser}
        clubId={club.id}
      />
    </Container>
  );
}

