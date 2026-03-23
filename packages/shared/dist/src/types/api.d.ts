export type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_API_KEY' | 'GEMINI_ERROR' | 'SESSION_LIMIT' | 'RATE_LIMITED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
export interface ApiError {
    error: {
        code: ErrorCode;
        message: string;
    };
}
export interface GameStartRequest {
    storyId: string;
    model: string;
    options?: {
        characterName?: string;
        characterSetting?: string;
        useLatex?: boolean;
        narrativeLength?: number;
    };
}
export interface GameChatRequest {
    sessionId: string;
    userMessage: string;
    regenerate?: boolean;
}
export type SSEEventType = 'token' | 'done' | 'memory' | 'memory_complete' | 'error';
export interface SSETokenEvent {
    text: string;
}
export interface SSEDoneEvent {
    tokenUsage: {
        input: number;
        output: number;
    } | null;
    sessionId?: string;
    sessionToken?: string;
}
export interface SSEMemoryEvent {
    triggered: boolean;
    status: 'generating' | 'complete' | 'failed';
}
export interface SSEErrorEvent {
    code: ErrorCode;
    message: string;
}
export interface HealthResponse {
    status: 'ok' | 'error';
    supabase: 'connected' | 'disconnected';
    uptime: number;
    version: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
export interface StoryFilterParams {
    genre?: string;
    search?: string;
    sort?: 'latest' | 'popular' | 'name';
    featured?: boolean;
    page?: number;
    limit?: number;
}
export interface AdminStoryFilterParams extends StoryFilterParams {
    is_public?: boolean;
}
//# sourceMappingURL=api.d.ts.map