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
      const { password_hash, ...story } = raw as unknown as Record<string, unknown>;
      return reply.send({ ...story, has_password: !!password_hash } as Story);
    }
    if (error && error.code !== 'PGRST116') {
      app.log.error(error, 'storiesDetailRoute: query error');
    }

    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' },
    });
  });

  // POST /api/stories/:id/verify — verify story password
  app.post('/api/stories/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password: string };

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
