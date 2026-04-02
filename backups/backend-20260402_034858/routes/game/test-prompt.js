import { buildPrompt, buildMemoryPrompt } from '../../services/prompt-builder.js';
import { logGeminiCall } from '../../services/gemini.js';
import { applySlidingWindow, prepareContents } from '../../services/session-manager.js';
import { requireAuth } from '../../plugins/auth.js';
export default async function (app) {
    app.post('/game/test-prompt', {
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    }, async (request, reply) => {
        requireAuth(request); // Auth required for prompt preview
        const body = request.body;
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
        const startMessage = config.promptConfig.game_start_message;
        let messages = body.messages || [];
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
            const allMessages = [
                ...messages,
                { role: 'user', content: actualUserMessage, timestamp: Date.now() },
            ];
            const windowSize = config.gameplayConfig.sliding_window_size;
            const windowMessages = applySlidingWindow(allMessages, windowSize);
            contents = prepareContents(windowMessages);
        }
        else {
            // Game start — only startMessage
            contents = [{ role: 'user', parts: [{ text: startMessage }] }];
        }
        // Async: log to api_logs (fire-and-forget)
        logGeminiCall({ app, sessionId: null, endpoint: 'game/test-prompt', model: null, systemPrompt, userMessage: actualUserMessage ?? '' }, { text: '', usageMetadata: null, error: null });
        return reply.send({
            systemPrompt,
            contents,
            startMessage,
            safetySettings: config.promptConfig.safety_settings,
        });
    });
}
//# sourceMappingURL=test-prompt.js.map