// backend/src/plugins/config-cache.ts
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { AppConfig, GameplayConfig, GenreConfig } from '@story-game/shared';

// Required config IDs constant
const REQUIRED_CONFIG_IDS = ['prompt_config', 'gameplay_config', 'genre_config'] as const;
type ConfigId = typeof REQUIRED_CONFIG_IDS[number];

// Config key mapping
const CONFIG_KEY_MAP: Record<string, keyof AppConfig> = {
  'prompt_config': 'promptConfig',
  'gameplay_config': 'gameplayConfig',
  'genre_config': 'genreConfig',
};

// Validation helper for array fields
function validateArrayField(
  obj: any,
  key: string,
  configPrefix: string,
  fieldName?: string
): asserts obj is any {
  if (!obj[key] || !Array.isArray(obj[key]) || obj[key].length === 0) {
    const fullName = fieldName || `${configPrefix}.${key}`;
    throw new Error(`${fullName} is missing or empty`);
  }
}

// Validation helper for object fields
function validateObjectField(obj: any, key: string, configPrefix: string): void {
  if (!obj[key]) {
    throw new Error(`${configPrefix}.${key} is missing`);
  }
}

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
      .in('id', REQUIRED_CONFIG_IDS);

    if (error || !data) throw new Error('Failed to fetch config');

    // Map config rows to result object using CONFIG_KEY_MAP
    const result: Partial<AppConfig> = {};
    for (const row of data) {
      const key = CONFIG_KEY_MAP[row.id];
      if (key) {
        result[key] = row.value;
      }
    }

    // Validate required config sections exist
    if (!result.promptConfig) {
      throw new Error('Missing prompt_config in database');
    }
    if (!result.gameplayConfig) {
      throw new Error('Missing gameplay_config in database');
    }
    if (!result.genreConfig) {
      throw new Error('Missing genre_config in database');
    }

    // Validate required fields in gameplay_config (Phase 1-B extensions)
    const gc = result.gameplayConfig as GameplayConfig;
    validateArrayField(gc, 'available_models', 'gameplay_config');
    validateArrayField(gc, 'input_modes', 'gameplay_config');
    validateArrayField(gc, 'status_attribute_types', 'gameplay_config');
    validateArrayField(gc, 'default_suggestions', 'gameplay_config');
    validateArrayField(gc, 'character_relations', 'gameplay_config');
    validateArrayField(gc, 'story_icons', 'gameplay_config');
    validateArrayField(gc, 'character_icons', 'gameplay_config');
    validateArrayField(gc, 'memory_categories', 'gameplay_config');
    validateObjectField(gc, 'editor_defaults', 'gameplay_config');
    validateObjectField(gc, 'default_labels', 'gameplay_config');

    // Validate at least one model has a valid id
    const hasValidModel = gc.available_models.some(m => m.id && typeof m.id === 'string');
    if (!hasValidModel) {
      throw new Error('gameplay_config.available_models contains no valid model IDs');
    }

    // Validate genre_config
    if (!result.genreConfig.genres || !Array.isArray(result.genreConfig.genres) || result.genreConfig.genres.length === 0) {
      throw new Error('genre_config.genres is missing or empty');
    }

    // Add default statusWindowDefaults if not present (for backward compatibility)
    if (!result.statusWindowDefaults) {
      result.statusWindowDefaults = {
        enabled: false,
        default_preset_genre: 'fantasy',
      };
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
