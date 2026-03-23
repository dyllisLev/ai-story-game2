-- ============================================================
-- Phase 2-A / Task 4: story_game.status_presets 테이블 신규 생성 + 시드 데이터
-- NOTE: presets.status_preset_id FK 대상이므로 20260323040000_extend_presets.sql 보다 먼저 실행
-- Depends on: 00000000000001_create_story_game_schema.sql (story_game.update_updated_at)
-- ============================================================

CREATE TABLE IF NOT EXISTS story_game.status_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  genre       TEXT NOT NULL DEFAULT '',
  attributes  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- attributes schema:
  -- [{"name": "내공", "type": "number", "max_value": 100}, ...]
  -- type 값: "number" | "text" | "gauge"
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER status_presets_updated_at
  BEFORE UPDATE ON story_game.status_presets
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();

-- RLS: 읽기 전체 공개, 쓰기는 service_role 전용 (admin API 통해서만)
ALTER TABLE story_game.status_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_presets_select"
  ON story_game.status_presets FOR SELECT USING (true);

-- ============================================================
-- 시드 데이터: 무협 / 판타지 / 현대 기본 프리셋
-- ============================================================

INSERT INTO story_game.status_presets (id, title, genre, attributes) VALUES
(
  gen_random_uuid(),
  '무협 기본',
  '무협',
  '[
    {"name": "내공",   "type": "gauge",  "max_value": 100},
    {"name": "체력",   "type": "gauge",  "max_value": 100},
    {"name": "무공",   "type": "number", "max_value": null},
    {"name": "경공",   "type": "number", "max_value": null},
    {"name": "문파",   "type": "text",   "max_value": null}
  ]'::jsonb
),
(
  gen_random_uuid(),
  '판타지 기본',
  '판타지',
  '[
    {"name": "HP",     "type": "gauge",  "max_value": 100},
    {"name": "MP",     "type": "gauge",  "max_value": 100},
    {"name": "레벨",   "type": "number", "max_value": null},
    {"name": "직업",   "type": "text",   "max_value": null},
    {"name": "칭호",   "type": "text",   "max_value": null}
  ]'::jsonb
),
(
  gen_random_uuid(),
  '현대 기본',
  '현대',
  '[
    {"name": "체력",   "type": "gauge",  "max_value": 100},
    {"name": "정신력", "type": "gauge",  "max_value": 100},
    {"name": "직업",   "type": "text",   "max_value": null},
    {"name": "평판",   "type": "number", "max_value": null}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;
