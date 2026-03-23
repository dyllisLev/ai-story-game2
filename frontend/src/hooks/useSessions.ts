import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { SessionListItem } from '@story-game/shared';

// ─── useSessions ─────────────────────────────────────────────────────────────

export function useSessions(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sessions', { limit }],
    queryFn:  () => api.get<SessionListItem[]>(`/sessions?limit=${limit}&sort=last_played`),
    enabled:  !!user,
    staleTime: 1000 * 30,
  });
}
