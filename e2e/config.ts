/**
 * E2E Test Configuration
 *
 * Central configuration for E2E tests including URLs, timeouts, and test data.
 */

export const e2eConfig = {
  /** Base URL for the frontend application */
  baseURL: 'http://localhost:5173',

  /** Default timeout for navigation (ms) */
  navigationTimeout: 10000,

  /** Default timeout for element waiting (ms) */
  elementTimeout: 5000,

  /** Debounce delay for search input (ms) */
  searchDebounce: 400,
} as const;
