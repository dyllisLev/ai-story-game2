// lib/constants.ts — Shared application constants
// Hardcoded values removed in Phase 2 - now loaded from /api/config

// Use useConfig() hook to get:
// - GENRES: config.genreConfig.genres.map(g => g.name)
// - GENRES_WITH_ALL: ['전체', ...config.genreConfig.genres.map(g => g.name)]
// - DEFAULT_SUGGESTIONS: config.gameplayConfig.default_suggestions

// localStorage/sessionStorage keys
export const STORAGE_KEYS = {
  THEME: 'ai-story-game-theme',
  DEV_ADMIN_SKIP: 'ai-story-game-dev-admin-skip',
  // Legacy key for backward compatibility (used before AI-175)
  DEV_ADMIN_SKIP_OLD: 'devAdminBypass',
} as const;

// DEV mode headers
export const DEV_HEADERS = {
  ADMIN_SKIP: 'x-dev-admin',
} as const;

export const DEV_HEADER_VALUES = {
  SKIP: 'skip',
  // Legacy value for backward compatibility (used before AI-175)
  TRUE: 'true',
} as const;
