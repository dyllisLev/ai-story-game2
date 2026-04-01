-- ============================================================
-- Add Missing Indexes per Table Definitions
-- Priority: MEDIUM - Performance optimization
-- Date: 2026-04-01
-- Author: Database Administrator
-- Issue: AI-57
--
-- PROBLEM: Several indexes defined in table definitions document
-- (docs/sdlc/phase2-design/05-Table-Definitions.md) are missing.
--
-- REFERENCE: Table definitions specify 11 composite indexes and
-- multiple single-column indexes for performance optimization.
--
-- INDEXES ADDED:
-- 1. Stories: status_preset_id, badge, like_count, public_featured_play, owner_uid
-- 2. Sessions: created_at, owner_played, story_owner
-- 3. User profiles: role
-- 4. Status presets: genre
-- ============================================================

-- Stories table indexes
CREATE INDEX IF NOT EXISTS idx_sg_stories_status_preset_id
  ON ai_story_game.stories(status_preset_id) WHERE status_preset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sg_stories_badge
  ON ai_story_game.stories(badge) WHERE badge IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sg_stories_like_count
  ON ai_story_game.stories(like_count DESC);

CREATE INDEX IF NOT EXISTS idx_sg_stories_public_featured_play
  ON ai_story_game.stories(is_public DESC, is_featured DESC, play_count DESC)
  WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_sg_stories_owner_uid
  ON ai_story_game.stories(owner_uid);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sg_sessions_created_at
  ON ai_story_game.sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_owner_played
  ON ai_story_game.sessions(owner_uid, last_played_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_story_owner
  ON ai_story_game.sessions(story_id, owner_uid);

-- User profiles table index
CREATE INDEX IF NOT EXISTS idx_sg_user_profiles_role
  ON ai_story_game.user_profiles(role);

-- Status presets table index
CREATE INDEX IF NOT EXISTS idx_sg_status_presets_genre
  ON ai_story_game.status_presets(genre);

-- Note: idx_sg_session_memory_session_type is already covered by
-- the UNIQUE(session_id, type) constraint on ai_story_game.session_memory

-- ============================================================
-- ROLLBACK PLAN
-- ============================================================
--
-- To rollback this migration, drop the indexes:
--
-- DROP INDEX IF EXISTS idx_sg_stories_status_preset_id;
-- DROP INDEX IF EXISTS idx_sg_stories_badge;
-- DROP INDEX IF EXISTS idx_sg_stories_like_count;
-- DROP INDEX IF EXISTS idx_sg_stories_public_featured_play;
-- DROP INDEX IF EXISTS idx_sg_stories_owner_uid;
-- DROP INDEX IF EXISTS idx_sg_sessions_created_at;
-- DROP INDEX IF EXISTS idx_sg_sessions_owner_played;
-- DROP INDEX IF EXISTS idx_sg_sessions_story_owner;
-- DROP INDEX IF EXISTS idx_sg_user_profiles_role;
-- DROP INDEX IF EXISTS idx_sg_status_presets_genre;
--
-- ============================================================
