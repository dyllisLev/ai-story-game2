// lib/constants.ts — Shared application constants

/**
 * Canonical list of story genres used across FilterBar, BasicSettings,
 * StatusPresets, StoryManagement, and PresetEditModal.
 */
export const GENRES = ['무협', '판타지', '현대', '로맨스', '공포', 'SF', '미스터리', '역사', '심리'] as const;

/** GENRES including the "all" sentinel value used in filter UIs. */
export const GENRES_WITH_ALL = ['전체', ...GENRES] as const;

export type Genre = typeof GENRES[number];
