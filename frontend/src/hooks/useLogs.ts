import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/* ── Types ── */

export interface ServiceLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  status_code: number;
  response_time_ms: number;
  ip: string;
}

export interface ServiceLogFilters {
  status?: '2xx' | '4xx' | '5xx' | '';
  path?: string;
  time_range?: '1h' | '6h' | '24h' | '7d';
  page: number;
  limit: number;
}

export interface ApiLog {
  id: string;
  timestamp: string;
  session_id: string;
  endpoint: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  request_payload?: string;
  response_text?: string;
  system_prompt?: string;
  messages?: string;
}

export interface ApiLogFilters {
  endpoint?: string;
  session_id?: string;
  time_range?: '1h' | '6h' | '24h';
  errors_only?: boolean;
  page: number;
  limit: number;
}

export interface LogPage<T> {
  data: T[];
  total: number;
  page: number;
  total_pages: number;
}

/* ── Service Logs Hook ── */

export function useServiceLogs() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ServiceLogFilters>({
    status: '',
    path: '',
    time_range: '24h',
    page: 1,
    limit: 20,
  });

  const query = useQuery<LogPage<ServiceLog>>({
    queryKey: ['admin', 'service-logs', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status)      params.set('status', filters.status);
      if (filters.path)        params.set('path', filters.path);
      if (filters.time_range)  params.set('time_range', filters.time_range);
      params.set('page',  String(filters.page));
      params.set('limit', String(filters.limit));
      return api.get<LogPage<ServiceLog>>(`/admin/service-logs?${params.toString()}`);
    },
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/admin/service-logs'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'service-logs'] }),
  });

  const updateFilters = useCallback((patch: Partial<ServiceLogFilters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  return {
    logs: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    filters,
    updateFilters,
    clearLogs: deleteMutation.mutate,
    isClearing: deleteMutation.isPending,
  };
}

/* ── API Logs Hook ── */

export function useApiLogs() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ApiLogFilters>({
    endpoint: '',
    session_id: '',
    time_range: '24h',
    errors_only: false,
    page: 1,
    limit: 20,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery<LogPage<ApiLog>>({
    queryKey: ['admin', 'api-logs', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.endpoint)   params.set('endpoint',   filters.endpoint);
      if (filters.session_id) params.set('session_id', filters.session_id);
      if (filters.time_range) params.set('time_range', filters.time_range);
      if (filters.errors_only) params.set('errors_only', 'true');
      params.set('page',  String(filters.page));
      params.set('limit', String(filters.limit));
      return api.get<LogPage<ApiLog>>(`/admin/api-logs?${params.toString()}`);
    },
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/admin/api-logs'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'api-logs'] }),
  });

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const updateFilters = useCallback((patch: Partial<ApiLogFilters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  return {
    logs: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    filters,
    updateFilters,
    expandedId,
    toggleExpanded,
    clearLogs: deleteMutation.mutate,
    isClearing: deleteMutation.isPending,
  };
}
