// backend/src/plugins/sentry.ts
import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { extractBearerToken } from '../lib/auth-helpers.js';

/**
 * Extended reply type with Sentry span
 */
declare module 'fastify' {
  interface FastifyReply {
    sentrySpan?: Sentry.Span;
  }
}

/**
 * Sentry error tracking and performance monitoring plugin
 *
 * Features:
 * - Automatic error capturing and reporting
 * - Performance monitoring for routes
 * - User tracking from auth headers
 * - Request breadcrumbs
 * - Environment-aware configuration
 */
export default fp(async function sentryPlugin(app: FastifyInstance) {
  const { SENTRY_DSN, SENTRY_ENVIRONMENT, NODE_ENV } = app.config;

  // Skip initialization if no DSN configured
  if (!SENTRY_DSN) {
    app.log.warn('Sentry: SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  // Initialize Sentry with v10 API
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT || NODE_ENV || 'development',
    integrations: [
      // HTTP request tracing integration
      Sentry.httpIntegration(),
      // Node.js profiling
      nodeProfilingIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    // beforeSend filter for sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        const { authorization, 'x-api-key': xApiKey, cookie, ...safeHeaders } = event.request.headers;
        event.request.headers = safeHeaders;
      }
      // Filter out sensitive data in request body
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '[REDACTED]';
        if (data.apiKey) data.apiKey = '[REDACTED]';
        if (data.accessToken) data.accessToken = '[REDACTED]';
        if (data.refreshToken) data.refreshToken = '[REDACTED]';
      }
      return event;
    },
  });

  // Add request hook to start spans
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Create span for performance monitoring using v10 API
    const span = Sentry.startSpan({
      name: `${request.method} ${request.url}`,
      op: 'http.server',
    }, () => {
      // Span is automatically active in this callback
    });

    // Store span on reply for finishing later
    if (span !== undefined) {
      reply.sentrySpan = span;
    }

    // Add user context if authenticated
    const token = extractBearerToken(request.headers.authorization);
    if (token) {
      // Set basic user context - will be overridden by auth plugin with full details
      Sentry.setUser({ id: 'authenticated' });
    }
  });

  // Add response hook to finish spans
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sentrySpan) {
      reply.sentrySpan.end();
      reply.sentrySpan = undefined;
    }
  });

  // Add error hook to capture errors
  app.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    // Capture exception with context
    Sentry.withScope((scope) => {
      // Add request data
      scope.setContext('request', {
        method: request.method,
        url: request.url,
        headers: request.headers,
        query: request.query,
        body: request.body,
      });

      // Add response data
      scope.setContext('response', {
        statusCode: reply.statusCode,
      });

      // Capture the exception
      Sentry.captureException(error);
    });
  });

  app.log.info('Sentry: Error tracking initialized');
});

/**
 * Helper function to manually capture errors
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional_context', context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Helper function to manually capture messages
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Helper function to set user context
 */
export function setUser(user: { id: string; email?: string; role?: string }): void {
  Sentry.setUser(user);
}

/**
 * Helper function to add breadcrumbs
 */
export function addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}
