// backend/src/routes/game/utils.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * API 키 해석: 헤더 직접 전달 또는 로그인 사용자의 DB 저장 키 복호화
 */
export async function resolveApiKey(app: FastifyInstance, request: FastifyRequest): Promise<string | null> {
  // 1. 헤더에서 직접 가져오기 (익명 + 로그인 모두)
  const headerKey = request.headers['x-gemini-key'] as string;
  if (headerKey) return headerKey;

  // 2. 로그인 사용자: DB에서 암호화된 키 복호화
  if (request.user) {
    const { data: profile } = await app.supabaseAdmin
      .from('user_profiles')
      .select('api_key_enc')
      .eq('id', request.user.id)
      .single();

    if (profile?.api_key_enc) {
      try {
        const { decrypt } = await import('../../services/crypto.js');
        const decrypted = decrypt(profile.api_key_enc, app.config.API_KEY_ENCRYPTION_SECRET);
        if (decrypted) return decrypted;
      } catch {
        // 복호화 실패 시 — 손상된 키 삭제
        await app.supabaseAdmin
          .from('user_profiles')
          .update({ api_key_enc: null })
          .eq('id', request.user.id);
        app.log.warn({ userId: request.user.id }, 'Failed to decrypt stored API key, cleared');
      }
    }
  }

  return null;
}
