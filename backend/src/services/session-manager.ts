// backend/src/services/session-manager.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionMessage, GameplayConfig } from '@story-game/shared';

export function applySlidingWindow(
  messages: SessionMessage[],
  windowSize: number
): SessionMessage[] {
  const windowStart = Math.max(0, messages.length - windowSize);
  return messages.slice(windowStart);
}

export function prepareContents(messages: SessionMessage[]) {
  return messages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

export function shouldGenerateMemory(
  messages: SessionMessage[],
  summaryUpToIndex: number,
  gameplayConfig: GameplayConfig
): boolean {
  const windowSize = gameplayConfig.sliding_window_size || 20;
  if (messages.length <= windowSize) return false;
  if ((messages.length - summaryUpToIndex) < windowSize) return false;
  return true;
}

// ============================================================
// Phase 2-B: turn tracking + chapter label updates
// ============================================================

/**
 * Recalculates turn_count for a session by counting user-role messages.
 * Called after each completed AI turn.
 */
export async function updateTurnCount(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (error || !data) return;

  const messages = (data.messages as SessionMessage[]) ?? [];
  const userTurns = messages.filter((m) => m.role === 'user').length;

  await supabase
    .from('sessions')
    .update({ turn_count: userTurns })
    .eq('id', sessionId);
}

/**
 * Updates the chapter_label field for a session.
 * Called when the AI response contains a chapter-transition marker.
 */
export async function updateChapterLabel(
  supabase: SupabaseClient,
  sessionId: string,
  label: string
): Promise<void> {
  await supabase
    .from('sessions')
    .update({ chapter_label: label })
    .eq('id', sessionId);
}

/**
 * Updates the preview_text field (short excerpt of latest AI response).
 */
export async function updatePreviewText(
  supabase: SupabaseClient,
  sessionId: string,
  aiResponse: string
): Promise<void> {
  const preview = aiResponse.replace(/\n+/g, ' ').trim().slice(0, 120);
  await supabase
    .from('sessions')
    .update({ preview_text: preview })
    .eq('id', sessionId);
}

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
export function detectChapterLabel(aiResponse: string): string | null {
  const pattern =
    /(?:제\s*\d+\s*장|Chapter\s+\d+)\s*[:\-—]\s*[^\n]{1,60}/i;
  const match = aiResponse.match(pattern);
  return match ? match[0].trim() : null;
}
