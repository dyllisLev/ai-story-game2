// backend/src/routes/config.ts
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../plugins/auth.js';

export default async function configRoutes(app: FastifyInstance) {
  // GET /api/config — 공개
  app.get('/api/config', async (request, reply) => {
    try {
      const config = await app.getAppConfig();
      return config;
    } catch (err) {
      app.log.error(err, 'Failed to load config');
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Configuration unavailable' } });
    }
  });

  // PUT /api/config — 관리자만
  app.put('/api/config', async (request, reply) => {
    requireAdmin(request);

    const body = request.body as { promptConfig?: unknown; gameplayConfig?: unknown };
    if (!body.promptConfig || !body.gameplayConfig) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Missing promptConfig or gameplayConfig' } });
    }

    const { error: e1 } = await app.supabaseAdmin
      .from('config')
      .update({ value: body.promptConfig })
      .eq('id', 'prompt_config');

    const { error: e2 } = await app.supabaseAdmin
      .from('config')
      .update({ value: body.gameplayConfig })
      .eq('id', 'gameplay_config');

    if (e1 || e2) {
      app.log.error({ e1, e2 }, 'Config update failed');
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Config update failed' } });
    }

    app.invalidateConfigCache();
    return { ok: true };
  });
}
