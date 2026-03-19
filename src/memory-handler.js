import { generate } from './gemini-client.js';
import { getSessionMemory, upsertMemory } from './db.js';

/**
 * 메모리 생성 트리거 조건 체크
 */
export function shouldGenerateMemory(messages, summaryUpToIndex, gameplayConfig) {
  const windowSize = gameplayConfig.sliding_window_size || 20;
  if (messages.length <= windowSize) return false;
  if ((messages.length - summaryUpToIndex) < windowSize) return false;
  return true;
}

/**
 * 메모리 생성 + DB 저장 (비스트리밍 Gemini 호출)
 */
export async function generateAndSaveMemory({ env, apiKey, model, sessionId, messages, promptConfig, gameplayConfig }) {
  const windowSize = gameplayConfig.sliding_window_size || 20;
  const windowStart = Math.max(0, messages.length - windowSize);
  const recentMessages = messages.slice(windowStart);

  // 기존 메모리 조회
  const existingMemory = await getSessionMemory(env, sessionId);
  const memoryText = existingMemory ? JSON.stringify(existingMemory, null, 2) : '없음';

  const messagesText = recentMessages
    .map(m => `[${m.role}] ${m.content}`)
    .join('\n\n');

  const requestBody = promptConfig.memory_request
    .replace('{memory}', memoryText)
    .replace('{messages}', messagesText);

  const result = await generate({
    apiKey,
    model,
    body: {
      contents: [{ role: 'user', parts: [{ text: requestBody }] }],
      systemInstruction: { parts: [{ text: promptConfig.memory_system_instruction }] },
      generationConfig: { responseMimeType: 'application/json' },
      safetySettings: [
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    },
  });

  const parsed = parseMemoryResponse(result.text);

  // DB에 4종 메모리 UPSERT
  await Promise.all([
    upsertMemory(env, sessionId, 'short_term', parsed.shortTerm),
    upsertMemory(env, sessionId, 'long_term', parsed.longTerm),
    upsertMemory(env, sessionId, 'characters', parsed.characters),
    upsertMemory(env, sessionId, 'goals', parsed.goals),
  ]);

  return parsed;
}

function parseMemoryResponse(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
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
