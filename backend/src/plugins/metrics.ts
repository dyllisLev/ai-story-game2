// backend/src/plugins/metrics.ts
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getMetricsRegistry, trackHttpRequest } from '../services/metrics.js';
import type { Metric } from '../services/metrics.js';

// Pre-compile regex for better performance
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_ID_REGEX = /\/\d+(?=\/|$)/g; // Only replace digits that are path segments

/**
 * Metrics collection plugin
 *
 * Automatically tracks HTTP requests, response times, and error rates.
 * Metrics are stored in-memory and can be accessed via the /metrics endpoint.
 */
export default fp(async function metricsPlugin(app: FastifyInstance) {
  const registry = getMetricsRegistry();

  // Track active requests
  app.decorate('activeRequests', 0);

  app.addHook('onRequest', async (request) => {
    app.activeRequests++;
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    app.activeRequests--;

    const duration = Date.now() - (request.startTime as number);
    const path = getCategoryPath(request.routeOptions.url);

    trackHttpRequest(
      request.method,
      path,
      reply.statusCode,
      duration
    );
  });

  // Expose metrics endpoint
  app.get('/metrics', async (_request, reply) => {
    const metrics = registry.getMetrics();

    // Format metrics in Prometheus-like text format
    const lines: string[] = [];
    for (const metric of metrics) {
      const labelStr = metric.labels
        ? '{' + Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',') + '}'
        : '';

      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }

    reply.type('text/plain; version=0.0.4; charset=utf-8');
    return lines.join('\n') + '\n';
  });

  app.log.info('Metrics: Plugin initialized');
});

/**
 * Convert route path to category path for metrics
 *
 * Replaces path parameters with placeholders like :id
 * Example: /stories/123 -> /stories/:id
 */
function getCategoryPath(url?: string): string {
  if (!url) return 'unknown';

  // Replace UUID patterns first, then numeric path segments
  return url
    .replace(UUID_REGEX, '/:id')
    .replace(NUMERIC_ID_REGEX, '/:id');
}

declare module 'fastify' {
  interface FastifyInstance {
    activeRequests: number;
  }

  interface FastifyRequest {
    startTime?: number;
  }
}
