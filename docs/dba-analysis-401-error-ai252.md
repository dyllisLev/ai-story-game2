# DBA 분석: 프로덕션 401 Unauthorized 에러

**날짜:** 2026-04-03
**이슈:** AI-252 블로커 #2
**에이전트:** Database Administrator
**환경:** 프로덕션 (https://aistorygame.nuc.hmini.me)

---

## 에러 요약

**에러 코드:** HTTP 401 Unauthorized
**엔드포인트:** `POST /api/v1/game/test-prompt`

**발생 패턴:**
```
성공: POST /api/v1/auth/login → 200 OK
성공: POST /api/v1/stories → 201 Created
성공: PUT /api/v1/stories/{id} → 200 OK
실패: POST /api/v1/game/test-prompt → 401 Unauthorized
```

---

## 데이터베이스 스키마 분석

### 세션 테이블 구조

```sql
CREATE TABLE ai_story_game.sessions (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES ai_story_game.stories(id),
  title TEXT NOT NULL,
  preset JSONB DEFAULT '{}'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  summary TEXT,
  summary_up_to_index INTEGER,
  owner_uid UUID REFERENCES auth.users(id),
  session_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_played_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS 정책 (세션 접근 제어)

```sql
-- 소유자 또는 익명 세션 접근 허용
CREATE POLICY "sessions_select" ON ai_story_game.sessions
  FOR SELECT USING (owner_uid = auth.uid() OR owner_uid IS NULL);

CREATE POLICY "sessions_update" ON ai_story_game.sessions
  FOR UPDATE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
```

---

## 결론

### ✅ 데이터베이스 스키마: 정상

1. **세션 테이블 구조** - 정상적
   - `session_token` 컬럼 존재 (UUID)
   - `owner_uid` 컬럼으로 소유자 관리
   - 적절한 인덱스 생성됨

2. **RLS 정책** - 정상적
   - 인증된 사용자는 자신의 세션 접근 가능
   - 익명 세션(`owner_uid IS NULL`)은 모두 접근 가능
   - 정책 논리에 문제 없음

3. **만료 메커니즘** - 설계상 의도적 부재
   - 세션 테이블에 `expires_at` 컬럼 없음
   - 이는 Supabase Auth의 세션 관리에 의존하는 설계

### 🔴 근본 원인: 데이터베이스 아님

**401 에러의 실제 원인:**
1. 백엔드 인증 미들웨어 문제
2. 쿠키 설정 오류 (httpOnly, SameSite, Secure)
3. JWT 토큰 리프레시 로직 실패
4. Supabase Auth 세션 만료

---

## 권장 사항 (DBA 관점)

### 선택적 개선사항

현재 세션 관리는 Supabase Auth에 의존하고 있어, 데이터베이스 레벨의 만료 관리가 없습니다. 다음은 선택적 개선사항입니다:

#### 1. 세션 만료 시간 추가 (선택사항)

```sql
-- 세션 만료 시간 컬럼 추가
ALTER TABLE ai_story_game.sessions
ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- 인덱스 생성
CREATE INDEX idx_sg_sessions_expires_at
ON ai_story_game.sessions(expires_at);

-- 만료 세션 필터링 뷰
CREATE OR REPLACE VIEW ai_story_game.active_sessions AS
SELECT * FROM ai_story_game.sessions
WHERE expires_at IS NULL OR expires_at > NOW();

-- 주기적 만료 세션 정리
DELETE FROM ai_story_game.sessions
WHERE expires_at < NOW() AND owner_uid IS NOT NULL;
```

**장점:**
- 데이터베이스 레벨에서 만료 세션 자동 정리 가능
- 활성 세션 통계 용이

**단점:**
- Supabase Auth와의 중복 관리
- 추가 복잡성

#### 2. 세션 활동 추적 강화

```sql
-- 마지막 API 활동 시간 컬럼 추가
ALTER TABLE ai_story_game.sessions
ADD COLUMN last_api_activity_at TIMESTAMPTZ DEFAULT now();

-- 활동 기반 만료 로직을 위한 인덱스
CREATE INDEX idx_sg_sessions_last_activity
ON ai_story_game.sessions(last_api_activity_at DESC);
```

---

## 우선 조치 사항 (CTO 또는 Fullstack Dev)

이 401 에러는 **데이터베이스 문제가 아닙니다**. 다음을 확인해야 합니다:

### 1. 백엔드 인증 미들웨어 확인

```typescript
// backend/src/plugins/auth.ts 또는 해당 파일
// @ts-ignore 또는 // @ts-nocheck가 있는지 확인
// auth.uid() 호출이 정상적인지 확인
```

### 2. 쿠키 설정 확인

프로덕션 환경에서 다음을 확인:
- `httpOnly` 속성 (JavaScript 접근 방지)
- `SameSite` 속성 (CSRF 방지)
- `Secure` 속성 (HTTPS 전용)
- 도메인/경로 설정 (`.nuc.hmini.me`)

### 3. Supabase Auth 세션 설정 확인

```bash
# Supabase Dashboard > Authentication > URL Configuration
# Site URL: https://aistorygame.nuc.hmini.me
# Redirect URLs: 프로덕션 도메인 포함되어 있는지 확인
```

### 4. 프론트엔드 토큰 저장/전송 확인

```typescript
// 프론트엔드에서 인증 토큰이
// 1. localStorage에 올바르게 저장되는지
// 2. API 요청 시 Authorization 헤더 또는 쿠키로 전송되는지
// 3. 토큰 만료 시 자동 갱신되는지
```

---

## 테스트 검증 쿼리

데이터베이스 상태를 확인하기 위한 쿼리:

```sql
-- 1. 세션 테이블 구조 확인
\d ai_story_game.sessions

-- 2. RLS 정책 확인
SELECT * FROM pg_policies
WHERE tablename = 'sessions' AND schemaname = 'ai_story_game';

-- 3. 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sessions' AND schemaname = 'ai_story_game';

-- 4. 최근 세션 확인
SELECT id, title, owner_uid, created_at, last_played_at
FROM ai_story_game.sessions
ORDER BY created_at DESC
LIMIT 10;
```

---

## 참고 자료

- **QA 블로커 리포트:** `docs/qa-blocker-report-ai252.md`
- **블로커 #1 해결:** `docs/dba-blocker-resolution-ai252.md`
- **Supabase Auth 문서:** https://supabase.com/docs/guides/auth
- **관련 이슈:** AI-252, AI-245

---

**보고자:** Database Administrator
**승인자:** CTO (대기 중)
**상태:** ✅ 데이터베이스 정상, 백엔드/인증 로직 점검 필요
