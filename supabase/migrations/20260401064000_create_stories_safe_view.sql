-- ============================================================
-- Create stories_safe VIEW in ai_story_game schema
-- Date: 2026-04-01
-- Priority: CRITICAL - Blocks stories list API
--
-- This view provides a secure, read-only access to public stories
-- with computed fields like has_password
-- ============================================================

-- Drop view if exists (in both schemas for cleanup)
DROP VIEW IF EXISTS story_game.stories_safe;
DROP VIEW IF EXISTS ai_story_game.stories_safe;

-- Create stories_safe view in ai_story_game schema
CREATE VIEW ai_story_game.stories_safe
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
FROM ai_story_game.stories
WHERE is_public = true;

-- Grant permissions
GRANT SELECT ON ai_story_game.stories_safe TO anon, authenticated;

-- Add comment
COMMENT ON VIEW ai_story_game.stories_safe IS 'Secure view for public stories with computed fields, excludes password_hash';
