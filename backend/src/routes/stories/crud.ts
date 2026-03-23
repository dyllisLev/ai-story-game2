// backend/src/routes/stories/crud.ts
// POST   /api/stories        — create story (auth required)
// PUT    /api/stories/:id    — update story (owner or admin)
// DELETE /api/stories/:id    — delete story (owner or admin)
import type { FastifyInstance } from 'fastify';
import type { StoryCreateInput, StoryUpdateInput } from '@story-game/shared';
import { requireAuth, verifyResourceOwner } from '../../plugins/auth.js';
import { STORY_FIELDS } from './constants.js';

export default async function storiesCrudRoute(app: FastifyInstance) {
  // POST /api/stories — create
  app.post('/api/stories', async (request, reply) => {
    const user = requireAuth(request);
    const body = request.body as StoryCreateInput;

    if (!body.title) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'title required' },
      });
    }

    const { data, error } = await app.supabaseAdmin
      .from('stories')
      .insert({
        ...body,
        owner_uid: user.id,
        owner_name: body.owner_name ?? user.nickname ?? '',
      })
      .select(STORY_FIELDS)
      .single();

    if (error) {
      app.log.error(error, 'storiesCrudRoute POST: insert failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create story' },
      });
    }

    return reply.status(201).send(data);
  });

  // PUT /api/stories/:id — update
  app.put('/api/stories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as StoryUpdateInput;

    await verifyResourceOwner(app, request, 'stories', id);

    const { data, error } = await app.supabaseAdmin
      .from('stories')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(STORY_FIELDS)
      .single();

    if (error) {
      app.log.error(error, 'storiesCrudRoute PUT: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update story' },
      });
    }

    return reply.send(data);
  });

  // DELETE /api/stories/:id — delete
  app.delete('/api/stories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await verifyResourceOwner(app, request, 'stories', id);

    const { error } = await app.supabaseAdmin
      .from('stories')
      .delete()
      .eq('id', id);

    if (error) {
      app.log.error(error, 'storiesCrudRoute DELETE: delete failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete story' },
      });
    }

    return reply.status(204).send();
  });
}
