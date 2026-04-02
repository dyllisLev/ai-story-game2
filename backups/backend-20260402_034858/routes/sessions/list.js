import { requireAuth } from '../../plugins/auth.js';
import { handleSupabaseError } from '../../services/error-handler.js';
export default async function (app) {
    app.get('/sessions', async (request, reply) => {
        const user = requireAuth(request);
        const { data, error } = await app.supabaseAdmin
            .from('sessions')
            // Select only the fields needed for the list view.
            // Use the DB-maintained turn_count instead of fetching the full messages array.
            .select('id, story_id, title, model, turn_count, last_played_at, created_at')
            .eq('owner_uid', user.id)
            .order('last_played_at', { ascending: false })
            .limit(50);
        if (error) {
            return handleSupabaseError(app, reply, 'GET /api/sessions', error, '세션 목록을 가져오는데 실패했습니다');
        }
        return reply.send(data || []);
    });
}
//# sourceMappingURL=list.js.map