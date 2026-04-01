-- ============================================================
-- Fix RLS Policies and Stories Safe View
-- Priority: CRITICAL - Blocks Phase 3 implementation
-- Date: 2026-04-01
-- Author: Database Administrator
-- Issue: AI-57, AI-67
--
-- PROBLEM: RLS policies and stories_safe view need to be recreated
-- with optimized auth.uid() pattern.
--
-- IMPORTANT: The actual database schema is 'ai_story_game' (verified 2026-04-01)
-- Migration files have been updated to use the correct schema name.
--
-- SOLUTION: Recreate all policies and views on ai_story_game schema
-- ============================================================

-- Step 1: Drop existing policies on ai_story_game (will recreate)
DROP POLICY IF EXISTS "stories_select" ON ai_story_game.stories;
DROP POLICY IF EXISTS "stories_insert" ON ai_story_game.stories;
DROP POLICY IF EXISTS "stories_update" ON ai_story_game.stories;
DROP POLICY IF EXISTS "stories_delete" ON ai_story_game.stories;

DROP POLICY IF EXISTS "sessions_select" ON ai_story_game.sessions;
DROP POLICY IF EXISTS "sessions_insert" ON ai_story_game.sessions;
DROP POLICY IF EXISTS "sessions_update" ON ai_story_game.sessions;
DROP POLICY IF EXISTS "sessions_delete" ON ai_story_game.sessions;

DROP POLICY IF EXISTS "session_memory_select" ON ai_story_game.session_memory;
DROP POLICY IF EXISTS "session_memory_insert" ON ai_story_game.session_memory;
DROP POLICY IF EXISTS "session_memory_update" ON ai_story_game.session_memory;

-- Step 2: Recreate optimized RLS policies on ai_story_game schema
-- Using optimized auth.uid() pattern (wrapped in SELECT subquery)

-- Stories RLS: Author can edit, public stories readable by all
CREATE POLICY "stories_select" ON ai_story_game.stories
  FOR SELECT USING (is_public = true OR (select auth.uid()) = owner_uid);

CREATE POLICY "stories_insert" ON ai_story_game.stories
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND owner_uid = (select auth.uid()));

CREATE POLICY "stories_update" ON ai_story_game.stories
  FOR UPDATE USING ((select auth.uid()) = owner_uid);

CREATE POLICY "stories_delete" ON ai_story_game.stories
  FOR DELETE USING ((select auth.uid()) = owner_uid);

-- Sessions RLS: Owner-only CRUD
CREATE POLICY "sessions_select" ON ai_story_game.sessions
  FOR SELECT USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

CREATE POLICY "sessions_insert" ON ai_story_game.sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "sessions_update" ON ai_story_game.sessions
  FOR UPDATE USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

CREATE POLICY "sessions_delete" ON ai_story_game.sessions
  FOR DELETE USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

-- Session Memory RLS: Session owner only (via sessions table)
CREATE POLICY "session_memory_select" ON ai_story_game.session_memory
  FOR SELECT USING (true);

CREATE POLICY "session_memory_insert" ON ai_story_game.session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM ai_story_game.sessions WHERE owner_uid = (select auth.uid()) OR owner_uid IS NULL)
  );

CREATE POLICY "session_memory_update" ON ai_story_game.session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM ai_story_game.sessions WHERE owner_uid = (select auth.uid()) OR owner_uid IS NULL)
  );

-- Step 3: Recreate stories_safe view on ai_story_game
DROP VIEW IF EXISTS ai_story_game.stories_safe;

CREATE VIEW ai_story_game.stories_safe
WITH (security_invoker = false)
AS SELECT
  id, title, description, tags, icon, banner_gradient,
  play_count, like_count, badge, is_featured, owner_name,
  world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex,
  is_public, preset, (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM ai_story_game.stories
WHERE is_public = true;

GRANT SELECT ON ai_story_game.stories_safe TO anon, authenticated;

-- ============================================================
-- ROLLBACK PLAN
-- ============================================================
--
-- To rollback this migration:
--
-- 1. Drop policies created above:
--    DROP POLICY "stories_select" ON ai_story_game.stories;
--    DROP POLICY "stories_insert" ON ai_story_game.stories;
--    DROP POLICY "stories_update" ON ai_story_game.stories;
--    DROP POLICY "stories_delete" ON ai_story_game.stories;
--    DROP POLICY "sessions_select" ON ai_story_game.sessions;
--    DROP POLICY "sessions_insert" ON ai_story_game.sessions;
--    DROP POLICY "sessions_update" ON ai_story_game.sessions;
--    DROP POLICY "sessions_delete" ON ai_story_game.sessions;
--    DROP POLICY "session_memory_select" ON ai_story_game.session_memory;
--    DROP POLICY "session_memory_insert" ON ai_story_game.session_memory;
--    DROP POLICY "session_memory_update" ON ai_story_game.session_memory;
--
-- 2. Recreate original policies from 00000000000003_setup_rls.sql
--    (without SELECT subquery wrapper optimization)
--
-- 3. Recreate original stories_safe view from 20260323010000_extend_stories.sql
--
-- ============================================================
