// backend/src/services/gemini.ts
import type { FastifyReply, FastifyInstance } from 'fastify';
import type { SafetySetting } from '@story-game/shared';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiRequestBody {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: Record<string, unknown>;
  safetySettings?: SafetySetting[];
}

interface StreamResult {
  text: string;
  usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | null;
  error: string | null;
}

/**
 * Gemini 스트리밍 호출 → Fastify SSE 응답
 * reply를 직접 스트리밍하며, 완료 시 결과를 반환한다.
 */
export async function streamToSSE(
  apiKey: string,
  model: string,
  body: GeminiRequestBody,
  reply: FastifyReply
): Promise<StreamResult> {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성
  });

  let fullResponse = '';
  let lastUsage: StreamResult['usageMetadata'] = null;

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000), // 60초 타임아웃
      }
    );

    if (!res.ok) {
      const err = await res.text();
      sendSSE(reply, 'error', { code: 'GEMINI_ERROR', message: `API Error ${res.status}: ${err}` });
      reply.raw.end();
      return { text: '', usageMetadata: null, error: `API Error ${res.status}` };
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (data.usageMetadata) lastUsage = data.usageMetadata;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullResponse += text;
            sendSSE(reply, 'token', { text });
          }
        } catch { /* skip malformed JSON */ }
      }
    }

    return { text: fullResponse, usageMetadata: lastUsage, error: null };
  } catch (err: any) {
    const message = err?.name === 'TimeoutError' ? 'Gemini 응답 타임아웃 (60초)' : err.message;
    sendSSE(reply, 'error', { code: 'GEMINI_ERROR', message });
    return { text: fullResponse, usageMetadata: lastUsage, error: message };
  }
}

/**
 * Gemini 비스트리밍 호출 (메모리 생성용)
 */
export async function generate(
  apiKey: string,
  model: string,
  body: GeminiRequestBody
): Promise<{ text: string; usageMetadata: any }> {
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

export function sendSSE(reply: FastifyReply, event: string, data: unknown): void {
  if (!reply.raw.destroyed) {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

// ---------------------------------------------------------------------------
// Higher-level wrappers
// ---------------------------------------------------------------------------

export interface ApiLogMeta {
  app: FastifyInstance;
  sessionId: string | null;
  endpoint: string;
  model: string | null;
  systemPrompt: string;
  userMessage: string;
}

export function logGeminiCall(
  meta: ApiLogMeta,
  result: { text: string; usageMetadata: any; error: string | null },
): void {
  meta.app.supabaseAdmin.from('api_logs').insert({
    session_id: meta.sessionId,
    endpoint: meta.endpoint,
    request_model: meta.model,
    request_system_prompt: meta.systemPrompt.slice(0, 500),
    request_messages: meta.userMessage ? [{ role: 'user', content: meta.userMessage }] : [],
    response_text: result.text ? result.text.slice(0, 500) : null,
    response_usage: result.usageMetadata,
    response_error: result.error,
  }).then(({ error }) => {
    if (error) meta.app.log.error(error, `${meta.endpoint}: api_log insert failed`);
  });
}

export interface CallGeminiParams {
  apiKey: string;
  model: string;
  body: GeminiRequestBody;
  reply: FastifyReply;
  log: ApiLogMeta;
  doneExtra?: Record<string, unknown>;
}

export async function callGeminiStream(params: CallGeminiParams): Promise<StreamResult> {
  const { apiKey, model, body, reply, log, doneExtra } = params;
  const result = await streamToSSE(apiKey, model, body, reply);

  const doneData = {
    ...doneExtra,
    tokenUsage: result.usageMetadata
      ? { input: result.usageMetadata.promptTokenCount || 0, output: result.usageMetadata.candidatesTokenCount || 0 }
      : null,
  };
  sendSSE(reply, 'done', doneData);
  logGeminiCall({ ...log, model }, result);

  return result;
}

export async function callGeminiGenerate(params: {
  apiKey: string;
  model: string;
  body: GeminiRequestBody;
  log?: ApiLogMeta;
}): Promise<{ text: string; usageMetadata: any }> {
  const result = await generate(params.apiKey, params.model, params.body);
  if (params.log) {
    logGeminiCall({ ...params.log, model: params.model }, { ...result, error: null });
  }
  return result;
}
