// backend/src/routes/stories/stats.ts
// GET /stories/stats — aggregate stats (total stories, plays, authors)
// Will be prefixed with /api/v1
import type { FastifyInstance } from 'fastify';
import type { StoryStats } from '@story-game/shared';

export default async function storiesStatsRoute(app: FastifyInstance) {
  app.get('/stories/stats', async (_request, reply) => {
    try {
      // Count total stories (ai_story_game schema has no is_public column — all rows are public)
      const { count: total_stories, error: countErr } = await app.supabaseAdmin
        .from('stories')
        .select('id', { count: 'exact', head: true });

      if (countErr) {
        app.log.error(countErr, 'storiesStatsRoute: story count failed');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: '통계를 불러오는데 실패했습니다' },
        });
      }

      // Count distinct authors (ai_story_game schema uses 'author' column, not 'owner_uid')
      const { data: stories, error: storiesErr } = await app.supabaseAdmin
        .from('stories')
        .select('author');

      if (storiesErr) {
        app.log.error(storiesErr, 'storiesStatsRoute: stories query failed');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: '작가 통계를 불러오는데 실패했습니다' },
        });
      }

      const uniqueAuthors = new Set((stories ?? []).map(s => s.author).filter(Boolean));

      const response: StoryStats = {
        total_stories: total_stories ?? 0,
        total_plays: 0,
        total_authors: uniqueAuthors.size,
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
