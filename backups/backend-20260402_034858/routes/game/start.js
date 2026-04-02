import { buildPrompt } from '../../services/prompt-builder.js';
import { resolveApiKey } from './utils.js';
export default async function (app) {
    app.post('/game/start', {
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    }, async (request, reply) => {
        const body = request.body;
        const apiKey = await resolveApiKey(app, request);
        if (!body.storyId || !body.model) {
            return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'storyId와 model을 입력해주세요' } });
        }
        if (!apiKey) {
            return reply.status(400).send({ error: { code: 'INVALID_API_KEY', message: 'API 키를 입력해주세요' } });
        }
        // 스토리 + 설정 조회
        const [storyResult, config] = await Promise.all([
            app.supabaseAdmin.from('stories').select('*').eq('id', body.storyId).single(),
            app.getAppConfig(),
        ]);
        if (storyResult.error || !storyResult.data) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '스토리를 찾을 수 없습니다' } });
        }
        const story = storyResult.data;
        const preset = {
            characterName: body.options?.characterName || story.character_name || '',
            characterSetting: body.options?.characterSetting || story.character_setting || '',
            useLatex: body.options?.useLatex ?? story.use_latex,
            narrativeLength: body.options?.narrativeLength || config.gameplayConfig.default_narrative_length,
        };
        const systemPrompt = buildPrompt(story, preset, config.promptConfig);
        const startMessage = config.promptConfig.game_start_message;
        // 세션 생성
        const sessionId = crypto.randomUUID();
        const { data: sessionData } = await app.supabaseAdmin
            .from('sessions')
            .insert({
            id: sessionId,
            story_id: body.storyId,
            title: story.title || config.gameplayConfig.default_labels.untitled_story,
            preset,
            messages: [],
            model: body.model,
            summary: '',
            summary_up_to_index: 0,
            owner_uid: request.user?.id || null,
        })
            .select('session_token')
            .single();
        return reply.send({
            sessionId,
            sessionToken: sessionData?.session_token ?? null,
            systemPrompt,
            startMessage,
            safetySettings: config.promptConfig.safety_settings ?? [],
        });
    });
}
//# sourceMappingURL=start.js.map