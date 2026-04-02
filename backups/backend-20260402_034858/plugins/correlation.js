// backend/src/plugins/correlation.ts
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';
/**
 * Correlation ID plugin
 *
 * Adds a unique correlation ID to each request for tracking across logs.
 * This ID is included in all log messages for that request.
 */
export default fp(async function correlationPlugin(app) {
    const CORRELATION_HEADER = 'x-correlation-id';
    const REQUEST_ID_HEADER = 'x-request-id';
    app.addHook('onRequest', async (request, reply) => {
        // Get correlation ID from headers or generate new one
        const correlationId = request.headers[CORRELATION_HEADER] ||
            request.headers[REQUEST_ID_HEADER] ||
            randomUUID();
        // Store on request for logging
        request.correlationId = correlationId;
        // Add to response headers
        reply.header(CORRELATION_HEADER, correlationId);
        // Add to logger context
        request.log = request.log.child({ correlationId });
    });
    app.log.info('Correlation: Plugin initialized');
});
//# sourceMappingURL=correlation.js.map