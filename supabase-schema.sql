-- ============================================
-- AI Story Game - Supabase Schema Migration
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================

-- 1. stories 테이블
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY,
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
  owner_uid UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. sessions 테이블
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  preset JSONB DEFAULT '{}'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  summary TEXT DEFAULT '',
  summary_up_to_index INTEGER DEFAULT 0,
  owner_uid UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_played_at TIMESTAMPTZ DEFAULT now()
);

-- 3. presets 테이블
CREATE TABLE IF NOT EXISTS presets (
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

-- 4. config 테이블
CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS) 설정
-- ============================================

-- stories RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- SEC-008: 공개 스토리 또는 본인 스토리만 조회 (password_hash 노출 방지)
CREATE POLICY "stories_select" ON stories
  FOR SELECT USING (is_public = true OR auth.uid() = owner_uid);

CREATE POLICY "stories_insert_anon" ON stories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stories_update_owner" ON stories
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "stories_delete_owner" ON stories
  FOR DELETE USING (auth.uid() = owner_uid);

-- sessions RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- SEC-009: 본인 세션만 조회 (타인 대화 내역 노출 방지)
CREATE POLICY "sessions_select_owner" ON sessions
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "sessions_insert_anon" ON sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sessions_update_owner" ON sessions
  FOR UPDATE USING (auth.uid() = owner_uid);

-- presets RLS
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- 프리셋 읽기는 모두 허용
CREATE POLICY "presets_select_public" ON presets
  FOR SELECT USING (true);

-- SEC-003: 프리셋 쓰기는 config 테이블의 admin 비밀번호를 알아야만 가능
-- 관리자 인증은 서버 측에서 별도로 처리해야 하며,
-- 최소한 특정 관리자 UID만 허용하도록 제한
-- ⚠️ 아래 '<YOUR_ADMIN_UID>' 를 실제 관리자 Supabase Auth UID로 교체하세요
-- Supabase Dashboard > Authentication > Users 에서 확인 가능
CREATE POLICY "presets_insert_admin" ON presets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = (SELECT (value)::uuid FROM config WHERE id = 'admin_uid' LIMIT 1)
  );

CREATE POLICY "presets_update_admin" ON presets
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = (SELECT (value)::uuid FROM config WHERE id = 'admin_uid' LIMIT 1)
  );

CREATE POLICY "presets_delete_admin" ON presets
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = (SELECT (value)::uuid FROM config WHERE id = 'admin_uid' LIMIT 1)
  );

-- config RLS
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select_anon" ON config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "config_upsert_anon" ON config
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "config_update_anon" ON config
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- 인덱스
-- ============================================

CREATE INDEX idx_stories_is_public ON stories(is_public) WHERE is_public = true;
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_sessions_story_id ON sessions(story_id);
CREATE INDEX idx_sessions_last_played ON sessions(last_played_at DESC);
CREATE INDEX idx_presets_is_default ON presets(is_default) WHERE is_default = true;

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
