// lib/genre.ts — Genre-related style utilities
import type { CSSProperties } from 'react';
import type { GenreConfig } from '@story-game/shared';

/**
 * Get genre style from genre config
 */
function getGenreStyle(genre: string, genreConfig: GenreConfig): CSSProperties {
  const g = genreConfig.genres.find(x => x.name === genre);
  if (!g) {
    return { color: 'var(--a-ink-muted)', borderColor: 'var(--a-border-soft)', background: 'transparent' };
  }
  return { color: g.color, borderColor: g.borderColor, background: g.bgColor };
}

/**
 * Returns admin CSS class name(s) for a genre tag badge.
 * Note: This function now uses genre config for styling.
 */
export function genreClass(genre: string, genreConfig: GenreConfig): string {
  const g = genreConfig.genres.find(x => x.name === genre);
  // For now, return generic class; specific styling can be done via inline styles
  return g ? 'a-genre-tag' : 'a-genre-tag';
}

/**
 * Returns inline CSSProperties for a genre tag (used in admin tables).
 */
export function genreStyle(genre: string, genreConfig: GenreConfig): CSSProperties {
  return getGenreStyle(genre, genreConfig);
}

/**
 * Shared tag style for home page components (StoryCard, FeaturedSection, StoryList)
 * Returns inline styles for genre tag badges with padding and typography
 */
export function tagStyle(tag: string, genreConfig: GenreConfig): CSSProperties {
  const genre = genreConfig.genres.find(g => g.name === tag);
  const c = genre ? { bg: genre.bgColor, color: genre.color } : { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
  return {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    background: c.bg,
    color: c.color,
  };
}

