// Shared Gemini API utilities
// Used by both editor.html and play.html

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

/**
 * Fetches available Gemini models and populates a select element.
 * @param {string} apiKey - Gemini API key
 * @param {HTMLSelectElement} selectElement - The <select> element to populate
 * @param {object} [options] - Optional settings
 * @param {string} [options.savedModel] - A previously saved model ID to restore
 * @param {function} [options.onModelChange] - Callback when model selection changes
 * @returns {Promise<string[]>} - Array of model IDs that were loaded
 */
export async function fetchModels(apiKey, selectElement, options = {}) {
  if (!apiKey) return [];
  selectElement.disabled = true;
  selectElement.innerHTML = '<option value="">모델 목록 조회 중...</option>';

  try {
    const res = await fetch(`${GEMINI_BASE}/models`, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    const models = (data.models || [])
      .filter(m => m.name.startsWith('models/gemini-') && m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name.replace('models/', '') }));

    selectElement.innerHTML = models.length
      ? models.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
      : '<option value="">사용 가능한 모델이 없습니다</option>';
    selectElement.disabled = models.length === 0;

    // Restore saved model selection
    if (options.savedModel && models.some(m => m.id === options.savedModel)) {
      selectElement.value = options.savedModel;
    }

    return models.map(m => m.id);
  } catch (err) {
    selectElement.innerHTML = `<option value="">오류: ${err.message}</option>`;
    selectElement.disabled = true;
    return [];
  }
}

/**
 * Creates a cached content for the given prompt.
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Model ID (without 'models/' prefix)
 * @param {string} promptText - The prompt text to cache
 * @param {HTMLElement} statusElement - Element to show cache status
 * @returns {Promise<{name: string}|null>} - Cache object with name, or null on failure
 */
export async function createCache(apiKey, model, promptText, statusElement) {
  statusElement.textContent = '캐시 생성 중...';
  statusElement.className = 'cache-status';

  try {
    const res = await fetch(`${GEMINI_BASE}/cachedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: `models/${model}`,
        systemInstruction: { parts: [{ text: promptText }] },
        ttl: '3600s',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cache Error ${res.status}: ${err}`);
    }

    const data = await res.json();
    statusElement.textContent = '캐시 활성';
    statusElement.className = 'cache-status active';
    return { name: data.name };
  } catch (err) {
    statusElement.textContent = err.message.startsWith('Cache Error') ? '실패' : `캐시 실패: ${err.message}`;
    statusElement.className = 'cache-status';
    return null;
  }
}

/**
 * Clears cache state and resets the status element.
 * @param {HTMLElement} statusElement - Element to reset
 * @returns {null} - Always returns null (assign to cachedContentName)
 */
export function clearCache(statusElement) {
  statusElement.textContent = '';
  statusElement.className = 'cache-status';
  return null;
}

/**
 * Streams a Gemini response via SSE, calling onChunk for each text fragment.
 * @param {object} options
 * @param {string} options.apiKey - Gemini API key
 * @param {string} options.model - Model ID (without 'models/' prefix)
 * @param {object} options.body - Request body (contents, system_instruction, cachedContent, safetySettings)
 * @param {function} options.onChunk - Called with (fullTextSoFar) on each chunk
 * @returns {Promise<{text: string, usageMetadata: object|null}>}
 */
export async function streamGenerate({ apiKey, model, body, onChunk }) {
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';
  let lastUsageMetadata = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const data = JSON.parse(jsonStr);
        if (data.usageMetadata) lastUsageMetadata = data.usageMetadata;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          fullResponse += text;
          if (onChunk) onChunk(fullResponse);
        }
      } catch (e) { /* skip malformed JSON */ }
    }
  }

  return { text: fullResponse, usageMetadata: lastUsageMetadata };
}

/**
 * Non-streaming Gemini API call (e.g. for summary generation).
 * @param {object} options
 * @param {string} options.apiKey - Gemini API key
 * @param {string} options.model - Model ID
 * @param {object} options.body - Request body
 * @returns {Promise<{text: string, usageMetadata: object|null}>}
 */
export async function generate({ apiKey, model, body }) {
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usageMetadata: data.usageMetadata || null,
  };
}
