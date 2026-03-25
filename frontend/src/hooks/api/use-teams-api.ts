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
    queryFn: async () => {
      const response = await apiClient.get<TeamRead[]>(API_ENDPOINTS.teams);
      return response.data;
    },
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['teams', teamId, 'users'],
    queryFn: async () => {
      const response = await apiClient.get<TeamMemberRead[]>(
        API_ENDPOINTS.teamMembers(teamId!)
      );
      return response.data;
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.post<TeamRead>(API_ENDPOINTS.teams, { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
