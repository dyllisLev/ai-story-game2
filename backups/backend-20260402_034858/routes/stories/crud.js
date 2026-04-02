import { randomUUID } from 'node:crypto';
import { verifyResourceOwner } from '../../plugins/auth.js';
import { STORY_FIELDS } from './constants.js';
import { ErrorHelpers, handleSupabaseError } from '../../services/error-handler.js';
export default async function storiesCrudRoute(app) {
    // POST /stories — create (auth optional for now)
    // Will be prefixed with /api/v1
    app.post('/stories', async (request, reply) => {
        const user = request.user; // null if not logged in
        const body = request.body;
        if (!body.title) {
            return ErrorHelpers.validationError(reply, '제목을 입력해주세요');
        }
        const { data, error } = await app.supabaseAdmin
            .from('stories')
            .insert({
            id: randomUUID(),
            ...body,
            owner_uid: user?.id ?? null,
            owner_name: body.owner_name ?? user?.nickname ?? '',
        })
            .select(STORY_FIELDS)
            .single();
        if (error) {
            return handleSupabaseError(app, reply, 'POST /api/stories', error, '스토리 생성에 실패했습니다');
        }
        return reply.status(201).send(data);
    });
    // PUT /stories/:id — update (skip ownership check if no auth)
    app.put('/stories/:id', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        if (request.user) {
            await verifyResourceOwner(app, request, 'stories', id);
        }
        const { data, error } = await app.supabaseAdmin
            .from('stories')
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select(STORY_FIELDS)
            .single();
        if (error) {
            return handleSupabaseError(app, reply, 'PUT /api/stories', error, '스토리 업데이트에 실패했습니다');
        }
        return reply.send(data);
    });
    // DELETE /stories/:id — delete (skip ownership check if no auth)
    app.delete('/stories/:id', async (request, reply) => {
        const { id } = request.params;
        if (request.user) {
            await verifyResourceOwner(app, request, 'stories', id);
        }
        const { error } = await app.supabaseAdmin
            .from('stories')
            .delete()
            .eq('id', id);
        if (error) {
            return handleSupabaseError(app, reply, 'DELETE /api/stories', error, '스토리 삭제에 실패했습니다');
        }
        return reply.status(204).send();
    });
}
//# sourceMappingURL=crud.js.map