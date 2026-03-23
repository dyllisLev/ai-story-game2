-- Story Game 전용 스키마 생성
CREATE SCHEMA IF NOT EXISTS story_game;

-- stories 테이블
CREATE TABLE story_game.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  world_setting TEXT DEFAULT '',
  story TEXT DEFAULT '',
  character_name TEXT DEFAULT '',
  character_setting TEXT DEFAULT '',
  characters TEXT DEFAULT '',
  user_note TEXT DEFAULT '',
  system_rules TEXT DEFAULT '',
  use_latex BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  password_hash TEXT,
  owner_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- sessions 테이블
CREATE TABLE story_game.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES story_game.stories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  preset JSONB DEFAULT '{}'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  summary TEXT DEFAULT '',
  summary_up_to_index INTEGER DEFAULT 0,
  owner_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_played_at TIMESTAMPTZ DEFAULT now()
);

-- session_memory 테이블
CREATE TABLE story_game.session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES story_game.sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

-- presets 테이블
CREATE TABLE story_game.presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  world_setting TEXT DEFAULT '',
  story TEXT DEFAULT '',
  characters TEXT DEFAULT '',
  character_name TEXT DEFAULT '',
  character_setting TEXT DEFAULT '',
  user_note TEXT DEFAULT '',
  system_rules TEXT DEFAULT '',
  use_latex BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- config 테이블
CREATE TABLE story_game.config (
  id TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- api_logs 테이블
CREATE TABLE story_game.api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES story_game.sessions(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_model TEXT,
  request_system_prompt TEXT,
  request_messages JSONB,
  request_body JSONB,
  response_text TEXT,
  response_usage JSONB,
  response_error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- stories_safe VIEW (password_hash 노출 방지, 공개 스토리만)
CREATE VIEW story_game.stories_safe
  WITH (security_invoker = false)
AS SELECT
  id, title, world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex, is_public,
  (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM story_game.stories
WHERE is_public = true;

-- 인덱스
CREATE INDEX idx_sg_stories_public ON story_game.stories(is_public) WHERE is_public = true;
CREATE INDEX idx_sg_stories_created ON story_game.stories(created_at DESC);
CREATE INDEX idx_sg_sessions_story ON story_game.sessions(story_id);
CREATE INDEX idx_sg_sessions_owner ON story_game.sessions(owner_uid);
CREATE INDEX idx_sg_sessions_played ON story_game.sessions(last_played_at DESC);
CREATE INDEX idx_sg_presets_default ON story_game.presets(is_default) WHERE is_default = true;
CREATE INDEX idx_sg_api_logs_session ON story_game.api_logs(session_id);
CREATE INDEX idx_sg_api_logs_created ON story_game.api_logs(created_at DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION story_game.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at BEFORE UPDATE ON story_game.stories
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON story_game.sessions
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER presets_updated_at BEFORE UPDATE ON story_game.presets
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER config_updated_at BEFORE UPDATE ON story_game.config
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER session_memory_updated_at BEFORE UPDATE ON story_game.session_memory
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
