// backend/src/plugins/request-logger.ts
// Fastify plugin: log all HTTP requests to service_logs table (fire-and-forget)
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

// Paths that should not be logged (health check noise, static assets, preflight, etc.)
const EXCLUDE_PREFIXES = [
  '/api/health',
  '/api/config',
  '/favicon.',
  '/__',
  // Static assets
  '/assets/',
  '/styles/',
  '/js/',
  '/images/',
  '/icons/',
];

function shouldExclude(url: string, method: string): boolean {
  if (method === 'OPTIONS') return true;
  // Strip query string before prefix matching
  const path = url.split('?')[0];
  return EXCLUDE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default fp(
  async (app: FastifyInstance) => {
    app.addHook('onResponse', (request, reply, done) => {
      // Skip excluded paths and methods
      if (shouldExclude(request.url, request.method)) {
        done();
        return;
      }

      // Fire-and-forget: logging failure must not affect the HTTP response
      app.supabaseAdmin
        .from('service_logs')
        .insert({
          method:       request.method,
          path:         request.url,
          status_code:  reply.statusCode,
          duration_ms:  Math.round(reply.elapsedTime),
          ip:
            (request.headers['x-forwarded-for'] as string | undefined)
              ?.split(',')[0]
              ?.trim() ?? request.ip,
          user_agent: request.headers['user-agent'] ?? '',
        })
        .then(({ error }) => {
          if (error) {
            app.log.warn({ error }, 'request-logger: failed to write service_log');
          }
        });

      done();
    });
  },
  {
    name: 'request-logger',
    dependencies: ['supabase'],
  }
);
