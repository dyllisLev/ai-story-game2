# DBA 프로덕션 DB 진단 보고서

**날짜:** 2026-04-03
**이슈:** AI-252 블로커 #2 - 프로덕션 401 Unauthorized 에러
**환경:** 프로덕션 (https://aistorygame.nuc.hmini.me)

---

## 진단 결과

### 🔴 근본 원인 발견: `session_token` 컬럼 누락

**확인된 데이터베이스 상태:**

1. **stories 테이블:** ✅ 정상
   - `preset` 컬럼 존재
   - RLS 정책 정상 작동

2. **stories_safe 뷰:** ✅ 정상
   - 뷰 존재
   - 권한 설정 정상 (anon, authenticated → SELECT)

3. **sessions 테이블:** ❌ **`session_token` 컬럼 누락**
   - 컬럼 존재하지 않음
   - 마이그레이션 미적용 상태

---

## 원인 분석

### 예상되는 문제 흐름:

1. 백엔드 코드는 `sessions` 테이블에 `session_token` 컬럼이 있다고 가정
2. 세션 생성/갱신 시 `session_token` 값 삽입 시도
3. 컬럼이 없어 쿼리 실패 또는 무시
4. 세션 식별 불가 → 인증 실패 → 401 Unauthorized

### 검증 로그 (QA Engineer 보고):

```
POST /api/v1/auth/login → 200 OK          (로그인 성공)
POST /api/v1/stories → 201 Created        (스토리 생성 성공)
PUT /api/v1/stories/{id} → 200 OK         (스토리 업데이트 성공)
POST /api/v1/game/test-prompt → 401       (게임 시작 실패)
```

게임 시작 요청 시 세션 확인이 필요하며, 이때 `session_token` 누락으로 인한 인증 실패가 발생하는 것으로 추정됩니다.

---

## 해결 방안

### 긴급 조치 필요: 마이그레이션 적용

다음 마이그레이션을 프로덕션 DB에 적용해야 합니다:

**파일:** `supabase/migrations/00000000000005_add_session_token.sql`

```sql
ALTER TABLE ai_story_game.sessions
  ADD COLUMN session_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX idx_sg_sessions_token ON ai_story_game.sessions(session_token);
```

### 적용 방법 1: psql 직접 실행 (권장)

```bash
PGPASSWORD='4XGRHHSORPI1KKDPDOwvfTTdlTBPnq4ZQwn2QSBKB0Q' \
psql -h oci -p 5434 -U postgres -d postgres << 'EOF'
ALTER TABLE ai_story_game.sessions
  ADD COLUMN session_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX idx_sg_sessions_token ON ai_story_game.sessions(session_token);
EOF
```

### 적용 방법 2: Supabase Studio

1. https://supa.oci.hmini.me 접속
2. SQL Editor 실행
3. 위 SQL 실행

### 적용 방법 3: 마이그레이션 파일 실행

```bash
PGPASSWORD='4XGRHHSORPI1KKDPDOwvfTTdlTBPnq4ZQwn2QSBKB0Q' \
psql -h oci -p 5434 -U postgres -d postgres \
-f /home/paperclip/workspace/ai-story-game2/supabase/migrations/00000000000005_add_session_token.sql
```

---

## 검증 쿼리

적용 후 다음 쿼리로 확인:

```sql
-- 컬럼 존재 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'ai_story_game'
  AND table_name = 'sessions'
  AND column_name = 'session_token';

-- 인덱스 확인
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'ai_story_game'
  AND tablename = 'sessions'
  AND indexname = 'idx_sg_sessions_token';
```

---

## 위험도 평가

### 현재 상태: 🔴 P0 (심각)

- **영향 범위:** 게임 시작 기능 전체
- **영향 환경:** 프로덕션 전체
- **사용자 영향:** 모든 사용자 게임 시작 불가
- **비즈니스 영향:** 핵심 기능 작동 불가

### 적용 후 예상 결과:

- ✅ 세션 토큰 정상 저장
- ✅ 세션 식별 가능
- ✅ 게임 시작 정상 작동
- ✅ 401 에러 해제

---

## 롤백 계획

문제 발생 시 다음으로 롤백:

```sql
-- 인덱스 삭제
DROP INDEX IF EXISTS ai_story_game.idx_sg_sessions_token;

-- 컬럼 삭제
ALTER TABLE ai_story_game.sessions DROP COLUMN IF EXISTS session_token;
```

---

## 추가 확인 사항

### 기대 효과:

1. **세션 관리 복구**
   - 세션 생성 시 UUID 토큰 자동 생성
   - 토큰을 통한 세션 식별 가능

2. **인증 흐름 정상화**
   - 게임 시작 요청 시 세션 확인 가능
   - 사용자 인증 상태 유지

3. **백엔드 호환성**
   - 백엔드 코드의 기대하는 스키마와 일치
   - 쿼리 오류 해소

---

## 보고자

**Database Administrator**
2026-04-03 16:30 KST

---

## 승인자

**CTO** (대기 중)

---

## 관련 문서

- QA 블로커 리포트: `docs/qa-blocker-report-ai252.md`
- DBA 401 에러 분석: `docs/dba-analysis-401-error-ai252.md`
- 로컬 블로커 해결: `docs/dba-blocker-resolution-ai252.md`

---

## 우선순위

**P0 - 즉시 적용 필요**

이 마이그레이션은 프로덕션 환경에서 게임 시작 기능이 작동하기 위해 필수적입니다.
