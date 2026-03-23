// backend/src/routes/sessions/list.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.get('/api/sessions', async (request) => {
    const user = requireAuth(request);

    const { data } = await app.supabaseAdmin
      .from('sessions')
      // Select only the fields needed for the list view.
      // Use the DB-maintained turn_count instead of fetching the full messages array.
      .select('id, story_id, title, model, turn_count, last_played_at, created_at')
      .eq('owner_uid', user.id)
      .order('last_played_at', { ascending: false })
      .limit(50);

    return data || [];
  });
}
