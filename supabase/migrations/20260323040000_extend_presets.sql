-- ============================================================
-- Phase 2-A / Task 3: story_game.presets 테이블 장르/아이콘/상태창 컬럼 추가
-- Depends on: 20260323030000_create_status_presets.sql (FK 참조 대상)
-- ============================================================

ALTER TABLE story_game.presets
  ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📖',
  ADD COLUMN IF NOT EXISTS status_preset_id UUID
    REFERENCES story_game.status_presets(id) ON DELETE SET NULL;
