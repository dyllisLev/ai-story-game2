-- stories RLS
ALTER TABLE story_game.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_select" ON story_game.stories
  FOR SELECT USING (is_public = true OR auth.uid() = owner_uid);
CREATE POLICY "stories_insert" ON story_game.stories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_uid = auth.uid());
CREATE POLICY "stories_update" ON story_game.stories
  FOR UPDATE USING (auth.uid() = owner_uid);
CREATE POLICY "stories_delete" ON story_game.stories
  FOR DELETE USING (auth.uid() = owner_uid);

-- sessions RLS
ALTER TABLE story_game.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON story_game.sessions
  FOR SELECT USING (owner_uid = auth.uid() OR owner_uid IS NULL);
CREATE POLICY "sessions_insert" ON story_game.sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update" ON story_game.sessions
  FOR UPDATE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
CREATE POLICY "sessions_delete" ON story_game.sessions
  FOR DELETE USING (owner_uid = auth.uid() OR owner_uid IS NULL);

-- session_memory RLS
ALTER TABLE story_game.session_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_memory_select" ON story_game.session_memory
  FOR SELECT USING (true);
CREATE POLICY "session_memory_insert" ON story_game.session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM story_game.sessions WHERE owner_uid = auth.uid() OR owner_uid IS NULL)
  );
CREATE POLICY "session_memory_update" ON story_game.session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM story_game.sessions WHERE owner_uid = auth.uid() OR owner_uid IS NULL)
  );

-- presets RLS
ALTER TABLE story_game.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_select" ON story_game.presets FOR SELECT USING (true);

-- config RLS
ALTER TABLE story_game.config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select" ON story_game.config FOR SELECT USING (true);

-- api_logs RLS (service key only)
ALTER TABLE story_game.api_logs ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS
ALTER TABLE story_game.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON story_game.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON story_game.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- stories_safe VIEW 권한
GRANT SELECT ON story_game.stories_safe TO anon, authenticated;
-- password_hash 직접 접근 차단
REVOKE SELECT (password_hash) ON story_game.stories FROM anon, authenticated;

-- 스토리 비밀번호 관련 함수
CREATE OR REPLACE FUNCTION story_game.get_story_salt(p_story_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = story_game AS $$
  SELECT split_part(password_hash, ':', 1)
  FROM stories WHERE id = p_story_id AND password_hash IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION story_game.verify_story_password(p_story_id uuid, p_input_hash text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = story_game AS $$
  SELECT EXISTS(
    SELECT 1 FROM stories WHERE id = p_story_id AND password_hash = p_input_hash
  );
$$;
