// backend/src/routes/admin/api-logs.test.ts
// Unit tests for API logs route with time_range filter
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import apiLogsRoutes from './api-logs.js';

describe('API Logs Routes - time_range filter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Mock Supabase admin client
    const mockData = [
      {
        id: '1',
        session_id: 'session-1',
        endpoint: '/api/v1/game/start',
        request_model: 'gemini-pro',
        response_usage: { input: 100, output: 200 },
        response_error: null,
        duration_ms: 1000,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        session_id: 'session-2',
        endpoint: '/api/v1/game/chat',
        request_model: 'gemini-pro',
        response_usage: { input: 150, output: 250 },
        response_error: 'Error occurred',
        duration_ms: 2000,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ];

    const mockRpc = vi.fn().mockResolvedValue({
      data: 150,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      count: 2,
      data: mockData,
      error: null,
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: mockData,
          count: 2,
          error: null,
        }),
      }),
    });

    // Make order chainable
    const mockOrderChain = {
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockData,
        count: 2,
        error: null,
      }),
    };

    const mockOrder = vi.fn().mockReturnValue(mockOrderChain);

    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      rpc: mockRpc,
    });

    app.supabaseAdmin = {
      from: mockFrom,
      rpc: mockRpc,
    } as any;

    // Mock requireAdmin to always pass
    app.decorate('requireAdmin', vi.fn(() => {}));

    await app.register(apiLogsRoutes);
  });

  it('should handle time_range parameter (24h)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?time_range=24h',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('total_pages');
  });

  it('should handle time_range parameter (1h)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?time_range=1h',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle time_range parameter (6h)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?time_range=6h',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle errors_only filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?errors_only=true',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle endpoint filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?endpoint=/api/v1/game/start',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle combined filters (time_range + errors_only)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?time_range=24h&errors_only=true',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should paginate correctly', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/api-logs?page=1&limit=10',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
    expect(data.page).toBe(1);
  });
});
