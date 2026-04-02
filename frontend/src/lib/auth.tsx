import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { AuthUser, AuthResponse } from '@story-game/shared';
import { MOCK_ADMIN_USER } from './test-utils';

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

  // Restore session on mount - cookies are sent automatically
  useEffect(() => {
    api
      .get<AuthUser>('/me')
      .then((u) => setUser(u))
      .catch(() => {
        // No valid session, user remains null
      })
      .finally(() => setIsLoading(false));
  }, []);

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
