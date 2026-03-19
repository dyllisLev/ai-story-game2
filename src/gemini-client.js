const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini 스트리밍 호출. ReadableStream을 반환하여 SSE로 프론트에 중계.
 * 스트림 완료 후 { text, usageMetadata }를 onComplete 콜백으로 전달.
 */
export function streamGenerate({ apiKey, model, body, onComplete }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      let lastUsage = null;

      try {
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
          const errorEvent = `data: ${JSON.stringify({ type: 'error', message: `API Error ${res.status}: ${err}` })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          if (onComplete) onComplete({ text: '', usageMetadata: null, error: `API Error ${res.status}: ${err}` });
          return;
        }

        const reader = res.body.getReader();
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
                const chunk = `data: ${JSON.stringify({ type: 'chunk', text })}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            } catch (e) { /* skip malformed JSON */ }
          }
        }

        if (onComplete) onComplete({ text: fullResponse, usageMetadata: lastUsage, error: null });
      } catch (err) {
        try {
          const errorEvent = `data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } catch { /* controller already closed */ }
        if (onComplete) onComplete({ text: '', usageMetadata: null, error: err.message });
      }
      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return stream;
}

/**
 * Gemini 비스트리밍 호출 (메모리 생성용).
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
