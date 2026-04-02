// API client — fetch wrapper with auth token injection
import {
  getDevBypassHeaders,
  updateDevBypassCache as updateDevBypassState,
  subscribeToDevBypass,
} from './dev-bypass';
import { STORAGE_KEYS, DEV_HEADER_VALUES } from './constants';

const API_BASE = '/api/v1';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Initialize/update the dev bypass state from localStorage.
 * Call this when the dev bypass state changes (e.g., when "건너뛰기 (Dev)" is clicked).
 *
 * This is a convenience function that delegates to the DevBypassManager singleton.
 */
export function updateDevBypassCache(): void {
  updateDevBypassState();
}

// Re-export dev bypass subscription function for AuthProvider
export { subscribeToDevBypass };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Build headers object - ensure we create a new object each time
  const headers: Record<string, string> = {};

  // Add Content-Type if body exists
  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  // Add dev bypass headers (if enabled) - creates new object each time
  const devBypassHeaders = getDevBypassHeaders();
  Object.assign(headers, devBypassHeaders);

  // Add any custom headers from options
  if (options.headers) {
    Object.assign(headers, options.headers);
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
