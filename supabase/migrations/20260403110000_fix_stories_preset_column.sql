-- ============================================================
-- Fix: Add missing 'preset' column to story_game.stories table
-- Bug: Frontend sends preset field but column doesn't exist, causing 400 errors
-- Related: AI-252 (Admin UI 9-genre testing - "게임 시작" button fails)
-- ============================================================

-- Add preset JSONB column to stories table
ALTER TABLE story_game.stories
  ADD COLUMN IF NOT EXISTS preset JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN story_game.stories.preset IS 'Status window and output settings (useStatusWindow, statusAttributes, narrativeLength, useCache)';

-- Recreate stories_safe VIEW to include preset column
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
