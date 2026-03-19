import { getStory, getConfig, getSession, getSessionMemory, createSession, updateSession, insertApiLog, isValidUUID } from './db.js';
import { buildPrompt, buildMemoryPrompt } from './prompt-builder.js';
import { streamGenerate, createCachedContent } from './gemini-client.js';
import { shouldGenerateMemory, generateAndSaveMemory } from './memory-handler.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGameStart(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { apiKey, storyId, model, options } = body;
  if (!apiKey) return jsonResponse({ error: 'apiKey required' }, 400);
  if (!storyId || !isValidUUID(storyId)) return jsonResponse({ error: 'valid storyId required' }, 400);
  if (!model) return jsonResponse({ error: 'model required' }, 400);

  // DB 조회 (병렬)
  const [story, { promptConfig, gameplayConfig }] = await Promise.all([
    getStory(env, storyId),
    getConfig(env),
  ]);

  if (!story) return jsonResponse({ error: 'Story not found' }, 404);
  if (!promptConfig) return jsonResponse({ error: 'Config not found' }, 500);

  // preset 구성
  const preset = {
    characterName: options?.characterName || story.character_name || '',
    characterSetting: options?.characterSetting || story.character_setting || '',
    useLatex: options?.useLatex !== undefined ? options.useLatex : story.use_latex,
    useCache: !!options?.useCache,
    narrativeLength: options?.narrativeLength || gameplayConfig.default_narrative_length,
  };

  // 프롬프트 조합
  const systemPrompt = buildPrompt(story, preset, promptConfig);
  const startMessage = promptConfig.game_start_message || '게임을 시작해줘';

  // 캐시 생성 (useCache가 true인 경우)
  let cachedContentName = null;
  if (preset.useCache) {
    const cache = await createCachedContent({
      apiKey, model, systemPrompt,
      ttl: promptConfig.cache_ttl || '300s',
    });
    if (cache) cachedContentName = cache.name;
  }

  const geminiBody = cachedContentName
    ? {
        cachedContent: cachedContentName,
        contents: [{ role: 'user', parts: [{ text: startMessage }] }],
        safetySettings: promptConfig.safety_settings || [],
      }
    : {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: startMessage }] }],
        safetySettings: promptConfig.safety_settings || [],
      };

  // 세션 생성
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();

  // SSE 스트리밍 + 완료 후 저장
  let completionData = { usageMetadata: null };

  const stream = streamGenerate({
    apiKey, model, body: geminiBody,
    onComplete({ text, usageMetadata, error }) {
      completionData.usageMetadata = usageMetadata;
      ctx.waitUntil((async () => {
        const messages = [
          { role: 'user', content: startMessage, timestamp: Date.now() },
          { role: 'model', content: text, timestamp: Date.now() },
        ];

        await createSession(env, {
          id: sessionId,
          story_id: storyId,
          title: story.title || '제목 없음',
          preset: { ...preset, cachedContentName },
          messages,
          model,
          summary: '',
          summary_up_to_index: 0,
        });

        await insertApiLog(env, {
          session_id: sessionId,
          endpoint: 'game/start',
          request_model: model,
          request_system_prompt: systemPrompt,
          request_messages: [{ role: 'user', content: startMessage }],
          request_body: geminiBody,
          response_text: text,
          response_usage: usageMetadata,
          response_error: error,
          duration_ms: Date.now() - startTime,
        });
      })());
    },
  });

  // done 이벤트를 스트림 끝에 추가 (usage 포함)
  const encoder = new TextEncoder();
  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      const doneEvent = `data: ${JSON.stringify({ type: 'done', sessionId, usage: completionData.usageMetadata, memoryStatus: 'none', cacheStatus: cachedContentName ? 'active' : 'none' })}\n\n`;
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });

  return new Response(wrappedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function handleGameChat(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { apiKey, sessionId, userMessage, regenerate } = body;
  if (!apiKey) return jsonResponse({ error: 'apiKey required' }, 400);
  if (!sessionId || !isValidUUID(sessionId)) return jsonResponse({ error: 'valid sessionId required' }, 400);
  if (!regenerate && !userMessage) return jsonResponse({ error: 'userMessage required' }, 400);

  // DB 조회 (병렬)
  const [session, { promptConfig, gameplayConfig }] = await Promise.all([
    getSession(env, sessionId),
    getConfig(env),
  ]);

  if (!session) return jsonResponse({ error: 'Session not found' }, 404);
  if (!session.story_id) return jsonResponse({ error: 'Session has no story' }, 400);

  const [story, memory] = await Promise.all([
    getStory(env, session.story_id),
    getSessionMemory(env, sessionId),
  ]);

  if (!story) return jsonResponse({ error: 'Story not found' }, 404);

  let messages = session.messages || [];

  // regenerate: 마지막 user+model 쌍 제거
  let actualUserMessage = userMessage;
  if (regenerate && messages.length >= 2) {
    const lastModel = messages[messages.length - 1];
    const lastUser = messages[messages.length - 2];
    if (lastModel.role === 'model' && lastUser.role === 'user') {
      actualUserMessage = lastUser.content;
      messages = messages.slice(0, -2);
    }
  }

  // 프롬프트 조합
  let systemPrompt = buildPrompt(story, session.preset || {}, promptConfig);
  systemPrompt += buildMemoryPrompt(memory);

  // 슬라이딩 윈도우
  const windowSize = gameplayConfig.sliding_window_size || 20;
  const allMessages = [...messages, { role: 'user', content: actualUserMessage, timestamp: Date.now() }];
  const windowStart = Math.max(0, allMessages.length - windowSize);
  const windowMessages = allMessages.slice(windowStart);

  // Gemini 요청 body
  const contents = windowMessages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // 캐시가 있으면 cachedContent 사용 (메모리 없는 경우만 — 메모리가 있으면 system_instruction 사용)
  const cachedName = !memory && session.preset?.cachedContentName;
  const geminiBody = cachedName
    ? {
        cachedContent: cachedName,
        contents,
        safetySettings: promptConfig.safety_settings || [],
      }
    : {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        safetySettings: promptConfig.safety_settings || [],
      };

  const model = session.model || 'gemini-2.0-flash';
  const startTime = Date.now();

  let completionData = { usageMetadata: null };

  const stream = streamGenerate({
    apiKey, model, body: geminiBody,
    onComplete({ text, usageMetadata, error }) {
      completionData.usageMetadata = usageMetadata;
      ctx.waitUntil((async () => {
        // 메시지 저장
        const updatedMessages = [
          ...messages,
          { role: 'user', content: actualUserMessage, timestamp: Date.now() },
          { role: 'model', content: text, timestamp: Date.now() },
        ];

        const summaryUpToIndex = session.summary_up_to_index || 0;
        const updateData = { messages: updatedMessages };

        // 메모리 트리거 체크
        if (!error && shouldGenerateMemory(updatedMessages, summaryUpToIndex, gameplayConfig)) {
          try {
            await generateAndSaveMemory({
              env, apiKey, model, sessionId,
              messages: updatedMessages,
              promptConfig, gameplayConfig,
            });
            updateData.summary_up_to_index = updatedMessages.length;
          } catch (e) {
            console.error('Memory generation failed:', e);
          }
        }

        await updateSession(env, sessionId, updateData);

        await insertApiLog(env, {
          session_id: sessionId,
          endpoint: 'game/chat',
          request_model: model,
          request_system_prompt: systemPrompt,
          request_messages: windowMessages,
          request_body: geminiBody,
          response_text: text,
          response_usage: usageMetadata,
          response_error: error,
          duration_ms: Date.now() - startTime,
        });
      })());
    },
  });

  const encoder = new TextEncoder();
  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      const doneEvent = `data: ${JSON.stringify({ type: 'done', sessionId, usage: completionData.usageMetadata, memoryStatus: 'pending' })}\n\n`;
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });

  return new Response(wrappedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
