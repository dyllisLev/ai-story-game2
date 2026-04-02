// packages/shared/src/types/auth.ts
export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  role: 'pending' | 'user' | 'admin';
}

// DEV-only: Mock admin user for E2E testing
export const MOCK_ADMIN_USER: AuthUser = {
  id: 'dev-admin-user',
  email: 'dev-admin@example.com',
  nickname: 'Dev Admin',
  role: 'admin',
} as const;

// Phase 2-A: UserProfile — 프로필 페이지 및 소유자 표시용
export interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  has_api_key: boolean;  // api_key_enc IS NOT NULL
  created_at: string;
}

export interface AuthSignupInput {
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthLoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface VerifyAdminResponse {
  isAdmin: boolean;
  userId: string;
  email: string;
  role: 'pending' | 'user' | 'admin';
}
