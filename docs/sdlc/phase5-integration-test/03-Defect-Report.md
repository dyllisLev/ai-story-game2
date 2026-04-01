# AI Story Game - 결함 보고서 (Defect Report)

> **버전:** 1.0
> **작성일:** 2026-04-01
> **작성자:** QA Engineer
> **Phase:** SDLC Phase 5 - Integration Testing
> **보고 기간:** 2026-04-01

---

## 1. 개요 (Overview)

### 1.1 결함 통계

| 심각도 | 건수 | 비고 |
|--------|------|------|
| **Critical** | 0 | 시스템 중단 없음 |
| **High** | 0 | 주요 기능 동작 |
| **Medium** | 2 | 기능 제약 사항 |
| **Low** | 1 | 개선 제안 |
| **Info** | 1 | 정보 제공 |
| **합계** | 4 | |

### 1.2 결함 분포

| 영역 | 건수 |
|------|------|
| **인증/보안** | 1 |
| **프론트엔드** | 1 |
| **테스트 인프라** | 1 |
| **문서/설계** | 1 |

---

## 2. 결함 상세 (Defect Details)

### 2.1 Medium Severity

#### BUG-001: 프론트엔드 회원가입 양식 제품 미확인

**ID:** BUG-001
**심각도:** Medium
**우선순위:** High
**상태:** OPEN
**발생 일시:** 2026-04-01

**영향 범위:**
- 모듈: 프론트엔드 (/signup)
- 유스케이스: UC-002 (회원가입)
- 영향 사용자: 신규 가입 희망자

**재현 단계:**
1. http://localhost:5173/signup 접속
2. 양식 필드 입력:
   - 이메일: `integration.test@example.com`
   - 닉네임: `Integration Test User`
   - 비밀번호: `Test1234!`
   - 비밀번호 확인: `Test1234!`
3. "회원가입" 버튼 클릭

**예상 동작:**
- 백엔드 API 호출: `POST /api/auth/signup`
- 성공 메시지 표시
- `/login` 페이지로 리다이렉트

**실제 동작:**
- ⚠️ 버튼 클릭 후 네트워크 요청 감지되지 않음
- ⚠️ 페이지 리다이렉트 발생하지 않음
- ⚠️ 성공/실패 메시지 미표시
- ⚠️ 양식 필드 값 유지됨

**증거:**
- 스크린샷: `/tmp/signup_before.png`, `/tmp/after_signup.png`
- HAR 파일: `/tmp/signup.har` (0 requests)
- agent-browser 네트워크 추적: 요청 없음

**가능한 원인:**
1. 클라이언트 측 유효성 검증에서 차단 (그러나 오류 메시지 없음)
2. JavaScript 에러로 인해 핸들러 미작동
3. 버튼 이벤트 리스너 미등록
4. API 엔드포인트 URL 잘못됨

**권장 조치:**
1. 브라우저 개발자 도구 Console 로그 확인
2. React DevTools로 컴포넌트 상태 확인
3. Network 탭에서 실제로 요청 전송되는지 확인
4. `frontend/src/pages/Signup.js` (또는 .tsx) 코드 검토

**담당자:** Fullstack Dev 또는 Frontend Dev
**예상 수정 시간:** 1-2시간

---

#### BUG-002: 관리자 API 접근을 위한 테스트 계정 부재

**ID:** BUG-002
**심각도:** Medium
**우선순위:** Medium
**상태:** OPEN
**발생 일시:** 2026-04-01

**영향 범위:**
- 모듈: 백엔드 (/api/admin/*)
- 유스케이스: UC-012 ~ UC-015 (관리자 기능)
- 영향 사용자: QA Engineer, 관리자

**재현 단계:**
1. `/api/admin/dashboard` 엔드포인트 호출
2. Basic Auth 인증: `admin:admin123`
3. JWT Token 없이 호출

**예상 동작:**
- 401 Unauthorized 또는 403 Forbidden

**실제 동작:**
- ✅ 401 Unauthorized 반환 (정상)
- ⚠️ 그러나 **역할="admin"인 사용자가 존재하지 않아** 정상적인 접근 테스트 불가

**근본 원인:**
- Supabase `user_profiles` 테이블에 role="admin"인 행 부재
- 관리자 계정 생성 프로세스 미정의

**권장 조치:**
1. **단기 (즉시):** 수동으로 관리자 계정 생성
   ```sql
   -- Supabase SQL Editor 실행
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'admin@example.com';
   ```
2. **중기:** 관리자 계정 생성 마이그레이션 작성
   ```sql
   -- supabase/migrations/YYYYMMDDHHMMSS_create_admin_user.sql
   INSERT INTO user_profiles (id, email, nickname, role)
   VALUES ('uuid-here', 'admin@storygame.com', 'Admin', 'admin');
   ```
3. **장기:** 관리자 계정 관리 기능 구현

**담당자:** Fullstack Dev 또는 DBA
**예상 수정 시간:** 30분 (단기), 2시간 (중기)

---

### 2.2 Low Severity

#### BUG-003: Pending 사용자 로그인 허용에 따른 UX 혼선

**ID:** BUG-003
**심각도:** Low
**우선순위:** Low
**상태:** OPEN
**발생 일시:** 2026-04-01

**영향 범위:**
- 모듈: 인증 (/api/auth/login)
- 유스케이스: UC-003 (로그인)
- 영향 사용자: 승인 대기 중인 사용자

**재현 단계:**
1. `POST /api/auth/signup`으로 사용자 생성 (role="pending")
2. `POST /api/auth/login`으로 로그인 시도
3. JWT 토큰 획득
4. `GET /api/me` 호출

**예상 동작:**
- 로그인 단계에서 role="pending" 사용자 차단
- "관리자 승인 대기 중" 메시지 표시

**실제 동작:**
- ⚠️ 로그인 API는 토큰 반환 (성공한 것처럼 보임)
- ✅ 단, 보호된 리소스 접근 시 401 반환 (보안적으로는 안전)
- ⚠️ 사용자는 혼선: "로그인은 되는데 왜 아무것도 안 되지?"

**보안 평가:**
- ✅ **위험도 낮음:** 보호된 리소스는 올바르게 차단됨
- ✅ **구조적 안전:** `requireAdmin()` 등 인가 미들웨어 정상 작동
- ⚠️ **UX 문제:** 사용자 경험 관점에서 개선 필요

**권장 조치:**
1. **옵션 A (로그인 차단):**
   - `backend/src/routes/auth.ts` 로그인 핸들러에서 role 확인
   - role="pending"이면 403 반환, 명시적 메시지 전달

2. **옵션 B (클라이언트 안내):**
   - 로그인 성공 후 사용자 역할 확인
   - role="pending"이면 "승인 대기 중" 페이지 표시

**담당자:** Fullstack Dev
**예상 수정 시간:** 1시간

---

### 2.3 Info

#### INFO-001: Playwright E2E 테스트 실행 방법 미문서화

**ID:** INFO-001
**심각도:** Info
**우선순위:** Low
**상태:** OPEN
**발생 일시:** 2026-04-01

**설명:**
- `e2e/tests/` 디렉토리에 테스트 파일 존재
- 그러나 `package.json` 스크립트 미확인
- 테스트 실행 명령어 불명확

**확인 필요 사항:**
1. `frontend/package.json`에 테스트 스크립트 존재?
2. `npx playwright test`로 실행 가능?
3. 테스트 실행 시 백엔드/프론트엔드 서버 시작 필요?

**권장 조치:**
1. `README.md` 또는 `docs/testing.md`에 E2E 테스트 실행 방법 문서화
2. `package.json` scripts 섹션에 `"test:e2e"` 명령어 추가
3. CI/CD 파이프라인에 E2E 테스트 통합

**담당자:** Fullstack Dev 또는 DevOps Engineer
**예상 수정 시간:** 30분

---

## 3. 결함 우선순위 매트릭스

| 결함 ID | 심각도 | 영향도 | 긴급도 | 조치 우선순위 |
|---------|--------|--------|--------|--------------|
| BUG-001 | Medium | HIGH | HIGH | 🔴 P1 |
| BUG-002 | Medium | MEDIUM | MEDIUM | 🟡 P2 |
| BUG-003 | Low | LOW | LOW | 🟢 P3 |
| INFO-001 | Info | LOW | LOW | ⚪ P4 |

**우선순위 정의:**
- **P1 (Critical):** 즉시 조치 필요 (24시간 이내)
- **P2 (High):** 조기 조치 필요 (1주 이내)
- **P3 (Medium):** 계획적 조치 (1개월 이내)
- **P4 (Low):** 편의 개선 (여유 있게)

---

## 4. 수정 추적 (Fix Tracking)

### 4.1 수정 현황

| 결함 ID | 상태 | 담당자 | 예상 완료일 | 실제 완료일 |
|---------|------|--------|-----------|-----------|
| BUG-001 | OPEN | - | - | - |
| BUG-002 | OPEN | - | - | - |
| BUG-003 | OPEN | - | - | - |
| INFO-001 | OPEN | - | - | - |

### 4.2 회귀 테스트 체크리스트

수정 완료 후 다음 테스트 수행:

- [ ] 회원가입 양식 정상 제품
- [ ] 회원가입 성공 후 로그인 페이지 리다이렉트
- [ ] 관리자 계정으로 로그인 및 대시보드 접근
- [ ] Pending 사용자 로그인 시 명확한 메시지
- [ ] E2E 테스트 실행 및 전체 통과

---

## 5. 통계 및 추이 (Trends)

### 5.1 결함 발견 추이

```
주차 | Critical | High | Medium | Low | Info | 합계
-----|----------|------|--------|-----|------|-----
W1   |    0     |  0   |    2   |  1  |   1  |   4
```

### 5.2 결함 유형별 분포

```
🟦 백엔드 (Backend)     : 1건 (25%)
🟩 프론트엔드 (Frontend) : 1건 (25%)
🟨 테스트 (Test)         : 1건 (25%)
🟧 문서 (Documentation) : 1건 (25%)
```

### 5.3 모듈별 결함 밀도

| 모듈 | 결함 수 | 테스트 항목 수 | 밀도 (결함/테스트) |
|------|---------|--------------|-------------------|
| 인증 (Auth) | 1 | 5 | 20% |
| 프론트엔드 UI | 1 | 3 | 33% |
| 관리자 (Admin) | 1 | 4 | 25% |
| 인프라 (Infra) | 1 | 2 | 50% |

---

## 6. 배포 영향 평가 (Deployment Impact Assessment)

### 6.1 현재 상태로 배포 시 위험도

**전체 위험도:** 🟡 MEDIUM

**주요 리스크:**
1. **신규 사용자 가입 불가** (BUG-001)
   - 영향: 신규 유저 유입 차단
   - 완화: 기존 사용자는 정상 작동

2. **관리자 기능 접근 불가** (BUG-002)
   - 영향: 시스템 모니터링 및 관리 불가
   - 완화: Supabase Dashboard에서 직접 DB 접근 가능

### 6.2 배포 권장 사항

**옵션 A: 배포 지연 (권장)**
- P1 결함 수정까지 대기
- 예상 지연 시간: 1-2일

**옵션 B: 제한적 배포**
- 신규 가입 기능 비활성화 상태로 배포
- 공지: "신규 가입은 곧 재개됩니다"
- 관리자는 Supabase Dashboard 직접 사용

**옵션 C: 정시 배포**
- 현재 상태 그대로 배포
- 핫픽스로 결함 수정

**권장:** 옵션 A (배포 지연) → 품질 우선

---

## 7. 부록 (Appendix)

### 7.1 결함 보고 템플릿

신규 결함 발견 시 다음 양식 사용:

```markdown
#### BUG-XXX: [제목]

**ID:** BUG-XXX
**심각도:** [Critical/High/Medium/Low]
**우선순위:** [High/Medium/Low]
**상태:** [OPEN/IN_PROGRESS/RESOLVED]
**발생 일시:** YYYY-MM-DD

**영향 범위:**
- 모듈: [모듈명]
- 유스케이스: [UC-XXX]
- 영향 사용자: [대상]

**재현 단계:**
1.
2.
3.

**예상 동작:**

**실제 동작:**

**증거:**
- 스크린샷:
- 로그:

**권장 조치:**

**담당자:**
**예상 수정 시간:**
```

### 7.2 관련 문서

- [01-Integration-Test-Cases.md](./01-Integration-Test-Cases.md) - 통합 테스트 케이스
- [02-Integration-Test-Results.md](./02-Integration-Test-Results.md) - 통합 테스트 결과
- [Phase 4 단위 테스트 결함 보고서](../phase4-unit-test/03-Defect-Report.md)

---

## 8. 서명 (Sign-off)

**작성자:** QA Engineer (Agent f357226d-9584-4675-aa21-1127ac275f18)

**검토자:** [ ] CTO [ ] Fullstack Dev

**승인자:** [ ] CEO

**보고서 완료일:** 2026-04-01

**다음 리뷰 예정일:** [모든 P1, P2 결함 수정 완료 후]

---

**문서 버전:** 1.0
**최종 수정:** 2026-04-01
