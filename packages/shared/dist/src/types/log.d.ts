export interface ServiceLog {
    id: string;
    timestamp: string;
    method: string;
    path: string;
    status_code: number;
    duration_ms: number;
    ip: string;
    user_agent: string;
}
export interface ServiceLogFilter {
    status?: '2xx' | '4xx' | '5xx' | '';
    status_code?: number;
    path?: string;
    time_range?: '1h' | '6h' | '24h' | '7d';
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}
export interface ServiceLogStats {
    error_rate_24h: number;
    avg_response_ms: number;
    total_requests_today: number;
    hourly_counts: {
        hour: number;
        count: number;
    }[];
}
export interface ApiLog {
    id: string;
    session_id: string | null;
    endpoint: string;
    request_model: string | null;
    request_system_prompt: string | null;
    request_messages: unknown[];
    request_body: Record<string, unknown> | null;
    response_text: string | null;
    response_usage: {
        input: number;
        output: number;
    } | null;
    response_error: string | null;
    duration_ms: number;
    created_at: string;
}
export interface ApiLogFilter {
    endpoint?: string;
    session_id?: string;
    time_range?: '1h' | '6h' | '24h';
    from?: string;
    to?: string;
    errors_only?: boolean;
    page?: number;
    limit?: number;
}
export interface ApiLogStats {
    total_calls_today: number;
    total_tokens_today: {
        input: number;
        output: number;
    };
    error_count_today: number;
}
//# sourceMappingURL=log.d.ts.map