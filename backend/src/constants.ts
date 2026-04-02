// API constants - single source of truth for API versioning

export const API_V1_PREFIX = '/api/v1' as const;
export const API_HEALTH_ENDPOINT = '/api/health' as const;

// DEV mode headers
export const DEV_HEADERS = {
  ADMIN_SKIP: 'x-dev-admin',
} as const;

export const DEV_HEADER_VALUES = {
  SKIP: 'skip',
} as const;
