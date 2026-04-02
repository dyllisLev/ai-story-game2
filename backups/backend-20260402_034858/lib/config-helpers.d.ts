import type { AppConfig, GameplayConfig } from '@story-game/shared';
/**
 * Get the default AI model ID from gameplay config
 * @param gameplayConfig - The gameplay configuration
 * @returns The default model ID, or falls back to first available model
 * @throws Error if no models are configured
 */
export declare function getDefaultModelId(gameplayConfig: GameplayConfig): string;
/**
 * Get model ID with user preference fallback
 * @param appConfig - The full app config
 * @param userPreference - User's preferred model ID (optional)
 * @returns The model ID to use
 */
export declare function resolveModelId(appConfig: AppConfig, userPreference?: string): string;
