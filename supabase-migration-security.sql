-- ============================================
-- 보안 패치 마이그레이션
-- Supabase Dashboard > SQL Editor 에서 실행
-- 2026-03-18
-- ============================================

-- config 테이블에 value 컬럼 추가 (admin_uid 저장용)
ALTER TABLE config ADD COLUMN IF NOT EXISTS value TEXT;

-- ============================================
-- 1. stories SELECT 정책 수정 (SEC-008)
-- 공개 스토리 또는 본인 스토리만 조회 가능
-- ============================================
DROP POLICY IF EXISTS "stories_select_public" ON stories;
CREATE POLICY "stories_select" ON stories
  FOR SELECT USING (is_public = true OR auth.uid() = owner_uid);

-- ============================================
-- 2. sessions SELECT 정책 수정 (SEC-009)
-- 본인 세션만 조회 가능
-- ============================================
DROP POLICY IF EXISTS "sessions_select_public" ON sessions;
CREATE POLICY "sessions_select_owner" ON sessions
  FOR SELECT USING (auth.uid() = owner_uid);

-- ============================================
-- 3. presets 쓰기 정책 수정 (SEC-003)
-- admin_uid 로 등록된 관리자만 쓰기 가능
-- ============================================
DROP POLICY IF EXISTS "presets_insert_anon" ON presets;
DROP POLICY IF EXISTS "presets_update_anon" ON presets;
DROP POLICY IF EXISTS "presets_delete_anon" ON presets;

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

-- ============================================
-- 4. config 테이블 RLS 수정 (SEC-010)
-- 클라이언트 쓰기 완전 차단 + password_hash 노출 방지
-- ============================================
DROP POLICY IF EXISTS "config_select_anon" ON config;
DROP POLICY IF EXISTS "config_upsert_anon" ON config;
DROP POLICY IF EXISTS "config_update_anon" ON config;

-- 읽기: admin 비밀번호 해시는 제외
CREATE POLICY "config_select_safe" ON config
  FOR SELECT USING (auth.uid() IS NOT NULL AND id != 'admin');

-- 쓰기: INSERT, UPDATE, DELETE 정책 없음 = 모든 클라이언트 쓰기 거부
-- config 변경은 Supabase Dashboard (service_role) 에서만 가능

-- ============================================
-- 5. 고아 스토리 방지 - owner_uid 강제 (SEC-011)
-- ============================================
DROP POLICY IF EXISTS "stories_insert_anon" ON stories;
CREATE POLICY "stories_insert_owner" ON stories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_uid = auth.uid());

-- ============================================
-- 6. password_hash 노출 방지 (SEC-012)
-- stories_safe VIEW + 서버측 암호 검증 RPC
-- ============================================

-- 6a. password_hash 컬럼 직접 SELECT 권한 회수
REVOKE SELECT (password_hash) ON stories FROM anon, authenticated;

-- 6b. 안전한 VIEW 생성 (password_hash 대신 has_password 불린, 공개 스토리만)
CREATE VIEW stories_safe
  WITH (security_invoker = false)
AS SELECT
  id, title, world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex, is_public,
  (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM stories
WHERE is_public = true;

GRANT SELECT ON stories_safe TO anon, authenticated;

-- 6c. 스토리 암호 salt 반환 (클라이언트에서 PBKDF2 계산용)
CREATE OR REPLACE FUNCTION get_story_salt(p_story_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT split_part(password_hash, ':', 1)
  FROM stories
  WHERE id = p_story_id AND password_hash IS NOT NULL;
$$;

-- 6d. 스토리 암호 검증 (클라이언트가 계산한 해시를 서버에서 비교)
CREATE OR REPLACE FUNCTION verify_story_password(p_story_id uuid, p_input_hash text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM stories
    WHERE id = p_story_id AND password_hash = p_input_hash
  );
$$;

-- ============================================
-- 7. 관리자 UID 등록
-- ⚠️ 아래 값을 실제 관리자 UID로 교체하세요
-- Supabase Dashboard > Authentication > Users 에서 확인
-- ============================================
-- INSERT INTO config (id, value) VALUES ('admin_uid', 'YOUR-ADMIN-UID-HERE')
-- ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- 8. 고아 테스트 스토리 정리
-- ============================================
DELETE FROM stories WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
