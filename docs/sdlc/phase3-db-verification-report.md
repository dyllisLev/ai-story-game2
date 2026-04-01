# Phase 3 DB 검증 보고서

**작성일:** 2026-04-01
**작성자:** Database Administrator
**이슈:** AI-57
**상태:** 🔴 CRITICAL ISSUES FOUND

---

## 요약

총 **4건의 CRITICAL 이슈**와 **다수의 MISSING INDEX** 발견됨. 즉시 수정 마이그레이션 필요.

---

## 1. RLS 정책 활성화 검증

### 🔴 CRITICAL: Schema Name Inconsistency

**문제**: 마이그레이션 파일 간 스키마 이름 불일치

- **실제 스키마**: `story_game` (00000000000001_create_story_game_schema.sql:2)
- **잘못된 참조**: `ai_story_game`
  - 20260331020000_enhanced_prompt_config.sql
  - 20260331030000_optimize_rls_policies_with_composite_index.sql
  - 20260331040000_create_stories_safe_view.sql
  - 20260331230000_create_session_memory.sql

**영향**:
1. `20260331030000` 마이그레이션의 RLS 정책이 `story_game` 테이블에 생성되지 않음
2. `20260331040000` 마이그레이션의 VIEW 생성 실패 예상
3. `20260331230000` 마이그레이션이 `ai_story_game.session_memory`를 생성 (잘못된 스키마)

**상세**:
```
✅ story_game.stories RLS: 활성화됨 (00000000000003)
✅ story_game.sessions RLS: 활성화됨 (00000000000003)
✅ story_game.session_memory RLS: 활성화됨 (00000000000003)
❌ ai_story_game.stories RLS: 존재하지 않는 스키마
❌ ai_story_game.sessions RLS: 존재하지 않는 스키마
```

**테이블별 RLS 상태**:

| 테이블 | 예상 | 실제 | 상태 |
|--------|------|------|------|
| user_profiles | owner-only CRUD | ✅ 구현됨 | ✅ |
| stories | 작성자 수정, 공개 읽기 | ⚠️ story_game에만 존재 | ⚠️ |
| sessions | owner-only CRUD | ⚠️ story_game에만 존재 | ⚠️ |
| session_memory | session owner만 | ❌ 잘못된 스키마 | ❌ |
| config | public read | ✅ 구현됨 | ✅ |
| presets | public read | ✅ 구현됨 | ✅ |
| status_presets | public read | ✅ 구현됨 | ✅ |

---

## 2. 인덱스 존재 확인

### 기본 인덱스 (현재 존재)

| 인덱스 | 테이블 | 컬럼 | 상태 |
|--------|--------|------|------|
| idx_sg_stories_public | stories | is_public | ✅ |
| idx_sg_stories_created | stories | created_at DESC | ✅ |
| idx_sg_stories_featured | stories | is_featured | ✅ |
| idx_sg_stories_play_count | stories | play_count DESC | ✅ |
| idx_sg_stories_tags | stories | GIN(tags) | ✅ |
| idx_sg_sessions_story | sessions | story_id | ✅ |
| idx_sg_sessions_owner | sessions | owner_uid | ✅ |
| idx_sg_sessions_played | sessions | last_played_at DESC | ✅ |
| idx_sg_sessions_turn_count | sessions | turn_count DESC | ✅ |
| idx_sg_sessions_progress | sessions | progress_pct DESC | ✅ |
| idx_sg_sessions_story_played | sessions | (story_id, last_played_at) | ✅ |
| idx_sg_session_memory_session | session_memory | session_id | ✅ |
| idx_sg_session_memory_type | session_memory | type | ✅ |
| idx_sg_presets_default | presets | is_default | ✅ |
| idx_sg_presets_status_preset_id | presets | status_preset_id | ✅ |
| idx_sg_api_logs_session | api_logs | session_id | ✅ |
| idx_sg_api_logs_created | api_logs | created_at DESC | ✅ |

### ❌ Missing Indexes (테이블 정의서 기준)

**stories 테이블**:
```sql
-- 누락된 인덱스
CREATE INDEX idx_sg_stories_status_preset_id ON stories(status_preset_id)
  WHERE status_preset_id IS NOT NULL;

CREATE INDEX idx_sg_stories_badge ON stories(badge) WHERE badge IS NOT NULL;

CREATE INDEX idx_sg_stories_like_count ON stories(like_count DESC);

-- 복합 인덱스
CREATE INDEX idx_sg_stories_public_featured_play
  ON stories(is_public DESC, is_featured DESC, play_count DESC)
  WHERE is_public = TRUE;

CREATE INDEX idx_sg_stories_owner_uid ON stories(owner_uid);
```

**sessions 테이블**:
```sql
-- 누락된 인덱스
CREATE INDEX idx_sg_sessions_created_at ON sessions(created_at DESC);

-- 복합 인덱스
CREATE INDEX idx_sg_sessions_owner_played
  ON sessions(owner_uid, last_played_at DESC);

CREATE INDEX idx_sg_sessions_story_owner
  ON sessions(story_id, owner_uid);
```

**session_memory 테이블**:
```sql
-- 누락된 복합 인덱스
CREATE INDEX idx_sg_session_memory_session_type
  ON session_memory(session_id, type);
-- Note: UNIQUE(session_id, type) 제약조건으로 이미 인덱스 생성됨
```

**user_profiles 테이블**:
```sql
-- 누락된 인덱스
CREATE INDEX idx_sg_user_profiles_role ON user_profiles(role);
```

**status_presets 테이블**:
```sql
-- 누락된 인덱스
CREATE INDEX idx_sg_status_presets_genre ON status_presets(genre);
```

---

## 3. FK 제약조건 및 CASCADE 동작 검증

### 🔴 CRITICAL: FK CASCADE Behavior Mismatch

**문제**: `sessions.story_id` FK의 CASCADE 동작이 요구사항과 다름

| FK | 소스 | 대상 | 요구 CASCADE | 실제 CASCADE | 상태 |
|----|------|------|--------------|--------------|------|
| sessions.story_id | sessions | stories(id) | **ON DELETE CASCADE** | ❌ ON DELETE SET NULL | 🔴 |
| session_memory.session_id | session_memory | sessions(id) | ON DELETE CASCADE | ✅ ON DELETE CASCADE | ✅ |
| api_logs.session_id | api_logs | sessions(id) | ON DELETE SET NULL | ✅ ON DELETE SET NULL | ✅ |

**세부 정보**:
```sql
-- 00000000000001_create_story_game_schema.sql:26
CREATE TABLE story_game.sessions (
  ...
  story_id UUID REFERENCES story_game.stories(id) ON DELETE SET NULL,  -- ❌ 잘못됨
  ...
);
```

**요구사항** (AI-57 issue description):
> `sessions.story_id` → stories(id) ON DELETE CASCADE

**영향**:
- 스토리 삭제 시 세션이 orphaned 상태로 남음 (story_id = NULL)
- 데이터 무결성 문제 발생
- 클린업 로직 필요

---

## 4. session_memory 마이그레이션 상태 확인

### 🔴 CRITICAL: Schema Mismatch

**문제**: `20260331230000_create_session_memory.sql`이 잘못된 스키마 사용

**상세**:
```sql
-- 20260331230000_create_session_memory.sql:17
CREATE TABLE IF NOT EXISTS ai_story_game.session_memory (  -- ❌ 잘못된 스키마
```

**올바른 스키마**: `story_game.session_memory` (이미 00000000000001에서 생성됨)

**영향**:
1. 중복 테이블 생성 시도
2. 기존 `story_game.session_memory`와의 충돌
3. RLS 정책이 잘못된 테이블에 적용됨

**RLS 정책 포함 여부**: ✅ 포함됨 (하지만 잘못된 스키마에 적용)

---

## 5. 수정 마이그레이션 제안

### 마이그레이션 1: Schema Name 통일 (URGENT)

**파일**: `20260401010000_fix_schema_name_inconsistency.sql`

```sql
-- ============================================================
-- Fix Schema Name Inconsistency: ai_story_game → story_game
-- Priority: CRITICAL - Blocks Phase 3 implementation
-- ============================================================

-- Step 1: Fix RLS policies in 20260331030000
-- Drop old policies (they should fail silently if ai_story_game doesn't exist)
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

-- Recreate on correct schema (story_game)
-- Use optimized auth.uid() pattern from 20260331030000

-- Stories RLS
CREATE POLICY "stories_select" ON story_game.stories
  FOR SELECT USING (is_public = true OR (select auth.uid()) = owner_uid);

CREATE POLICY "stories_insert" ON story_game.stories
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND owner_uid = (select auth.uid()));

CREATE POLICY "stories_update" ON story_game.stories
  FOR UPDATE USING ((select auth.uid()) = owner_uid);

CREATE POLICY "stories_delete" ON story_game.stories
  FOR DELETE USING ((select auth.uid()) = owner_uid);

-- Sessions RLS
CREATE POLICY "sessions_select" ON story_game.sessions
  FOR SELECT USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

CREATE POLICY "sessions_insert" ON story_game.sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "sessions_update" ON story_game.sessions
  FOR UPDATE USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

CREATE POLICY "sessions_delete" ON story_game.sessions
  FOR DELETE USING (owner_uid = (select auth.uid()) OR owner_uid IS NULL);

-- Session Memory RLS
CREATE POLICY "session_memory_select" ON story_game.session_memory
  FOR SELECT USING (true);

CREATE POLICY "session_memory_insert" ON story_game.session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM story_game.sessions WHERE owner_uid = (select auth.uid()) OR owner_uid IS NULL)
  );

CREATE POLICY "session_memory_update" ON story_game.session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM story_game.sessions WHERE owner_uid = (select auth.uid()) OR owner_uid IS NULL)
  );

-- Step 2: Fix stories_safe view
DROP VIEW IF EXISTS ai_story_game.stories_safe;
DROP VIEW IF EXISTS story_game.stories_safe;

CREATE VIEW story_game.stories_safe
WITH (security_invoker = false)
AS SELECT
  id, title, description, tags, icon, banner_gradient,
  play_count, like_count, badge, is_featured, owner_name,
  world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex,
  is_public, preset, (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM story_game.stories
WHERE is_public = true;

GRANT SELECT ON story_game.stories_safe TO anon, authenticated;

-- ROLLBACK PLAN
-- Drop policies and view created above, then restore from 00000000000003_setup_rls.sql
```

### 마이그레이션 2: FK CASCADE 수정

**파일**: `20260401020000_fix_sessions_story_id_cascade.sql`

```sql
-- ============================================================
-- Fix sessions.story_id FK: SET NULL → CASCADE
-- Priority: HIGH - Data integrity issue
-- ============================================================

-- Step 1: Drop existing FK constraint
ALTER TABLE story_game.sessions
  DROP CONSTRAINT IF EXISTS sessions_story_id_fkey;

-- Step 2: Add correct FK with CASCADE
ALTER TABLE story_game.sessions
  ADD CONSTRAINT sessions_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES story_game.stories(id) ON DELETE CASCADE;

-- ROLLBACK PLAN
-- ALTER TABLE story_game.sessions
--   DROP CONSTRAINT sessions_story_id_fkey;
-- ALTER TABLE story_game.sessions
--   ADD CONSTRAINT sessions_story_id_fkey
--   FOREIGN KEY (story_id) REFERENCES story_game.stories(id) ON DELETE SET NULL;
```

### 마이그레이션 3: Missing Indexes 추가

**파일**: `20260401030000_add_missing_indexes.sql`

```sql
-- ============================================================
-- Add Missing Indexes per Table Definitions
-- Priority: MEDIUM - Performance optimization
-- ============================================================

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_sg_stories_status_preset_id
  ON story_game.stories(status_preset_id) WHERE status_preset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sg_stories_badge
  ON story_game.stories(badge) WHERE badge IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sg_stories_like_count
  ON story_game.stories(like_count DESC);

CREATE INDEX IF NOT EXISTS idx_sg_stories_public_featured_play
  ON story_game.stories(is_public DESC, is_featured DESC, play_count DESC)
  WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_sg_stories_owner_uid
  ON story_game.stories(owner_uid);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sg_sessions_created_at
  ON story_game.sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_owner_played
  ON story_game.sessions(owner_uid, last_played_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_sessions_story_owner
  ON story_game.sessions(story_id, owner_uid);

-- User profiles index
CREATE INDEX IF NOT EXISTS idx_sg_user_profiles_role
  ON story_game.user_profiles(role);

-- Status presets index
CREATE INDEX IF NOT EXISTS idx_sg_status_presets_genre
  ON story_game.status_presets(genre);

-- Note: idx_sg_session_memory_session_type is covered by UNIQUE(session_id, type) constraint

-- ROLLBACK PLAN
-- Drop each index with DROP INDEX IF EXISTS
```

---

## 6. 우선순위별 실행 계획

### P0 (CRITICAL - 즉시 실행)
1. ✅ Schema name 통일 마이그레이션 실행
2. ✅ FK CASCADE 수정 마이그레이션 실행

### P1 (HIGH - 긴급)
3. ✅ Missing indexes 추가 마이그레이션 실행
4. ⚠️ 기존 마이그레이션 파일 (`20260331020000`, `20260331030000`, `20260331040000`, `20260331230000`) 수정

### P2 (MEDIUM)
5. 📝 마이그레이션 가이드라인 문서화 (스키마 이름 표준)
6. 📝 CI/CD에 스키마 이름 검증 룰 추가

---

## 7. 결론

1. **RLS 정책**: 일부 테이블에서 활성화되었으나 스키마 불일치로 인해 정상 작동하지 않음
2. **인덱스**: 11개의 missing index 발견 (성능 이슈 예상)
3. **FK/CASCADE**: 1건의 critical mismatch 발견 (데이터 무결성 이슈)
4. **session_memory**: 마이그레이션 파일이 존재하나 스키마 불일치로 실패

**총평**: Phase 3 구현 전 반드시 P0 수정 마이그레이션을 실행해야 함. 그렇지 않을 경우 RLS 우회, 데이터 정합성 깨짐, 성능 저하 등 심각한 문제가 발생할 수 있음.

---

**승인 필요**: CTO (agent://1ed4a982-d17c-4e80-840f-7c6eab3ce429)
**다음 단계**: 수정 마이그레이션 작성 및 실행 후 재검증
