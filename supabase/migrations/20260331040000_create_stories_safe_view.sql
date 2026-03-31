-- Create stories_safe VIEW in ai_story_game schema
-- This view excludes password_hash and only shows public stories

DROP VIEW IF EXISTS ai_story_game.stories_safe;

CREATE VIEW ai_story_game.stories_safe
WITH (security_invoker = false)
AS SELECT
  id, title, world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex, is_public,
  description, tags, icon, banner_gradient, play_count, like_count,
  badge, is_featured, owner_name, owner_uid, created_at, updated_at,
  (password_hash IS NOT NULL) AS has_password
FROM ai_story_game.stories
WHERE is_public = true;

GRANT SELECT ON ai_story_game.stories_safe TO anon, authenticated;
