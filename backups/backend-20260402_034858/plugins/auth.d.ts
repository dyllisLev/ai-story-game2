import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthUser } from '@story-game/shared';
declare module 'fastify' {
    interface FastifyRequest {
        user: AuthUser | null;
    }
}
declare const _default: (app: FastifyInstance) => Promise<void>;
export default _default;
/** 로그인 필수 + 승인된 사용자만 (pending 차단) */
export declare function requireAuth(request: FastifyRequest): AuthUser;
/** 로그인 필수 (pending 포함 — 프로필 조회 등에 사용) */
export declare function requireLogin(request: FastifyRequest): AuthUser;
export declare function requireAdmin(request: FastifyRequest): AuthUser;
/**
 * Requires HTTP Basic Authentication for admin routes.
 * This provides an additional security layer for admin access.
 */
export declare function requireAdminBasicAuth(request: FastifyRequest): void;
/**
 * Requires both Basic Authentication AND JWT admin role.
 * This provides dual-layer security for sensitive admin operations.
 */
export declare function requireAdminWithBasicAuth(request: FastifyRequest): AuthUser;
/**
 * Verifies that the authenticated user owns a resource (or is admin).
 */
export declare function verifyResourceOwner(app: FastifyInstance, request: FastifyRequest, table: string, id: string): Promise<void>;
export declare function verifySessionAccess(app: FastifyInstance, request: FastifyRequest, sessionId: string): Promise<void>;
