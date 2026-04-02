// backend/src/plugins/auth.test.ts
// Unit tests for auth plugin cookie parsing and backward compatibility
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { build } from 'fastify';
import authPlugin from './auth';
import { supabasePlugin } from './supabase';
// Mock Supabase plugin
vi.mock('./supabase', () => ({
    supabasePlugin: async (app) => {
        app.decorate('supabaseAdmin', {
            auth: {
                getUser: vi.fn().mockImplementation((token) => {
                    if (token === 'valid-token') {
                        return Promise.resolve({
                            data: {
                                user: { id: 'test-user-id', email: 'test@example.com' },
                            },
                            error: null,
                        });
                    }
                    return Promise.resolve({
                        data: { user: null },
                        error: { message: 'Invalid token' },
                    });
                }),
            },
            from: vi.fn().mockReturnValue({
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
describe('Auth Plugin - Cookie-based Authentication', () => {
    let app;
    beforeEach(async () => {
        app = build();
        await app.register(supabasePlugin);
        await app.register(authPlugin);
        // Add a test route that requires auth
        app.get('/test', {
            onRequest: [(request) => {
                    // If no user, return 401
                    if (!request.user) {
                        throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
                    }
                }],
        }, async (request) => {
            return { user: request.user };
        });
        await app.ready();
    });
    afterEach(async () => {
        await app.close();
    });
    describe('Cookie-based Authentication', () => {
        it('should parse user from access_token cookie', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                cookies: {
                    access_token: 'valid-token',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.user).toMatchObject({
                id: 'test-user-id',
                email: 'test@example.com',
                nickname: 'Test User',
                role: 'user',
            });
        });
        it('should return 401 when cookie is invalid', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                cookies: {
                    access_token: 'invalid-token',
                },
            });
            expect(response.statusCode).toBe(401);
        });
        it('should return 401 when no auth cookie is present', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
            });
            expect(response.statusCode).toBe(401);
        });
    });
    describe('Backward Compatibility - Authorization Header', () => {
        it('should parse user from Authorization header (Bearer token)', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    authorization: 'Bearer valid-token',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.user).toMatchObject({
                id: 'test-user-id',
                email: 'test@example.com',
            });
        });
        it('should prioritize Authorization header over cookie', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    authorization: 'Bearer valid-token',
                },
                cookies: {
                    access_token: 'invalid-token',
                },
            });
            // Should use Authorization header, not cookie
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.user).toMatchObject({
                id: 'test-user-id',
                email: 'test@example.com',
            });
        });
    });
    describe('Cookie Parsing Edge Cases', () => {
        it('should handle malformed cookie header gracefully', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    cookie: 'invalid=cookie; format=bad',
                },
            });
            expect(response.statusCode).toBe(401);
        });
        it('should handle empty cookie header', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    cookie: '',
                },
            });
            expect(response.statusCode).toBe(401);
        });
        it('should extract access_token from cookie with multiple cookies', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    cookie: 'other=value; access_token=valid-token; another=value',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.user).toMatchObject({
                id: 'test-user-id',
                email: 'test@example.com',
            });
        });
    });
    describe('Authorization Header Edge Cases', () => {
        it('should handle malformed Authorization header', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    authorization: 'InvalidFormat token',
                },
            });
            // Should fall back to cookie (which doesn't exist), so 401
            expect(response.statusCode).toBe(401);
        });
        it('should handle Authorization header without Bearer prefix', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    authorization: 'valid-token',
                },
            });
            // Should not parse, fall back to cookie (none), so 401
            expect(response.statusCode).toBe(401);
        });
        it('should handle empty Authorization header', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test',
                headers: {
                    authorization: '',
                },
            });
            expect(response.statusCode).toBe(401);
        });
    });
});
//# sourceMappingURL=auth.test.js.map