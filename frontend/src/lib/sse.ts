// ============================================================
// SSE Stream Parser for Gemini streaming responses
// Port / adaptation from public/js/gemini-api.js streamGenerate()
// ============================================================

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface StreamGenerateOptions {
  apiKey: string;
  model: string;
  body: object;
  onChunk?: (textSoFar: string) => void;
  signal?: AbortSignal;
}

export interface StreamGenerateResult {
  text: string;
  usageMetadata: Record<string, number> | null;
}

/**
 * Streams a Gemini response via SSE.
 * Calls onChunk with the full text accumulated so far on each chunk.
 */
export async function streamGenerate({
  apiKey,
  model,
  body,
  onChunk,
  signal,
}: StreamGenerateOptions): Promise<StreamGenerateResult> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API Error ${res.status}: ${errText}`);
  }

  if (!res.body) {
    throw new Error('Response body is null');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';
  let lastUsageMetadata: Record<string, number> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const data = JSON.parse(jsonStr);
        if (data.usageMetadata) {
          lastUsageMetadata = data.usageMetadata as Record<string, number>;
        }
        const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) {
          fullResponse += text;
          onChunk?.(fullResponse);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  return { text: fullResponse, usageMetadata: lastUsageMetadata };
}

/**
 * Fetch available Gemini models for the given API key.
 * Returns model list ordered by display name.
 */
export interface GeminiModel {
  id: string;
  name: string;
}

export async function fetchGeminiModels(
  apiKey: string,
  signal?: AbortSignal
): Promise<GeminiModel[]> {
  const res = await fetch(`${GEMINI_BASE}/models`, {
    headers: { 'x-goog-api-key': apiKey },
    signal,
  });
  if (!res.ok) throw new Error(`Models API Error: ${res.status}`);
  const data = await res.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
  return (data.models ?? [])
    .filter(
      (m) =>
        m.name.startsWith('models/gemini-') &&
        m.supportedGenerationMethods?.includes('generateContent')
    )
    .map((m) => ({
      id: m.name.replace('models/', ''),
      name: m.displayName ?? m.name.replace('models/', ''),
    }));
}
