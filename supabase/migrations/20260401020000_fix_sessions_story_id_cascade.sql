-- ============================================================
-- Fix sessions.story_id FK: SET NULL → CASCADE
-- Priority: HIGH - Data integrity issue
-- Date: 2026-04-01
-- Author: Database Administrator
-- Issue: AI-57
--
-- PROBLEM: sessions.story_id FK has ON DELETE SET NULL but specification
-- requires ON DELETE CASCADE.
--
-- CURRENT BEHAVIOR:
-- - When a story is deleted, sessions have story_id set to NULL
-- - This creates orphaned sessions with no story reference
--
-- EXPECTED BEHAVIOR:
-- - When a story is deleted, all related sessions should be deleted
-- - Maintains data integrity and prevents orphaned records
--
-- REFERENCE: AI-57 issue description specifies:
-- "sessions.story_id → stories(id) ON DELETE CASCADE"
-- ============================================================

-- Step 1: Drop existing FK constraint
ALTER TABLE ai_story_game.sessions
  DROP CONSTRAINT IF EXISTS sessions_story_id_fkey;

-- Step 2: Add correct FK with CASCADE behavior
ALTER TABLE ai_story_game.sessions
  ADD CONSTRAINT sessions_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES ai_story_game.stories(id) ON DELETE CASCADE;

-- ============================================================
-- ROLLBACK PLAN
-- ============================================================
--
-- To rollback this migration:
--
-- ALTER TABLE ai_story_game.sessions
--   DROP CONSTRAINT sessions_story_id_fkey;
--
-- ALTER TABLE ai_story_game.sessions
--   ADD CONSTRAINT sessions_story_id_fkey
--   FOREIGN KEY (story_id) REFERENCES ai_story_game.stories(id) ON DELETE SET NULL;
--
-- ============================================================
