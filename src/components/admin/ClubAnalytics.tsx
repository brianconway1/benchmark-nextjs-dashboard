'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  FitnessCenter as SessionIcon,
  SportsBasketball as DrillIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { appColors } from '@/theme';
import type { Team, User } from '@/types';

interface ClubAnalyticsProps {
  clubId: string;
  teams: Team[];
  members: User[];
}

interface TeamAnalytics {
  teamId: string;
  teamName: string;
  sessionsTotal: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  drillsTotal: number;
  drillsThisWeek: number;
  drillsThisMonth: number;
  contributors: string[];
}

interface DrillDoc {
  createdAt?: { toDate?: () => Date } | Date | string | number;
  createdBy?: string;
  uploadedBy?: string;
  userId?: string;
}

interface SessionDoc {
  teamId?: string;
  createdAt?: { toDate?: () => Date } | Date | string | number;
  date?: { toDate?: () => Date } | Date | string | number;
  createdBy?: string;
}

export default function ClubAnalytics({ clubId, teams, members }: ClubAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0);
  const [drillsTotal, setDrillsTotal] = useState(0);
  const [drillsThisWeek, setDrillsThisWeek] = useState(0);
  const [drillsThisMonth, setDrillsThisMonth] = useState(0);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!clubId || teams.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Calculate first day of week (Monday)
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday is start of week
        const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        firstDayOfWeek.setHours(0, 0, 0, 0);

        const teamIds = teams.map((t) => t.id);
        const memberIds = members.map((m) => m.id);

        // Create a map of user IDs to display names
        const userNameMap = new Map<string, string>();
        members.forEach((m) => {
          const name = m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Unknown';
          userNameMap.set(m.id, name);
        });

        // Create a map of team IDs to names
        const teamNameMap = new Map<string, string>();
        teams.forEach((t) => {
          teamNameMap.set(t.id, t.name);
        });

        // Fetch sessions for all teams (Firestore 'in' query supports up to 30 items)
        let allSessions: { teamId: string; data: SessionDoc }[] = [];
        for (let i = 0; i < teamIds.length; i += 30) {
          const batch = teamIds.slice(i, i + 30);
          const sessionsSnapshot = await getDocs(
            query(collection(db, 'sessions'), where('teamId', 'in', batch))
          );
          sessionsSnapshot.docs.forEach((doc) => {
            const data = doc.data() as SessionDoc;
            allSessions.push({ teamId: data.teamId || '', data });
          });
        }

        // Fetch team_drills for all teams
        let allTeamDrills: { teamId: string; data: DrillDoc }[] = [];
        for (let i = 0; i < teamIds.length; i += 30) {
          const batch = teamIds.slice(i, i + 30);
          const drillsSnapshot = await getDocs(
            query(collection(db, 'team_drills'), where('teamId', 'in', batch))
          );
          drillsSnapshot.docs.forEach((doc) => {
            const data = doc.data() as DrillDoc & { teamId: string };
            allTeamDrills.push({ teamId: data.teamId || '', data });
          });
        }

        // Fetch user_drills for all members
        let allUserDrills: { userId: string; data: DrillDoc }[] = [];
        if (memberIds.length > 0) {
          for (let i = 0; i < memberIds.length; i += 30) {
            const batch = memberIds.slice(i, i + 30);
            const userDrillsSnapshot = await getDocs(
              query(collection(db, 'user_drills'), where('userId', 'in', batch))
            );
            userDrillsSnapshot.docs.forEach((doc) => {
              const data = doc.data() as DrillDoc & { userId: string };
              allUserDrills.push({ userId: data.userId || '', data });
            });
          }
        }

        // Helper to parse date field
        const parseDate = (dateField: DrillDoc['createdAt'] | SessionDoc['date']): Date | null => {
          if (!dateField) return null;
          if (typeof dateField === 'object' && 'toDate' in dateField && dateField.toDate) {
            return dateField.toDate();
          } else if (dateField instanceof Date) {
            return dateField;
          } else if (typeof dateField === 'string' || typeof dateField === 'number') {
            return new Date(dateField);
          }
          return null;
        };

        // Helper to check if a date is this month
        const isThisMonth = (dateField: DrillDoc['createdAt'] | SessionDoc['date']): boolean => {
          const date = parseDate(dateField);
          return date !== null && date >= firstDayOfMonth;
        };

        // Helper to check if a date is this week
        const isThisWeek = (dateField: DrillDoc['createdAt'] | SessionDoc['date']): boolean => {
          const date = parseDate(dateField);
          return date !== null && date >= firstDayOfWeek;
        };

        // Calculate totals
        const totalSessions = allSessions.length;
        const weekSessions = allSessions.filter((s) => isThisWeek(s.data.date || s.data.createdAt)).length;
        const monthSessions = allSessions.filter((s) => isThisMonth(s.data.date || s.data.createdAt)).length;

        const totalDrills = allTeamDrills.length + allUserDrills.length;
        const weekDrills =
          allTeamDrills.filter((d) => isThisWeek(d.data.createdAt)).length +
          allUserDrills.filter((d) => isThisWeek(d.data.createdAt)).length;
        const monthDrills =
          allTeamDrills.filter((d) => isThisMonth(d.data.createdAt)).length +
          allUserDrills.filter((d) => isThisMonth(d.data.createdAt)).length;

        setSessionsTotal(totalSessions);
        setSessionsThisWeek(weekSessions);
        setSessionsThisMonth(monthSessions);
        setDrillsTotal(totalDrills);
        setDrillsThisWeek(weekDrills);
        setDrillsThisMonth(monthDrills);

        // Calculate per-team analytics
        const teamStats = new Map<string, TeamAnalytics>();

        // Initialize all teams
        teams.forEach((team) => {
          teamStats.set(team.id, {
            teamId: team.id,
            teamName: team.name,
            sessionsTotal: 0,
            sessionsThisWeek: 0,
            sessionsThisMonth: 0,
            drillsTotal: 0,
            drillsThisWeek: 0,
            drillsThisMonth: 0,
            contributors: [],
          });
        });

        // Count sessions per team
        allSessions.forEach((session) => {
          const teamId = session.teamId;
          const stats = teamStats.get(teamId);
          if (stats) {
            stats.sessionsTotal++;
            const sessionDate = session.data.date || session.data.createdAt;
            if (isThisWeek(sessionDate)) {
              stats.sessionsThisWeek++;
            }
            if (isThisMonth(sessionDate)) {
              stats.sessionsThisMonth++;
            }
            // Track contributor
            const creatorId = session.data.createdBy;
            if (creatorId && !stats.contributors.includes(userNameMap.get(creatorId) || creatorId)) {
              const name = userNameMap.get(creatorId);
              if (name) stats.contributors.push(name);
            }
          }
        });

        // Count team drills per team
        allTeamDrills.forEach((drill) => {
          const teamId = drill.teamId;
          const stats = teamStats.get(teamId);
          if (stats) {
            stats.drillsTotal++;
            if (isThisWeek(drill.data.createdAt)) {
              stats.drillsThisWeek++;
            }
            if (isThisMonth(drill.data.createdAt)) {
              stats.drillsThisMonth++;
            }
            // Track contributor
            const creatorId = drill.data.createdBy || drill.data.uploadedBy;
            if (creatorId && !stats.contributors.includes(userNameMap.get(creatorId) || creatorId)) {
              const name = userNameMap.get(creatorId);
              if (name) stats.contributors.push(name);
            }
          }
        });

        // For user drills, we need to map them to teams via user's teamId
        const userToTeamMap = new Map<string, string>();
        members.forEach((m) => {
          if (m.teamId) {
            userToTeamMap.set(m.id, m.teamId);
          }
        });

        allUserDrills.forEach((drill) => {
          const userId = drill.userId;
          const teamId = userToTeamMap.get(userId);
          if (teamId) {
            const stats = teamStats.get(teamId);
            if (stats) {
              stats.drillsTotal++;
              if (isThisWeek(drill.data.createdAt)) {
                stats.drillsThisWeek++;
              }
              if (isThisMonth(drill.data.createdAt)) {
                stats.drillsThisMonth++;
              }
              const name = userNameMap.get(userId);
              if (name && !stats.contributors.includes(name)) {
                stats.contributors.push(name);
              }
            }
          }
        });

        // Convert to array and sort by activity
        const analyticsArray = Array.from(teamStats.values())
          .filter((t) => t.sessionsTotal > 0 || t.drillsTotal > 0)
          .sort((a, b) => (b.sessionsTotal + b.drillsTotal) - (a.sessionsTotal + a.drillsTotal));

        setTeamAnalytics(analyticsArray);
      } catch (error) {
        console.error('Error fetching club analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [clubId, teams, members]);

  if (loading) {
    return (
      <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress size={40} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 3 }}>
        Activity Analytics
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: appColors.backgroundGrey,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: appColors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SessionIcon sx={{ color: appColors.primaryText }} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Training Sessions
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                {sessionsTotal}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: appColors.success }}>
                +{sessionsThisWeek} this week
              </Typography>
              <Typography variant="caption" sx={{ color: appColors.success }}>
                +{sessionsThisMonth} this month
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: appColors.backgroundGrey,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: appColors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DrillIcon sx={{ color: appColors.primaryText }} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Custom Drills
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: appColors.textPrimary }}>
                {drillsTotal}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: appColors.success }}>
                +{drillsThisWeek} this week
              </Typography>
              <Typography variant="caption" sx={{ color: appColors.success }}>
                +{drillsThisMonth} this month
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Team Breakdown Table */}
      {teamAnalytics.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: appColors.textPrimary, mb: 2 }}>
            Breakdown by Team
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Sessions</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Drills</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Contributors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamAnalytics.map((team) => (
                  <TableRow key={team.teamId} hover>
                    <TableCell>{team.teamName}</TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {team.sessionsTotal}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {team.sessionsThisWeek > 0 && (
                            <Typography variant="caption" sx={{ color: appColors.success }}>
                              +{team.sessionsThisWeek}w
                            </Typography>
                          )}
                          {team.sessionsThisMonth > 0 && (
                            <Typography variant="caption" sx={{ color: appColors.success }}>
                              +{team.sessionsThisMonth}m
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {team.drillsTotal}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {team.drillsThisWeek > 0 && (
                            <Typography variant="caption" sx={{ color: appColors.success }}>
                              +{team.drillsThisWeek}w
                            </Typography>
                          )}
                          {team.drillsThisMonth > 0 && (
                            <Typography variant="caption" sx={{ color: appColors.success }}>
                              +{team.drillsThisMonth}m
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {team.contributors.slice(0, 3).map((name, idx) => (
                          <Chip
                            key={idx}
                            label={name}
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {team.contributors.length > 3 && (
                          <Chip
                            label={`+${team.contributors.length - 3}`}
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {sessionsTotal === 0 && drillsTotal === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No activity data available for this club yet.
        </Typography>
      )}
    </Paper>
  );
}
