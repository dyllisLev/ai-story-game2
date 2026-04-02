// backend/src/tests/helpers.ts
import Fastify from 'fastify';
import { loadConfig } from '../../config.js';
/**
 * Test app builder - creates Fastify app with test configuration
 *
 * This allows integration testing without starting a server,
 * using light-my-request to inject requests.
 */
export async function buildTestApp(overrides = {}) {
    const testConfig = {
        ...loadConfig(),
        ...overrides,
        NODE_ENV: 'test',
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
    role: 'user',
};
export const mockAdmin = {
    id: 'test-admin-id',
    email: 'admin@example.com',
    nickname: 'Test Admin',
    role: 'admin',
};
/**
 * Helper to create auth headers for requests
 */
export function createAuthHeaders(user) {
    if (!user) {
        return {};
    }
    // In real implementation, this would create a valid JWT
    // For now, we'll use a mock token that tests can verify
    return {
        authorization: `Bearer mock-token-${user.id}`,
    };
}
export async function testRequest(app, options) {
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
        headers: response.headers,
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
//# sourceMappingURL=helpers.js.map