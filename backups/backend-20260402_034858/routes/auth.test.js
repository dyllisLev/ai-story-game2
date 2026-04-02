// backend/src/routes/auth.test.ts
// Unit tests for cookie-based authentication
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { build } from 'fastify';
import cookie from '@fastify/cookie';
import authRoutes from './auth';
import { supabasePlugin } from '../plugins/supabase';
// Mock Supabase plugin
vi.mock('../plugins/supabase', () => ({
    supabasePlugin: async (app) => {
        app.decorate('supabaseAdmin', {
            auth: {
                signUp: vi.fn().mockResolvedValue({
                    data: {
                        user: { id: 'test-user-id', email: 'test@example.com' },
                        session: {
                            access_token: 'test-access-token',
                            refresh_token: 'test-refresh-token',
                        },
                    },
                    error: null,
                }),
                signInWithPassword: vi.fn().mockResolvedValue({
                    data: {
                        user: { id: 'test-user-id', email: 'test@example.com' },
                        session: {
                            access_token: 'test-access-token',
                            refresh_token: 'test-refresh-token',
                        },
                    },
                    error: null,
                }),
                signOut: vi.fn().mockResolvedValue({ error: null }),
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: { id: 'test-user-id', email: 'test@example.com' },
                    },
                    error: null,
                }),
            },
            from: vi.fn().mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    error: null,
                }),
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: { nickname: 'Test User', role: 'user' },
                            error: null,
                        }),
                    }),
                }),
            }),
        });
    },
}));
describe('Auth Routes - Cookie-based Authentication', () => {
    let app;
    beforeEach(async () => {
        app = build();
        await app.register(cookie, { secret: 'test-secret' });
        await app.register(supabasePlugin);
        app.decorate('config', {
            NODE_ENV: 'development',
            CORS_ORIGIN: 'http://localhost:5173',
        });
        app.decorate('log', {
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
        });
        await app.register(authRoutes);
        await app.ready();
    });
    afterEach(async () => {
        await app.close();
    });
    describe('POST /auth/signup', () => {
        it('should set httpOnly cookies on successful signup', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/signup',
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                    nickname: 'Test User',
                },
            });
            expect(response.statusCode).toBe(201);
            const cookies = response.cookies;
            expect(cookies).toHaveLength(2);
            const accessCookie = cookies.find((c) => c.name === 'access_token');
            const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
            expect(accessCookie).toBeDefined();
            expect(refreshCookie).toBeDefined();
            expect(accessCookie?.value).toBe('test-access-token');
            expect(refreshCookie?.value).toBe('test-refresh-token');
            // Verify cookie security settings
            expect(accessCookie?.options).toMatchObject({
                httpOnly: true,
                path: '/',
                sameSite: 'strict',
            });
            expect(refreshCookie?.options).toMatchObject({
                httpOnly: true,
                path: '/',
                sameSite: 'strict',
            });
            // In development, secure should be false
            expect(accessCookie?.options?.secure).toBe(false);
            expect(refreshCookie?.options?.secure).toBe(false);
        });
        it('should return user data in response body', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/signup',
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                    nickname: 'Test User',
                },
            });
            const body = JSON.parse(response.body);
            expect(body).toMatchObject({
                user: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                    nickname: 'Test User',
                    role: 'pending',
                },
            });
        });
    });
    describe('POST /auth/login', () => {
        it('should set httpOnly cookies on successful login', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });
            expect(response.statusCode).toBe(200);
            const cookies = response.cookies;
            expect(cookies).toHaveLength(2);
            const accessCookie = cookies.find((c) => c.name === 'access_token');
            const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
            expect(accessCookie?.value).toBe('test-access-token');
            expect(refreshCookie?.value).toBe('test-refresh-token');
        });
    });
    describe('POST /auth/logout', () => {
        it('should clear cookies on logout', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/logout',
            });
            expect(response.statusCode).toBe(204);
            const cookies = response.cookies;
            expect(cookies).toHaveLength(2);
            // Both cookies should be cleared
            const accessCookie = cookies.find((c) => c.name === 'access_token');
            const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
            expect(accessCookie?.value).toBe('');
            expect(refreshCookie?.value).toBe('');
        });
    });
    describe('Cookie Security', () => {
        it('should set secure flag in production', async () => {
            // Create app with production config
            const prodApp = build();
            await prodApp.register(cookie, { secret: 'test-secret' });
            await prodApp.register(supabasePlugin);
            prodApp.decorate('config', {
                NODE_ENV: 'production',
                CORS_ORIGIN: false,
            });
            prodApp.decorate('log', {
                error: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
            });
            await prodApp.register(authRoutes);
            await prodApp.ready();
            const response = await prodApp.inject({
                method: 'POST',
                url: '/auth/signup',
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });
            const accessCookie = response.cookies.find((c) => c.name === 'access_token');
            const refreshCookie = response.cookies.find((c) => c.name === 'refresh_token');
            expect(accessCookie?.options?.secure).toBe(true);
            expect(refreshCookie?.options?.secure).toBe(true);
            await prodApp.close();
        });
        it('should set appropriate maxAge values', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/signup',
                payload: {
                    email: 'test@example.com',
                    password: 'password123',
                },
            });
            const accessCookie = response.cookies.find((c) => c.name === 'access_token');
            const refreshCookie = response.cookies.find((c) => c.name === 'refresh_token');
            // Access token: 1 hour (3600 seconds)
            expect(accessCookie?.options?.maxAge).toBe(3600);
            // Refresh token: 7 days (604800 seconds)
            expect(refreshCookie?.options?.maxAge).toBe(604800);
        });
    });
});
//# sourceMappingURL=auth.test.js.map