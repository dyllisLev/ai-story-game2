// backend/src/plugins/auth.ts
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthUser } from '@story-game/shared';
import { MOCK_ADMIN_USER } from '@story-game/shared';
import * as Sentry from '@sentry/node';
import { extractBearerToken, extractCookieToken, COOKIE_NAMES } from '../lib/auth-helpers.js';
import { DEV_HEADERS, DEV_HEADER_VALUES } from '../constants.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null);

  // Parse JWT for all requests but don't fail - allows public routes to work
  app.addHook('preHandler', async (request) => {
    // DEV mode: allow mock admin for E2E testing
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    const devAdminHeader = request.headers[DEV_HEADERS.ADMIN_SKIP];

    // Debug logging for all admin routes
    if (request.url.includes('config') || request.url.includes('admin')) {
      console.log('[preHandler] URL:', request.url, 'isDev:', isDev, 'devHeader:', devAdminHeader, 'NODE_ENV:', process.env.NODE_ENV);
    }

    if (isDev && devAdminHeader === DEV_HEADER_VALUES.SKIP) {
      console.log('[preHandler] DEV BYPASS: Setting MOCK_ADMIN_USER');
      request.user = MOCK_ADMIN_USER;
      return;
    }

    let token: string | undefined;

    // Try Authorization header first (for backward compatibility)
    token = extractBearerToken(request.headers.authorization);

    // Fall back to cookie-based auth if header not present
    if (!token) {
      token = extractCookieToken(request.headers.cookie, COOKIE_NAMES.ACCESS_TOKEN);
    }

    if (!token) return;

    const { data: { user }, error } = await app.supabase.auth.getUser(token);

    if (error || !user) return;

    // Fetch nickname and role from user_profiles
    const { data: profile } = await app.supabaseAdmin
      .from('user_profiles')
      .select('nickname, role')
      .eq('id', user.id)
      .single();

    request.user = {
      id: user.id,
      email: user.email || '',
      nickname: profile?.nickname || null,
      role: (profile?.role as AuthUser['role']) || 'pending',
    };

    // Set Sentry user context asynchronously (don't await - fire and forget)
    setImmediate(() => {
      Sentry.setUser({
        id: user.id,
        email: user.email || undefined,
        role: (profile?.role as AuthUser['role']) || 'pending',
      });
    });
  });
});

// 라우트에서 사용할 인증 가드 함수들

/** 로그인 필수 + 승인된 사용자만 (pending 차단) */
export function requireAuth(request: FastifyRequest): AuthUser {
  if (!request.user) {
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: '로그인이 필요합니다' };
  }
  if (request.user.role === 'pending') {
    throw { statusCode: 403, code: 'PENDING_APPROVAL', message: '관리자 승인 대기 중입니다' };
  }
  return request.user;
}

/** 로그인 필수 (pending 포함 — 프로필 조회 등에 사용) */
export function requireLogin(request: FastifyRequest): AuthUser {
  if (!request.user) {
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: '로그인이 필요합니다' };
  }
  return request.user;
}

export function requireAdmin(request: FastifyRequest): AuthUser {
  const user = requireLogin(request);
  if (user.role !== 'admin') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' };
  }
  return user;
}

/**
 * Requires HTTP Basic Authentication for admin routes.
 * This provides an additional security layer for admin access.
 */
export function requireAdminBasicAuth(request: FastifyRequest): void {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'Basic Authentication required' };
  }

  // Decode Basic Auth credentials
  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  const adminUsername = request.server.config.ADMIN_BASIC_AUTH_USERNAME;
  const adminPassword = request.server.config.ADMIN_BASIC_AUTH_PASSWORD;

  if (!username || !password || username !== adminUsername || password !== adminPassword) {
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'Invalid admin credentials' };
  }
}

/**
 * Requires both Basic Authentication AND JWT admin role.
 * This provides dual-layer security for sensitive admin operations.
 */
export function requireAdminWithBasicAuth(request: FastifyRequest): AuthUser {
  // First check Basic Auth
  requireAdminBasicAuth(request);
  // Then check JWT admin role
  return requireAdmin(request);
}

/**
 * Verifies that the authenticated user owns a resource (or is admin).
 */
export async function verifyResourceOwner(
  app: FastifyInstance,
  request: FastifyRequest,
  table: string,
  id: string
): Promise<void> {
  const user = requireAuth(request);

  const { data, error } = await app.supabaseAdmin
    .from(table)
    .select('owner_uid')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: '리소스를 찾을 수 없습니다' };
  }

  if ((data as { owner_uid: string }).owner_uid !== user.id && user.role !== 'admin') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '이 리소스를 수정할 권한이 없습니다' };
  }
}

// 세션 토큰 검증 (익명 사용자용)
export async function verifySessionAccess(
  app: FastifyInstance,
  request: FastifyRequest,
  sessionId: string
): Promise<void> {
  // DEV mode: dev bypass - skip session token verification
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  if (isDev && request.headers['x-dev-admin-skip'] === 'skip') {
    // In dev bypass mode, just verify the session exists
    const { data } = await app.supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' };
    return;
  }

  // 로그인 사용자: owner_uid로 검증
  if (request.user) {
    const { data } = await app.supabaseAdmin
      .from('sessions')
      .select('owner_uid')
      .eq('id', sessionId)
      .single();

    if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' };
    if (data.owner_uid && data.owner_uid !== request.user.id) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 접근 권한이 없습니다' };
    }
    return;
  }

  // 익명 사용자: X-Session-Token으로 검증
  const sessionToken = request.headers['x-session-token'] as string;
  if (!sessionToken) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 토큰이 필요합니다' };
  }

  const { data } = await app.supabaseAdmin
    .from('sessions')
    .select('session_token')
    .eq('id', sessionId)
    .single();

  if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' };
  if (data.session_token !== sessionToken) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 토큰이 일치하지 않습니다' };
  }
}
