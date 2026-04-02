// backend/src/tests/integration/sessions.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import sessionsRoutes from '../../routes/sessions/index.js';
import type { AppConfig } from '@story-game/shared';

describe('Sessions Routes - Integration Tests', () => {
  let app: FastifyInstance;
  let mockFrom: any;

  const mockConfig = {
    promptConfig: {
      system: 'test system',
      scenarios: {
        fantasy: { type: 'story', prompt: 'fantasy scenario' },
        modern: { type: 'story', prompt: 'modern scenario' },
      },
    },
    gameplayConfig: {
      available_models: [{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' }],
      input_modes: ['text', 'voice'],
      status_attribute_types: [
        { key: 'hp', label: 'HP', type: 'number', min: 0, max: 100, default: 100 },
      ],
      default_suggestions: [],
      character_relations: [],
      story_icons: [],
      character_icons: [],
      memory_categories: [],
      editor_defaults: { title: '' },
      default_labels: {
        new_session: 'New Session',
        new_chapter: 'New Chapter',
      },
    },
    genreConfig: {
      genres: [
        { id: 'fantasy', name: 'Fantasy', icon: '⚔️', color: '#8B4513' },
        { id: 'modern', name: 'Modern', icon: '🏙️', color: '#4169E1' },
      ],
    },
    statusWindowDefaults: {
      enabled: false,
      default_preset_genre: 'fantasy',
    },
  } as unknown as AppConfig;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    mockFrom = vi.fn();
    app.decorate('supabaseAdmin', {
      from: mockFrom,
    } as any);

    app.decorate('getAppConfig', async () => mockConfig);

    app.decorateRequest('user', null);
    app.addHook('onRequest', async (request) => {
      if ((app as any).user) {
        request.user = (app as any).user;
      }
    });

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

    await app.register(sessionsRoutes, { prefix: '/api/v1' });
  });

  afterEach(async () => {
    mockFrom.mockReset();
    await app.close();
  });

  describe('GET /sessions (list)', () => {
    it('should return user sessions when authenticated', async () => {
      (app as any).user = { id: 'test-user', role: 'user' };

      const mockSessions = [
        { id: '1', story_id: 'story-1', story_title: 'Story 1' },
        { id: '2', story_id: 'story-2', story_title: 'Story 2' },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    it('should return empty array for user with no sessions', async () => {
      (app as any).user = { id: 'test-user', role: 'user' };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });
  });

  describe('GET /sessions/:id', () => {
    it('should return session by id', async () => {
      (app as any).user = { id: 'session-owner', role: 'user' };

      const mockSession = {
        id: '123',
        story_id: 'story-1',
        story_title: 'Test Story',
        owner_uid: 'session-owner',
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { owner_uid: 'session-owner' },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockSession,
            error: null,
          }),
        };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions/123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('123');
      expect(body.story_title).toBe('Test Story');
    });

    it('should return 404 for non-existent session', async () => {
      (app as any).user = { id: 'test-user', role: 'user' };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions/999',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should reject access to other user session', async () => {
      (app as any).user = { id: 'different-user', role: 'user' };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_uid: 'session-owner' },
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions/123',
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /sessions (create)', () => {
    it('should allow unauthenticated request (anonymous session)', async () => {
      const newSession = {
        id: 'new-session-id',
        session_token: 'token-123',
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: newSession,
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          story_id: 'story-123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBe('new-session-id');
    });

    it('should reject request with missing storyId', async () => {
      (app as any).user = { id: 'test-user', role: 'user' };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
    });

    it('should create session with valid data', async () => {
      (app as any).user = { id: 'test-user', role: 'user' };

      const newSession = {
        id: 'new-session-id',
        story_id: 'story-123',
        owner_uid: 'test-user',
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: newSession,
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          story_id: 'story-123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBe('new-session-id');
    });
  });

  describe('PUT /sessions/:id (update)', () => {
    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/sessions/123',
        payload: {
          title: 'Updated Session',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject non-owner update', async () => {
      (app as any).user = { id: 'different-user', role: 'user' };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_uid: 'session-owner' },
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/sessions/123',
        payload: {
          title: 'Updated Session',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow owner update', async () => {
      (app as any).user = { id: 'session-owner', role: 'user' };

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          const queryObj: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { owner_uid: 'session-owner' },
              error: null,
            }),
          };
          return queryObj;
        }
        const updateObj: any = {
          update: vi.fn().mockReturnThis(),
        };
        updateObj.eq = vi.fn().mockResolvedValue({ error: null });
        return updateObj;
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/sessions/123',
        payload: {
          title: 'Updated Session',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
    });
  });

  describe('DELETE /sessions/:id', () => {
    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/123',
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject non-owner deletion', async () => {
      (app as any).user = { id: 'different-user', role: 'user' };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_uid: 'session-owner' },
          error: null,
        }),
      } as any);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/123',
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow owner deletion', async () => {
      (app as any).user = { id: 'session-owner', role: 'user' };

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          const queryObj: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { owner_uid: 'session-owner' },
              error: null,
            }),
          };
          return queryObj;
        }
        const deleteObj: any = {
          delete: vi.fn().mockReturnThis(),
        };
        deleteObj.eq = vi.fn().mockResolvedValue({ error: null });
        return deleteObj;
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
    });
  });
});
