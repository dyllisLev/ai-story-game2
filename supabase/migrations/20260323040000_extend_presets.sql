-- ============================================================
-- Phase 2-A / Task 3: ai_story_game.presets 테이블 장르/아이콘 컬럼 추가
-- Depends on: 20260323030000_create_status_presets.sql (FK 참조 대상)
-- Note: status_preset_id 컬럼은 이미 존재함 (별도 마이그레이션으로 적용됨)
-- ============================================================

ALTER TABLE ai_story_game.presets
  ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📖';
