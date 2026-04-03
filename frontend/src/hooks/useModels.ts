// hooks/useModels.ts
// Fetch user's available Gemini models from API

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface GeminiModel {
  id: string;
  label: string;
  description?: string;
  version?: string;
}

interface ModelsResponse {
  models: GeminiModel[];
}

const STALE_TIME = 10 * 60 * 1000; // 10 minutes - models don't change frequently

export function useModels(hasApiKey: boolean) {
  return useQuery<GeminiModel[]>({
    queryKey: ['models'],
    queryFn: async () => {
      const response = await api.get<ModelsResponse>('/me/models');
      return response.models;
    },
    enabled: hasApiKey, // Only fetch if user has an API key
    staleTime: STALE_TIME,
    retry: 1,
  });
}
