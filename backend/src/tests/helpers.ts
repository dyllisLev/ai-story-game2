// backend/src/tests/helpers.ts
import Fastify, { type FastifyInstance } from 'fastify';
import buildApp from '../../server.js';
import { loadConfig } from '../../config.js';
import type { EnvConfig } from '../../config.js';

/**
 * Test app builder - creates Fastify app with test configuration
 *
 * This allows integration testing without starting a server,
 * using light-my-request to inject requests.
 */
export async function buildTestApp(overrides: Partial<EnvConfig> = {}): Promise<FastifyInstance> {
  const testConfig = {
    ...loadConfig(),
    ...overrides,
    NODE_ENV: 'test' as const,
  };

  // Build Fastify app with test config
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Decorate with test config
  app.decorate('config', testConfig);

  // Register routes (similar to server.ts but without plugins that require external services)
  // We'll need to mock supabase, redis, etc.

  return app;
}

/**
 * Mock user for authentication tests
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  nickname: 'Test User',
  role: 'user' as const,
};

export const mockAdmin = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  nickname: 'Test Admin',
  role: 'admin' as const,
};

/**
 * Helper to create auth headers for requests
 */
export function createAuthHeaders(user?: typeof mockUser | typeof mockAdmin): Record<string, string> {
  if (!user) {
    return {};
  }

  // In real implementation, this would create a valid JWT
  // For now, we'll use a mock token that tests can verify
  return {
    authorization: `Bearer mock-token-${user.id}`,
  };
}

/**
 * Helper to build a test request
 */
export interface TestRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
}

export async function testRequest(
  app: FastifyInstance,
  options: TestRequestOptions
): Promise<{ statusCode: number; body: any; headers: Record<string, string> }> {
  const response = await app.inject({
    method: options.method,
    url: options.url,
    headers: options.headers,
    payload: options.body,
    query: options.query,
  });

  return {
    statusCode: response.statusCode,
    body: response.json(),
    headers: response.headers as Record<string, string>,
  };
}

/**
 * Common test data builders
 */
export const testDataBuilders = {
  user: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    nickname: `Test User ${Date.now()}`,
  }),

  story: () => ({
    title: `Test Story ${Date.now()}`,
    genre: 'fantasy',
    description: 'A test story for integration testing',
    status: 'draft',
  }),

  preset: () => ({
    title: `Test Preset ${Date.now()}`,
    genre: 'fantasy',
    description: 'A test preset',
  }),

  statusPreset: () => ({
    title: `Test Status Preset ${Date.now()}`,
    genre: 'fantasy',
    attributes: [
      { key: 'health', label: '체력', type: 'number', default: 100, min: 0, max: 100 },
    ],
  }),
};
