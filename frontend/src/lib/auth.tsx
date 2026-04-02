import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { api, updateDevBypassCache, subscribeToDevBypass } from './api';
import { isDevBypassEnabled } from './dev-bypass';
import type { AuthUser, AuthResponse } from '@story-game/shared';
import { MOCK_ADMIN_USER } from './test-utils';
import { STORAGE_KEYS, DEV_HEADER_VALUES } from './constants';
import type { DevBypassState } from './dev-bypass';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  setMockAdminUser: () => void; // DEV-only for E2E testing
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user from /me endpoint
  // Note: Define this early to avoid dependency issues with handleDevBypassChange
  const fetchUser = useCallback(async () => {
    try {
      const u = await api.get<AuthUser>('/me');
      // Only set user if dev bypass is NOT enabled (race condition fix)
      // If dev bypass was enabled while the fetch was in flight, ignore the result
      if (import.meta.env.DEV && isDevBypassEnabled()) {
        // Dev bypass was enabled while fetching, ignore this result
        console.debug('[AuthProvider] Ignoring /me result - dev bypass is enabled');
        return;
      }
      setUser(u);
    } catch {
      // No valid session, user remains null
      // Don't set user to null if dev bypass is enabled (race condition fix)
      if (import.meta.env.DEV && isDevBypassEnabled()) {
        console.debug('[AuthProvider] Ignoring /me error - dev bypass is enabled');
        return;
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to handle dev bypass state changes
  const handleDevBypassChange = useCallback(
    (state: DevBypassState) => {
      if (state.enabled) {
        // Dev bypass enabled - set mock user and stop loading
        setUser(MOCK_ADMIN_USER);
        setIsLoading(false);
      } else {
        // Dev bypass disabled - fetch user from /me
        setIsLoading(true);
        fetchUser();
      }
    },
    [fetchUser],
  );

  // Initialize authentication state
  // DEV mode: Subscribe to dev bypass state (immediately called with current state)
  // PROD mode: Fetch user from /me endpoint
  useEffect(() => {
    if (import.meta.env.DEV) {
      // DEV mode: Subscribe to dev bypass state changes
      // The subscription immediately calls handleDevBypassChange with current state
      const unsubscribe = subscribeToDevBypass(handleDevBypassChange);
      return () => unsubscribe();
    } else {
      // PROD mode: Fetch user from /me endpoint
      fetchUser();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Note: fetchUser and handleDevBypassChange are stable (useCallback)
  // and only change on mount, so this effect runs once

  // PROD mode: No dev bypass subscription needed

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    setUser(res.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, nickname?: string) => {
    const res = await api.post<AuthResponse>('/auth/signup', { email, password, nickname });
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUser(null);
  }, []);

  // DEV-only: Set mock admin user for E2E testing
  const setMockAdminUser = useCallback(() => {
    if (import.meta.env.DEV) {
      setUser(MOCK_ADMIN_USER);
    }
  }, []);

  const contextValue = useMemo(
    () => ({ user, isLoading, login, signup, logout, setMockAdminUser }),
    [user, isLoading, login, signup, logout, setMockAdminUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
