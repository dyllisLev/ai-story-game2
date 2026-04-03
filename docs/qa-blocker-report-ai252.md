# QA Blocker Report - AI-252

**날짜:** 2026-04-03
**태스크:** AI-252 - Admin UI를 통한 9장르 검증 테스트
**에이전트:** QA Engineer
**상태:** 🔴 BLOCKED - 테스트 환경 차단

---

## 발견된 블로커

### 블로커 #1: Supabase RLS 권한 거부

**심각도:** P0 (테스트 진행 불가)

**에러 코드:** PostgreSQL 42501
**에러 메시지:** `permission denied for view stories_safe`

**영향받는 기능:**
1. 스토리 목록 조회 (GET /api/v1/stories) → 500 에러
2. 스토리 생성 (POST /api/v1/stories) → 500 에러
3. 세션 목록 조회 (GET /api/v1/sessions) → 500 에러

**백엔드 로그:**
```
[11:50:15.993] ERROR (495488): storiesListRoute: supabase query failed
    code: "42501"
    details: null
    hint: null
    message: "permission denied for view stories_safe"
```

**재현 단계:**
1. 로컬 개발 환경 시작 (`./dev.sh start`)
2. 프론트엔드 접속 (http://localhost:5173)
3. 홈페이지 또는 에디터 페이지 접속
4. API 요청 자동 발생
5. 500 Internal Server Error

**예상 동작:**
- 스토리 목록이 정상적으로 표시됨
- 새 스토리를 생성할 수 있음
- 게임을 시작할 수 있음

**실제 동작:**
- 스토리 목록이 "로딩 중" 상태로 멈춤
- 에디터에서 저장 불가
- 게임 시작 불가

---

## 원인 분석

### 가능한 원인:
1. **RLS 정책 누락:** `stories_safe` 뷰에 대한 RLS 정책이 생성되지 않음
2. **마이그레이션 미실행:** stories_safe_view 관련 마이그레이션 실행되지 않음
3. **권한 부족:** 인증된 사용자 또는 익명 사용자에게 뷰 접근 권한 부여 안됨

### 관련 코드:
- 백엔드 라우트: `backend/src/routes/stories.ts` (storiesListRoute)
- 뷰 정의: Supabase 마이그레이션 스크립트
- RLS 정책: Supabase 마이그레이션 스크립트

---

## 해결 방안

### 즉시 조치 필요 (풀스택 개발자):

1. **마이그레이션 확인:**
   ```bash
   # Supabase 마이그레이션 상태 확인
   supabase migration list

   # stories_safe 뷰 관련 마이그레이션 확인
   supabase db remote changes
   ```

2. **RLS 정책 확인:**
   ```sql
   -- stories_safe 뷰 확인
   SELECT * FROM pg_views WHERE viewname = 'stories_safe';

   -- RLS 정책 확인
   SELECT * FROM pg_policies WHERE tablename = 'stories_safe';
   ```

3. **권한 부여:**
   ```sql
   -- 필요한 경우 권한 부여
   GRANT SELECT ON stories_safe TO authenticated;
   GRANT SELECT ON stories_safe TO anon;
   ```

4. **마이그레이션 재실행:**
   ```bash
   supabase db push
   ```

---

## 테스트 영향

### 현재 테스트 불가 상태:

| 테스트 항목 | 상태 | 비고 |
|------------|------|------|
| 판타지 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 현대 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 무협 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 로맨스 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 공포 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| SF 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 미스터리 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 역사 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |
| 심리 장르 테스트 | ❌ 불가 | 스토리 생성/로드 불가 |

### AI-252 진행률:
- **테스트 계획:** ✅ 완료
- **테스트 시나리오 설정:** ✅ 완료 (27개 시나리오 정의)
- **테스트 실행:** ❌ BLOCKED (환경 문제)
- **품질 평가:** ⏳ 대기 중
- **리포트 작성:** ⏳ 대기 중

---

## 조치 요청

**풀스택 개발자 (Fullstack Dev)에게 조치 요청:**

1. 🔴 **긴급:** Supabase RLS 권한 문제 해결
2. 🔴 **긴급:** 마이그레이션 상태 확인 및 재실행
3. 🟡 **추천:** 테스트 환경 자동화 스크립트 개선

**QA Engineer 다음 단계:**
- 블로커 해제 대기 중
- 해제 즉시 테스트 재개 예정
- 예상 소요 시간: 2-3시간 (9장르 × 10-15턴)

---

## 첨부 자료

### 백엔드 로그 발췌:
```
[11:50:15.993] ERROR (495488): storiesListRoute: supabase query failed
    code: "42501"
    message: "permission denied for view stories_safe"
```

### 네트워크 요청 기록:
```
GET http://localhost:5173/api/v1/stories?featured=true&limit=4&sort=popular → 500
GET http://localhost:5173/api/v1/stories?sort=latest&page=1&limit=20 → 500
POST http://localhost:5173/api/v1/stories → 500
GET http://localhost:5173/api/v1/sessions?limit=5&sort=last_played → 500
```

---

**보고자:** QA Engineer
**승인자:** CTO (대기 중)

---

## 업데이트 #1: 프로덕션 세션 만료 문제 (2026-04-03 15:01)

### 블로커 #2: 프로덕션 세션 만료 (현재 차단 요소)

**심각도:** P0 (테스트 진행 불가)
**환경:** 프로덕션 환경 (https://aistorygame.nuc.hmini.me)
**상태:** 🔴 해제 필요

### 에러 정보:

**에러 코드:** HTTP 401 Unauthorized
**엔드포인트:** `POST /api/v1/game/test-prompt`

### 발생 현상:

1. **로그인 성공:**
   - 자격증명: `story-writer@story-game.ai` / `TempPassword123!`
   - `POST /api/v1/auth/login` → 200 OK
   - 에디터 접근 성공

2. **시나리오 설정 성공:**
   - 판타지 F1-Basic 시나리오 설정
   - 완성도: 60%
   - 스토리 생성: `POST /api/v1/stories` → 201 Created
   - 스토리 업데이트: `PUT /api/v1/stories/{id}` → 200 OK

3. **게임 시작 실패:**
   - API 키 입력 성공
   - "▶ 게임 시작" 버튼 클릭
   - `POST /api/v1/game/test-prompt` → **401 Unauthorized**

### 원인 분석:

**가능한 원인:**
1. 쿠키 설정 문제 (httpOnly, SameSite, Secure 속성)
2. 세션 만료 시간이 너무 짧음
3. JWT 토큰 리프레시 로직 실패
4. 프론트엔드에서 인증 토큰 저장/전송 문제

### 네트워크 요청 기록:

```
POST /api/v1/stories → 201 (성공)
PUT /api/v1/stories/0654fae1-dfea-482c-a602-bff08bf6337e → 200 (성공)
GET https://generativelanguage.googleapis.com/v1beta/models → 200 (성공)
POST /api/v1/game/test-prompt → 401 (인증 실패)
```

### 해결 방안:

**@CTO 조치 필요:**

1. **프로덕션 쿠키 설정 확인:**
   - `httpOnly` 속성
   - `SameSite` 속성
   - `Secure` 속성 (HTTPS)
   - 도메인/경로 설정

2. **세션 만료 시간 확인:**
   - 현재 만료 시간 설정
   - 적절한 만료 시간으로 조정 (최소 1시간 권장)

3. **JWT 토큰 리프레시 확인:**
   - 액세스 토큰 만료 전 리프레시
   - 리프레시 토큰 로직 확인

### 테스트 준비 상태:

- ✅ 로그인 가능
- ✅ 에디터 접근 가능
- ✅ 시나리오 설정 가능 (판타지 F1-Basic, 완성도 60%)
- ✅ API 키 입력 가능
- ❌ 게임 시작 불가 (401 에러)
