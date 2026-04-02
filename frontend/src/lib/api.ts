// API client — fetch wrapper with auth token injection
import { STORAGE_KEYS, DEV_HEADERS, DEV_HEADER_VALUES } from './constants';

const API_BASE = '/api/v1';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  if (import.meta.env.DEV) {
    try {
      const shouldSkip = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP) === DEV_HEADER_VALUES.SKIP;
      if (shouldSkip) {
        headers[DEV_HEADERS.ADMIN_SKIP] = DEV_HEADER_VALUES.SKIP;
      }
    } catch {
      // localStorage unavailable - skip dev bypass
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

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
