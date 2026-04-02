export function applySlidingWindow(messages, windowSize) {
    const windowStart = Math.max(0, messages.length - windowSize);
    return messages.slice(windowStart);
}
export function prepareContents(messages) {
    return messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));
}
export function shouldGenerateMemory(messages, summaryUpToIndex, gameplayConfig) {
    const windowSize = gameplayConfig.sliding_window_size;
    if (messages.length <= windowSize)
        return false;
    if ((messages.length - summaryUpToIndex) < windowSize)
        return false;
    return true;
}
// ============================================================
// Phase 2-B: turn tracking + chapter label updates
// ============================================================
/**
 * Recalculates turn_count for a session by counting user-role messages.
 * Called after each completed AI turn.
 */
export async function updateTurnCount(supabase, sessionId) {
    const { data, error } = await supabase
        .from('sessions')
        .select('messages')
        .eq('id', sessionId)
        .single();
    if (error || !data)
        return;
    const messages = data.messages ?? [];
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
export async function updateChapterLabel(supabase, sessionId, label) {
    await supabase
        .from('sessions')
        .update({ chapter_label: label })
        .eq('id', sessionId);
}
/**
 * Updates the preview_text field (short excerpt of latest AI response).
 */
export async function updatePreviewText(supabase, sessionId, aiResponse) {
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
export function detectChapterLabel(aiResponse) {
    const pattern = /(?:제\s*\d+\s*장|Chapter\s+\d+)\s*[:\-—]\s*[^\n]{1,60}/i;
    const match = aiResponse.match(pattern);
    return match ? match[0].trim() : null;
}
//# sourceMappingURL=session-manager.js.map