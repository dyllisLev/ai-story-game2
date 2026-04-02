import type { FastifyInstance } from 'fastify';
/**
 * Metrics collection plugin
 *
 * Automatically tracks HTTP requests, response times, and error rates.
 * Metrics are stored in-memory and can be accessed via the /metrics endpoint.
 */
declare const _default: (app: FastifyInstance) => Promise<void>;
export default _default;
declare module 'fastify' {
    interface FastifyInstance {
        activeRequests: number;
    }
    interface FastifyRequest {
        startTime?: number;
    }
}
