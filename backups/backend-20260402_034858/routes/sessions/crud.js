import { verifySessionAccess } from '../../plugins/auth.js';
import { getDefaultModelId } from '../../lib/config-helpers.js';
// PUT에서 변경 가능한 필드만 허용 (권한 상승 방지)
const ALLOWED_UPDATE_FIELDS = ['title', 'preset', 'last_played_at'];
export default async function (app) {
    // POST /sessions — 빈 세션 생성 (game/start를 사용하지 않는 경우)
    // Will be prefixed with /api/v1
    app.post('/sessions', async (request, reply) => {
        // Authentication optional for anonymous sessions
        const user = request.user; // Can be null for anonymous sessions
        const body = request.body;
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
            owner_uid: user?.id || null, // Allow null for anonymous sessions
        })
            .select('id, session_token')
            .single();
        if (error)
            return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
        return reply.status(201).send({ id: data.id, sessionToken: data.session_token });
    });
    app.put('/sessions/:id', async (request, reply) => {
        const { id } = request.params;
        await verifySessionAccess(app, request, id);
        // 허용된 필드만 추출 (owner_uid, session_token 등 변경 방지)
        const body = request.body;
        const safeUpdate = {};
        for (const key of ALLOWED_UPDATE_FIELDS) {
            if (key in body)
                safeUpdate[key] = body[key];
        }
        if (Object.keys(safeUpdate).length === 0) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: '업데이트할 유효한 필드가 없습니다' } });
        }
        const { error } = await app.supabaseAdmin
            .from('sessions')
            .update(safeUpdate)
            .eq('id', id);
        if (error)
            return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
        return { ok: true };
    });
    app.delete('/sessions/:id', async (request, reply) => {
        const { id } = request.params;
        await verifySessionAccess(app, request, id);
        await app.supabaseAdmin.from('sessions').delete().eq('id', id);
        return { ok: true };
    });
}
//# sourceMappingURL=crud.js.map