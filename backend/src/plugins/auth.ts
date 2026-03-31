// backend/src/plugins/auth.ts
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthUser } from '@story-game/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null);

  // preHandler — 모든 요청에서 JWT를 파싱 (실패해도 진행, 공개 라우트 허용)
  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return;

    const token = authHeader.slice(7);
    const { data: { user }, error } = await app.supabase.auth.getUser(token);

    if (error || !user) return;

    // user_profiles에서 닉네임과 role 조회
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
