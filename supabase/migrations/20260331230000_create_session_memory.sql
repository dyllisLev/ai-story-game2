-- ============================================================
-- Create session_memory table in ai_story_game schema
-- Date: 2026-04-01
-- Author: Database Administrator
-- Priority: CRITICAL - Core gameplay feature blocked
--
-- ✅ VERIFIED: sessions table uses owner_uid (UUID), not user_id
--    RLS policies correctly reference sessions.owner_uid = auth.uid()
--    Backend code confirms: .eq('owner_uid', user.id) pattern
-- ============================================================
-- This migration creates the session_memory table which is
-- required for the AI memory system (short_term, long_term,
-- characters, goals memory categories)
-- ============================================================

-- Create session_memory table
CREATE TABLE IF NOT EXISTS ai_story_game.session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ai_story_game.sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_sg_session_memory_session_id
  ON ai_story_game.session_memory(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_sg_session_memory_type
  ON ai_story_game.session_memory(type);

-- Create updated_at trigger
CREATE TRIGGER session_memory_updated_at
  BEFORE UPDATE ON ai_story_game.session_memory
  FOR EACH ROW
  EXECUTE FUNCTION ai_story_game.update_updated_at();

-- Enable Row Level Security
ALTER TABLE ai_story_game.session_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can access memory for their own sessions
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

-- Admin bypass policy
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

-- Add comment
COMMENT ON TABLE ai_story_game.session_memory IS 'Stores AI-generated memory for game sessions in 4 categories: short_term, characters, goals, long_term';
COMMENT ON COLUMN ai_story_game.session_memory.type IS 'Memory category: short_term (recent events), characters (NPC tracking), goals (player objectives), long_term (story arc memory)';
COMMENT ON COLUMN ai_story_game.session_memory.content IS 'JSONB array containing memory items with structure: [{content, timestamp, importance}]';
