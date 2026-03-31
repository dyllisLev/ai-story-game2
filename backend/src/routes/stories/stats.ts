// backend/src/routes/stories/stats.ts
// GET /api/stories/stats — aggregate stats (total stories, plays, authors)
import type { FastifyInstance } from 'fastify';
import type { StoryStats } from '@story-game/shared';

export default async function storiesStatsRoute(app: FastifyInstance) {
  app.get('/api/stories/stats', async (_request, reply) => {
    try {
      // Count total public stories
      const { count: total_stories, error: countErr } = await app.supabaseAdmin
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);

      if (countErr) {
        app.log.error(countErr, 'storiesStatsRoute: story count failed');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: '통계를 불러오는데 실패했습니다' },
        });
      }

      // Sum play_count and count distinct owners from stories table directly
      const { data: stories, error: storiesErr } = await app.supabaseAdmin
        .from('stories')
        .select('play_count, owner_uid')
        .eq('is_public', true);

      if (storiesErr) {
        app.log.error(storiesErr, 'storiesStatsRoute: stories query failed');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: '플레이 통계를 불러오는데 실패했습니다' },
        });
      }

      const total_plays = (stories ?? []).reduce((sum, s) => sum + (s.play_count ?? 0), 0);
      const uniqueOwners = new Set((stories ?? []).map(s => s.owner_uid).filter(Boolean));
      const total_authors = uniqueOwners.size;

      const response: StoryStats = {
        total_stories: total_stories ?? 0,
        total_plays,
        total_authors,
      };

      return reply.send(response);
    } catch (err) {
      app.log.error(err, 'storiesStatsRoute: unexpected error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
      });
    }
  });
}
