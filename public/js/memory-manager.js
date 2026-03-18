// memory-manager.js
// 메모리 생성, 파싱, 로컬 캐시 관리

import { generate } from './gemini-api.js';

const MEMORY_CACHE_PREFIX = 'ai-story-session-';
const MEMORY_CACHE_SUFFIX = '-memory';

/**
 * AI에게 메모리 생성 요청
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {Array} params.messages - 현재 윈도우 내 대화 메시지 (Gemini format)
 * @param {object|null} params.existingMemory - 기존 메모리 { shortTerm, characters, goals, longTerm }
 * @param {object} params.promptConfig - { memory_system_instruction, memory_request }
 * @returns {Promise<object>} - { shortTerm, characters, goals, longTerm }
 */
export async function generateMemory({ apiKey, model, messages, existingMemory, promptConfig }) {
  const memoryText = existingMemory
    ? JSON.stringify(existingMemory, null, 2)
    : '없음';

  const messagesText = messages
    .map(m => `[${m.role}] ${m.parts[0].text}`)
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

  return parseMemoryResponse(result.text);
}

/**
 * AI 응답 JSON 파싱 (코드펜스 제거 fallback 포함)
 */
function parseMemoryResponse(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 코드펜스 제거 후 재시도
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

/**
 * localStorage 캐시 저장
 */
export function saveMemoryToLocal(sessionId, memory) {
  try {
    localStorage.setItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX, JSON.stringify(memory));
  } catch { /* 용량 초과 무시 */ }
}

/**
 * localStorage 캐시 로드
 */
export function loadMemoryFromLocal(sessionId) {
  try {
    const raw = localStorage.getItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * localStorage 캐시 삭제
 */
export function removeMemoryFromLocal(sessionId) {
  localStorage.removeItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX);
}

/**
 * 기존 sessions.summary를 장기기억으로 마이그레이션
 */
export function migrateOldSummary(summary) {
  if (!summary || typeof summary !== 'string') return null;
  return {
    shortTerm: [],
    characters: [],
    goals: '',
    longTerm: [{ title: '이전 요약', content: summary }],
  };
}
