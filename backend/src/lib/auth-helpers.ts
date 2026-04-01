// backend/src/lib/auth-helpers.ts
// Shared authentication utilities

/**
 * Extract Bearer token from Authorization header
 * @returns Token string or undefined if header is missing/invalid
 */
export function extractBearerToken(authHeader: string | undefined): string | undefined {
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7);
}

/**
 * Extract cookie value by name from Cookie header
 * @param cookies - Cookie header string
 * @param name - Cookie name to extract
 * @returns Cookie value or undefined if not found
 */
export function extractCookieToken(cookies: string | undefined, name: string): string | undefined {
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1];
}

/**
 * Token and cookie name constants
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Token expiration in seconds
 */
export const TOKEN_EXPIRATION = {
  ACCESS: 60 * 60, // 1 hour
  REFRESH: 60 * 60 * 24 * 7, // 7 days
} as const;

/**
 * Rate limiting constants for auth endpoints
 */
export const AUTH_RATE_LIMITS = {
  SIGNUP_MAX: 5, // Prevent brute force attacks
  SIGNUP_WINDOW: '1 minute',
  LOGIN_MAX: 5, // Prevent brute force attacks
  LOGIN_WINDOW: '1 minute',
  REFRESH_MAX: 10, // Allow periodic token refresh
  REFRESH_WINDOW: '1 hour',
} as const;
