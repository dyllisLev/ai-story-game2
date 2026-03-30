-- ============================================================
-- Combined migration for public schema
-- Adapted from story_game.* migrations for the actual deployed DB
-- ============================================================

-- ============================================================
-- 1. stories: UI 메타데이터 컬럼 추가
-- ============================================================

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📖',
  ADD COLUMN IF NOT EXISTS banner_gradient TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge TEXT CHECK (badge IN ('new', 'hot')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '';

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_stories_featured
  ON public.stories(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_stories_play_count
  ON public.stories(play_count DESC);

CREATE INDEX IF NOT EXISTS idx_stories_tags
  ON public.stories USING GIN(tags);

-- ============================================================
-- 2. sessions: 턴 추적 컬럼 추가
-- ============================================================

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_pct REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chapter_label TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT '';

-- session_token (migration 00000000000005)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_token UUID DEFAULT gen_random_uuid();

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_turn_count
  ON public.sessions(turn_count DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_progress
  ON public.sessions(progress_pct DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token
  ON public.sessions(session_token);

-- ============================================================
-- 3. presets: 장르/아이콘/상태창 컬럼 추가
--    (status_presets 테이블 먼저 생성 후 FK 추가)
-- ============================================================

-- update_updated_at 함수 (public schema용, 없으면 생성)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. status_presets 테이블 신규 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS public.status_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  genre       TEXT NOT NULL DEFAULT '',
  attributes  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- updated_at 트리거 (없으면 생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'status_presets_updated_at'
      AND tgrelid = 'public.status_presets'::regclass
  ) THEN
    CREATE TRIGGER status_presets_updated_at
      BEFORE UPDATE ON public.status_presets
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- RLS
ALTER TABLE public.status_presets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'status_presets' AND schemaname = 'public' AND policyname = 'status_presets_select'
  ) THEN
    CREATE POLICY "status_presets_select"
      ON public.status_presets FOR SELECT USING (true);
  END IF;
END
$$;

-- 시드 데이터 (무협/판타지/현대 기본 프리셋)
INSERT INTO public.status_presets (title, genre, attributes) VALUES
(
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

-- ============================================================
-- 5. presets: FK 추가 (status_presets 생성 이후)
-- ============================================================

ALTER TABLE public.presets
  ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📖',
  ADD COLUMN IF NOT EXISTS status_preset_id UUID
    REFERENCES public.status_presets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_presets_status_preset_id
  ON public.presets(status_preset_id)
  WHERE status_preset_id IS NOT NULL;

-- ============================================================
-- 6. service_logs 테이블 신규 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp   TIMESTAMPTZ DEFAULT now(),
  method      TEXT NOT NULL,
  path        TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  ip          TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_service_logs_timestamp
  ON public.service_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_service_logs_status
  ON public.service_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_service_logs_path
  ON public.service_logs(path);

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. config: 장르 목록 + 상태창 기본값 시드
-- ============================================================

INSERT INTO public.config (id, value) VALUES
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

-- ============================================================
-- 8. stories_safe VIEW 재생성 (새 컬럼 포함)
-- ============================================================

DROP VIEW IF EXISTS public.stories_safe;

CREATE VIEW public.stories_safe AS
SELECT
  id,
  title,
  description,
  tags,
  icon,
  banner_gradient,
  play_count,
  like_count,
  badge,
  is_featured,
  owner_name,
  world_setting,
  story,
  character_name,
  character_setting,
  characters,
  user_note,
  system_rules,
  use_latex,
  is_public,
  preset,
  (password_hash IS NOT NULL) AS has_password,
  owner_uid,
  created_at,
  updated_at
FROM public.stories
WHERE is_public = true;

GRANT SELECT ON public.stories_safe TO anon, authenticated;

-- ============================================================
-- 9. play_count 원자적 증가 RPC 함수
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_play_count(p_story_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stories
  SET play_count = play_count + 1
  WHERE id = p_story_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_play_count(UUID) TO anon, authenticated;
