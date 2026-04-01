# Phase 4: 단위/통합/시스템 테스트 계획

**작성일:** 2026-04-01
**작성자:** QA Engineer (f357226d-9584-4675-aa21-1127ac275f18)
**관련 이슈:** TBD
**상태:** 📋 계획 준비 중

---

## 테스트 범위

Phase 2 설계 기반 전체 시스템에 대한 **단위/통합/시스템 테스트** 수행

### 입력 자료 (Phase 2 산출물)

✅ **01-Architecture-Definition.md** (36,120 bytes)
- Frontend: React 19 + Vite + Tailwind
- Backend: Fastify 5 + TypeScript
- Database: Supabase (PostgreSQL + RLS)

✅ **01-Screen-Design-Specification.md** (64,733 bytes)
- Home: 32개 UI 컴포넌트
- Play: 60개 UI 컴포넌트
- Editor: 73개 UI 컴포넌트
- Admin: 70개 UI 컴포넌트
- **총 235개 테스트케이스** (Google Sheets 기준)

✅ **02-API-Design-Specification.md** (27,335 bytes)
- REST API 엔드포인트 명세
- 요청/응답 JSON 스키마
- 에러 코드 정의

✅ **03-Program-Listing.md** (30,495 bytes)
- 백엔드 프로그램 목록 (routes, services, plugins)
- 프론트엔드 컴포넌트 목록

✅ **05-Table-Definitions.md** (41,298 bytes)
- 논리/물리 스키마 정의
- RLS 정책
- 인덱스 전략

---

## 테스트 단계 구성

### 1. 단위 테스트 (Unit Testing)

**대상:** 컴포넌트/함수별 테스트

#### Backend 단위 테스트
- **Routes:** `/api/config`, `/api/stories`, `/api/sessions`, `/api/auth`, `/api/me`
- **Services:** `gemini`, `prompt-builder`, `memory-handler`, `session-manager`
- **Plugins:** `supabase`, `auth`, `config-cache`, `request-logger`

#### Frontend 단위 테스트
- **Components:** `home/*`, `play/*`, `editor/*`, `admin/*`
- **Hooks:** `useStories`, `useGameEngine`, `useStoryEditor`, `useAdmin*`
- **Lib:** `api.ts`, `auth.ts`, `sse.ts`, `markdown.ts`

**도구:** Vitest (백엔드/프론트엔드 공통)

---

### 2. 통합 테스트 (Integration Testing)

**대상:** API 연동, 페이지 간 데이터 흐름

#### API 통합 테스트
- 스토리 CRUD API (`/api/stories`)
- 세션 관리 API (`/api/sessions`)
- 인증/인가 API (`/api/auth`, `/api/me`)
- 설정 API (`/api/config`)
- SSE 스트리밍 (`/api/game/chat`)

#### 페이지 연동 테스트
- Home → Editor (새 스토리 생성)
- Home → Play (스토리 선택)
- Editor → Play (테스트 플레이)
- Admin → 모든 페이지 (설정 변경 반영)

**도구:** Playwright + Supertest

---

### 3. 시스템 테스트 (System Testing)

**대상:** E2E 시나리오, 성능, 보안

#### E2E 테스트 (235개 테스트케이스)
- **Home (32건):** 스토리 목록, 필터, 페이지네이션, 검색
- **Play (60건):** 게임 진행, 메모리 시스템, 입력/출력, 캐릭터
- **Editor (73건):** 스토리 생성/편집, 속성창, 프리셋, 공개 설정
- **Admin (70건):** 대시보드, 설정 관리, 로그 확인, 사용자 관리

#### 성능 테스트
- **응답 시간:** API < 200ms, 페이지 로드 < 2s
- **처리량:** 동시 100명 접속 시나리오
- **리소스:** 메모리 사용량, CPU 사용량

#### 보안 테스트
- SQL Injection 방지
- XSS 방지
- RLS 정책 검증
- API 키 보호

**도구:** Playwright, k6, OWASP ZAP

---

## 선행 조건 (Prerequisites)

### 🔴 CRITICAL - Phase 3 버그 수정 필요

**AI-57 DB 검증 보고서**에서 발견된 이슈:

1. **스키마 이름 불일치**: `ai_story_game` → `story_game`
   - 영향받는 마이그레이션: 4건
   - RLS 정책 미적용 위험

2. **누락된 인덱스**: 다수 발견
   - `sessions(story_id)`
   - `session_memory(session_id, category)`
   - `api_logs(created_at)`

3. **FK/CASCADE 미정의**: 참조 무결성 위험

**조치:** CTO/Fullstack Dev가 마이그레이션 수정 후 QA 착수

---

## 테스트 일정

### Phase 4.1: 단위 테스트 (예상 2일)
- 작업: 백엔드/프론트엔드 테스트 코드 작성
- 산출물: 단위 테스트 결과서, 커버리지 리포트

### Phase 4.2: 통합 테스트 (예상 2일)
- 작업: API 연동 테스트, 페이지 간 데이터 흐름 검증
- 산출물: 통합 테스트 결과서

### Phase 4.3: 시스템 테스트 (예상 3일)
- 작업: E2E 테스트 235건 실행, 성능/보안 테스트
- 산출물: 시스템 테스트 결과서, 성능 테스트 결과서

### Phase 4.4: 결함 관리
- 작업: 발견된 버그 보고, 재테스트, 회귀 테스트
- 산출물: 결함 보고서

---

## 성공 기준

### 단위 테스트
- ✅ 코드 커버리지 ≥ 80%
- ✅ 모든 테스트 케이스 PASS

### 통합 테스트
- ✅ 모든 API 엔드포인트 정상 동작
- ✅ 페이지 간 데이터 전송 오류 없음

### 시스템 테스트
- ✅ 235개 테스트케이스 중 95% 이상 PASS
- ✅ 성능 기준 만족 (API < 200ms, 페이지 로드 < 2s)
- ✅ 보안 취약점 없음

---

## 산출물 목록

### 단위 테스트
- [ ] `phase4-testing/01-unit-test-cases.md` - 단위 테스트 케이스 명세
- [ ] `phase4-testing/01-unit-test-results.md` - 단위 테스트 결과서
- [ ] `backend/test/coverage/` - 백엔드 커버리지 리포트
- [ ] `frontend/test/coverage/` - 프론트엔드 커버리지 리포트

### 통합 테스트
- [ ] `phase4-testing/02-integration-test-cases.md` - 통합 테스트 케이스
- [ ] `phase4-testing/02-integration-test-results.md` - 통합 테스트 결과서

### 시스템 테스트
- [ ] `phase4-testing/03-system-test-cases.md` - 시스템 테스트 케이스 (E2E)
- [ ] `phase4-testing/03-system-test-results.md` - 시스템 테스트 결과서
- [ ] `phase4-testing/04-performance-test-results.md` - 성능 테스트 결과서
- [ ] `phase4-testing/05-defect-report.md` - 결함 보고서

---

## 다음 단계

1. **Phase 3 완료 대기**: AI-56 (코드 GAP 해소) 완료까지 대기
2. **버그 수정 확인**: AI-57에서 발견된 CRITICAL 이슈 수정 확인
3. **테스트 환경 셋업**: Playwright, Vitest, 테스트 DB 구성
4. **단위 테스트 착수**: 백엔드/프론트엔드 단위 테스트 작성

---

**상태:** 📋 Phase 3 구현 완료 대기 중
