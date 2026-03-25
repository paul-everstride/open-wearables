import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

export interface TeamRead {
  id: string;
  name: string;
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
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['teams', teamId, 'users'],
    queryFn: () => apiClient.get<TeamMemberRead[]>(API_ENDPOINTS.teamMembers(teamId!)),
    enabled: !!teamId,
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
