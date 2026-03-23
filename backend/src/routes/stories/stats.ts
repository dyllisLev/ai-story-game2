// backend/src/routes/stories/stats.ts
// GET /api/stories/stats — aggregate stats (total stories, plays, authors)
import type { FastifyInstance } from 'fastify';
import type { StoryStats } from '@story-game/shared';

export default async function storiesStatsRoute(app: FastifyInstance) {
  app.get('/api/stories/stats', async (_request, reply) => {
    // Run all three queries in parallel.
    // total_plays and total_authors are computed DB-side via RPCs to avoid
    // fetching every row just to reduce it in JS.
    const [
      { count: total_stories, error: countErr },
      { data: totalPlaysData, error: playErr },
      { data: totalAuthorsData, error: authorErr },
    ] = await Promise.all([
      app.supabaseAdmin
        .from('stories_safe')
        .select('*', { count: 'exact', head: true }),
      app.supabaseAdmin
        .rpc('get_total_public_play_count'),
      app.supabaseAdmin
        .rpc('get_unique_public_author_count'),
    ]);

    if (countErr) {
      app.log.error(countErr, 'storiesStatsRoute: story count failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
      });
    }
    if (playErr) {
      app.log.error(playErr, 'storiesStatsRoute: play count RPC failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch play stats' },
      });
    }
    if (authorErr) {
      app.log.error(authorErr, 'storiesStatsRoute: author count RPC failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch author stats' },
      });
    }

    const response: StoryStats = {
      total_stories: total_stories ?? 0,
      total_plays:   (totalPlaysData as number | null) ?? 0,
      total_authors: (totalAuthorsData as number | null) ?? 0,
    };

    return reply.send(response);
  });
}
