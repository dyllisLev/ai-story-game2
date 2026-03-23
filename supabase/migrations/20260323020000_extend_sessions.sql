-- ============================================================
-- Phase 2-A / Task 2: story_game.sessions 테이블 턴 추적 컬럼 추가
-- Depends on: 00000000000001_create_story_game_schema.sql
-- ============================================================

ALTER TABLE story_game.sessions
  ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_pct REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chapter_label TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT '';

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_sg_sessions_turn_count
  ON story_game.sessions(turn_count DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_progress
  ON story_game.sessions(progress_pct DESC);
