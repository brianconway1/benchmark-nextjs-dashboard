'use client';

import { Card, CardContent, Box, Typography } from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { appColors } from '@/theme';

interface SystemStatsProps {
  totalClubs: number;
  totalUsers: number;
  totalTeams: number;
  totalAdmins: number;
  loading?: boolean;
}

export default function SystemStats({
  totalClubs,
  totalUsers,
  totalTeams,
  totalAdmins,
  loading = false,
}: SystemStatsProps) {
  const stats = [
    {
      label: 'Total Clubs',
      value: totalClubs,
      icon: <BusinessIcon sx={{ fontSize: 40, color: appColors.primary }} />,
    },
    {
      label: 'Total Users',
      value: totalUsers,
      icon: <PeopleIcon sx={{ fontSize: 40, color: appColors.primary }} />,
    },
    {
      label: 'Total Teams',
      value: totalTeams,
      icon: <GroupsIcon sx={{ fontSize: 40, color: appColors.primary }} />,
    },
    {
      label: 'Total Admins',
      value: totalAdmins,
      icon: <AdminIcon sx={{ fontSize: 40, color: appColors.primary }} />,
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
      {stats.map((stat) => (
        <Card key={stat.label} sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {stat.icon}
              <Box sx={{ ml: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                  {loading ? '...' : stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

