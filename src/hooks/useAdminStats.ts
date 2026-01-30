'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SystemHealth {
  orphanedUsers: {
    usersWithoutClub: number;
    usersWithoutTeam: number;
    sessionsWithoutTeam: number;
    total: number;
  };
  systemActivity: {
    recentUsers: number;
    recentSessions: number;
    recentClubs: number;
    totalActivity: number;
    status: string;
  };
}

interface AdminStats {
  totalClubs: number;
  clubsThisMonth: number;
  activeUsers: number;
  usersThisMonth: number;
  sessionsCreated: number;
  sessionsThisMonth: number;
  totalTeams: number;
  totalAdmins: number;
  systemHealth: SystemHealth;
  loading: boolean;
  error: string | null;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalClubs: 0,
    clubsThisMonth: 0,
    activeUsers: 0,
    usersThisMonth: 0,
    sessionsCreated: 0,
    sessionsThisMonth: 0,
    totalTeams: 0,
    totalAdmins: 0,
    systemHealth: {
      orphanedUsers: {
        usersWithoutClub: 0,
        usersWithoutTeam: 0,
        sessionsWithoutTeam: 0,
        total: 0,
      },
      systemActivity: {
        recentUsers: 0,
        recentSessions: 0,
        recentClubs: 0,
        totalActivity: 0,
        status: 'Unknown',
      },
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true, error: null }));

      // Get current date and first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch all data in parallel for better performance
      const [
        clubsSnapshot,
        clubsThisMonthSnapshot,
        usersSnapshot,
        usersThisMonthSnapshot,
        sessionsSnapshot,
        sessionsThisMonthSnapshot,
        teamsSnapshot,
        superAdminQuery,
        clubAdminQuery,
        clubAdminCoachQuery,
      ] = await Promise.all([
        getDocs(collection(db, 'sports_clubs')),
        getDocs(query(collection(db, 'sports_clubs'), where('createdAt', '>=', firstDayOfMonth))),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'users'), where('createdAt', '>=', firstDayOfMonth))),
        getDocs(collection(db, 'sessions')),
        getDocs(query(collection(db, 'sessions'), where('date', '>=', firstDayOfMonth))),
        getDocs(collection(db, 'teams')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'super_admin'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'club_admin'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'club_admin_coach'))),
      ]);

      const totalClubs = clubsSnapshot.size;
      const clubsThisMonth = clubsThisMonthSnapshot.size;
      const activeUsers = usersSnapshot.size; // Total users since we don't have login tracking
      const usersThisMonth = usersThisMonthSnapshot.size;
      const sessionsCreated = sessionsSnapshot.size;
      const sessionsThisMonth = sessionsThisMonthSnapshot.size;
      const totalTeams = teamsSnapshot.size;
      const totalAdmins = superAdminQuery.size + clubAdminQuery.size + clubAdminCoachQuery.size;

      // System Health Monitoring - fetch in parallel
      const systemHealth = await checkSystemHealth(twentyFourHoursAgo);

      setStats({
        totalClubs,
        clubsThisMonth,
        activeUsers,
        usersThisMonth,
        sessionsCreated,
        sessionsThisMonth,
        totalTeams,
        totalAdmins,
        systemHealth,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load statistics',
      }));
    }
  };

  const checkSystemHealth = async (twentyFourHoursAgo: Date): Promise<SystemHealth> => {
    try {
      // Check for orphaned users and recent activity in parallel
      const [
        usersWithoutClubSnapshot,
        usersWithoutTeamSnapshot,
        sessionsWithoutTeamSnapshot,
        recentUsersSnapshot,
        recentSessionsSnapshot,
        recentClubsSnapshot,
      ] = await Promise.all([
        // Note: Firestore doesn't support querying for null directly
        // We'll need to check this differently or use a different approach
        // For now, we'll skip this check and calculate it differently if needed
        Promise.resolve({ size: 0 } as { size: number }),
        Promise.resolve({ size: 0 } as { size: number }),
        getDocs(query(collection(db, 'sessions'), where('teamId', '==', null))),
        getDocs(query(collection(db, 'users'), where('createdAt', '>=', twentyFourHoursAgo))),
        getDocs(query(collection(db, 'sessions'), where('date', '>=', twentyFourHoursAgo))),
        getDocs(query(collection(db, 'sports_clubs'), where('createdAt', '>=', twentyFourHoursAgo))),
      ]);

      const usersWithoutClub = 0; // Would need different query approach
      const usersWithoutTeam = 0; // Would need different query approach
      const sessionsWithoutTeam = sessionsWithoutTeamSnapshot.size;
      const totalOrphaned = usersWithoutClub + usersWithoutTeam + sessionsWithoutTeam;

      const recentUsers = recentUsersSnapshot.size;
      const recentSessions = recentSessionsSnapshot.size;
      const recentClubs = recentClubsSnapshot.size;
      const totalRecentActivity = recentUsers + recentSessions + recentClubs;

      let status = 'No Activity';
      if (totalRecentActivity > 0) {
        if (totalRecentActivity >= 10) status = 'High Activity';
        else if (totalRecentActivity >= 5) status = 'Moderate Activity';
        else status = 'Low Activity';
      }

      return {
        orphanedUsers: {
          usersWithoutClub,
          usersWithoutTeam,
          sessionsWithoutTeam,
          total: totalOrphaned,
        },
        systemActivity: {
          recentUsers,
          recentSessions,
          recentClubs,
          totalActivity: totalRecentActivity,
          status,
        },
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        orphanedUsers: {
          usersWithoutClub: 0,
          usersWithoutTeam: 0,
          sessionsWithoutTeam: 0,
          total: 0,
        },
        systemActivity: {
          recentUsers: 0,
          recentSessions: 0,
          recentClubs: 0,
          totalActivity: 0,
          status: 'Error',
        },
      };
    }
  };

  const formatChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? `+${current} this month` : '0 this month';
    }
    const change = current - previous;
    const percentage = Math.round((change / previous) * 100);
    return change >= 0 ? `+${percentage}% this month` : `${percentage}% this month`;
  };

  const formatUserChange = (current: number) => {
    return current > 0 ? `+${current} this month` : '0 this month';
  };

  return {
    ...stats,
    formatChange,
    formatUserChange,
    refetch: fetchStats,
  };
}

