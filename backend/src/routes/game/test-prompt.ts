// backend/src/routes/game/test-prompt.ts
import type { FastifyInstance } from 'fastify';
import type { SessionMessage, SessionMemory } from '@story-game/shared';
import { buildPrompt, buildMemoryPrompt } from '../../services/prompt-builder.js';
import { applySlidingWindow, prepareContents } from '../../services/session-manager.js';

interface TestPromptRequest {
  editorData: {
    world_setting: string;
    story: string;
    character_name: string;
    character_setting: string;
    characters: string;
    user_note: string;
    system_rules: string;
    use_latex: boolean;
  };
  preset: {
    characterName?: string;
    characterSetting?: string;
    useLatex: boolean;
    narrativeLength: number;
  };
  messages?: SessionMessage[];
  memory?: SessionMemory;
  userMessage?: string;
  regenerate?: boolean;
}

export default async function (app: FastifyInstance) {
  app.post('/api/game/test-prompt', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as TestPromptRequest;

    if (!body.editorData || !body.preset) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'editorData and preset required' },
      });
    }

    const config = await app.getAppConfig();

    // Build system prompt
    let systemPrompt = buildPrompt(body.editorData, body.preset, config.promptConfig);
    if (body.memory) {
      systemPrompt += buildMemoryPrompt(body.memory);
    }

    const startMessage = config.promptConfig.game_start_message || '게임을 시작해줘';
    let messages: SessionMessage[] = body.messages || [];
    let actualUserMessage = body.userMessage;

    // Regenerate: strip last user+model pair
    if (body.regenerate && messages.length >= 2) {
      const lastModel = messages[messages.length - 1];
      const lastUser = messages[messages.length - 2];
      if (lastModel.role === 'model' && lastUser.role === 'user') {
        actualUserMessage = lastUser.content;
        messages = messages.slice(0, -2);
      }
    }

    // Build contents with sliding window
    let contents;
    if (actualUserMessage) {
      const allMessages: SessionMessage[] = [
        ...messages,
        { role: 'user', content: actualUserMessage, timestamp: Date.now() },
      ];
      const windowSize = config.gameplayConfig.sliding_window_size || 20;
      const windowMessages = applySlidingWindow(allMessages, windowSize);
      contents = prepareContents(windowMessages);
    } else {
      // Game start — only startMessage
      contents = [{ role: 'user', parts: [{ text: startMessage }] }];
    }

    // Async: log to api_logs (fire-and-forget)
    app.supabaseAdmin.from('api_logs').insert({
      session_id: null,
      endpoint: 'game/test-prompt',
      request_model: null,
      request_system_prompt: systemPrompt.slice(0, 500),
      request_messages: actualUserMessage ? [{ role: 'user', content: actualUserMessage }] : [],
      response_text: null,
      response_usage: null,
      response_error: null,
    }).catch((err: unknown) => {
      app.log.error(err, 'test-prompt: api_log insert failed');
    });

    return reply.send({
      systemPrompt,
      contents,
      startMessage,
      safetySettings: config.promptConfig.safety_settings,
    });
  });
}
