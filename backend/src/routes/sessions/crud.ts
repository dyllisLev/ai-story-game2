// backend/src/routes/sessions/crud.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth, verifySessionAccess } from '../../plugins/auth.js';
import { getDefaultModelId } from '../../lib/config-helpers.js';

// PUT에서 변경 가능한 필드만 허용 (권한 상승 방지)
const ALLOWED_UPDATE_FIELDS = ['title', 'preset', 'last_played_at'];

export default async function (app: FastifyInstance) {
  // POST /api/sessions — 빈 세션 생성 (game/start를 사용하지 않는 경우)
  app.post('/api/sessions', async (request, reply) => {
    const user = requireAuth(request);
    const body = request.body as { story_id: string; title?: string; model?: string };

    if (!body.story_id) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'story_id를 입력해주세요' } });
    }

    const config = await app.getAppConfig();
    const defaultModel = getDefaultModelId(config.gameplayConfig);

    const { data, error } = await app.supabaseAdmin
      .from('sessions')
      .insert({
        id: crypto.randomUUID(),
        story_id: body.story_id,
        title: body.title || config.gameplayConfig.default_labels.new_session,
        model: body.model || defaultModel,
        messages: [],
        preset: {},
        owner_uid: user.id,
      })
      .select('id, session_token')
      .single();

    if (error) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    return reply.status(201).send({ id: data.id, sessionToken: data.session_token });
  });

  app.put<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    await verifySessionAccess(app, request, id);

    // 허용된 필드만 추출 (owner_uid, session_token 등 변경 방지)
    const body = request.body as Record<string, unknown>;
    const safeUpdate: Record<string, unknown> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (key in body) safeUpdate[key] = body[key];
    }

    if (Object.keys(safeUpdate).length === 0) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: '업데이트할 유효한 필드가 없습니다' } });
    }

    const { error } = await app.supabaseAdmin
      .from('sessions')
      .update(safeUpdate)
      .eq('id', id);

    if (error) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    await verifySessionAccess(app, request, id);

    await app.supabaseAdmin.from('sessions').delete().eq('id', id);
    return { ok: true };
  });
}
