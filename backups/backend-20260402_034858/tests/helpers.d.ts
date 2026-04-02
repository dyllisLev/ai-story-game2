import { type FastifyInstance } from 'fastify';
import type { EnvConfig } from '../../config.js';
/**
 * Test app builder - creates Fastify app with test configuration
 *
 * This allows integration testing without starting a server,
 * using light-my-request to inject requests.
 */
export declare function buildTestApp(overrides?: Partial<EnvConfig>): Promise<FastifyInstance>;
/**
 * Mock user for authentication tests
 */
export declare const mockUser: {
    id: string;
    email: string;
    nickname: string;
    role: "user";
};
export declare const mockAdmin: {
    id: string;
    email: string;
    nickname: string;
    role: "admin";
};
/**
 * Helper to create auth headers for requests
 */
export declare function createAuthHeaders(user?: typeof mockUser | typeof mockAdmin): Record<string, string>;
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
export declare function testRequest(app: FastifyInstance, options: TestRequestOptions): Promise<{
    statusCode: number;
    body: any;
    headers: Record<string, string>;
}>;
/**
 * Common test data builders
 */
export declare const testDataBuilders: {
    user: () => {
        email: string;
        password: string;
        nickname: string;
    };
    story: () => {
        title: string;
        genre: string;
        description: string;
        status: string;
    };
    preset: () => {
        title: string;
        genre: string;
        description: string;
    };
    statusPreset: () => {
        title: string;
        genre: string;
        attributes: {
            key: string;
            label: string;
            type: string;
            default: number;
            min: number;
            max: number;
        }[];
    };
};
