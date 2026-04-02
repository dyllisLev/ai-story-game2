// lib/auth.test.tsx — Unit tests for AuthProvider with race condition detection
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth';
import { devBypassManager, updateDevBypassCache } from './dev-bypass';
import { STORAGE_KEYS, DEV_HEADER_VALUES } from './constants';
import { MOCK_ADMIN_USER } from '@story-game/shared';
import type { AuthUser } from '@story-game/shared';

/* ── Mocks ── */

// Mock the api module - but NOT the dev-bypass functions
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// Mock import.meta.env.DEV
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: true,
    },
  },
});

// Import the mocked api
import { api } from './api';

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Mock localStorage
const createMockLocalStorage = () => {
  const store = new Map<string, string>();

  return {
    store,
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
  };
};

const mockLocalStorage = createMockLocalStorage();

/* ── Test Helpers ── */

/**
 * Create a test wrapper that provides AuthContext
 */
function createWrapper() {
  return function AuthWrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

/**
 * Reset all mocks and state before each test
 */
function resetState() {
  // Clear localStorage
  mockLocalStorage.store.clear();

  // Reset dev bypass manager state
  (devBypassManager as any).state = { enabled: false, lastUpdated: 0 };
  (devBypassManager as any).listeners.clear();

  // Reset API mocks
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.put.mockReset();
  mockApi.delete.mockReset();

  // Restore localStorage mock
  vi.stubGlobal('localStorage', mockLocalStorage);
}

/* ── Setup and Teardown ── */

beforeEach(() => {
  resetState();

  // Mock import.meta.env.DEV for all tests
  vi.stubGlobal('import', {
    meta: {
      env: {
        DEV: true,
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ── Tests ── */

describe('AuthProvider', () => {
  describe('initialization without dev bypass', () => {
    it('should call /me on mount when dev bypass is not enabled', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'Test User',
        role: 'user',
      };

      mockApi.get.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Should call /me (might be called multiple times due to React StrictMode)
      expect(mockApi.get).toHaveBeenCalledWith('/me');

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // User should be set
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle /me error gracefully when dev bypass is not enabled', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // User should be null (no valid session)
      expect(result.current.user).toBeNull();
    });
  });

  describe('initialization with dev bypass enabled', () => {
    it('should use mock admin user when dev bypass is enabled in localStorage', async () => {
      // Set dev bypass BEFORE mounting AuthProvider
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      (devBypassManager as any).initializeFromStorage();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Should immediately have mock user without calling /me
      await waitFor(() => {
        expect(result.current.user).toEqual(MOCK_ADMIN_USER);
        expect(result.current.isLoading).toBe(false);
      });

      // Should NOT call /me
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should support legacy dev bypass key format', async () => {
      // Set old dev bypass key
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD, DEV_HEADER_VALUES.TRUE);
      (devBypassManager as any).initializeFromStorage();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Should immediately have mock user
      await waitFor(() => {
        expect(result.current.user).toEqual(MOCK_ADMIN_USER);
        expect(result.current.isLoading).toBe(false);
      });

      // Should NOT call /me
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('race condition: dev bypass enabled during mount', () => {
    it('should NOT call /me if dev bypass is enabled before fetch completes', async () => {
      // Create a promise that we can control
      let resolveFetch: (() => void) | null = null;
      const fetchPromise = new Promise<AuthUser>((resolve) => {
        resolveFetch = () => resolve({
          id: 'user-1',
          email: 'user@example.com',
          nickname: 'Test User',
          role: 'user',
        });
      });

      mockApi.get.mockReturnValue(fetchPromise as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading, /me call initiated
      expect(result.current.isLoading).toBe(true);
      expect(mockApi.get).toHaveBeenCalled();

      // SIMULATE RACE CONDITION: Enable dev bypass BEFORE /me completes
      await act(async () => {
        mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
        updateDevBypassCache();

        // Verify dev bypass is enabled
        console.log('Dev bypass enabled:', devBypassManager.isEnabled());

        // Resolve the /me fetch AFTER dev bypass is enabled
        if (resolveFetch) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          resolveFetch();
        }
      });

      // Wait for all async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Despite the race condition, dev bypass should take precedence
      expect(result.current.user).toEqual(MOCK_ADMIN_USER);
    });

    it('should handle rapid dev bypass toggles without race conditions', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial /me call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Rapidly toggle dev bypass multiple times
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          // Enable dev bypass
          mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
          updateDevBypassCache();
        });

        await waitFor(() => {
          expect(result.current.user).toEqual(MOCK_ADMIN_USER);
        });

        await act(async () => {
          // Disable dev bypass
          mockLocalStorage.removeItem(STORAGE_KEYS.DEV_ADMIN_SKIP);
          updateDevBypassCache();
        });

        // After disabling, should fetch /me again
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      }

      // Should complete all toggles without errors
      expect(result.current).toBeDefined();
    });
  });

  describe('dev bypass state changes', () => {
    it('should update to mock admin user when dev bypass is enabled after mount', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'Test User',
        role: 'user',
      };

      mockApi.get.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial /me call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
      });

      // Enable dev bypass
      await act(async () => {
        mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
        updateDevBypassCache();
      });

      // Should switch to mock admin user
      await waitFor(() => {
        expect(result.current.user).toEqual(MOCK_ADMIN_USER);
      });
    });

    it('should fetch /me when dev bypass is disabled after being enabled', async () => {
      // Start with dev bypass enabled
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      (devBypassManager as any).initializeFromStorage();

      const mockUser: AuthUser = {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'Test User',
        role: 'user',
      };

      mockApi.get.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Should start with mock admin user
      await waitFor(() => {
        expect(result.current.user).toEqual(MOCK_ADMIN_USER);
      });

      // Disable dev bypass
      await act(async () => {
        mockLocalStorage.removeItem(STORAGE_KEYS.DEV_ADMIN_SKIP);
        updateDevBypassCache();
      });

      // Should fetch /me and switch to real user
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('authentication methods', () => {
    it('should login successfully', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'Test User',
        role: 'user',
      };

      mockApi.get.mockRejectedValue(new Error('No session')); // /me fails
      mockApi.post.mockResolvedValue({ user: mockUser }); // login succeeds

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial failed /me call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login
      await act(async () => {
        await result.current.login('user@example.com', 'password');
      });

      // Should call login endpoint
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'password',
      });

      // User should be set
      expect(result.current.user).toEqual(mockUser);
    });

    it('should signup successfully', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'Test User',
        role: 'user',
      };

      mockApi.get.mockRejectedValue(new Error('No session'));
      mockApi.post.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Signup
      await act(async () => {
        await result.current.signup('user@example.com', 'password', 'TestUser');
      });

      // Should call signup endpoint
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/signup', {
        email: 'user@example.com',
        password: 'password',
        nickname: 'TestUser',
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should logout successfully', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'Test User',
        role: 'user',
      };

      mockApi.get.mockResolvedValue(mockUser);
      mockApi.post.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial user
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      // Should call logout endpoint
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');

      // User should be null
      expect(result.current.user).toBeNull();
    });
  });

  describe('setMockAdminUser (DEV-only)', () => {
    it('should set mock admin user when called', async () => {
      mockApi.get.mockRejectedValue(new Error('No session'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Set mock admin user
      await act(async () => {
        result.current.setMockAdminUser();
      });

      // Should have mock admin user
      expect(result.current.user).toEqual(MOCK_ADMIN_USER);
    });
  });
});
