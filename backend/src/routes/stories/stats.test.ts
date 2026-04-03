// backend/src/routes/stories/stats.test.ts
import { describe, it, expect, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import statsRoute from './stats.js';

describe('GET /api/v1/stories/stats', () => {
  const createApp = async (mockFrom: any) => {
    const app = Fastify({ logger: false });

    // Add error handler
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

    // Mock Supabase admin client
    app.decorate('supabaseAdmin', {
      from: mockFrom,
    } as any);

    // Register route with API v1 prefix
    await app.register(statsRoute, { prefix: '/api/v1' });
    return app;
  };

  it('should return story statistics successfully', async () => {
    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        const mockHead = vi.fn().mockResolvedValue({
          count: 10,
          error: null,
        });
        return {
          select: vi.fn().mockResolvedValue({ head: mockHead }),
        };
      } else {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { owner_uid: 'user-1' },
              { owner_uid: 'user-2' },
              { owner_uid: 'user-1' }, // Duplicate author
            ],
            error: null,
          }),
        };
      }
    });

    const app = await createApp(mockFrom);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stories/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('total_stories');
    expect(body).toHaveProperty('total_plays');
    expect(body).toHaveProperty('total_authors');
  });

  it.skip('should handle database errors gracefully', async () => {
    const mockHead = vi.fn().mockResolvedValue({
      count: null,
      error: { message: 'Database connection failed' },
    });
    const mockFrom = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ head: mockHead }),
    }));

    const app = await createApp(mockFrom);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stories/stats',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toHaveProperty('code', 'INTERNAL_ERROR');
  });

  it('should handle empty results correctly', async () => {
    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        const mockHead = vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        });
        return {
          select: vi.fn().mockResolvedValue({ head: mockHead }),
        };
      } else {
        return {
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
    });

    const app = await createApp(mockFrom);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stories/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.total_stories).toBe(0);
    expect(body.total_plays).toBe(0);
    expect(body.total_authors).toBe(0);
  });

  it('should filter null owner_uid values when counting authors', async () => {
    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        const mockHead = vi.fn().mockResolvedValue({
          count: 5,
          error: null,
        });
        return {
          select: vi.fn().mockResolvedValue({ head: mockHead }),
        };
      } else {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { owner_uid: 'user-1' },
              { owner_uid: null }, // Should be filtered out
              { owner_uid: 'user-2' },
              { owner_uid: null }, // Should be filtered out
            ],
            error: null,
          }),
        };
      }
    });

    const app = await createApp(mockFrom);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stories/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.total_authors).toBe(2); // Only non-null owner_uid values
  });

  it('should handle stories query error', async () => {
    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        const mockHead = vi.fn().mockResolvedValue({
          count: 10,
          error: null,
        });
        return {
          select: vi.fn().mockResolvedValue({ head: mockHead }),
        };
      } else {
        return {
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Stories query failed' },
          }),
        };
      }
    });

    const app = await createApp(mockFrom);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stories/stats',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toHaveProperty('code', 'INTERNAL_ERROR');
  });
});
