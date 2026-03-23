// backend/src/routes/game/chat.ts
import type { FastifyInstance } from 'fastify';
import type { GameChatRequest, SessionMessage } from '@story-game/shared';
import { buildPrompt, buildMemoryPrompt } from '../../services/prompt-builder.js';
import { applySlidingWindow, prepareContents, shouldGenerateMemory } from '../../services/session-manager.js';
import { streamToSSE, sendSSE } from '../../services/gemini.js';
import { generateAndSaveMemory, buildMemoryFromRows } from '../../services/memory-handler.js';
import { verifySessionAccess } from '../../plugins/auth.js';
import { resolveApiKey } from './utils.js';

export default async function (app: FastifyInstance) {
  app.post('/api/game/chat', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as GameChatRequest;

    if (!body.sessionId) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'sessionId required' } });
    }
    if (!body.regenerate && !body.userMessage) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'userMessage required' } });
    }

    const apiKey = await resolveApiKey(app, request);
    if (!apiKey) {
      return reply.status(400).send({ error: { code: 'INVALID_API_KEY', message: 'API key required (X-Gemini-Key header or saved key)' } });
    }

    await verifySessionAccess(app, request, body.sessionId);

    // 세션 + 설정 + 스토리 + 메모리 조회
    const { data: session } = await app.supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', body.sessionId)
      .single();

    if (!session) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const [storyResult, config, memoryResult] = await Promise.all([
      app.supabaseAdmin.from('stories').select('*').eq('id', session.story_id).single(),
      app.getAppConfig(),
      app.supabaseAdmin.from('session_memory').select('type, content').eq('session_id', body.sessionId),
    ]);

    if (!storyResult.data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    }

    // 메모리 조립
    const memory = buildMemoryFromRows(memoryResult.data || []);

    let messages: SessionMessage[] = session.messages || [];
    let actualUserMessage = body.userMessage;

    // regenerate 처리
    if (body.regenerate && messages.length >= 2) {
      const lastModel = messages[messages.length - 1];
      const lastUser = messages[messages.length - 2];
      if (lastModel.role === 'model' && lastUser.role === 'user') {
        actualUserMessage = lastUser.content;
        messages = messages.slice(0, -2);
      }
    }

    // 프롬프트 조립
    let systemPrompt = buildPrompt(storyResult.data, session.preset || {}, config.promptConfig);
    systemPrompt += buildMemoryPrompt(memory);

    const windowSize = config.gameplayConfig.sliding_window_size || 20;
    const allMessages: SessionMessage[] = [
      ...messages,
      { role: 'user', content: actualUserMessage, timestamp: Date.now() },
    ];
    const windowMessages = applySlidingWindow(allMessages, windowSize);
    const contents = prepareContents(windowMessages);

    // SSE 스트리밍
    const geminiBody = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      safetySettings: config.promptConfig.safety_settings,
    };

    const result = await streamToSSE(apiKey, session.model || 'gemini-2.0-flash', geminiBody, reply);

    // done 이벤트
    const doneData = {
      tokenUsage: result.usageMetadata
        ? { input: result.usageMetadata.promptTokenCount || 0, output: result.usageMetadata.candidatesTokenCount || 0 }
        : null,
    };

    sendSSE(reply, 'done', doneData);

    // 비동기: 메시지 저장 + 메모리 트리거
    if (result.text) {
      const updatedMessages: SessionMessage[] = [
        ...allMessages,
        { role: 'model', content: result.text, timestamp: Date.now() },
      ];

      const updateData: Record<string, unknown> = { messages: updatedMessages, last_played_at: new Date().toISOString() };
      const summaryUpToIndex = session.summary_up_to_index || 0;

      if (shouldGenerateMemory(updatedMessages, summaryUpToIndex, config.gameplayConfig)) {
        // 메모리 생성 알림
        sendSSE(reply, 'memory', { triggered: true, status: 'generating' });

        try {
          const newMemory = await generateAndSaveMemory({
            app, apiKey,
            model: session.model || 'gemini-2.0-flash',
            sessionId: body.sessionId,
            messages: updatedMessages,
            promptConfig: config.promptConfig,
            gameplayConfig: config.gameplayConfig,
          });

          updateData.summary_up_to_index = updatedMessages.length;
          sendSSE(reply, 'memory_complete', newMemory);
        } catch (err) {
          app.log.error(err, 'Memory generation failed');
          sendSSE(reply, 'memory', { triggered: true, status: 'failed' });
        }
      }

      // Persist session update and api_log in parallel; errors must not crash the SSE stream.
      try {
        await Promise.all([
          app.supabaseAdmin
            .from('sessions')
            .update(updateData)
            .eq('id', body.sessionId),
          app.supabaseAdmin.from('api_logs').insert({
            session_id: body.sessionId,
            endpoint: 'game/chat',
            request_model: session.model,
            request_system_prompt: systemPrompt.slice(0, 500),
            request_messages: [{ role: 'user', content: actualUserMessage }],
            response_text: result.text.slice(0, 500),
            response_usage: result.usageMetadata,
            response_error: result.error,
          }),
        ]);
      } catch (err) {
        app.log.error(err, 'chat: post-SSE DB writes failed');
      }
    }

    if (!reply.raw.destroyed) {
      reply.raw.end();
    }
  });
}
