# AI Story Game - 결함 보고서 (Defect Report)

> **버전:** 1.0
> **작성일:** 2026-04-01
> **작성자:** QA Engineer
> **Phase:** SDLC Phase 6 - System Testing
> **보고 기간:** 2026-04-01

---

## 1. 개요 (Overview)

### 1.1 결함 통계

| 심각도 | 신규 발견 | Phase 4 이관 | Phase 5 이관 | 합계 | 비율 |
|--------|----------|-------------|-------------|------|------|
| **Critical** | 1 | 5 | 0 | **6** | 28% |
| **High** | 0 | 4 | 2 | **6** | 28% |
| **Medium** | 0 | 2 | 2 | **4** | 18% |
| **Low** | 0 | 0 | 1 | **1** | 5% |
| **Info** | 0 | 0 | 1 | **1** | 5% |
| **합계** | **1** | **11** | **4** | **21** | **100%** |

### 1.2 결함 추이 (Phase별)

```
Phase 4 (단위 테스트)    : 11개 (P0: 5, P1: 4, P2: 2)
Phase 5 (통합 테스트)    :  4개 (M: 2, L: 1, I: 1)
Phase 6 (시스템 테스트)   :  1개 (Critical: 1)
─────────────────────────────────────────────────
총계                    : 21개
해결됨                  :  0개 (0%)
진행 중                 :  0개 (0%)
미해결                  : 21개 (100%)
```

### 1.3 심각도 분포

```
🔴 Critical (P0) : 6개  (28%)
🟠 High (P1)     : 6개  (28%)
🟡 Medium (P2)   : 4개  (18%)
🟢 Low (P3)      : 1개  (5%)
⚪ Info          : 1개  (5%)
```

---

## 2. Phase 6 신규 결함 (System Testing)

### 2.1 Critical Severity

#### SYS-BUG-001: E2E 테스트 전체 실패 - page.goto() URL 합성 오류

| 항목 | 내용 |
|------|------|
| **ID** | SYS-BUG-001 |
| **제목** | E2E 테스트 page.goto()에서 "Cannot navigate to invalid URL" 에러 |
| **모듈** | e2e/tests/, e2e/pages/ |
| **심각도** | 🔴 CRITICAL (P0) |
| **우선순위** | CRITICAL |
| **상태** | 🔴 OPEN |
| **발생 일시** | 2026-04-01 |
| **발견자** | QA Engineer |

**재현 단계:**
1. Backend(3000), Frontend(5173) 실행 중인 상태 확인
2. `npx playwright test` 실행
3. 모든 테스트가 `page.goto('/')` 또는 `page.goto('/play')`에서 실패

**예상 동작:**
- baseURL(`http://localhost:5173`) 기반으로 상대 경로 탐색 성공
- HomePage.goto() 내부에서 `this.page.goto('/')` 호출 시 `http://localhost:5173/`로 이동

**실제 동작:**
```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

  at HomePage.goto (/home/paperclip/workspace/ai-story-game2/e2e/pages/home.page.ts:91:21)
```

**증거:**
- 스크린샷: `e2e/test-results/` (전체 테스트 실패)
- 로그: Playwright test output (34개 실패)

**근본 원인 (분석):**

**가능한 원인 1:** Page Object Model에서 baseURL이 제대로 전달되지 않음
- `e2e/fixtures/base.fixture.ts`에서 페이지 객체 생성 시 baseURL 설정 누락

**가능한 원인 2:** playwright.config.ts의 baseURL이 페이지 객체에 반영되지 않음
- `playwright.config.ts`에는 `baseURL: 'http://localhost:5173'` 설정되어 있으나
- `e2e/pages/home.page.ts:91`에서 `page.goto('/')` 호출 시 Playwright가 baseURL을 합성하지 못함

**가능한 원인 3:** global-setup.ts에서 브라우저 컨텍스트가 baseURL 없이 초기화됨
- `e2e/global-setup.ts` 확인 필요

**영향:**
- 모든 E2E 테스트 34개 실패 (100% 실패율)
- 시스템 테스트 자동화 완전 차단
- 회귀 테스트 불가
- CI/CD 파이프라인 품질 게이트 부재

**권장 조치:**

**긴급 (즉시, 30분 이내):**
```typescript
// e2e/pages/home.page.ts 수정 (임시 완화)
async goto() {
  // await this.page.goto('/');  // 기존
  await this.page.goto('http://localhost:5173/');  // 임시 수정
  await this.page.waitForLoadState('networkidle');
}
```

**단기 (1시간 이내):**
1. `e2e/fixtures/base.fixture.ts` 확인하여 baseURL 전달 여부 점검
2. `e2e/global-setup.ts`에서 baseURL 설정 확인
3. playwright.config.ts와 fixture 간 설정 일치성 검토

**중기 (1일 이내):**
1. 환경변수 기반 baseURL 설정 (`.env.test` 파일 활용)
2. `frontend/package.json`에 `test:e2e` 스크립트 추가:
   ```json
   "scripts": {
     "test:e2e": "playwright test"
   }
   ```
3. E2E 테스트 실행 방법 문서화 (`docs/TESTING.md` 또는 `README.md`)

**담당자:** Fullstack Dev 또는 QA Engineer
**예상 수정 시간:** 1-2시간

---

## 3. Phase 5 이관 결함 (Integration Testing)

### 3.1 Medium Severity

#### BUG-001: 프론트엔드 회원가입 양식 제출 미작동

| 항목 | 내용 |
|------|------|
| **ID** | BUG-001 (Phase 5) |
| **제목** | /signup 페이지에서 "회원가입" 버튼 클릭 시 네트워크 요청 미발생 |
| **모듈** | frontend/src/pages/Signup.js |
| **심각도** | 🟡 MEDIUM (P2) |
| **우선순위** | HIGH |
| **상태** | 🔴 OPEN (미해결) |
| **발생 일시** | 2026-04-01 |

**재현 단계:**
1. http://localhost:5173/signup 접속
2. 양식 필드 입력 (이메일, 닉네임, 비밀번호)
3. "회원가입" 버튼 클릭

**예상 동작:**
- POST /api/auth/signup 호출
- 성공 메시지 표시
- /login 페이지로 리다이렉트

**실제 동작:**
- ⚠️ 버튼 클릭 후 네트워크 요청 감지되지 않음
- ⚠️ 페이지 리다이렉트 발생하지 않음
- ⚠️ 성공/실패 메시지 미표시

**가능한 원인:**
1. 클라이언트 측 유효성 검증에서 차단 (그러나 오류 메시지 없음)
2. JavaScript 에러로 인해 핸들러 미작동
3. 버튼 이벤트 리스너 미등록
4. API 엔드포인트 URL 잘못됨

**담당자:** Fullstack Dev
**예상 수정 시간:** 1-2시간

---

#### BUG-002: 관리자 API 접근을 위한 테스트 계정 부재

| 항목 | 내용 |
|------|------|
| **ID** | BUG-002 (Phase 5) |
| **제목** | role="admin"인 사용자가 존재하지 않아 관리자 기능 테스트 불가 |
| **모듈** | Supabase user_profiles 테이블 |
| **심각도** | 🟡 MEDIUM (P2) |
| **우선순위** | MEDIUM |
| **상태** | 🔴 OPEN (미해결) |
| **발생 일시** | 2026-04-01 |

**재현 단계:**
1. Supabase user_profiles 테이블 조회
2. WHERE role = 'admin' 조건 검색

**예상 동작:**
- role="admin"인 행 1개 이상 존재

**실제 동작:**
- ⚠️ 0 rows returned

**권장 조치:**
1. **단기 (즉시):** 수동으로 관리자 계정 생성
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'admin@example.com';
   ```
2. **중기:** 관리자 계정 생성 마이그레이션 작성

**담당자:** Fullstack Dev 또는 DBA
**예상 수정 시간:** 30분 (단기), 2시간 (중기)

---

### 3.2 Low Severity

#### BUG-003: Pending 사용자 로그인 허용에 따른 UX 혼선

| 항목 | 내용 |
|------|------|
| **ID** | BUG-003 (Phase 5) |
| **제목** | role="pending" 사용자가 로그인 API에서 토큰을 받지만 보호된 리소스 접근 시 차단됨 |
| **모듈** | backend/src/routes/auth.ts |
| **심각도** | 🟢 LOW (P3) |
| **우선순위** | LOW |
| **상태** | 🔴 OPEN (미해결) |
| **발생 일시** | 2026-04-01 |

**재현 단계:**
1. POST /api/auth/signup으로 role="pending" 사용자 생성
2. POST /api/auth/login으로 로그인 시도
3. JWT 토큰 획득
4. GET /api/me 호출

**예상 동작:**
- 로그인 단계에서 role="pending" 사용자 차단
- "관리자 승인 대기 중" 메시지 표시

**실제 동작:**
- ⚠️ 로그인 API는 토큰 반환 (성공한 것처럼 보임)
- ✅ 단, 보호된 리소스 접근 시 401 반환 (보안적으로는 안전)

**보안 평가:**
- ✅ 위험도 낮음: 보호된 리소스는 올바르게 차단됨
- ⚠️ UX 문제: 사용자가 혼선 느낌

**담당자:** Fullstack Dev
**예상 수정 시간:** 1시간

---

### 3.3 Info

#### INFO-001: Playwright E2E 테스트 실행 방법 미문서화

| 항목 | 내용 |
|------|------|
| **ID** | INFO-001 (Phase 5) |
| **제목** | `package.json`에 테스트 스크립트 미정의 |
| **모듈** | frontend/package.json, README.md |
| **심각도** | ⚪ INFO (P4) |
| **우선순위** | LOW |
| **상태** | 🔴 OPEN (미해결) |
| **발생 일시** | 2026-04-01 |

**권장 조치:**
1. `frontend/package.json`에 `"test:e2e": "playwright test"` 추가
2. `README.md` 또는 `docs/TESTING.md`에 실행 방법 문서화

**담당자:** Fullstack Dev 또는 DevOps Engineer
**예상 수정 시간:** 30분

---

## 4. Phase 4 이관 결함 (Unit Testing)

**참고:** Phase 4 결함 11개는 전부 미해결 상태로 이관되었습니다. 상세 내용은 [Phase 4 결함 보고서](../phase4-unit-test/03-Defect-Report.md)를 참조하십시오.

### 4.1 Critical Severity (5개)

| ID | 제목 | 상태 | 비고 |
|----|------|------|------|
| DEF-001 | 단위 테스트 미구현 | 🔴 OPEN | 전체 모듈 테스트 부재 |
| DEF-002 | 테스트 프레임워크 미설치 | 🔴 OPEN | Vitest 미설치 |
| DEF-003 | 테스트 스크립트 미정의 | 🔴 OPEN | package.json에 스크립트 없음 |
| DEF-004 | 코드 커버리지 도구 미설치 | 🔴 OPEN | @vitest/coverage-v8 미설치 |
| DEF-005 | 핵심 서비스 모듈 테스트 부재 | 🔴 OPEN | crypto.ts 테스트 없음 |

### 4.2 High Severity (4개)

| ID | 제목 | 상태 | 비고 |
|----|------|------|------|
| DEF-006 | CI/CD 파이프라인에 테스트 단계 없음 | 🔴 OPEN | GitHub Actions 미설정 |
| DEF-007 | Mock/Stub 라이브러리 미준비 | 🔴 OPEN | Supabase Mock 없음 |
| DEF-008 | E2E 테스트와 단위 테스트 간극 | 🔴 OPEN | 테스트 피라미드 불균형 |
| DEF-009 | 테스트 문서 부재 | 🔴 OPEN | TESTING.md 미작성 |

### 4.3 Medium Severity (2개)

| ID | 제목 | 상태 | 비고 |
|----|------|------|------|
| DEF-010 | 유틸리티 함수 테스트 부재 | 🔴 OPEN | frontend/src/lib/ |
| DEF-011 | 커스텀 훅 테스트 어려움 | 🔴 OPEN | @testing-library/react 미설치 |

---

## 5. 결함 우선순위 매트릭스

### 5.1 전체 결함 우선순위

| 우선순위 | 결함 ID | 제목 | 심각도 | 담당자 | 예상 완료일 |
|----------|---------|------|--------|--------|-----------|
| 🔴 P1 | SYS-BUG-001 | E2E 테스트 page.goto() 실패 | Critical | Fullstack Dev | 2026-04-02 |
| 🔴 P1 | DEF-005 | crypto.ts 단위 테스트 부재 | Critical | Fullstack Dev | 2026-04-05 |
| 🔴 P1 | DEF-001 | 단위 테스트 미구현 | Critical | Fullstack Dev | 2026-04-15 |
| 🟠 P2 | BUG-001 | 회원가입 양식 제출 미작동 | Medium | Fullstack Dev | 2026-04-02 |
| 🟠 P2 | BUG-002 | 관리자 테스트 계정 부재 | Medium | Fullstack Dev | 2026-04-02 |
| 🟠 P2 | DEF-002 | 테스트 프레임워크 미설치 | Critical | Fullstack Dev | 2026-04-02 |
| 🟠 P2 | DEF-003 | 테스트 스크립트 미정의 | Critical | Fullstack Dev | 2026-04-02 |
| 🟡 P3 | BUG-003 | Pending 사용자 로그인 UX | Low | Fullstack Dev | 2026-04-08 |
| 🟡 P3 | DEF-010 | 유틸리티 함수 테스트 부재 | Medium | Fullstack Dev | 2026-04-08 |
| ⚪ P4 | INFO-001 | E2E 테스트 실행 방법 미문서화 | Info | Fullstack Dev | 2026-04-05 |

### 5.2 우선순위 정의

| 우선순위 | 정의 | 해결 기한 |
|----------|------|----------|
| **P1 (Critical)** | 즉시 조치 필요. 시스템 차단 버그. | 24시간 이내 |
| **P2 (High)** | 조기 조치 필요. 주요 기능 영향. | 1주 이내 |
| **P3 (Medium)** | 계획적 조치. 일반 기능 영향. | 1개월 이내 |
| **P4 (Low)** | 편의 개선. 문서화. | 여유 있게 |

---

## 6. 수정 추적 (Fix Tracking)

### 6.1 수정 현황

| 결함 ID | 상태 | 담당자 | 예상 완료일 | 실제 완료일 |
|---------|------|--------|-----------|-----------|
| SYS-BUG-001 | 🔴 OPEN | - | 2026-04-02 | - |
| BUG-001 | 🔴 OPEN | - | 2026-04-02 | - |
| BUG-002 | 🔴 OPEN | - | 2026-04-02 | - |
| BUG-003 | 🔴 OPEN | - | 2026-04-08 | - |
| INFO-001 | 🔴 OPEN | - | 2026-04-05 | - |
| DEF-001 ~ DEF-011 | 🔴 OPEN | - | 2026-04-15 | - |

### 6.2 회귀 테스트 체크리스트

수정 완료 후 다음 테스트 수행:

- [ ] SYS-BUG-001: E2E 테스트 34개 전체 통과 확인
- [ ] BUG-001: 회원가입 양식 정상 제출, /login으로 리다이렉트
- [ ] BUG-002: role="admin" 계정으로 로그인 및 /admin 접근
- [ ] BUG-003: Pending 사용자 로그인 시 명확한 메시지
- [ ] INFO-001: `npm run test:e2e` 실행 가능
- [ ] DEF-001 ~ DEF-011: Phase 4 단위 테스트 11개 결함 해결

---

## 7. 통계 및 추이 (Trends)

### 7.1 결함 발견 추이

```
Phase       | Critical | High | Medium | Low | Info | 합계
------------|----------|------|--------|-----|------|-----
Phase 4     |    5     |  4   |    2   |  0  |   0  |  11
Phase 5     |    0     |  0   |    2   |  1  |   1  |   4
Phase 6     |    1     |  0   |    0   |  0  |   0  |   1
합계        |    6     |  4   |    4   |  1  |   1  |  21
```

### 7.2 결함 유형별 분포

```
🟦 백엔드 (Backend)           : 2건  (10%)
🟩 프론트엔드 (Frontend)       : 3건  (14%)
🟨 테스트 인프라 (Test Infra)  : 13건 (62%)
🟧 문서 (Documentation)        : 1건  (5%)
🟦 DevOps (CI/CD)              : 2건  (10%)
```

### 7.3 모듈별 결함 밀도

| 모듈 | 결함 수 | 테스트 항목 수 | 밀도 (결함/테스트) |
|------|---------|--------------|-------------------|
| **테스트 인프라** | 13 | 34 | 38% |
| **인증 (Auth)** | 2 | 17 | 12% |
| **프론트엔드 UI** | 2 | 23 | 9% |
| **관리자 (Admin)** | 1 | 11 | 9% |
| **DevOps** | 2 | 4 | 50% |

---

## 8. 배포 영향 평가 (Deployment Impact Assessment)

### 8.1 현재 상태로 배포 시 위험도

**전체 위험도:** 🔴 **CRITICAL - 배포 불가**

**주요 리스크:**
1. **E2E 테스트 전체 실패** (SYS-BUG-001)
   - 영향: 어떤 기능도 정상 동작 확인 불가
   - 완화: 없음 (테스트 인프라 전체 차단)

2. **단위 테스트 전체 부재** (DEF-001 ~ DEF-011)
   - 영향: 코드 변경 시 회귀 버그 탐지 불가
   - 완화: 수동 테스트로만 검증 (비효율)

3. **신규 사용자 가입 불가** (BUG-001)
   - 영향: 신규 유저 유입 차단
   - 완화: 기존 사용자는 정상 작동

4. **관리자 기능 접근 불가** (BUG-002)
   - 영향: 시스템 모니터링 및 관리 불가
   - 완화: Supabase Dashboard에서 직접 DB 접근

### 8.2 배포 권장 사항

**옵션 A: 배포 지연 (강력 권장)**
- P1 결함 수정까지 대기
- 예상 지연 시간: 2-3일
- 이유: 모든 기능이 테스트 불가 상태

**옵션 B: 제한적 배포 (비권장)**
- 신규 가입 기능 비활성화 상태로 배포
- 공지: "신규 가입은 곧 재개됩니다"
- 관리자는 Supabase Dashboard 직접 사용
- 위험도: 여전히 높음 (회귀 테스트 불가)

**옵션 C: 정시 배포 (강력 비권장)**
- 현재 상태 그대로 배포
- 핫픽스로 결함 수정
- 위험도: 매우 높음 (프로덕션 버그 발생 시 탐지 불가)

**권장:** 옵션 A (배포 지연) → 품질 우선

---

## 9. 다음 단계 (Next Steps)

### 9.1 긴급 (1일 이내)

| 순위 | 작업 | 담당자 | 예상 시간 |
|------|------|--------|----------|
| 1 | SYS-BUG-001 해결: page.goto() baseURL 설정 수정 | Fullstack Dev | 1-2시간 |
| 2 | BUG-001 해결: 회원가입 양식 제출 핸들러 수정 | Fullstack Dev | 1-2시간 |
| 3 | BUG-002 해결: 관리자 계정 생성 (SQL) | Fullstack Dev | 30분 |

### 9.2 단기 (1주 이내)

| 순위 | 작업 | 담당자 | 예상 시간 |
|------|------|--------|----------|
| 1 | Phase 4 결함 해결: 테스트 프레임워크 설치 | Fullstack Dev | 2시간 |
| 2 | INFO-001 해결: E2E 테스트 실행 방법 문서화 | Fullstack Dev | 30분 |
| 3 | E2E 테스트 재실행 및 결과 확인 | QA Engineer | 1시간 |
| 4 | BUG-003 해결: Pending 사용자 로그인 명확한 메시지 | Fullstack Dev | 1시간 |

### 9.3 중기 (1개월 이내)

| 순위 | 작업 | 담당자 | 예상 시간 |
|------|------|--------|----------|
| 1 | 단위 테스트 구현 (전체 모듈) | Fullstack Dev | 24시간 |
| 2 | CI/CD 파이프라인에 테스트 통합 | DevOps Engineer | 6시간 |
| 3 | 성능 테스트 수행 (SSE, 부하) | QA Engineer | 8시간 |
| 4 | 보안 테스트 수행 (RLS, API 키 암호화) | QA Engineer | 4시간 |

---

## 10. 결론 (Conclusion)

### 10.1 요약

AI Story Game 프로젝트의 시스템 테스트 결과:

- **총 결함:** 21개 (Phase 4: 11개, Phase 5: 4개, Phase 6: 1개)
- **주요 문제:** 테스트 인프라 전체 실패로 모든 기능 검증 차단
- **심각도:** 🔴 높음 (Critical 결함 6개, 28%)

### 10.2 품질 목표 달성 현황

| 항목 | 목표 | 현재 | 달성 여부 |
|------|------|------|----------|
| 단위 테스트 커버리지 | 70% | 0% | ❌ |
| E2E 테스트 통과율 | 100% | 0% | ❌ |
| API 응답 시간 (p95) | < 500ms | 55ms | ✅ |
| 결함 해결률 | 100% | 0% | ❌ |

### 10.3 최종 권장 사항

**배포 결정:** 🔴 **배포 지연 (옵션 A)**

**이유:**
1. E2E 테스트 인프라 버그로 모든 기능 검증 불가
2. 단위/통합 테스트 부재로 회귀 위험 높음
3. 신규 사용자 가입 기능 동작하지 않음

**재개 기준:**
- SYS-BUG-001 해결 및 E2E 테스트 34개 전체 통과
- BUG-001, BUG-002 해결 및 검증
- 최소 핵심 기능 10개 테스트 통과

---

## 11. 관련 문서 (Related Documents)

- [01-System-Test-Cases.md](./01-System-Test-Cases.md) — 시스템 테스트 케이스
- [02-System-Test-Results.md](./02-System-Test-Results.md) — 시스템 테스트 결과
- [03-Performance-Test-Results.md](./03-Performance-Test-Results.md) — 성능 테스트 결과
- [Phase 5 결함 보고서](../phase5-integration-test/03-Defect-Report.md) — 통합 테스트 결함
- [Phase 4 결함 보고서](../phase4-unit-test/03-Defect-Report.md) — 단위 테스트 결함

---

## 12. 서명 (Sign-off)

**작성자:** QA Engineer (Agent f357226d-9584-4675-aa21-1127ac275f18)

**검토자:** [ ] CTO [ ] Fullstack Dev

**승인자:** [ ] CEO

**보고서 완료일:** 2026-04-01

**다음 리뷰 예정일:** [P1 결함(2개) 해결 후]

---

**문서 버전:** 1.0
**최종 수정:** 2026-04-01
