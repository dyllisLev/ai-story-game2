import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../lib/api';

/* ── Types ── */

export interface DashboardStats {
  stories: {
    total: number;
    public: number;
    featured: number;
  };
  sessions: {
    total: number;
    active_today: number;
  };
  users: {
    total: number;
    active_today: number;
  };
  system: {
    error_rate_24h: number;
    avg_response_ms: number;
    total_requests_today: number;
  };
  recent_events: RecentEvent[];
  hourly_calls: HourlyBucket[];
}

export interface RecentEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface HourlyBucket {
  hour: number;  // 0–23
  count: number;
}

export interface SystemStatus {
  cloudflare_worker: 'ok' | 'warn' | 'error';
  supabase_db: 'ok' | 'warn' | 'error';
  gemini_api: 'ok' | 'warn' | 'error';
  error_rate: number;      // percentage
  avg_response_ms: number;
}

/* ── Hook ── */

export function useAdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<DashboardStats>('/admin/dashboard'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const systemStatus: SystemStatus = useMemo(() => ({
    cloudflare_worker: 'ok',
    supabase_db: 'ok',
    gemini_api: 'ok',
    error_rate: data?.system.error_rate_24h ?? 0,
    avg_response_ms: data?.system.avg_response_ms ?? 0,
  }), [data?.system.error_rate_24h, data?.system.avg_response_ms]);

  return {
    stats: data,
    systemStatus,
    isLoading,
    error,
    refetch,
  };
}
