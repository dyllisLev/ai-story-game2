// backend/src/routes/config.ts
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../plugins/auth.js';

export default async function configRoutes(app: FastifyInstance) {
  // GET /config/public — public config (genre list, models, input modes)
  app.get('/config/public', async (_request, reply) => {
    try {
      const config = await app.getAppConfig();
      // Return only non-sensitive configuration
      return {
        genreConfig: config.genreConfig,
        gameplayConfig: {
          availableModels: config.gameplayConfig.availableModels,
          input_modes: config.gameplayConfig.input_modes,
          default_suggestions: config.gameplayConfig.default_suggestions,
        },
      };
    } catch (err) {
      app.log.error(err, 'Failed to load public config');
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: '설정을 불러올 수 없습니다' } });
    }
  });

  // GET /config — 관리자만
  app.get('/config', async (request, reply) => {
    requireAdmin(request);

    try {
      const config = await app.getAppConfig();
      return config;
    } catch (err) {
      app.log.error(err, 'Failed to load config');
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: '설정을 불러올 수 없습니다' } });
    }
  });

  // PUT /config — 관리자만
  app.put('/config', async (request, reply) => {
    requireAdmin(request);

    const body = request.body as { promptConfig?: unknown; gameplayConfig?: unknown };
    if (!body.promptConfig || !body.gameplayConfig) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: '프롬프트 또는 게임플레이 설정이 누락되었습니다' } });
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
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: '설정 업데이트에 실패했습니다' } });
    }

    app.invalidateConfigCache();
    return { ok: true };
  });
}
