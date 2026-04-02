// backend/src/routes/admin/service-logs.test.ts
// Unit tests for service logs route with time_range and status filters
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import serviceLogsRoutes from './service-logs.js';

describe('Service Logs Routes - time_range and status filters', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Mock Supabase admin client
    const mockData = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/api/v1/config',
        status_code: 200,
        duration_ms: 100,
        ip: '127.0.0.1',
        user_agent: 'test-agent',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        method: 'POST',
        path: '/api/v1/game/start',
        status_code: 400,
        duration_ms: 200,
        ip: '127.0.0.2',
        user_agent: 'test-agent',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        method: 'GET',
        path: '/api/v1/sessions',
        status_code: 500,
        duration_ms: 300,
        ip: '127.0.0.3',
        user_agent: 'test-agent',
      },
    ];

    const mockRpc = vi.fn().mockResolvedValue({
      data: 150,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      count: 3,
      data: mockData,
      error: null,
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: mockData,
          count: 3,
          error: null,
        }),
      }),
    });

    // Make order chainable
    const mockOrderChain = {
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockData,
        count: 3,
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

    await app.register(serviceLogsRoutes);
  });

  it('should handle time_range parameter (24h)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?time_range=24h',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('total_pages');
  });

  it('should handle status parameter (2xx)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?status=2xx',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle status parameter (4xx)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?status=4xx',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle status parameter (5xx)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?status=5xx',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle status parameter (empty = all)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?status=',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle combined filters (status + time_range)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?status=2xx&time_range=24h',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle legacy status_code parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?status_code=200',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should handle path filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?path=/api/v1/config',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });

  it('should paginate correctly', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/service-logs?page=1&limit=10',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
    expect(data.page).toBe(1);
  });
});
