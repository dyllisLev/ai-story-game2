// frontend/src/hooks/useFeedbackStats.ts
// AI-264: 피드백 통계 훅
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { FeedbackAdminStats } from '@story-game/shared';

interface UseFeedbackStatsResult {
  stats: FeedbackAdminStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFeedbackStats(): UseFeedbackStatsResult {
  const [stats, setStats] = useState<FeedbackAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<FeedbackAdminStats>('/feedback/admin/stats');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('통계 조회에 실패했습니다'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
