import { STORY_FIELDS } from './constants.js';
export default async function storiesDetailRoute(app) {
    // GET /stories/:id
    app.get('/stories/:id', async (request, reply) => {
        const { id } = request.params;
        // Query from stories table with full STORY_FIELDS + password_hash to
        // ensure all columns (including preset JSONB) are returned.
        const query = app.supabaseAdmin
            .from('stories')
            .select(STORY_FIELDS + ', password_hash')
            .eq('id', id);
        // If authenticated, restrict to own stories + public; otherwise allow all (dev mode)
        if (request.user) {
            query.or(`owner_uid.eq.${request.user.id},is_public.eq.true`);
        }
        const { data: raw, error } = await query.single();
        if (raw) {
            const { password_hash, ...story } = raw;
            return reply.send({ ...story, has_password: !!password_hash });
        }
        if (error && error.code !== 'PGRST116') {
            app.log.error(error, 'storiesDetailRoute: query error');
        }
        return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' },
        });
    });
    // POST /stories/:id/verify — verify story password
    app.post('/stories/:id/verify', async (request, reply) => {
        const { id } = request.params;
        const { password } = request.body;
        if (!password) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: '비밀번호를 입력해주세요' },
            });
        }
        const { data, error } = await app.supabaseAdmin
            .rpc('verify_story_password', { p_story_id: id, p_password: password });
        if (error) {
            app.log.error(error, 'storiesDetailRoute: verify_story_password rpc error');
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: '비밀번호 확인에 실패했습니다' },
            });
        }
        return reply.send({ valid: data === true });
    });
}
//# sourceMappingURL=detail.js.map