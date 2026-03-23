// backend/src/routes/game/start.ts
import type { FastifyInstance } from 'fastify';
import type { GameStartRequest } from '@story-game/shared';
import { buildPrompt } from '../../services/prompt-builder.js';
import { streamToSSE, sendSSE } from '../../services/gemini.js';
import { resolveApiKey } from './utils.js';

export default async function (app: FastifyInstance) {
  app.post('/api/game/start', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as GameStartRequest;
    const apiKey = await resolveApiKey(app, request);

    if (!body.storyId || !body.model) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'storyId and model required' } });
    }
    if (!apiKey) {
      return reply.status(400).send({ error: { code: 'INVALID_API_KEY', message: 'API key required' } });
    }

    // 스토리 + 설정 조회
    const [storyResult, config] = await Promise.all([
      app.supabaseAdmin.from('stories').select('*').eq('id', body.storyId).single(),
      app.getAppConfig(),
    ]);

    if (storyResult.error || !storyResult.data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    }

    const story = storyResult.data;
    const preset = {
      characterName: body.options?.characterName || story.character_name || '',
      characterSetting: body.options?.characterSetting || story.character_setting || '',
      useLatex: body.options?.useLatex ?? story.use_latex,
      narrativeLength: body.options?.narrativeLength || config.gameplayConfig.default_narrative_length,
    };

    const systemPrompt = buildPrompt(story, preset, config.promptConfig);
    const startMessage = config.promptConfig.game_start_message || '게임을 시작해줘';

    // 세션 생성
    const sessionId = crypto.randomUUID();
    const { data: sessionData } = await app.supabaseAdmin
      .from('sessions')
      .insert({
        id: sessionId,
        story_id: body.storyId,
        title: story.title || '제목 없음',
        preset,
        messages: [],
        model: body.model,
        summary: '',
        summary_up_to_index: 0,
        owner_uid: request.user?.id || null,
      })
      .select('session_token')
      .single();

    // SSE 스트리밍 시작
    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: startMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      safetySettings: config.promptConfig.safety_settings,
    };

    const result = await streamToSSE(apiKey, body.model, geminiBody, reply);

    // done 이벤트 (sessionToken 포함)
    const doneData = {
      sessionId,
      sessionToken: sessionData?.session_token,
      tokenUsage: result.usageMetadata
        ? { input: result.usageMetadata.promptTokenCount || 0, output: result.usageMetadata.candidatesTokenCount || 0 }
        : null,
    };

    sendSSE(reply, 'done', doneData);
    if (!reply.raw.destroyed) {
      reply.raw.end();
    }

    // 비동기: 메시지 저장 + API 로그 — run in parallel, errors must not crash the handler
    if (result.text) {
      const messages = [
        { role: 'user', content: startMessage, timestamp: Date.now() },
        { role: 'model', content: result.text, timestamp: Date.now() },
      ];
      try {
        await Promise.all([
          app.supabaseAdmin
            .from('sessions')
            .update({ messages })
            .eq('id', sessionId),
          app.supabaseAdmin.from('api_logs').insert({
            session_id: sessionId,
            endpoint: 'game/start',
            request_model: body.model,
            request_system_prompt: systemPrompt,
            request_messages: [{ role: 'user', content: startMessage }],
            response_text: result.text.slice(0, 500),
            response_usage: result.usageMetadata,
            response_error: result.error,
          }),
        ]);
      } catch (err) {
        app.log.error(err, 'start: post-SSE DB writes failed');
      }
    }
  });
}
