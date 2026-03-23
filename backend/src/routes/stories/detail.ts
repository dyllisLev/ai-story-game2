// backend/src/routes/stories/detail.ts
// GET  /api/stories/:id        — single story (public or owned private)
// POST /api/stories/:id/verify — password verification
import type { FastifyInstance } from 'fastify';
import type { Story } from '@story-game/shared';
import { STORY_FIELDS } from './constants.js';

export default async function storiesDetailRoute(app: FastifyInstance) {
  // GET /api/stories/:id
  app.get('/api/stories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // 1. Try the public view first (no auth required)
    const { data: publicStory, error: publicError } = await app.supabaseAdmin
      .from('stories_safe')
      .select('*')
      .eq('id', id)
      .single();

    if (publicStory) {
      return reply.send(publicStory as Story);
    }
    if (publicError && publicError.code !== 'PGRST116') {
      app.log.error(publicError, 'storiesDetailRoute: public query error');
    }

    // 2. If authenticated, check private stories owned by this user
    if (request.user) {
      const { data: privateStory, error: privateError } = await app.supabaseAdmin
        .from('stories')
        .select(STORY_FIELDS)
        .eq('id', id)
        .eq('owner_uid', request.user.id)
        .single();

      if (privateStory) {
        return reply.send({ ...(privateStory as object), has_password: false } as Story);
      }
      if (privateError && privateError.code !== 'PGRST116') {
        app.log.error(privateError, 'storiesDetailRoute: private query error');
      }
    }

    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Story not found' },
    });
  });

  // POST /api/stories/:id/verify — verify story password
  app.post('/api/stories/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password: string };

    if (!password) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'password required' },
      });
    }

    const { data, error } = await app.supabaseAdmin
      .rpc('verify_story_password', { p_story_id: id, p_password: password });

    if (error) {
      app.log.error(error, 'storiesDetailRoute: verify_story_password rpc error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify password' },
      });
    }

    return reply.send({ valid: data === true });
  });
}
