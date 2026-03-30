import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export interface TeamRead {
  id: string;
  name: string;
  coach_email: string | null;
  created_at: string;
}

export interface TeamMemberRead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  external_user_id: string | null;
  created_at: string;
}

export function useTeamsApi() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.get<TeamRead[]>(API_ENDPOINTS.teams),
    staleTime: 0,
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['teams', teamId, 'users'],
    queryFn: () => apiClient.get<TeamMemberRead[]>(API_ENDPOINTS.teamMembers(teamId!)),
    enabled: !!teamId,
  });
}

export interface TeamMembershipRead {
  team_id: string;
  team_name: string;
  coach_email: string | null;
  user_id: string;
}

export function useTeamMemberships() {
  return useQuery({
    queryKey: ['teams', 'members'],
    queryFn: () => apiClient.get<TeamMembershipRead[]>('/api/v1/teams/members'),
    staleTime: 0,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<TeamRead>(API_ENDPOINTS.teams, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export interface CoachRead {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  team_count: number;
}

export function useCoaches() {
  return useQuery({
    queryKey: ['coaches'],
    queryFn: () => apiClient.get<CoachRead[]>('/api/v1/coaches'),
    staleTime: 0,
  });
}

export function useCoachTeams(coachEmail: string | null) {
  return useQuery({
    queryKey: ['coaches', coachEmail, 'teams'],
    queryFn: () => apiClient.get<TeamRead[]>(`/api/v1/coaches/${encodeURIComponent(coachEmail!)}/teams`),
    enabled: !!coachEmail,
    staleTime: 0,
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiClient.post(`/api/v1/teams/${teamId}/users/${userId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiClient.delete(`/api/v1/teams/${teamId}/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
