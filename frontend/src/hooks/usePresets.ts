// hooks/usePresets.ts
// Load story presets and status presets from the API

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Preset, StatusPreset } from '@story-game/shared';

interface UsePresetsReturn {
  presets: Preset[];
  statusPresets: StatusPreset[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePresets(): UsePresetsReturn {
  const presetsQuery = useQuery<Preset[]>({
    queryKey: ['presets'],
    queryFn: () => api.get<Preset[]>('/presets'),
    staleTime: 60_000,
  });

  const statusPresetsQuery = useQuery<StatusPreset[]>({
    queryKey: ['status-presets'],
    queryFn: () => api.get<StatusPreset[]>('/status-presets'),
    staleTime: 60_000,
  });

  const isLoading = presetsQuery.isLoading || statusPresetsQuery.isLoading;
  const error = (presetsQuery.error ?? statusPresetsQuery.error) as Error | null;

  const refetch = () => {
    void presetsQuery.refetch();
    void statusPresetsQuery.refetch();
  };

  return {
    presets: presetsQuery.data ?? [],
    statusPresets: statusPresetsQuery.data ?? [],
    isLoading,
    error,
    refetch,
  };
}
