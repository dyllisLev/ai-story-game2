import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse, StoryListItem, StoryFilterParams, StoryStats } from '@story-game/shared';

// ─── useStories ───────────────────────────────────────────────────────────────

export function useStories(params: StoryFilterParams) {
  const searchParams = new URLSearchParams();

  if (params.genre)    searchParams.set('genre', params.genre);
  if (params.search)   searchParams.set('search', params.search);
  if (params.sort)     searchParams.set('sort', params.sort);
  if (params.featured) searchParams.set('featured', 'true');
  searchParams.set('page',  String(params.page  ?? 1));
  searchParams.set('limit', String(params.limit ?? 20));

  return useQuery({
    queryKey: ['stories', params],
    queryFn:  () => api.get<PaginatedResponse<StoryListItem>>(`/stories?${searchParams.toString()}`),
  });
}

// ─── useFeaturedStories ───────────────────────────────────────────────────────

export function useFeaturedStories(limit = 4) {
  return useQuery({
    queryKey: ['stories', 'featured', limit],
    queryFn:  () =>
      api.get<PaginatedResponse<StoryListItem>>(
        `/stories?featured=true&limit=${limit}&sort=popular`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

// ─── useStoryStats ────────────────────────────────────────────────────────────

export function useStoryStats() {
  return useQuery({
    queryKey: ['stories', 'stats'],
    queryFn:  () => api.get<StoryStats>('/stories/stats'),
    staleTime: 1000 * 60 * 5,
  });
}
