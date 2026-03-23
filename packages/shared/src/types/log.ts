// packages/shared/src/types/log.ts
// Service & API 로그 타입 — Phase 2-A

// ============================================================
// Service Logs (HTTP 요청 로그)
// ============================================================

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
  status_code?: number;
  path?: string;
  from?: string;   // ISO 8601 타임스탬프
  to?: string;
  page?: number;
  limit?: number;
}

export interface ServiceLogStats {
  error_rate_24h: number;           // 24시간 오류율 (%)
  avg_response_ms: number;          // 평균 응답시간 (ms)
  total_requests_today: number;     // 오늘 총 요청 수
  hourly_counts: { hour: number; count: number }[];
}

// ============================================================
// API Logs (Gemini API 호출 로그)
// ============================================================

export interface ApiLog {
  id: string;
  session_id: string | null;
  endpoint: string;
  request_model: string | null;
  request_system_prompt: string | null;
  request_messages: unknown[];
  request_body: Record<string, unknown> | null;
  response_text: string | null;
  response_usage: { input: number; output: number } | null;
  response_error: string | null;
  duration_ms: number;
  created_at: string;
}

export interface ApiLogFilter {
  endpoint?: string;
  session_id?: string;
  from?: string;
  to?: string;
  errors_only?: boolean;
  page?: number;
  limit?: number;
}

export interface ApiLogStats {
  total_calls_today: number;
  total_tokens_today: { input: number; output: number };
  error_count_today: number;
}
