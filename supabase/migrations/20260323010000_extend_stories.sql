-- ============================================================
-- Phase 2-A / Task 1: story_game.stories 테이블 UI 메타데이터 컬럼 추가
-- Depends on: 00000000000001_create_story_game_schema.sql
-- ============================================================

-- UI 메타데이터 컬럼 추가
ALTER TABLE story_game.stories
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
CREATE INDEX IF NOT EXISTS idx_sg_stories_featured
  ON story_game.stories(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_sg_stories_play_count
  ON story_game.stories(play_count DESC);

CREATE INDEX IF NOT EXISTS idx_sg_stories_tags
  ON story_game.stories USING GIN(tags);

-- stories_safe VIEW 재생성 (새 컬럼 포함)
DROP VIEW IF EXISTS story_game.stories_safe;

CREATE VIEW story_game.stories_safe
  WITH (security_invoker = false)
AS SELECT
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
FROM story_game.stories
WHERE is_public = true;

GRANT SELECT ON story_game.stories_safe TO anon, authenticated;

-- play_count 원자적 증가 RPC 함수
CREATE OR REPLACE FUNCTION story_game.increment_play_count(p_story_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = story_game
AS $$
  UPDATE story_game.stories
  SET play_count = play_count + 1
  WHERE id = p_story_id;
$$;
