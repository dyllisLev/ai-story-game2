// backend/src/routes/stories/crud.ts
// POST   /api/stories        — create story (auth required)
// PUT    /api/stories/:id    — update story (owner or admin)
// DELETE /api/stories/:id    — delete story (owner or admin)
import type { FastifyInstance } from 'fastify';
import type { StoryCreateInput, StoryUpdateInput } from '@story-game/shared';
import { randomUUID } from 'node:crypto';
import { verifyResourceOwner } from '../../plugins/auth.js';
import { STORY_FIELDS } from './constants.js';

export default async function storiesCrudRoute(app: FastifyInstance) {
  // POST /api/stories — create (auth optional for now)
  app.post('/api/stories', async (request, reply) => {
    const user = request.user; // null if not logged in
    const body = request.body as StoryCreateInput;

    if (!body.title) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
      });
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
      app.log.error(error, 'storiesCrudRoute POST: insert failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '스토리 생성에 실패했습니다' },
      });
    }

    return reply.status(201).send(data);
  });

  // PUT /api/stories/:id — update (skip ownership check if no auth)
  app.put('/api/stories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as StoryUpdateInput;

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
      app.log.error(error, 'storiesCrudRoute PUT: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '스토리 업데이트에 실패했습니다' },
      });
    }

    return reply.send(data);
  });

  // DELETE /api/stories/:id — delete (skip ownership check if no auth)
  app.delete('/api/stories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (request.user) {
      await verifyResourceOwner(app, request, 'stories', id);
    }

    const { error } = await app.supabaseAdmin
      .from('stories')
      .delete()
      .eq('id', id);

    if (error) {
      app.log.error(error, 'storiesCrudRoute DELETE: delete failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '스토리 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
