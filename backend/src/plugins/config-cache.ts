// backend/src/plugins/config-cache.ts
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '@story-game/shared';

declare module 'fastify' {
  interface FastifyInstance {
    getAppConfig: () => Promise<AppConfig>;
    invalidateConfigCache: () => void;
  }
}

const CONFIG_TTL_MS = 5 * 60 * 1000; // 5분

export default fp(async (app: FastifyInstance) => {
  let cached: { data: AppConfig; expiresAt: number } | null = null;

  async function fetchConfig(): Promise<AppConfig> {
    const { data, error } = await app.supabaseAdmin
      .from('config')
      .select('id, value')
      .in('id', ['prompt_config', 'gameplay_config']);

    if (error || !data) throw new Error('Failed to fetch config');

    const result: Partial<AppConfig> = {};
    for (const row of data) {
      if (row.id === 'prompt_config') result.promptConfig = row.value;
      else if (row.id === 'gameplay_config') result.gameplayConfig = row.value;
    }

    if (!result.promptConfig || !result.gameplayConfig) {
      throw new Error('Missing prompt_config or gameplay_config');
    }

    return result as AppConfig;
  }

  async function getAppConfig(): Promise<AppConfig> {
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    const data = await fetchConfig();
    cached = { data, expiresAt: Date.now() + CONFIG_TTL_MS };
    return data;
  }

  function invalidateConfigCache(): void {
    cached = null;
  }

  app.decorate('getAppConfig', getAppConfig);
  app.decorate('invalidateConfigCache', invalidateConfigCache);
});
