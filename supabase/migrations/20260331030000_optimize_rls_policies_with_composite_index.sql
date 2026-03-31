-- ============================================================
-- Optimize RLS Policies for Performance (10-100x faster queries)
-- Add Composite Index for Story Session Queries
-- ============================================================
--
-- Issue: RLS policies call auth.uid() for every row scan
-- Impact: 10-100x slowdown on large tables (100K+ rows)
-- Solution: Wrap auth.uid() in SELECT subquery (called once, cached)
--
-- Reference: Supabase Postgres Best Practices - security-rls-performance.md

-- Step 1: Drop existing RLS policies
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

-- Step 2: Recreate stories RLS policies with optimized auth.uid()
CREATE POLICY "stories_select" ON ai_story_game.stories
  FOR SELECT USING (is_public = true OR (select auth.uid()) = owner_uid);

CREATE POLICY "stories_insert" ON ai_story_game.stories
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND owner_uid = (select auth.uid()));

CREATE POLICY "stories_update" ON ai_story_game.stories
  FOR UPDATE USING ((select auth.uid()) = owner_uid);

CREATE POLICY "stories_delete" ON ai_story_game.stories
  FOR DELETE USING ((select auth.uid()) = owner_uid);

-- Step 3: Recreate sessions RLS policies with optimized auth.uid()
CREATE POLICY "sessions_select" ON ai_story_game.sessions
  FOR SELECT USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

CREATE POLICY "sessions_insert" ON ai_story_game.sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "sessions_update" ON ai_story_game.sessions
  FOR UPDATE USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

CREATE POLICY "sessions_delete" ON ai_story_game.sessions
  FOR DELETE USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

-- Step 4: Recreate session_memory RLS policies with optimized auth.uid()
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

-- Step 5: Create composite index for story session queries
-- Purpose: Fast retrieval of all sessions for a story, ordered by last played
-- Usage: "Get story history" and "Resume session" features
CREATE INDEX idx_sg_sessions_story_played
ON ai_story_game.sessions(story_id, last_played_at DESC);

-- Step 6: Add index on session_memory.session_id for FK lookups
-- Note: Already covered by UNIQUE constraint, but explicit index helps query planner
CREATE INDEX idx_sg_session_memory_session
ON ai_story_game.session_memory(session_id);

-- ============================================================
-- ROLLBACK PLAN
-- ============================================================
--
-- To rollback this migration:
--
-- DROP INDEX idx_sg_sessions_story_played;
-- DROP INDEX idx_sg_session_memory_session;
--
-- Then recreate original policies (without SELECT subquery wrapper):
-- See migration 00000000000003_setup_rls.sql for original definitions
--
-- ============================================================
