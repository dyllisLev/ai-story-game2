// backend/src/tests/integration/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import authRoutes from '../../routes/auth.js';

describe('Auth Routes - Integration Tests', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Register cookie plugin (required for auth routes)
    await app.register(cookie, { secret: 'test-secret' });

    // Add error handler for validation errors
    app.setErrorHandler((error: any, request, reply) => {
      if (error.code === 'FST_ERR_VALIDATION') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력값이 올바르지 않습니다',
          },
        });
      }
      return reply.status(error.statusCode || 500).send({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      });
    });

    // Mock Supabase client
    const mockSingle = vi.fn().mockResolvedValue({
      data: { nickname: 'test-user', role: 'user' },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
    });

    // Create minimal Supabase client mock
    const mockSupabaseClient = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      },
      from: mockFrom,
    } as any;

    // Create minimal Supabase admin client mock
    const mockSupabaseAdmin = {
      auth: {
        admin: {
          deleteUser: vi.fn(),
        },
      },
      from: mockFrom,
    } as any;

    app.decorate('supabase', mockSupabaseClient);
    app.decorate('supabaseAdmin', mockSupabaseAdmin);

    // Decorate config (needed for production cookie setting)
    app.decorate('config', {
      NODE_ENV: 'development',
      PORT: 3000,
      SUPABASE_URL: 'test-url',
      SUPABASE_ANON_KEY: 'test-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      SENTRY_DSN: '',
      SENTRY_ENVIRONMENT: 'test',
      API_KEY_ENCRYPTION_SECRET: 'test-secret',
    } as any);

    // Register routes
    await app.register(authRoutes);
  });

  describe('POST /auth/signup', () => {
    it('should reject request with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request with missing password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject request with invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'not-an-email',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject request with short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'test@example.com',
          password: '12345',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should accept valid signup request', async () => {
      const mockSignUp = (app as any).supabase.auth.signUp;
      mockSignUp.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: null,
          },
        },
        error: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe('test-user-id');
    });

    it('should handle Supabase signup error', async () => {
      const mockSignUp = (app as any).supabase.auth.signUp;
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already exists',
          code: 'user_exists',
          status: 400,
          __isAuthError: true,
          name: 'AuthError',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: 'existing@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should reject request with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request with missing password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should accept valid login request', async () => {
      const mockSignIn = (app as any).supabase.auth.signInWithPassword;
      mockSignIn.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: null,
          },
        },
        error: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe('test-user-id');
      // Tokens are set as httpOnly cookies, not in response body
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      const mockSignIn = (app as any).supabase.auth.signInWithPassword;
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          code: 'invalid_credentials',
          status: 401,
          __isAuthError: true,
          name: 'AuthError',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should reject request with missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should accept valid refresh token', async () => {
      const mockRefresh = (app as any).supabase.auth.refreshSession;
      mockRefresh.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: null,
          },
        },
        error: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'valid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({});
      // Tokens are set as httpOnly cookies, not in response body
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle invalid refresh token', async () => {
      const mockRefresh = (app as any).supabase.auth.refreshSession;
      mockRefresh.mockResolvedValue({
        data: { session: null },
        error: {
          message: 'Invalid refresh token',
          code: 'invalid_token',
          status: 401,
          __isAuthError: true,
          name: 'AuthError',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should accept logout request', async () => {
      const mockSignOut = (app as any).supabase.auth.signOut;
      mockSignOut.mockResolvedValue({ error: null });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should handle logout error', async () => {
      const mockSignOut = (app as any).supabase.auth.signOut;
      mockSignOut.mockResolvedValue({
        error: {
          message: 'Logout failed',
          code: 'logout_failed',
          status: 500,
          __isAuthError: true,
          name: 'AuthError',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.error).toBeDefined();
    });
  });
});
