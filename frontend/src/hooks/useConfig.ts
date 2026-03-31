// hooks/useConfig.ts
// Fetch and cache application config from /api/config

import { useQuery } from '@tanstack/react-query';
import type { AppConfig } from '@story-game/shared';
import { api } from '@/lib/api';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useConfig() {
  return useQuery<AppConfig>({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/config'),
    staleTime: STALE_TIME,
    retry: 1,
  });
}
