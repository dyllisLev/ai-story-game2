import type { FastifyReply, FastifyInstance } from 'fastify';
import type { SafetySetting } from '@story-game/shared';
interface GeminiRequestBody {
    contents: Array<{
        role: string;
        parts: Array<{
            text: string;
        }>;
    }>;
    systemInstruction?: {
        parts: Array<{
            text: string;
        }>;
    };
    generationConfig?: Record<string, unknown>;
    safetySettings?: SafetySetting[];
}
interface StreamResult {
    text: string;
    usageMetadata: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
    } | null;
    error: string | null;
}
/**
 * Gemini 스트리밍 호출 → Fastify SSE 응답
 * reply를 직접 스트리밍하며, 완료 시 결과를 반환한다.
 */
export declare function streamToSSE(apiKey: string, model: string, body: GeminiRequestBody, reply: FastifyReply): Promise<StreamResult>;
/**
 * Gemini 비스트리밍 호출 (메모리 생성용)
 */
export declare function generate(apiKey: string, model: string, body: GeminiRequestBody): Promise<{
    text: string;
    usageMetadata: any;
}>;
export declare function sendSSE(reply: FastifyReply, event: string, data: unknown): void;
export interface ApiLogMeta {
    app: FastifyInstance;
    sessionId: string | null;
    endpoint: string;
    model: string | null;
    systemPrompt: string;
    userMessage: string;
}
export declare function logGeminiCall(meta: ApiLogMeta, result: {
    text: string;
    usageMetadata: any;
    error: string | null;
}): void;
export interface CallGeminiParams {
    apiKey: string;
    model: string;
    body: GeminiRequestBody;
    reply: FastifyReply;
    log: ApiLogMeta;
    doneExtra?: Record<string, unknown>;
}
export declare function callGeminiStream(params: CallGeminiParams): Promise<StreamResult>;
export declare function callGeminiGenerate(params: {
    apiKey: string;
    model: string;
    body: GeminiRequestBody;
    log?: ApiLogMeta;
}): Promise<{
    text: string;
    usageMetadata: any;
}>;
export {};
