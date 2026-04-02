import type { FastifyInstance } from 'fastify';
import type { SessionMessage, SessionMemory, PromptConfig, GameplayConfig } from '@story-game/shared';
/**
 * Assembles a SessionMemory object from raw DB rows returned by a
 * `session_memory` select (type, content).
 * Exported so callers don't duplicate this logic.
 */
export declare function buildMemoryFromRows(rows: {
    type: string;
    content: unknown;
}[]): SessionMemory;
interface GenerateMemoryParams {
    app: FastifyInstance;
    apiKey: string;
    model: string;
    sessionId: string;
    messages: SessionMessage[];
    promptConfig: PromptConfig;
    gameplayConfig: GameplayConfig;
}
export declare function generateAndSaveMemory(params: GenerateMemoryParams): Promise<SessionMemory>;
export {};
