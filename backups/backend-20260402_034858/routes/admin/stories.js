import { requireAdminWithBasicAuth } from '../../plugins/auth.js';
import { STORY_FIELDS } from '../stories/constants.js';
import { buildPaginatedResponse } from '../../lib/pagination.js';
export default async function adminStoriesRoute(app) {
    // GET /api/admin/stories
    app.get('/admin/stories', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    genre: { type: 'string' },
                    search: { type: 'string' },
                    sort: { type: 'string', enum: ['latest', 'popular', 'name'] },
                    featured: { type: 'boolean' },
                    is_public: { type: 'boolean' },
                    page: { type: 'integer', minimum: 1, default: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                },
            },
        },
    }, async (request, reply) => {
        requireAdminWithBasicAuth(request);
        const q = request.query;
        const { genre, search, sort = 'latest', featured, is_public, page = 1, limit = 20, } = q;
        const pageNum = Number(page);
        const limitNum = Math.min(Number(limit), 100);
        const offset = (pageNum - 1) * limitNum;
        let query = app.supabaseAdmin
            .from('stories')
            .select(STORY_FIELDS, { count: 'exact' });
        if (genre) {
            query = query.contains('tags', [genre]);
        }
        if (search) {
            const safe = search.replace(/[%_]/g, '\\$&');
            query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
        }
        if (featured === true) {
            query = query.eq('is_featured', true);
        }
        if (is_public !== undefined && is_public !== null) {
            query = query.eq('is_public', is_public === true);
        }
        const sortMap = {
            latest: { column: 'created_at', ascending: false },
            popular: { column: 'play_count', ascending: false },
            name: { column: 'title', ascending: true },
        };
        const { column, ascending } = sortMap[sort] ?? sortMap.latest;
        query = query
            .order(column, { ascending })
            .range(offset, offset + limitNum - 1);
        const { data, count, error } = await query;
        if (error) {
            app.log.error(error, 'adminStoriesRoute GET: query failed');
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: '스토리 목록을 불러오는데 실패했습니다' },
            });
        }
        return reply.send(buildPaginatedResponse(data ?? [], count, pageNum, limitNum));
    });
    // PUT /api/admin/stories/:id/featured — toggle featured flag
    app.put('/admin/stories/:id/featured', async (request, reply) => {
        requireAdminWithBasicAuth(request);
        const { id } = request.params;
        const { featured } = request.body;
        if (typeof featured !== 'boolean') {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'featured 값(boolean)을 입력해주세요' },
            });
        }
        const { data, error } = await app.supabaseAdmin
            .from('stories')
            .update({ is_featured: featured, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, is_featured')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return reply.status(404).send({
                    error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' },
                });
            }
            app.log.error(error, 'adminStoriesRoute PUT featured: update failed');
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: '추천 설정 업데이트에 실패했습니다' },
            });
        }
        return reply.send(data);
    });
    // DELETE /api/admin/stories/:id — admin force-delete any story
    app.delete('/admin/stories/:id', async (request, reply) => {
        requireAdminWithBasicAuth(request);
        const { id } = request.params;
        const { error } = await app.supabaseAdmin
            .from('stories')
            .delete()
            .eq('id', id);
        if (error) {
            if (error.code === 'PGRST116') {
                return reply.status(404).send({
                    error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' },
                });
            }
            app.log.error(error, 'adminStoriesRoute DELETE: failed');
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: '스토리 삭제에 실패했습니다' },
            });
        }
        return reply.status(204).send();
    });
}
//# sourceMappingURL=stories.js.map