-- ============================================================
-- Phase 2-A / Task 6: FK 인덱스 추가 + story_game.config 장르/상태창 시드
-- Depends on: 20260323030000_extend_presets.sql, 20260323040000_create_status_presets.sql
-- ============================================================

-- presets.status_preset_id FK는 20260323030000 에서 이미 정의됨
-- 명시적 인덱스로 JOIN 성능 확보
CREATE INDEX IF NOT EXISTS idx_sg_presets_status_preset_id
  ON story_game.presets(status_preset_id)
  WHERE status_preset_id IS NOT NULL;

-- ============================================================
-- config 시드: 장르 목록 + 상태창 기본값
-- ============================================================

INSERT INTO story_game.config (id, value) VALUES
(
  'genre_list',
  '["무협","판타지","현대","로맨스","공포","SF","미스터리","역사","심리"]'::jsonb
),
(
  'status_window_defaults',
  '{"enabled": false, "default_preset_genre": "무협"}'::jsonb
)
ON CONFLICT (id) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = now();
