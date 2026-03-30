import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Story } from '@story-game/shared';

export type { Story };

/* ── Types ── */

export interface AdminStoryFilters {
  genre?: string;
  visibility?: 'public' | 'private' | '';
  search?: string;
  featured_only?: boolean;
  page: number;
  limit: number;
}

export interface StoriesPage {
  data: Story[];
  total: number;
  page: number;
  total_pages: number;
}

/* ── Hook ── */

export function useAdminStories() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminStoryFilters>({
    genre: '',
    visibility: '',
    search: '',
    featured_only: false,
    page: 1,
    limit: 20,
  });

  const query = useQuery<StoriesPage>({
    queryKey: ['admin', 'stories', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.genre)          params.set('genre',        filters.genre);
      if (filters.visibility)     params.set('is_public',    filters.visibility === 'public' ? 'true' : 'false');
      if (filters.search)         params.set('search',       filters.search);
      if (filters.featured_only)  params.set('featured', 'true');
      params.set('page',  String(filters.page));
      params.set('limit', String(filters.limit));
      return api.get<StoriesPage>(`/admin/stories?${params.toString()}`);
    },
    staleTime: 30_000,
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      api.put(`/admin/stories/${id}/featured`, { featured }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stories'] }),
  });

  const updateFilters = useCallback((patch: Partial<AdminStoryFilters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const toggleFeatured = useCallback(
    (id: string, featured: boolean) => toggleFeaturedMutation.mutate({ id, featured }),
    [toggleFeaturedMutation],
  );

  return {
    stories: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
    filters,
    updateFilters,
    toggleFeatured,
    isTogglingFeatured: toggleFeaturedMutation.isPending,
  };
}
