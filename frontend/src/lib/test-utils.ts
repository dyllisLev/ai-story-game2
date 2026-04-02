/**
 * DEV-only mock users for E2E testing
 * These are only used in development mode and tree-shaken in production
 */

import type { AuthUser } from '@story-game/shared';

export const MOCK_ADMIN_USER: AuthUser = {
  id: 'dev-admin-user',
  email: 'dev-admin@example.com',
  nickname: 'Dev Admin',
  role: 'admin',
} as const;
