/**
 * Get the default AI model ID from gameplay config
 * @param gameplayConfig - The gameplay configuration
 * @returns The default model ID, or falls back to first available model
 * @throws Error if no models are configured
 */
export function getDefaultModelId(gameplayConfig) {
    if (!gameplayConfig.available_models || gameplayConfig.available_models.length === 0) {
        throw new Error('No AI models configured');
    }
    // Find model marked as default, or use first available
    const defaultModel = gameplayConfig.available_models.find(m => m.is_default);
    return defaultModel?.id || gameplayConfig.available_models[0].id;
}
/**
 * Get model ID with user preference fallback
 * @param appConfig - The full app config
 * @param userPreference - User's preferred model ID (optional)
 * @returns The model ID to use
 */
export function resolveModelId(appConfig, userPreference) {
    if (userPreference) {
        return userPreference;
    }
    return getDefaultModelId(appConfig.gameplayConfig);
}
//# sourceMappingURL=config-helpers.js.map