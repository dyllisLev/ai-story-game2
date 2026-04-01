# Manual Migration Execution Guide

**Date:** 2026-04-01 07:00 UTC
**Status:** ⏸️ Awaiting Manual Execution
**Location:** https://supa.oci.hmini.me/project/sql

---

## ⚠️ Important Note: Schema Name

**The correct schema is `ai_story_game`, NOT `story_game`.**

The DBA's migration documentation incorrectly assumes `story_game`. All SQL below has been corrected to use `ai_story_game`.

---

## Migration 1: Create stories_safe View (CRITICAL - Blocks Stories API)

**Impact:** Without this, `/api/v1/stories` returns 500 error

```sql
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
```

**Verify:**
```sql
SELECT * FROM ai_story_game.stories_safe LIMIT 1;
```

---

## Migration 2: Create session_memory Table

**Impact:** Core AI memory gameplay feature

```sql
-- Create session_memory table
CREATE TABLE IF NOT EXISTS ai_story_game.session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ai_story_game.sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_sg_session_memory_session_id
  ON ai_story_game.session_memory(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_sg_session_memory_type
  ON ai_story_game.session_memory(type);

-- Enable RLS
ALTER TABLE ai_story_game.session_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view memory for their sessions"
  ON ai_story_game.session_memory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_game.sessions
      WHERE sessions.id = session_memory.session_id
      AND sessions.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can insert memory for their sessions"
  ON ai_story_game.session_memory
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_story_game.sessions
      WHERE sessions.id = session_memory.session_id
      AND sessions.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can update memory for their sessions"
  ON ai_story_game.session_memory
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_game.sessions
      WHERE sessions.id = session_memory.session_id
      AND sessions.owner_uid = auth.uid()
    )
  );

-- Admin bypass
CREATE POLICY "Admins can full access session_memory"
  ON ai_story_game.session_memory
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_game.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_story_game.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_story_game.session_memory TO authenticated;
GRANT SELECT ON ai_story_game.session_memory TO anon;
```

**Verify:**
```sql
SELECT * FROM ai_story_game.session_memory LIMIT 1;
```

---

## Migration 3: Fix sessions.story_id CASCADE

**Impact:** Data integrity - prevents orphaned sessions

```sql
-- Drop existing FK
ALTER TABLE ai_story_game.sessions
  DROP CONSTRAINT IF EXISTS sessions_story_id_fkey;

-- Add correct FK with CASCADE
ALTER TABLE ai_story_game.sessions
  ADD CONSTRAINT sessions_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES ai_story_game.stories(id) ON DELETE CASCADE;
```

**Verify:**
```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'ai_story_game'
AND tc.table_name = 'sessions'
AND rc.constraint_name = 'sessions_story_id_fkey';
-- Expected: delete_rule = 'CASCADE'
```

---

## Migration 4: Add Missing Indexes (Performance)

```sql
-- Stories indexes
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

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sg_sessions_created_at
  ON ai_story_game.sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_owner_played
  ON ai_story_game.sessions(owner_uid, last_played_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_story_owner
  ON ai_story_game.sessions(story_id, owner_uid);

-- User profiles index
CREATE INDEX IF NOT EXISTS idx_sg_user_profiles_role
  ON ai_story_game.user_profiles(role);

-- Status presets index
CREATE INDEX IF NOT EXISTS idx_sg_status_presets_genre
  ON ai_story_game.status_presets(genre);
```

**Verify:**
```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = 'ai_story_game'
AND indexname LIKE 'idx_sg_%'
ORDER BY indexname;
-- Expected: 11 indexes
```

---

## Post-Migration Steps

1. **Restart backend:**
   ```bash
   ./dev.sh restart
   ```

2. **Test health:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Test stories API:**
   ```bash
   curl "http://localhost:3000/api/v1/stories?limit=1"
   ```

4. **Verify view exists:**
   ```sql
   SELECT schemaname, viewname FROM pg_views
   WHERE schemaname = 'ai_story_game' AND viewname = 'stories_safe';
   ```

---

## Execution Order

Execute migrations in this exact order:

1. ✅ Migration 1: stories_safe view (blocks stories API)
2. ✅ Migration 2: session_memory table (blocks AI memory)
3. ✅ Migration 3: sessions CASCADE (data integrity)
4. ✅ Migration 4: indexes (performance)

---

**All SQL uses `ai_story_game` schema - this is the CORRECT schema for this Supabase instance.**
