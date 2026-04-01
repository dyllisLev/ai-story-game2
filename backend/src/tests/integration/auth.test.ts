// backend/src/tests/integration/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import authRoutes from '../../routes/auth.js';

describe('Auth Routes - Integration Tests', () => {
  let app: Fastify.FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Mock Supabase client
    app.decorate('supabase', {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    });

    app.decorate('supabaseAdmin', {
      auth: {
        admin: {
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn(),
    });

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
      const mockSignUp = vi.mocked(app.supabase.auth.signUp);
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: null },
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
      const mockSignUp = vi.mocked(app.supabase.auth.signUp);
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
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
      const mockSignIn = vi.mocked(app.supabase.auth.signInWithPassword);
      mockSignIn.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
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
      expect(body.session).toBeDefined();
      expect(body.session.access_token).toBe('mock-token');
    });

    it('should handle invalid credentials', async () => {
      const mockSignIn = vi.mocked(app.supabase.auth.signInWithPassword);
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
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
      const mockRefresh = vi.mocked(app.supabase.auth.refreshSession);
      (app.supabase.auth as any).refreshSession = mockRefresh;
      mockRefresh.mockResolvedValue({
        data: {
          session: { access_token: 'new-token', refresh_token: 'new-refresh' },
        },
        error: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: 'valid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.session).toBeDefined();
      expect(body.session.access_token).toBe('new-token');
    });

    it('should handle invalid refresh token', async () => {
      const mockRefresh = vi.mocked(app.supabase.auth.refreshSession);
      (app.supabase.auth as any).refreshSession = mockRefresh;
      mockRefresh.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should accept logout request', async () => {
      const mockSignOut = vi.mocked(app.supabase.auth.signOut);
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
      const mockSignOut = vi.mocked(app.supabase.auth.signOut);
      mockSignOut.mockResolvedValue({
        error: { message: 'Logout failed' },
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
