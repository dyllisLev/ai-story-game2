// API client — fetch wrapper with auth token injection
import { STORAGE_KEYS, DEV_HEADERS, DEV_HEADER_VALUES } from './constants';

const API_BASE = '/api/v1';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Cache dev bypass state to eliminate race conditions from localStorage access
// Without caching, localStorage can fail intermittently in try-catch, causing 401 errors
let cachedDevBypassEnabled = false;

/**
 * Initialize/update the cached dev bypass state from localStorage.
 * Call this when the dev bypass state changes (e.g., when "건너뛰기 (Dev)" is clicked).
 */
export function updateDevBypassCache(): void {
  try {
    const hasNewKey = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP) === DEV_HEADER_VALUES.SKIP;
    const hasOldKey = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD) === DEV_HEADER_VALUES.TRUE;
    cachedDevBypassEnabled = hasNewKey || hasOldKey;
  } catch (error) {
    // localStorage unavailable (e.g., private browsing) - cache as disabled
    console.debug('Dev bypass cache update failed:', error);
    cachedDevBypassEnabled = false;
  }
}

// Initialize cache on module load
updateDevBypassCache();

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  // Add dev bypass header from cached state (eliminates race condition from localStorage access)
  if (cachedDevBypassEnabled) {
    headers[DEV_HEADERS.ADMIN_SKIP] = DEV_HEADER_VALUES.SKIP;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method,
    body: options.body,
    headers,
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: { code: 'INTERNAL_ERROR', message: res.statusText } }));
    const info = body.error ?? { code: 'INTERNAL_ERROR', message: res.statusText };
    const error = new Error(info.message ?? res.statusText);
    (error as Error & { code: string }).code = info.code ?? 'INTERNAL_ERROR';
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { headers }),

  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), headers }),

  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), headers }),

  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', headers }),
};
