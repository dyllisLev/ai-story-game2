import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PromptConfig, GameplayConfig } from '@story-game/shared';

export type { PromptConfig, GameplayConfig };

export interface AdminConfig {
  prompt_config: PromptConfig;
  gameplay_config: GameplayConfig;
}

/* ── Hook ── */

export function useAdminConfig() {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: config, isLoading, error } = useQuery<AdminConfig>({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      // API returns camelCase keys: promptConfig, gameplayConfig
      const raw = await api.get<{ promptConfig: PromptConfig; gameplayConfig: GameplayConfig }>('/config');
      return {
        prompt_config: raw.promptConfig,
        gameplay_config: raw.gameplayConfig,
      };
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (next: AdminConfig) => api.put('/config', next),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved');
      setLastSaved(new Date());
      void queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    },
  });

  const save = useCallback(
    (next: AdminConfig) => mutation.mutate(next),
    [mutation],
  );

  return {
    config,
    isLoading,
    error,
    save,
    saveStatus,
    lastSaved,
  };
}
