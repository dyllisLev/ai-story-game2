// backend/src/routes/sessions/detail.ts
import type { FastifyInstance } from 'fastify';
import { verifySessionAccess } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;

    await verifySessionAccess(app, request, id);

    const { data, error } = await app.supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    return data;
  });
}
