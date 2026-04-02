import * as Sentry from '@sentry/node';
import type { FastifyInstance } from 'fastify';
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
declare const _default: (app: FastifyInstance) => Promise<void>;
export default _default;
/**
 * Helper function to manually capture errors
 */
export declare function captureError(error: Error, context?: Record<string, any>): void;
/**
 * Helper function to manually capture messages
 */
export declare function captureMessage(message: string, level?: Sentry.SeverityLevel): void;
/**
 * Helper function to set user context
 */
export declare function setUser(user: {
    id: string;
    email?: string;
    role?: string;
}): void;
/**
 * Helper function to add breadcrumbs
 */
export declare function addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel): void;
