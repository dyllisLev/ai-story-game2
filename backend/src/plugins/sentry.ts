// backend/src/plugins/sentry.ts
import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { FastifyInstance } from 'fastify';
import { extractBearerToken } from '../lib/auth-helpers.js';

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

  // Initialize Sentry
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT || NODE_ENV || 'development',
    integrations: [
      // HTTP request tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Express-like middleware for Fastify
      new Sentry.Integrations.OnUnhandledRejection({ mode: 'warn' }),
      // Node.js profiling
      nodeProfilingIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    // Capture unhandled errors
    captureUnhandledRejections: true,
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

  // Decorate reply with Sentry tracing
  app.decorateReply('sentryTransaction', null);

  // Add request hook to start transactions
  app.addHook('onRequest', async (request, reply) => {
    // Create transaction for performance monitoring
    const transaction = Sentry.startTransaction({
      name: `${request.method} ${request.url}`,
      op: 'http.server',
    });

    reply.sentryTransaction = transaction;

    // Add user context if authenticated
    const token = extractBearerToken(request.headers.authorization);
    if (token) {
      // Set basic user context - will be overridden by auth plugin with full details
      Sentry.setUser({ id: 'authenticated' });
    }
  });

  // Add response hook to finish transactions
  app.addHook('onResponse', async (request, reply) => {
    if (reply.sentryTransaction) {
      reply.sentryTransaction.finish();
      reply.sentryTransaction = null;
    }
  });

  // Add error hook to capture errors
  app.addHook('onError', async (request, reply, error) => {
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
