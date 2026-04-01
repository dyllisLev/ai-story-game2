# AI Story Game - 릴리스 노트 (Release Notes)

> **버전:** 1.0.0
> **릴리스 일자:** 2026-04-01 (예정)
> **작성자:** DevOps Engineer
> **Phase:** SDLC Phase 7 - Deployment
> **이슈:** AI-63

---

## 목차

1. [릴리스 개요](#릴리스-개요)
2. [주요 기능](#주요-기능)
3. [버그 수정](#버그-수정)
4. [알려진 이슈](#알려진-이슈)
5. [업그레이드 가이드](#업그레이드-가이드)
6. [기술 스펙](#기술-스펙)
7. [변경 로그](#변경-로그)

---

## 릴리스 개요

### 1.1 버전 정보

| 항목 | 내용 |
|------|------|
| **버전** | 1.0.0 |
| **코드명** | (없음) |
| **릴리스 유형** | Major Release (최초 공개 릴리스) |
| **배포 대상** | Production |
| **배포 일자** | 2026-04-01 (예정) |

### 1.2 릴리스 요약

AI Story Game 플랫폼의 첫 번째 공개 릴리스입니다. Google Gemini API를 활용한 인터랙티브 소설 게임 플랫폼으로, 사용자가 AI와 대화하며 이야기를 진행할 수 있습니다.

**주요 특징:**
- 🎮 **AI 기반 스토리텔링:** Gemini API로 실시간 대화형 스토리 생성
- ✍️ **스토리 에디터:** 사용자가 자신만의 스토리를 작성하고 공유
- 🔐 **보안:** Supabase RLS 기반 데이터 보호, AES-256 API 키 암호화
- 📊 **관리자 기능:** 대시보드, 사용자 관리, 시스템 로그 확인
- 🎨 **반응형 UI:** React 19 + Tailwind CSS로 구현된 모던한 인터페이스

### 1.3 새로운 기능 한눈에 보기

| 기능 카테고리 | 주요 기능 |
|--------------|----------|
| **사용자** | 회원가입, 로그인, 프로필 관리, API 키 등록 |
| **스토리 탐색** | 장르 필터, 검색, 정렬, 추천 스토리 |
| **스토리 플레이** | 새 세션 시작, 대화 진행, 메모리 시스템, 상태창 |
| **스토리 에디터** | 스토리 생성/수정/삭제, 프리셋 관리, 시스템 규칙 |
| **관리자** | 대시보드, 사용자 관리, API 로그, 서비스 로그 |

---

## 주요 기능

### 2.1 인증 및 프로필 (AUTH)

| 기능 | 설명 | 상태 |
|------|------|------|
| **회원가입** | 이메일/비밀번호로 회원가입 (Supabase Auth) | ⚠️ BUG-001 (배포 후 수정 예정) |
| **로그인** | JWT 토큰 기반 로그인, 자동 갱신 | ✅ |
| **로그아웃** | 세션 종료, 토큰 무효화 | ✅ |
| **프로필 조회** | 닉네임, 이메일, 아바타 확인 | ✅ |
| **API 키 관리** | Gemini API 키 AES-256 암호화 저장 | ✅ |
| **역할 기반 접근** | user, pending, admin 역할 지원 | ✅ |

**API Endpoints:**
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/me` - 프로필 조회
- `PUT /api/me` - 프로필 수정
- `PUT /api/me/apikey` - API 키 등록

### 2.2 스토리 탐색 (STORY-BROWSE)

| 기능 | 설명 | 상태 |
|------|------|------|
| **스토리 목록** | 페이지네이션 (20개/페이지) | ✅ |
| **장르 필터** | 무협, 판타지, 로맨스, SF, 공포 등 | ✅ |
| **검색** | 제목/설명 키워드 검색 (ILIKE) | ✅ |
| **정렬** | 최신순, 인기순, 이름순 | ✅ |
| **추천 스토리** | is_featured 스토리 히어로 섹션 | ✅ |
| **이어하기** | 내 최근 플레이 세션 (최대 50개) | ✅ |

**API Endpoints:**
- `GET /api/stories` - 스토리 목록 조회
- `GET /api/stories/:id` - 스토리 상세 조회
- `GET /api/sessions` - 내 세션 목록

### 2.3 스토리 플레이 (GAME)

| 기능 | 설명 | 상태 |
|------|------|------|
| **새 세션 시작** | 스토리 ID로 새 게임 세션 생성 | ✅ |
| **대화 전송** | 사용자 입력 → AI 응답 | ✅ |
| **SSE 스트리밍** | 실시간 AI 응답 스트리밍 | ✅ |
| **메시지 모드** | [행동], [생각], [대사], [장면 지시] | ✅ |
| **상태창 파싱** | \`\`\`status 블록 UI 표시 | ✅ |
| **자동 저장** | 매 턴 자동 세션 저장 | ✅ |
| **메모리 시스템** | 단기/장기/캐릭터/목표 4종 메모리 | ✅ |
| **슬라이딩 윈도우** | 최근 N개 메시지만 컨텍스트 | ✅ |
| **이어하기** | 세션 목록에서 이어서 플레이 | ✅ |

**API Endpoints:**
- `POST /api/game/start` - 새 세션 시작
- `POST /api/game/chat` - 대화 진행 (SSE)
- `GET /api/sessions/:id` - 세션 상세 조회
- `GET /api/sessions/:id/memory` - 메모리 조회

**지원 AI 모델:**
- Gemini 1.5 Flash (기본)
- Gemini 1.5 Flash Lite (빠른 응답)
- Gemini 1.5 Pro (고품질 응답)

### 2.4 스토리 에디터 (EDITOR)

| 기능 | 설명 | 상태 |
|------|------|------|
| **스토리 생성** | 제목, 설명, 장르, 세계관, 캐릭터 등 | ✅ |
| **스토리 수정** | 실시간 미리보기 | ✅ |
| **스토리 삭제** | 소프트 삭제 (is_public=false) | ✅ |
| **프리셋 관리** | 장르별 미리 정의된 설정 | ✅ |
| **시스템 규칙** | AI 행동 제약 조건 | ✅ |
| **상태창 설정** | 장르별 속성 정의 | ✅ |
| **테스트 플레이** | 에디터 내에서 바로 테스트 | ✅ |
| **공개/비공개** | 스토리 공개 범위 설정 | ✅ |
| **비밀번호 보호** | 스토리 비밀번호 설정 | ✅ |

**API Endpoints:**
- `POST /api/stories` - 스토리 생성
- `PUT /api/stories/:id` - 스토리 수정
- `DELETE /api/stories/:id` - 스토리 삭제
- `POST /api/game/test-prompt` - 프롬프트 테스트

### 2.5 관리자 (ADMIN)

| 기능 | 설명 | 상태 |
|------|------|------|
| **대시보드** | 총 스토리/세션/사용자 수, 최근 활동 | ✅ |
| **사용자 관리** | 사용자 목록, 역할 변경 | ✅ |
| **스토리 관리** | 전체 스토리 조회, 공개 설정 | ✅ |
| **API 로그** | Gemini API 호출 로그, 사용량 추적 | ✅ |
| **서비스 로그** | 백엔드 요청 로그 | ✅ |
| **시스템 설정** | 프롬프트 템플릿, 게임플레이 설정 | ✅ |
| **상태창 프리셋** | 장르별 속성 정의 관리 | ✅ |

**API Endpoints:**
- `GET /api/admin/dashboard` - 대시보드
- `GET /api/admin/stories` - 스토리 관리
- `GET /api/admin/users` - 사용자 관리
- `GET /api/admin/api-logs` - API 로그
- `GET /api/admin/service-logs` - 서비스 로그
- `GET/PUT /api/config` - 시스템 설정
- `GET/POST/PUT/DELETE /api/admin/status-presets` - 상태창 프리셋

**인증:** Basic Auth (admin:ADMIN_BASIC_AUTH_PASSWORD)

---

## 버그 수정

### 3.1 Phase 3: DB 스키마 수정

| 결함 | 수정 내용 | 상태 |
|------|----------|------|
| **Schema Name Inconsistency** | `ai_story_game` → `story_game` 이름 통일 | ✅ (20260401010000) |
| **Foreign Key CASCADE Missing** | sessions.story_id에 ON DELETE CASCADE 추가 | ✅ (20260401020000) |
| **Missing Indexes** | 성능 최적화를 위한 인덱스 추가 | ✅ (20260401030000) |

**Migration Files:**
- `20260401010000_fix_schema_name_inconsistency.sql`
- `20260401020000_fix_sessions_story_id_cascade.sql`
- `20260401030000_add_missing_indexes.sql`

### 3.2 Phase 4-5: 테스트 발견 결함

| 결함 ID | 심각도 | 상태 | 수정 계획 |
|---------|--------|------|----------|
| BUG-001 | Medium | OPEN | 배포 후 수정 예정 (프론트엔드 회원가입 양식) |
| BUG-002 | Medium | OPEN | 배포 전 수동 관리자 계정 생성 |
| BUG-003 | Low | OPEN | 배포 후 수정 예정 (Pending 사용자 로그인 UX) |
| DEF-001~005 | P0 | OPEN | 배포 후 2주 이내 단위 테스트 구현 |
| DEF-006 | P1 | OPEN | 배포 후 1개월 이내 CI/CD 구현 |

---

## 알려진 이슈

### 4.1 배포 시점 기준 알려진 이슈

| 이슈 | 영향 | 우선순위 | 완화 계획 |
|------|------|----------|----------|
| **신규 사용자 가입 불가 (BUG-001)** | 새 사용자 가입 기능 동작하지 않음 | P1 | (A) 배포 전 수정 또는 (B) "가입 일시 중지" 공지 |
| **관리자 계정 부재 (BUG-002)** | 관리자 대시보드 접근 불가 | P2 | 배포 전 SQL로 수동 생성 |
| **Pending 사용자 로그인 허용 (BUG-003)** | UX 혼선 가능 | P3 | 배포 후 로그인 단계에서 차단 |
| **단위 테스트 부재 (DEF-001~005)** | 회귀 버그 탐지 불가 | P1 | 배포 후 2주 이내 구현 |
| **CI/CD 미구현 (DEF-006)** | 자동화 품질 게이트 부재 | P2 | 배포 후 1개월 이내 구현 |

### 4.2 제약사항

- **스테이징 환경:** 현재 미존재
- **모니터링:** APM 도구 미사용 (로그 기반 모니터링만)
- **백업:** 수동 백업만 지원 (자동화 예정)

---

## 업그레이드 가이드

### 5.1 사용자 업그레이드 (이전 버전 없음)

본 릴리스는 최초 공개 릴리스로, 이전 버전에서의 업그레이드는 없습니다.

### 5.2 데이터베이스 마이그레이션

**새로 설치하는 경우:**
```bash
# Supabase SQL Editor 또는 CLI로 다음 마이그레이션 순서대로 실행
# 1. 기본 스키마 (00000000000001~5.sql)
# 2. 확장 스키마 (20260323010000~60000.sql)
# 3. RLS 최적화 (20260401010000~30000.sql)
```

### 5.3 환경변수 설정

**필수 환경변수:**
```bash
# .env (프로덕션)
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-role-key>
SUPABASE_SCHEMA=ai_story_game
API_KEY_ENCRYPTION_SECRET=<32-char-random-secret>
ADMIN_BASIC_AUTH_PASSWORD=<strong-password>
```

### 5.4 서비스 시작

**개발 환경:**
```bash
./dev.sh start   # 백엔드(3000) + 프론트엔드(5173) 시작
```

**프로덕션 환경:**
```bash
# Backend
cd backend && npm run build && npm start

# Frontend (정적 파일 호스팅)
cd frontend && npm run build
# dist/ 디렉토리 내용을 웹 서버에 배포
```

---

## 기술 스펙

### 6.1 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| **프론트엔드** | React | 19.0.0 |
| | Vite | 6.0.0 |
| | TypeScript | 5.8.0 |
| | Tailwind CSS | 4.0.0 |
| **백엔드** | Fastify | 5.2.0 |
| | Node.js | 22.x |
| | TypeScript | 5.8.0 |
| **데이터베이스** | Supabase (PostgreSQL) | 15.x |
| **인증** | Supabase Auth | Latest |
| **AI** | Google Gemini API | 1.5 Flash/Pro |

### 6.2 데이터베이스 스키마

**주요 테이블:**
- `auth.users` (Supabase Auth)
- `user_profiles` - 사용자 프로필
- `stories` - 스토리
- `sessions` - 플레이 세션
- `session_memory` - 세션 메모리 (4종)
- `config` - 시스템 설정
- `presets` - 스토리 프리셋
- `status_presets` - 상태창 프리셋
- `api_logs` - API 호출 로그
- `service_logs` - 서비스 로그

### 6.3 API 엔드포인트 요약

| 카테고리 | 엔드포인트 수 | 주요 경로 |
|----------|--------------|----------|
| **인증** | 4 | `/api/auth/*` |
| **사용자** | 3 | `/api/me` |
| **스토리** | 5 | `/api/stories` |
| **세션** | 4 | `/api/sessions` |
| **게임** | 3 | `/api/game/*` |
| **관리자** | 8 | `/api/admin/*` |
| **시스템** | 2 | `/api/config`, `/api/health` |
| **합계** | **29** | |

---

## 변경 로그

### 7.1 Phase 1-2: 요구사항 및 설계 (2026-03-31)

**생성된 문서:**
- SRS (Software Requirements Specification)
- RTM (Requirements Traceability Matrix)
- Use Case Specifications
- Conceptual ERD
- TO-BE Process Definitions
- Architecture Definition
- Screen Design Specification
- API Design Specification
- Table Definitions

### 7.2 Phase 3: 구현 및 DB 검증 (2026-04-01)

**구현된 기능:**
- 백엔드 Fastify 서버 (3000)
- 프론트엔드 React 앱 (5173)
- Supabase DB 스키마 (ai_story_game)
- 인증 플러그인 (JWT)
- RLS 정책 활성화

**DB 검증:**
- RLS 정책 활성화 확인
- 인덱스 존재 확인
- 스키마 이름 불일치 발견 및 수정

### 7.3 Phase 4: 단위 테스트 (2026-04-01)

**테스트 결과:**
- 단위 테스트 프레임워크 미설치 (DEF-002)
- 테스트 파일 0개 (DEF-001)
- 결함 11건 발견 (P0: 5, P1: 4, P2: 2)

### 7.4 Phase 5: 통합 테스트 (2026-04-01)

**테스트 결과:**
- 통합 테스트 케이스 10개
- 통과: 7/10
- 실패: 3/10 (BUG-001, BUG-002, BUG-003)

### 7.5 Phase 6: 시스템 테스트 (2026-04-01)

**참고:** Phase 6 시스템 테스트 문서는 별도로 작성되지 않음 (Phase 5 통합 테스트로 대체)

### 7.6 Phase 7: 배포 계획 (2026-04-01)

**생성된 문서:**
- 배포 계획서 (Deployment Plan)
- 릴리스 노트 (Release Notes) - 본 문서

---

## 부록

### A. 확인해야 할 로그

배포 후 다음 로그를 확인하여 정상 동작을 검증하십시오:

**백엔드 로그:**
```
[info] Server listening on http://0.0.0.0:3000
[info] Supabase client initialized
[info] Config cache initialized
```

**데이터베이스 로그:**
```
LOG: database system is ready to accept connections
LOG: RLS policy "stories_select_policy" enabled
```

### B. 성능 벤치마크

| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| **API 응답시간** | < 500ms (p95) | curl -w "@curl-format.txt" |
| **API 처리량** | > 100 req/s | Apache Bench (ab) |
| **DB 쿼리시간** | < 100ms (p95) | pg_stat_statements |
| **SSE 지연시간** | < 1초 | 브라우저 Network 탭 |

### C. 지원 및 피드백

**버그 신고:** Paperclip 이슈 트래커
**기능 요청:** CTO에게 승인 요청
**보안 이슈:** CTO에게 즉시 보고 (비공개)

---

## 서명 (Sign-off)

**작성자:** DevOps Engineer (Agent b5566bff-f052-4052-9938-a6aa28c80066)

**검토자:** [ ] CTO [ ] Fullstack Dev

**승인자:** [ ] CEO

**릴리스 승인 일자:** [ ]

---

**문서 버전:** 1.0
**최종 수정:** 2026-04-01

**다음 릴리스 예정:** v1.1.0 (버그 수정 및 단위 테스트 추가)
