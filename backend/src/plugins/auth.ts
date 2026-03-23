// backend/src/plugins/auth.ts
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthUser } from '@story-game/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

const ADMIN_UID_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null);

  // In-memory cache for admin_uid to avoid a DB round-trip on every request.
  let adminUidCache: { value: string | null; expiresAt: number } | null = null;

  async function getAdminUid(): Promise<string | null> {
    if (adminUidCache && Date.now() < adminUidCache.expiresAt) {
      return adminUidCache.value;
    }
    const { data } = await app.supabaseAdmin
      .from('config')
      .select('value')
      .eq('id', 'admin_uid')
      .single();
    const value = (data?.value as string | null) ?? null;
    adminUidCache = { value, expiresAt: Date.now() + ADMIN_UID_TTL_MS };
    return value;
  }

  // preHandler로 등록 — 모든 요청에서 JWT를 파싱 (실패해도 진행, 공개 라우트 허용)
  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return;

    const token = authHeader.slice(7);
    const { data: { user }, error } = await app.supabase.auth.getUser(token);

    if (error || !user) return;

    // user_profiles에서 닉네임과 role 조회, admin_uid는 캐시 사용
    const [{ data: profile }, adminUid] = await Promise.all([
      app.supabaseAdmin
        .from('user_profiles')
        .select('nickname')
        .eq('id', user.id)
        .single(),
      getAdminUid(),
    ]);

    request.user = {
      id: user.id,
      email: user.email || '',
      nickname: profile?.nickname || null,
      role: adminUid === user.id ? 'admin' : 'user',
    };
  });
});

// 라우트에서 사용할 인증 가드 함수들
export function requireAuth(request: FastifyRequest): AuthUser {
  if (!request.user) {
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: '로그인이 필요합니다' };
  }
  return request.user;
}

export function requireAdmin(request: FastifyRequest): AuthUser {
  const user = requireAuth(request);
  if (user.role !== 'admin') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' };
  }
  return user;
}

/**
 * Verifies that the authenticated user owns a resource (or is admin).
 * Throws with the appropriate HTTP status if not found or not authorized.
 *
 * @param table   - Supabase table name
 * @param id      - Row id value
 * @param request - Fastify request (must already have request.user set)
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
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Resource not found' };
  }

  if ((data as { owner_uid: string }).owner_uid !== user.id && user.role !== 'admin') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Not authorized to modify this resource' };
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

    if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Session not found' };
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

  if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Session not found' };
  if (data.session_token !== sessionToken) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 토큰이 일치하지 않습니다' };
  }
}
