-- Add missing columns to user_profiles table
ALTER TABLE ai_story_game.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON ai_story_game.user_profiles(role);

-- Add comment
COMMENT ON COLUMN ai_story_game.user_profiles.role IS 'User role: pending, user, admin';
