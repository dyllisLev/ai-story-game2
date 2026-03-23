// lib/genre.ts — Genre-related style utilities
import type { CSSProperties } from 'react';

/**
 * Returns admin CSS class name(s) for a genre tag badge.
 */
export function genreClass(genre: string): string {
  switch (genre) {
    case '무협':   return 'a-genre-tag genre-martial';
    case '판타지': return 'a-genre-tag genre-fantasy';
    case '현대':   return 'a-genre-tag genre-modern';
    case '로맨스': return 'a-genre-tag genre-romance';
    default:       return 'a-genre-tag';
  }
}

/**
 * Returns inline CSSProperties for a genre tag (used in admin tables).
 */
export function genreStyle(genre: string): CSSProperties {
  switch (genre) {
    case '무협':   return { color: '#c49a3c', borderColor: 'rgba(196,154,60,0.35)',  background: 'rgba(196,154,60,0.1)' };
    case '판타지': return { color: '#7a9fc4', borderColor: 'rgba(122,159,196,0.35)', background: 'rgba(122,159,196,0.1)' };
    case '현대':   return { color: '#8fba8a', borderColor: 'rgba(143,186,138,0.35)', background: 'rgba(143,186,138,0.1)' };
    case '로맨스': return { color: '#c47fa5', borderColor: 'rgba(196,127,165,0.35)', background: 'rgba(196,127,165,0.1)' };
    default:       return { color: 'var(--a-ink-muted)', borderColor: 'var(--a-border-soft)', background: 'transparent' };
  }
}
