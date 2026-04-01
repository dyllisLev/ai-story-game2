// backend/src/routes/me.ts
// GET    /me           — get own profile
// PUT    /me           — update nickname
// GET    /me/apikey    — get masked API key
// PUT    /me/apikey    — save encrypted API key
// DELETE /me/apikey    — remove API key
import type { FastifyInstance } from 'fastify';
import type { UserProfile } from '@story-game/shared';
import { requireLogin } from '../plugins/auth.js';
import { encrypt, decrypt } from '../services/crypto.js';

export default async function meRoutes(app: FastifyInstance) {
  // GET /me
  app.get('/me', async (request, reply) => {
    const user = requireLogin(request);

    const { data: profile, error } = await app.supabaseAdmin
      .from('user_profiles')
      .select('id, nickname, api_key_enc, role, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: '프로필을 찾을 수 없습니다' },
      });
    }

    const response = {
      id: profile.id,
      email: user.email,
      nickname: profile.nickname ?? null,
      avatar_url: null, // TODO: add avatar_url column to user_profiles
      has_api_key: profile.api_key_enc != null,
      role: profile.role ?? 'pending',
      created_at: profile.created_at,
    };

    return reply.send(response);
  });

  // PUT /me — update nickname
  app.put('/me', async (request, reply) => {
    const user = requireLogin(request);
    const { nickname } = request.body as { nickname: string };

    if (!nickname) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: '닉네임을 입력해주세요' },
      });
    }

    const { data, error } = await app.supabaseAdmin
      .from('user_profiles')
      .update({ nickname, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, nickname, avatar_url, api_key_enc, created_at')
      .single();

    if (error) {
      app.log.error(error, 'meRoutes PUT /api/me: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '프로필 업데이트에 실패했습니다' },
      });
    }

    const response: UserProfile = {
      id: data.id,
      nickname: data.nickname ?? null,
      avatar_url: data.avatar_url ?? null,
      has_api_key: data.api_key_enc != null,
      created_at: data.created_at,
    };

    return reply.send(response);
  });

  // GET /me/apikey — masked API key
  app.get('/me/apikey', async (request, reply) => {
    const user = requireLogin(request);
    const encryptionKey = app.config.API_KEY_ENCRYPTION_SECRET;

    const { data: profile, error } = await app.supabaseAdmin
      .from('user_profiles')
      .select('api_key_enc')
      .eq('id', user.id)
      .single();

    if (error || !profile?.api_key_enc) {
      return reply.send({ has_api_key: false, masked: null });
    }

    try {
      const plaintext = decrypt(profile.api_key_enc, encryptionKey);
      const masked =
        plaintext.length > 8
          ? plaintext.slice(0, 4) + '****' + plaintext.slice(-4)
          : '****';
      return reply.send({ has_api_key: true, masked });
    } catch (decryptErr) {
      app.log.error(decryptErr, 'meRoutes GET /api/me/apikey: decrypt failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 키 복호화에 실패했습니다' },
      });
    }
  });

  // PUT /me/apikey — save encrypted API key
  app.put('/me/apikey', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const user = requireLogin(request);
    const { apiKey } = request.body as { apiKey: string };
    const encryptionKey = app.config.API_KEY_ENCRYPTION_SECRET;

    if (!apiKey) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'API 키를 입력해주세요' },
      });
    }

    let encrypted: string;
    try {
      encrypted = encrypt(apiKey, encryptionKey);
    } catch (encErr) {
      app.log.error(encErr, 'meRoutes PUT /api/me/apikey: encrypt failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 키 암호화에 실패했습니다' },
      });
    }

    const { error } = await app.supabaseAdmin
      .from('user_profiles')
      .update({ api_key_enc: encrypted, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      app.log.error(error, 'meRoutes PUT /api/me/apikey: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 키 저장에 실패했습니다' },
      });
    }

    return reply.send({ has_api_key: true });
  });

  // DELETE /me/apikey — remove API key
  app.delete('/me/apikey', async (request, reply) => {
    const user = requireLogin(request);

    const { error } = await app.supabaseAdmin
      .from('user_profiles')
      .update({ api_key_enc: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      app.log.error(error, 'meRoutes DELETE /api/me/apikey: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 키 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
