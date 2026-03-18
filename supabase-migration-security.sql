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
-- 4. 관리자 UID 등록
-- ⚠️ 아래 값을 실제 관리자 UID로 교체하세요
-- Supabase Dashboard > Authentication > Users 에서 확인
-- ============================================
-- INSERT INTO config (id, value) VALUES ('admin_uid', 'YOUR-ADMIN-UID-HERE')
-- ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;
