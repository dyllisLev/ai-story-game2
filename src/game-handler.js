import { getStory, getConfig, getSession, getSessionMemory, createSession, updateSession, insertApiLog, isValidUUID } from './db.js';
import { buildPrompt, buildMemoryPrompt } from './prompt-builder.js';
import { shouldGenerateMemory, generateAndSaveMemory } from './memory-handler.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/game/start
 * 프롬프트 빌드 + 세션 생성 → Gemini 요청에 필요한 데이터 반환
 * (Gemini 호출은 프론트엔드에서 직접 수행)
 */
export async function handleGameStart(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { storyId, model, options } = body;
  if (!storyId || !isValidUUID(storyId)) return jsonResponse({ error: 'valid storyId required' }, 400);
  if (!model) return jsonResponse({ error: 'model required' }, 400);

  const [story, { promptConfig, gameplayConfig }] = await Promise.all([
    getStory(env, storyId),
    getConfig(env),
  ]);

  if (!story) return jsonResponse({ error: 'Story not found' }, 404);
  if (!promptConfig) return jsonResponse({ error: 'Config not found' }, 500);

  const preset = {
    characterName: options?.characterName || story.character_name || '',
    characterSetting: options?.characterSetting || story.character_setting || '',
    useLatex: options?.useLatex !== undefined ? options.useLatex : story.use_latex,
    useCache: !!options?.useCache,
    narrativeLength: options?.narrativeLength || gameplayConfig.default_narrative_length,
  };

  const systemPrompt = buildPrompt(story, preset, promptConfig);
  const startMessage = promptConfig.game_start_message || '게임을 시작해줘';

  const sessionId = crypto.randomUUID();

  await createSession(env, {
    id: sessionId,
    story_id: storyId,
    title: story.title || '제목 없음',
    preset,
    messages: [],
    model,
    summary: '',
    summary_up_to_index: 0,
  });

  return jsonResponse({
    sessionId,
    systemPrompt,
    startMessage,
    safetySettings: promptConfig.safety_settings || [],
    cacheTtl: promptConfig.cache_ttl || '300s',
  });
}

/**
 * POST /api/game/chat
 * 프롬프트 빌드 + 슬라이딩 윈도우 적용 → Gemini 요청에 필요한 데이터 반환
 */
export async function handleGameChat(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { sessionId, userMessage, regenerate } = body;
  if (!sessionId || !isValidUUID(sessionId)) return jsonResponse({ error: 'valid sessionId required' }, 400);
  if (!regenerate && !userMessage) return jsonResponse({ error: 'userMessage required' }, 400);

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

  let actualUserMessage = userMessage;
  if (regenerate && messages.length >= 2) {
    const lastModel = messages[messages.length - 1];
    const lastUser = messages[messages.length - 2];
    if (lastModel.role === 'model' && lastUser.role === 'user') {
      actualUserMessage = lastUser.content;
      messages = messages.slice(0, -2);
    }
  }

  let systemPrompt = buildPrompt(story, session.preset || {}, promptConfig);
  systemPrompt += buildMemoryPrompt(memory);

  const windowSize = gameplayConfig.sliding_window_size || 20;
  const allMessages = [...messages, { role: 'user', content: actualUserMessage, timestamp: Date.now() }];
  const windowStart = Math.max(0, allMessages.length - windowSize);
  const windowMessages = allMessages.slice(windowStart);

  const contents = windowMessages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  return jsonResponse({
    systemPrompt,
    contents,
    safetySettings: promptConfig.safety_settings || [],
    model: session.model || 'gemini-2.0-flash',
    hasMemory: !!memory,
  });
}

/**
 * POST /api/game/save
 * 프론트엔드에서 Gemini 호출 완료 후 결과 저장
 */
export async function handleGameSave(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { apiKey, sessionId, userMessage, responseText, usageMetadata, systemPrompt, isStart } = body;
  if (!sessionId || !isValidUUID(sessionId)) return jsonResponse({ error: 'valid sessionId required' }, 400);

  const session = await getSession(env, sessionId);
  if (!session) return jsonResponse({ error: 'Session not found' }, 404);

  const messages = session.messages || [];
  const updatedMessages = [
    ...messages,
    { role: 'user', content: userMessage, timestamp: Date.now() },
    { role: 'model', content: responseText, timestamp: Date.now() },
  ];

  const updateData = { messages: updatedMessages };

  // 메모리 트리거 (채팅 시에만, apiKey가 있을 때만)
  if (!isStart && apiKey) {
    const { promptConfig, gameplayConfig } = await getConfig(env);
    const summaryUpToIndex = session.summary_up_to_index || 0;

    if (shouldGenerateMemory(updatedMessages, summaryUpToIndex, gameplayConfig)) {
      ctx.waitUntil((async () => {
        try {
          await generateAndSaveMemory({
            env, apiKey,
            model: session.model || 'gemini-2.0-flash',
            sessionId,
            messages: updatedMessages,
            promptConfig, gameplayConfig,
          });
          await updateSession(env, sessionId, { summary_up_to_index: updatedMessages.length });
        } catch (e) {
          console.error('Memory generation failed:', e);
        }
      })());
      updateData.summary_up_to_index = updatedMessages.length;
    }
  }

  await updateSession(env, sessionId, updateData);

  // api_logs 기록
  ctx.waitUntil(insertApiLog(env, {
    session_id: sessionId,
    endpoint: isStart ? 'game/start' : 'game/chat',
    request_model: session.model,
    request_system_prompt: systemPrompt || '',
    request_messages: [{ role: 'user', content: userMessage }],
    request_body: null,
    response_text: responseText,
    response_usage: usageMetadata,
    response_error: null,
    duration_ms: body.durationMs || 0,
  }));

  return jsonResponse({ ok: true, memoryStatus: updateData.summary_up_to_index ? 'pending' : 'none' });
}
