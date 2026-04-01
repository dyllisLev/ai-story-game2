// backend/src/routes/game/chat.ts
// Returns JSON with systemPrompt, contents, safetySettings, model.
// Frontend calls Gemini directly with this data.
import type { FastifyInstance } from 'fastify';
import type { GameChatRequest, SessionMessage } from '@story-game/shared';
import { buildPrompt, buildMemoryPrompt } from '../../services/prompt-builder.js';
import { applySlidingWindow, prepareContents } from '../../services/session-manager.js';
import { buildMemoryFromRows } from '../../services/memory-handler.js';
import { verifySessionAccess } from '../../plugins/auth.js';
import { resolveModelId } from '../../lib/config-helpers.js';

export default async function (app: FastifyInstance) {
  app.post('/game/chat', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as GameChatRequest;

    if (!body.sessionId) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'sessionId를 입력해주세요' } });
    }
    if (!body.regenerate && !body.userMessage) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'userMessage를 입력해주세요' } });
    }

    await verifySessionAccess(app, request, body.sessionId);

    // 세션 + 설정 + 스토리 + 메모리 조회
    const { data: session } = await app.supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', body.sessionId)
      .single();

    if (!session) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' } });
    }

    const [storyResult, config, memoryResult] = await Promise.all([
      app.supabaseAdmin.from('stories').select('*').eq('id', session.story_id).single(),
      app.getAppConfig(),
      app.supabaseAdmin.from('session_memory').select('type, content').eq('session_id', body.sessionId),
    ]);

    if (!storyResult.data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } });
    }

    // 메모리 조립
    const memory = buildMemoryFromRows(memoryResult.data || []);

    let messages: SessionMessage[] = session.messages || [];

    // regenerate 처리
    if (body.regenerate && messages.length >= 2) {
      const lastModel = messages[messages.length - 1];
      const lastUser = messages[messages.length - 2];
      if (lastModel.role === 'model' && lastUser.role === 'user') {
        messages = messages.slice(0, -2);
      }
    }

    // 프롬프트 조립
    let systemPrompt = buildPrompt(storyResult.data, session.preset || {}, config.promptConfig);
    systemPrompt += buildMemoryPrompt(memory);

    const windowSize = config.gameplayConfig.sliding_window_size;
    const allMessages: SessionMessage[] = [
      ...messages,
      ...(body.userMessage ? [{ role: 'user' as const, content: body.userMessage, timestamp: Date.now() }] : []),
    ];
    const windowMessages = applySlidingWindow(allMessages, windowSize);
    const contents = prepareContents(windowMessages);

    const modelName = resolveModelId(config, session.model);
    const hasMemory = (memoryResult.data?.length ?? 0) > 0;

    return reply.send({
      systemPrompt,
      contents,
      safetySettings: config.promptConfig.safety_settings ?? [],
      model: modelName,
      hasMemory,
    });
  });
}
