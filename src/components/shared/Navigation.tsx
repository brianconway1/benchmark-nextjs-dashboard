'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle as AccountIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  CreditCard as CreditCardIcon,
  Business as BusinessIcon,
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Analytics as AnalyticsIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  FitnessCenter as FitnessCenterIcon,
  VideoLibrary as VideoLibraryIcon,
  SportsGymnastics as SportsGymnasticsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { appColors } from '@/theme';

const DRAWER_WIDTH = 280;

interface NavigationProps {
  userData: User | null;
  currentPath: string;
}

export default function Navigation({ userData, currentPath }: NavigationProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [hasTeams, setHasTeams] = useState<boolean | null>(null); // null = loading, true/false = loaded

  const isSuperAdmin = userData?.role === 'super_admin';
  const isClubAdmin = userData?.role === 'club_admin' || userData?.role === 'club_admin_coach';
  const userMenuOpen = Boolean(anchorEl);

  // Check if club has teams
  useEffect(() => {
    const checkTeams = async () => {
      if (!isClubAdmin || !userData?.clubId) {
        setHasTeams(false);
        return;
      }

      try {
        const teamsQuery = query(
          collection(db, 'teams'),
          where('clubId', '==', userData.clubId)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        setHasTeams(!teamsSnapshot.empty);
      } catch (error) {
        console.error('Error checking teams:', error);
        setHasTeams(false);
      }
    };

    checkTeams();
  }, [isClubAdmin, userData?.clubId]);

  // Navigation items based on role
  const getNavItems = () => {
    if (isSuperAdmin) {
      return [
        { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
        { label: 'Create Club', path: '/admin/clubs/create', icon: <AddIcon /> },
        { label: 'All Clubs', path: '/admin/clubs', icon: <AdminIcon /> },
        { label: 'User Management', path: '/admin/users', icon: <PeopleIcon /> },
        { label: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCardIcon /> },
        { label: 'Audit Log', path: '/admin/audit-log', icon: <HistoryIcon /> },
        { label: 'Bulk Drill Upload', path: '/admin/bulk-upload', icon: <UploadIcon /> },
        { label: 'Benchmark Drills', path: '/admin/benchmark-drills', icon: <FitnessCenterIcon /> },
        { label: 'Benchmark Exercises', path: '/admin/benchmark-exercises', icon: <SportsGymnasticsIcon /> },
        { label: 'Masterclasses', path: '/admin/masterclasses', icon: <VideoLibraryIcon /> },
        // { label: 'Analytics', path: '/admin/analytics', icon: <AnalyticsIcon /> },
        // { label: 'System Settings', path: '/admin/settings', icon: <SettingsIcon /> },
      ];
    }

    if (isClubAdmin) {
      const items = [
        { label: 'Dashboard', path: '/club', icon: <DashboardIcon /> },
        { label: 'Club', path: '/club/info', icon: <BusinessIcon /> },
        { label: 'Teams', path: '/club/teams', icon: <GroupsIcon /> },
        { label: 'Members', path: '/club/members', icon: <PeopleIcon /> },
        { label: 'Referral Codes', path: '/club/referral-codes', icon: <VpnKeyIcon /> },
        { label: 'Subscriptions', path: '/club/subscriptions', icon: <CreditCardIcon /> },
      ];

      // Show onboarding if club has no teams yet
      if (hasTeams === false) {
        items.push({ label: 'Onboarding', path: '/onboarding', icon: <SchoolIcon /> });
      }

      return items;
    }

    return [];
  };

  const navItems = getNavItems();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleUserMenuClose();
    await signOut();
    // Use window.location for a full page redirect to ensure clean state
    window.location.href = '/login';
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const displayName =
    userData?.displayName ||
    `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
    userData?.email ||
    'User';

  // Format role for display
  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    const roleMap: Record<string, string> = {
      super_admin: 'Super Admin',
      club_admin: 'Club Admin',
      club_admin_coach: 'Admin Coach',
      coach: 'Coach',
      view_only: 'View Only',
    };
    return roleMap[role] || role;
  };

  const roleLabel = getRoleLabel(userData?.role);

  // Sidebar Drawer Content
  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ borderBottom: '1px solid #333333', backgroundColor: appColors.textPrimary }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
          Benchmark Coach
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {navItems.map((item) => {
          // Check if current path matches or starts with the nav item path (for nested routes)
          // For exact matches like '/club', only match exactly (not '/club/teams')
          // For paths like '/club/teams', match '/club/teams' and anything starting with '/club/teams/'
          let isActive = false;
          if (currentPath === item.path) {
            // Exact match
            isActive = true;
          } else if (currentPath.startsWith(item.path + '/')) {
            // Check if there's a more specific nav item that should match instead
            // For example, if we're on '/club/teams' and checking '/club', we should not match
            // because '/club/teams' is a more specific nav item
            const hasMoreSpecificMatch = navItems.some(
              (otherItem) =>
                otherItem.path !== item.path &&
                otherItem.path.startsWith(item.path + '/') &&
                currentPath.startsWith(otherItem.path)
            );
            // Only match if there's no more specific nav item that should be active
            if (!hasMoreSpecificMatch) {
              isActive = true;
            }
          }
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: appColors.primary,
                    color: appColors.primaryText,
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: appColors.primaryHover,
                    },
                    '& .MuiListItemIcon-root': {
                      color: appColors.primaryText,
                    },
                  },
                  '&:hover': {
                    backgroundColor: appColors.backgroundGrey,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? appColors.primaryText : appColors.textSecondary }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1 }}>
          <AccountIcon sx={{ mr: 1, color: appColors.textSecondary }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: appColors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </Typography>
              {roleLabel && (
                <Chip
                  label={roleLabel}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 'medium',
                    backgroundColor: '#e0e0e0',
                    color: appColors.textPrimary,
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
              {userData?.email}
            </Typography>
          </Box>
        </Box>
        <ListItemButton
          onClick={handleSignOut}
          sx={{
            borderRadius: 1,
            '&:hover': {
              backgroundColor: appColors.backgroundGrey,
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon sx={{ color: appColors.textSecondary }} />
          </ListItemIcon>
          <ListItemText primary="Sign Out" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: appColors.textPrimary,
          color: '#ffffff',
          boxShadow: 'none',
          borderBottom: '1px solid #333333',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 'bold' }}
          >
            {isClubAdmin && userData?.clubId ? 'Club Dashboard' : isSuperAdmin ? 'Admin Dashboard' : 'Dashboard'}
          </Typography>

          {/* User Menu */}
          <IconButton
            onClick={handleUserMenuOpen}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#333333',
              },
            }}
          >
            <AccountIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid #e0e0e0',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={userMenuOpen}
        onClose={handleUserMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem disabled>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {displayName}
          </Typography>
        </MenuItem>
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            {userData?.email}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>
          <LogoutIcon sx={{ mr: 1 }} />
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  );
}

