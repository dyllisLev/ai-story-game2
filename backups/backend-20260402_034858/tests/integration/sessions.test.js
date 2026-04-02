// backend/src/tests/integration/sessions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import sessionsRoutes from '../../routes/sessions/crud.js';
describe('Sessions Routes - Integration Tests', () => {
    let app;
    beforeEach(async () => {
        app = Fastify({ logger: false });
        // Mock Supabase admin client
        app.decorate('supabaseAdmin', {
            from: vi.fn(),
        });
        // Mock auth plugin
        app.decorateRequest('user', null);
        // Register routes
        await app.register(sessionsRoutes);
    });
    describe('GET /sessions (list)', () => {
        it('should return user sessions when authenticated', async () => {
            // Mock authenticated user
            app.user = { id: 'test-user', role: 'user' };
            const mockSessions = [
                { id: '1', story_id: 'story-1', story_title: 'Story 1' },
                { id: '2', story_id: 'story-2', story_title: 'Story 2' },
            ];
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: mockSessions,
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'GET',
                url: '/sessions',
            });
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(Array.isArray(body)).toBe(true);
            expect(body).toHaveLength(2);
        });
        it('should return empty array for user with no sessions', async () => {
            // Mock authenticated user
            app.user = { id: 'test-user', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'GET',
                url: '/sessions',
            });
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(Array.isArray(body)).toBe(true);
            expect(body).toHaveLength(0);
        });
    });
    describe('GET /sessions/:id', () => {
        it('should return session by id', async () => {
            // Mock authenticated user (session owner)
            app.user = { id: 'session-owner', role: 'user' };
            const mockSession = {
                id: '123',
                story_id: 'story-1',
                story_title: 'Test Story',
                owner_uid: 'session-owner',
            };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: mockSession,
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'GET',
                url: '/sessions/123',
            });
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.id).toBe('123');
            expect(body.story_title).toBe('Test Story');
        });
        it('should return 404 for non-existent session', async () => {
            // Mock authenticated user
            app.user = { id: 'test-user', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'GET',
                url: '/sessions/999',
            });
            expect(response.statusCode).toBe(404);
            const body = response.json();
            expect(body.error).toBeDefined();
            expect(body.error.code).toBe('NOT_FOUND');
        });
        it('should reject access to other user session', async () => {
            // Mock authenticated user (not session owner)
            app.user = { id: 'different-user', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { owner_uid: 'session-owner' },
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'GET',
                url: '/sessions/123',
            });
            expect(response.statusCode).toBe(403);
            const body = response.json();
            expect(body.error).toBeDefined();
            expect(body.error.code).toBe('FORBIDDEN');
        });
    });
    describe('POST /sessions (create)', () => {
        it('should reject unauthenticated request', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                payload: {
                    storyId: 'story-123',
                },
            });
            expect(response.statusCode).toBe(401);
        });
        it('should reject request with missing storyId', async () => {
            // Mock authenticated user
            app.user = { id: 'test-user', role: 'user' };
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                payload: {},
            });
            expect(response.statusCode).toBe(400);
            const body = response.json();
            expect(body.error).toBeDefined();
        });
        it('should create session with valid data', async () => {
            // Mock authenticated user
            app.user = { id: 'test-user', role: 'user' };
            const newSession = {
                id: 'new-session-id',
                story_id: 'story-123',
                owner_uid: 'test-user',
            };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockImplementation((table) => {
                if (table === 'stories') {
                    // Story exists check
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { id: 'story-123' },
                            error: null,
                        }),
                    };
                }
                // Session creation
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: newSession,
                        error: null,
                    }),
                };
            });
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                payload: {
                    storyId: 'story-123',
                },
            });
            expect(response.statusCode).toBe(201);
            const body = response.json();
            expect(body.id).toBe('new-session-id');
        });
        it('should return 404 for non-existent story', async () => {
            // Mock authenticated user
            app.user = { id: 'test-user', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                }),
            });
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                payload: {
                    storyId: 'non-existent-story',
                },
            });
            expect(response.statusCode).toBe(404);
            const body = response.json();
            expect(body.error).toBeDefined();
        });
    });
    describe('PUT /sessions/:id (update)', () => {
        it('should reject unauthenticated request', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/sessions/123',
                payload: {
                    title: 'Updated Session',
                },
            });
            expect(response.statusCode).toBe(401);
        });
        it('should reject non-owner update', async () => {
            // Mock authenticated user (not owner)
            app.user = { id: 'different-user', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { owner_uid: 'session-owner' },
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'PUT',
                url: '/sessions/123',
                payload: {
                    title: 'Updated Session',
                },
            });
            expect(response.statusCode).toBe(403);
        });
        it('should allow owner update', async () => {
            // Mock authenticated user (owner)
            app.user = { id: 'session-owner', role: 'user' };
            const updatedSession = {
                id: '123',
                title: 'Updated Session',
                owner_uid: 'session-owner',
            };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockImplementation((table) => {
                if (table === 'sessions') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: { owner_uid: 'session-owner' },
                            error: null,
                        }),
                    };
                }
                return {
                    update: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: updatedSession,
                        error: null,
                    }),
                };
            });
            const response = await app.inject({
                method: 'PUT',
                url: '/sessions/123',
                payload: {
                    title: 'Updated Session',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.title).toBe('Updated Session');
        });
    });
    describe('DELETE /sessions/:id', () => {
        it('should reject unauthenticated request', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/sessions/123',
            });
            expect(response.statusCode).toBe(401);
        });
        it('should reject non-owner deletion', async () => {
            // Mock authenticated user (not owner)
            app.user = { id: 'different-user', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { owner_uid: 'session-owner' },
                    error: null,
                }),
            });
            const response = await app.inject({
                method: 'DELETE',
                url: '/sessions/123',
            });
            expect(response.statusCode).toBe(403);
        });
        it('should allow owner deletion', async () => {
            // Mock authenticated user (owner)
            app.user = { id: 'session-owner', role: 'user' };
            const mockFrom = vi.mocked(app.supabaseAdmin.from);
            mockFrom.mockImplementation((table) => {
                if (table === 'sessions') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: { owner_uid: 'session-owner' },
                            error: null,
                        }),
                    };
                }
                return {
                    delete: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                };
            });
            const response = await app.inject({
                method: 'DELETE',
                url: '/sessions/123',
            });
            expect(response.statusCode).toBe(204);
        });
    });
});
//# sourceMappingURL=sessions.test.js.map