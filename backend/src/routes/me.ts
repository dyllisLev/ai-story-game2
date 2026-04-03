// backend/src/routes/me.ts
// GET    /me           — get own profile
// PUT    /me           — update nickname
// GET    /me/apikey    — get masked API key
// PUT    /me/apikey    — save encrypted API key
// DELETE /me/apikey    — remove API key
// GET    /me/models    — fetch available models from Gemini API
import type { FastifyInstance } from 'fastify';
import type { UserProfile } from '@story-game/shared';
import { requireLogin } from '../plugins/auth.js';
import { encrypt, decrypt } from '../services/crypto.js';
import { cachedQuery, CacheTags, CacheTTL } from '../services/cache.js';

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  version: string;
}

export default async function meRoutes(app: FastifyInstance) {
  // GET /me (cached)
  app.get('/me', async (request, reply) => {
    const user = requireLogin(request);

    // DEV mode: mock admin user bypass database query
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    if (isDev && user.id === 'dev-admin-user') {
      return reply.send({
        id: user.id,
        email: user.email,
        nickname: 'Dev Admin',
        avatar_url: null,
        has_api_key: false,
        role: 'admin',
        created_at: new Date().toISOString(),
      });
    }

    try {
      const profile = await cachedQuery(
        app.cache,
        `user:${user.id}`,
        async () => {
          const { data, error } = await app.supabaseAdmin
            .from('user_profiles')
            .select('id, nickname, api_key_enc, role, created_at')
            .eq('id', user.id)
            .maybeSingle();

          if (error || !data) {
            throw new Error('Profile not found');
          }

          return data;
        },
        {
          ttl: CacheTTL.MEDIUM, // 1 hour - changes infrequently
          tags: [CacheTags.USER_PROFILES, CacheTags.USER(user.id)],
        }
      );

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
    } catch (error) {
      app.log.error(error, 'GET /me: failed to fetch profile');
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: '프로필을 찾을 수 없습니다' },
      });
    }
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

    // Invalidate user profile cache
    await app.cache.invalidateByTag(CacheTags.USER(user.id));

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

    // DEV mode: dev bypass user - just return success (no database update)
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    if (isDev && user.id === 'dev-admin-user') {
      return reply.send({ has_api_key: true });
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

    // DEV mode: dev bypass user - just return success (no database update)
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    if (isDev && user.id === 'dev-admin-user') {
      return reply.status(204).send();
    }

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

  // GET /me/models — fetch available models from Gemini API
  app.get('/me/models', async (request, reply) => {
    const user = requireLogin(request);
    const encryptionKey = app.config.API_KEY_ENCRYPTION_SECRET;

    // Get user's encrypted API key
    const { data: profile, error } = await app.supabaseAdmin
      .from('user_profiles')
      .select('api_key_enc')
      .eq('id', user.id)
      .single();

    if (error || !profile?.api_key_enc) {
      return reply.status(400).send({
        error: { code: 'NO_API_KEY', message: 'API 키가 등록되어 있지 않습니다' },
      });
    }

    let apiKey: string;
    try {
      apiKey = decrypt(profile.api_key_enc, encryptionKey);
    } catch (decryptErr) {
      app.log.error(decryptErr, 'meRoutes GET /api/me/models: decrypt failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 키 복호화에 실패했습니다' },
      });
    }

    try {
      // Fetch models from Gemini API
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10_000), // 10초 타임아웃
        }
      );

      if (!res.ok) {
        const err = await res.text();
        app.log.error({ err, status: res.status }, 'meRoutes GET /api/me/models: Gemini API error');
        return reply.status(res.status).send({
          error: { code: 'GEMINI_API_ERROR', message: `Gemini API 오류: ${res.status}` },
        });
      }

      const data = await res.json();

      // Filter and transform models
      const models = (data.models || [])
        .filter((m: GeminiModel) => m.name.includes('generateContent'))
        .map((m: GeminiModel) => {
          const modelId = m.name.replace('models/', '');
          return {
            id: modelId,
            label: m.displayName || modelId,
            description: m.description,
            version: m.version,
          };
        })
        .sort((a: any, b: any) => {
          // Sort: models with 'flash' first, then 'pro', then others
          const aLower = a.id.toLowerCase();
          const bLower = b.id.toLowerCase();
          if (aLower.includes('flash') && !bLower.includes('flash')) return -1;
          if (!aLower.includes('flash') && bLower.includes('flash')) return 1;
          if (aLower.includes('pro') && !bLower.includes('pro')) return -1;
          if (!aLower.includes('pro') && bLower.includes('pro')) return 1;
          return a.id.localeCompare(b.id);
        });

      return reply.send({ models });
    } catch (fetchErr: any) {
      const message = fetchErr?.name === 'TimeoutError'
        ? 'Gemini API 응답 타임아웃 (10초)'
        : fetchErr?.message || '모델 목록을 가져오지 못했습니다';

      app.log.error({ err: fetchErr }, 'meRoutes GET /api/me/models: fetch failed');
      return reply.status(500).send({
        error: { code: 'FETCH_ERROR', message },
      });
    }
  });
}
