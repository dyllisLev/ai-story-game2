// backend/src/plugins/config-cache.ts
import fp from 'fastify-plugin';
// Required config IDs constant
const REQUIRED_CONFIG_IDS = ['prompt_config', 'gameplay_config', 'genre_config'];
// Config key mapping
const CONFIG_KEY_MAP = {
    'prompt_config': 'promptConfig',
    'gameplay_config': 'gameplayConfig',
    'genre_config': 'genreConfig',
};
// Validation helper for array fields
function validateArrayField(obj, key, configPrefix, fieldName) {
    if (!obj[key] || !Array.isArray(obj[key]) || obj[key].length === 0) {
        const fullName = fieldName || `${configPrefix}.${key}`;
        throw new Error(`${fullName} is missing or empty`);
    }
}
// Validation helper for object fields
function validateObjectField(obj, key, configPrefix) {
    if (!obj[key]) {
        throw new Error(`${configPrefix}.${key} is missing`);
    }
}
const CONFIG_TTL_MS = 5 * 60 * 1000; // 5분
export default fp(async (app) => {
    let cached = null;
    async function fetchConfig() {
        const { data, error } = await app.supabaseAdmin
            .from('config')
            .select('id, value')
            .in('id', REQUIRED_CONFIG_IDS);
        if (error || !data)
            throw new Error('Failed to fetch config');
        // Map config rows to result object using CONFIG_KEY_MAP
        const result = {};
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
        const gc = result.gameplayConfig;
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
        return result;
    }
    async function getAppConfig() {
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }
        const data = await fetchConfig();
        cached = { data, expiresAt: Date.now() + CONFIG_TTL_MS };
        return data;
    }
    function invalidateConfigCache() {
        cached = null;
    }
    app.decorate('getAppConfig', getAppConfig);
    app.decorate('invalidateConfigCache', invalidateConfigCache);
});
//# sourceMappingURL=config-cache.js.map