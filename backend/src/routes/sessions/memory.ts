// backend/src/routes/sessions/memory.ts
import type { FastifyInstance } from 'fastify';
import { verifySessionAccess } from '../../plugins/auth.js';
import type { SessionMemory } from '@story-game/shared';

export default async function (app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/sessions/:id/memory', async (request) => {
    const { id } = request.params;
    await verifySessionAccess(app, request, id);

    const { data } = await app.supabaseAdmin
      .from('session_memory')
      .select('type, content')
      .eq('session_id', id);

    const memory: SessionMemory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
    for (const row of data || []) {
      if (row.type === 'short_term') memory.shortTerm = row.content;
      else if (row.type === 'long_term') memory.longTerm = row.content;
      else if (row.type === 'characters') memory.characters = row.content;
      else if (row.type === 'goals') memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
    }

    return memory;
  });
}
