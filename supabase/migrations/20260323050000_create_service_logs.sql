-- ============================================================
-- Phase 2-A / Task 5: story_game.service_logs 테이블 신규 생성
-- HTTP 요청 로그 — admin 대시보드 모니터링용
-- Depends on: 00000000000001_create_story_game_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS story_game.service_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp   TIMESTAMPTZ DEFAULT now(),
  method      TEXT NOT NULL,
  path        TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  ip          TEXT,
  user_agent  TEXT
);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_sg_service_logs_timestamp
  ON story_game.service_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sg_service_logs_status
  ON story_game.service_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_sg_service_logs_path
  ON story_game.service_logs(path);

-- RLS: 클라이언트 접근 차단 (service_role만 INSERT/SELECT)
ALTER TABLE story_game.service_logs ENABLE ROW LEVEL SECURITY;
-- SELECT 정책 없음 → anon/authenticated 클라이언트 접근 불가
-- service_role 키는 RLS를 우회하므로 백엔드 서버에서만 사용
