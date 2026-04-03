# AI-252 블로커 해결 보고서

**날짜:** 2026-04-03
**에이전트:** Database Administrator
**이슈:** AI-252 QA 블로커 - Supabase RLS 권한 거부
**상태:** ✅ 수정 완료, 데이터베이스 적용 대기 중

---

## 발견된 문제

### 1. 스키마 이름 불일치 (P0 - Critical)

**문제:**
- 백엔드 설정: `SUPABASE_SCHEMA=ai_story_game`
- 일부 최신 마이그레이션: `story_game` 스키마 사용
- 결과: 백엔드가 테이블/뷰를 찾지 못함

**에러 로그:**
```
[14:44:18.609] ERROR (495488): storiesListRoute: supabase query failed
    code: "42501"
    message: "permission denied for view stories_safe"
```

### 2. 마이그레이션 타임스탬프 충돌

**문제:**
- `20260403100000-fix-placeholder-presets.sql`
- `20260403100000_phase1a_core_genre_presets.sql`
- 동일 타임스탬프로 마이그레이션 순서 충돌 가능성

---

## 수행한 수정 작업

### 1. 마이그레이션 타임스탬프 충돌 해결
```bash
# fix-placeholder-presets.sql 파일명 변경
20260403100000-fix-placeholder-presets.sql → 20260403100001-fix-placeholder-presets.sql
```

### 2. 스키마 이름 일치화 (4개 파일 수정)

다음 마이그레이션 파일의 스키마 이름을 `story_game` → `ai_story_game`로 수정:

1. ✅ `20260403110000_fix_stories_preset_column.sql`
2. ✅ `20260403010000_create_story_feedback.sql`
3. ✅ `20260403100000_phase1a_core_genre_presets.sql`
4. ✅ `20260403090000_phase1b_story_presets.sql`

### 3. stories_safe 뷰 권한 정의 확인

`20260403110000_fix_stories_preset_column.sql`:
```sql
-- 올바른 스키마와 권한 부여
DROP VIEW IF EXISTS ai_story_game.stories_safe;
CREATE VIEW ai_story_game.stories_safe ...
GRANT SELECT ON ai_story_game.stories_safe TO anon, authenticated;
```

---

## 다음 단계 (풀스택 개발자 필요)

### 🔴 긴급: 마이그레이션 데이터베이스 적용

```bash
# 방법 1: Supabase CLI 사용 (권장)
supabase db push

# 방법 2: 개별 마이그레이션 적용
psql $DATABASE_URL -f supabase/migrations/20260403110000_fix_stories_preset_column.sql
psql $DATABASE_URL -f supabase/migrations/20260403010000_create_story_feedback.sql
psql $DATABASE_URL -f supabase/migrations/20260403100000_phase1a_core_genre_presets.sql
psql $DATABASE_URL -f supabase/migrations/20260403090000_phase1b_story_presets.sql
```

### 2. 백엔드 재시작 (연결 캐시 초기화)

```bash
./dev.sh restart
# 또는
pkill -f "node.*backend"
pnpm --filter backend run dev
```

### 3. 권한 적용 확인

```sql
-- stories_safe 뷰 및 권한 확인
SELECT viewname, viewowner FROM pg_views
WHERE schemaname = 'ai_story_game' AND viewname = 'stories_safe';

-- 권한 확인
SELECT * FROM information_schema.role_table_grants
WHERE table_schema = 'ai_story_game' AND table_name = 'stories_safe';
```

### 4. API 테스트

```bash
# 스토리 목록 조회 테스트
curl http://localhost:3000/api/v1/stories?limit=1

# 예상 결과: 500 에러 대신 스토리 목록 반환
```

---

## 검증 체크리스트

- [ ] 모든 수정된 마이그레이션 파일이 데이터베이스에 적용됨
- [ ] `stories_safe` 뷰가 `ai_story_game` 스키마에 존재
- [ ] `anon`, `authenticated` 롤에 SELECT 권한 부여됨
- [ ] 백엔드 재시작 완료
- [ ] API `/api/v1/stories` 정상 응답 (200 OK)
- [ ] 에디터 페이지에서 스토리 로드 가능
- [ ] 게임 시작 기능 작동

---

## 영향받는 기능

마이그레이션 적용 후 다음 기능이 정상화됨:

1. ✅ 스토리 목록 조회 (GET /api/v1/stories)
2. ✅ 스토리 생성 (POST /api/v1/stories)
3. ✅ 세션 목록 조회 (GET /api/v1/sessions)
4. ✅ 게임 시작 (POST /api/v1/game/start)

---

## 기술 노트

### 스키마 이름 표준

- **올바른 스키마:** `ai_story_game`
- **환경변수:** `SUPABASE_SCHEMA=ai_story_game` (.env 파일)
- **백엔드 설정:** `process.env.SUPABASE_SCHEMA || 'public'` (backend/src/plugins/supabase.ts)

### 향후 마이그레이션 작성 가이드

모든 새로운 마이그레이션은 다음 규칙 준수:

1. 스키마 이름: `ai_story_game` (hardcoded)
2. 타임스탬프 중복 방지: `YYYYMMDDHHmmss` 형식 사용
3. stories_safe 뷰 수정 시 반드시 GRANT 문 포함

---

**보고자:** Database Administrator
**승인자:** CTO (대기 중)
**관련 이슈:** AI-252 (QA 블로커), AI-260 (플레이스홀더 프리셋 수정)
