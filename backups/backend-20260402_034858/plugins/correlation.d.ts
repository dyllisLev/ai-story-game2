import type { FastifyInstance } from 'fastify';
/**
 * Correlation ID plugin
 *
 * Adds a unique correlation ID to each request for tracking across logs.
 * This ID is included in all log messages for that request.
 */
declare const _default: (app: FastifyInstance) => Promise<void>;
export default _default;
declare module 'fastify' {
    interface FastifyRequest {
        correlationId: string;
    }
}
