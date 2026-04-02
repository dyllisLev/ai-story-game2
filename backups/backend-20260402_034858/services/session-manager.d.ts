import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionMessage, GameplayConfig } from '@story-game/shared';
export declare function applySlidingWindow(messages: SessionMessage[], windowSize: number): SessionMessage[];
export declare function prepareContents(messages: SessionMessage[]): {
    role: string;
    parts: {
        text: string;
    }[];
}[];
export declare function shouldGenerateMemory(messages: SessionMessage[], summaryUpToIndex: number, gameplayConfig: GameplayConfig): boolean;
/**
 * Recalculates turn_count for a session by counting user-role messages.
 * Called after each completed AI turn.
 */
export declare function updateTurnCount(supabase: SupabaseClient, sessionId: string): Promise<void>;
/**
 * Updates the chapter_label field for a session.
 * Called when the AI response contains a chapter-transition marker.
 */
export declare function updateChapterLabel(supabase: SupabaseClient, sessionId: string, label: string): Promise<void>;
/**
 * Updates the preview_text field (short excerpt of latest AI response).
 */
export declare function updatePreviewText(supabase: SupabaseClient, sessionId: string, aiResponse: string): Promise<void>;
/**
 * Detects a chapter transition in the AI response text.
 * Returns the matched chapter label string, or null if none found.
 *
 * Matches patterns like:
 *   "제 1장: 시작"
 *   "제1장 — 어둠 속으로"
 *   "Chapter 3: The Beginning"
 *   "Chapter 3 - Into Darkness"
 */
export declare function detectChapterLabel(aiResponse: string): string | null;
