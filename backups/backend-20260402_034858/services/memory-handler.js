// backend/src/services/memory-handler.ts
import { callGeminiGenerate } from './gemini.js';
/**
 * Assembles a SessionMemory object from raw DB rows returned by a
 * `session_memory` select (type, content).
 * Exported so callers don't duplicate this logic.
 */
export function buildMemoryFromRows(rows) {
    const memory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
    for (const row of rows) {
        if (row.type === 'short_term')
            memory.shortTerm = row.content;
        else if (row.type === 'long_term')
            memory.longTerm = row.content;
        else if (row.type === 'characters')
            memory.characters = row.content;
        else if (row.type === 'goals') {
            memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
        }
    }
    return memory;
}
export async function generateAndSaveMemory(params) {
    const { app, apiKey, model, sessionId, messages, promptConfig, gameplayConfig } = params;
    const windowSize = gameplayConfig.sliding_window_size;
    const windowStart = Math.max(0, messages.length - windowSize);
    const recentMessages = messages.slice(windowStart);
    // 기존 메모리 조회
    const { data: memoryRows } = await app.supabaseAdmin
        .from('session_memory')
        .select('type, content')
        .eq('session_id', sessionId);
    const existingMemory = buildMemoryFromRows(memoryRows || []);
    const memoryText = memoryRows?.length ? JSON.stringify(existingMemory, null, 2) : '없음';
    const messagesText = recentMessages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
    const requestBody = promptConfig.memory_request
        .replace('{memory}', memoryText)
        .replace('{messages}', messagesText);
    const result = await callGeminiGenerate({
        apiKey, model,
        body: {
            contents: [{ role: 'user', parts: [{ text: requestBody }] }],
            systemInstruction: { parts: [{ text: promptConfig.memory_system_instruction }] },
            generationConfig: { responseMimeType: 'application/json' },
            safetySettings: promptConfig.safety_settings,
        },
        log: {
            app, sessionId, endpoint: 'memory/generate',
            model, systemPrompt: promptConfig.memory_system_instruction,
            userMessage: requestBody.slice(0, 200),
        },
    });
    const parsed = parseMemoryResponse(result.text);
    // DB UPSERT
    await Promise.all([
        upsertMemory(app, sessionId, 'short_term', parsed.shortTerm),
        upsertMemory(app, sessionId, 'long_term', parsed.longTerm),
        upsertMemory(app, sessionId, 'characters', parsed.characters),
        upsertMemory(app, sessionId, 'goals', parsed.goals),
    ]);
    return parsed;
}
async function upsertMemory(app, sessionId, type, content) {
    await app.supabaseAdmin
        .from('session_memory')
        .upsert({ session_id: sessionId, type, content }, { onConflict: 'session_id,type' });
}
function parseMemoryResponse(text) {
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        json = JSON.parse(cleaned);
    }
    return {
        shortTerm: Array.isArray(json.shortTerm) ? json.shortTerm : [],
        characters: Array.isArray(json.characters) ? json.characters : [],
        goals: typeof json.goals === 'string' ? json.goals : '',
        longTerm: Array.isArray(json.longTerm) ? json.longTerm : [],
    };
}
//# sourceMappingURL=memory-handler.js.map