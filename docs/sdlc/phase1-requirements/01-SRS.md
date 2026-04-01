# AI Story Game - 요구사항 정의서 (SRS)
**Software Requirements Specification**

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Business Analyst
> **프로젝트:** AI Story Game (Interactive Fiction Platform)

---

## 1. 개요 (Introduction)

### 1.1 목적 (Purpose)
본 문서는 AI Story Game 플랫폼의 소프트웨어 요구사항을 정의한다. Google Gemini API를 활용한 인터랙티브 소설 게임으로, 사용자가 AI와 대화하며 이야기를 진행하는 웹 애플리케이션을 설명한다.

### 1.2 범위 (Scope)
- **대상 시스템:** AI Story Game 플랫폼 (Frontend + Backend + Database)
- **주요 기능:** 스토리 탐색, AI 대화 기반 게임 플레이, 스토리 에디터, 관리자 기능
- **기술 스택:** React 19, Fastify 5, Supabase, Gemini API

### 1.3 정의 (Definitions)
| 용어 | 정의 |
|------|------|
| 스토리 (Story) | AI가 생성하는 이야기의 템플릿. 세계관, 캐릭터, 시스템 규칙을 포함 |
| 세션 (Session) | 사용자가 스토리를 플레이하는 단위. 대화 기록과 진행 상태를 저장 |
| 메모리 (Memory) | 세션 중 AI가 참조하는 구조화된 정보 (단기/장기/캐릭터/목표) |
| 상태창 (Status Window) | 게임 진행 상황을 표시하는 UI (HP, MP, 내공 등 장르별 속성) |
| 프리셋 (Preset) | 스토리 생성 시 사용할 수 있는 미리 정의된 설정 템플릿 |
| SSE 스트리밍 | Server-Sent Events를 통한 실시간 AI 응답 전송 |

### 1.4 참고 문서 (References)
- `CLAUDE.md` - 프로젝트 구조 및 개발 가이드
- `docs/PROJECT-SPEC.md` - 프로젝트 기술 스펙
- `docs/flow-analysis.md` - 전체 플로우 분석
- `docs/ui-data-checklist.md` - UI 데이터 항목 체크리스트
- `docs/migration-tasks.md` - 마이그레이션 태스크

---

## 2. 전체 시스템 개요 (System Overview)

### 2.1 시스템 아키텍처
```
[React Frontend :5173] ──→ [Fastify Backend :3000] ──→ [Supabase PostgreSQL]
         │                         │
         │                         ├─ /api/config (GET/PUT)
         │                         ├─ /api/game/start|chat (SSE)
         │                         ├─ /api/stories (CRUD)
         │                         ├─ /api/sessions (CRUD)
         │                         ├─ /api/admin/* (관리자)
         │                         └─ /api/auth/* (인증)
         │
         └─ [Gemini API] (프론트에서 직접 호출, 백엔드가 프롬프트 조합)
```

### 2.2 사용자 역할 (Actors)
| 역할 | 설명 | 권한 |
|------|------|------|
| 비로그인 사용자 | 공개 스토리 탐색 | 공개 스토리 조회, 프리셋 조회 |
| 로그인 사용자 | 일반 사용자 | 스토리 플레이, 세션 관리, API 키 등록 |
| 스토리 작성자 | 콘텐츠 크리에이터 | 자신의 스토리 생성/수정/삭제 |
| 관리자 | 시스템 관리자 | 전체 스토리/세션/로그 관리, 설정 수정 |

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 인증 및 프로필 (AUTH-001 ~ AUTH-005)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| AUTH-001 | 회원가입 | 이메일/비밀번호로 회원가입, Supabase Auth 사용 | HIGH |
| AUTH-002 | 로그인 | 이메일/비밀번호로 로그인, JWT 토큰 발급 | HIGH |
| AUTH-003 | 로그아웃 | 현재 세션 종료, 토큰 무효화 | MEDIUM |
| AUTH-004 | 프로필 조회 | 내 닉네임, 이메일, 아바타 확인 | MEDIUM |
| AUTH-005 | API 키 관리 | Gemini API 키 암호화 저장 (AES-256) | HIGH |
| AUTH-006 | 세션 새로고침 | Refresh token으로 access token 갱신 | MEDIUM |

### 3.2 스토리 탐색 (STORY-BROWSE-001 ~ STORY-BROWSE-006)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| STORY-BROWSE-001 | 스토리 목록 조회 | 공개 스토리 목록을 페이지네이션으로 표시 (20개/페이지) | HIGH |
| STORY-BROWSE-002 | 장르 필터 | tags 배열 기반 장르 필터링 (무협, 판타지, 로맨스 등) | HIGH |
| STORY-BROWSE-003 | 검색 | title/description 기준 키워드 검색 (ILIKE) | MEDIUM |
| STORY-BROWSE-004 | 정렬 | latest (최신순), popular (플레이수순), name (이름순) | MEDIUM |
| STORY-BROWSE-005 | 추천 스토리 | is_featured=true인 스토리를 홈 히어로 섹션에 표시 | MEDIUM |
| STORY-BROWSE-006 | 이어하기 | 내 최근 플레이 세션 표시 (최대 50개) | MEDIUM |

### 3.3 스토리 플레이 (GAME-001 ~ GAME-010)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| GAME-001 | 새 세션 시작 | 스토리 ID로 새 게임 세션 생성, 시스템 프롬프트 조합 | HIGH |
| GAME-002 | 대화 전송 | 사용자 입력을 AI에 전달하고 응답 수신 | HIGH |
| GAME-003 | SSE 스트리밍 | Gemini API 응답을 실시간 스트리밍으로 표시 | HIGH |
| GAME-004 | 메시지 모드 | [행동], [생각], [대사], [장면 지시] 접두사 지원 | MEDIUM |
| GAME-005 | 상태창 파싱 | \`\`\`status... 블록을 파싱하여 UI에 표시 | MEDIUM |
| GAME-006 | 자동 저장 | 메시지 전송 시 자동으로 세션 저장 | HIGH |
| GAME-007 | 세션 조회 | 세션 목록 및 상세 조회 | HIGH |
| GAME-008 | 세션 삭제 | 세션 및 연관 메모리 삭제 (CASCADE) | MEDIUM |
| GAME-009 | 슬라이딩 윈도우 | 최근 N개 메시지만 컨텍스트에 포함 (기본 20개) | MEDIUM |
| GAME-010 | LaTeX 효과음 | 수식 문법으로 효과음/배경음 시각화 (선택) | LOW |

### 3.4 메모리 관리 (MEMORY-001 ~ MEMORY-004)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| MEMORY-001 | 단기 메모리 | 세션 내 최근 사건, AI가 자동 요약 | MEDIUM |
| MEMORY-002 | 장기 메모리 | 전체 이야기 핵심 요약, 주기적 업데이트 | MEDIUM |
| MEMORY-003 | 캐릭터 메모리 | 등장인물 정보 (성격, 관계, 상태) | MEDIUM |
| MEMORY-004 | 목표 메모리 | 플레이어/캐릭터 목표 및 진행 상황 | LOW |

### 3.5 스토리 에디터 (EDITOR-001 ~ EDITOR-009)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| EDITOR-001 | 스토리 생성 | 새 스토리 작성 (title, world_setting, story, characters, system_rules) | HIGH |
| EDITOR-002 | 스토리 수정 | 기존 스토리 내용 수정 | HIGH |
| EDITOR-003 | 스토리 삭제 | 스토리 및 연관 세션 삭제 | MEDIUM |
| EDITOR-004 | 공개 설정 | is_public, password_hash로 공개 범위 제어 | MEDIUM |
| EDITOR-005 | 메타데이터 | description, tags, icon, banner_gradient 설정 | MEDIUM |
| EDITOR-006 | 상태창 설정 | status_preset_id로 장르별 상태창 연결 | MEDIUM |
| EDITOR-007 | 프리셋 적용 | 미리 정의된 프리셋을 불러와서 빠르게 작성 | LOW |
| EDITOR-008 | 프롬프트 미리보기 | 조합된 시스템 프롬프트 실시간 확인 | MEDIUM |
| EDITOR-009 | 테스트 플레이 | 에디터 내에서 바로 테스트 플레이 (모달) | MEDIUM |

### 3.6 관리자 기능 (ADMIN-001 ~ ADMIN-008)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| ADMIN-001 | 대시보드 | 전체 통계 (스토리수, 플레이수, 작성자수) | HIGH |
| ADMIN-002 | 스토리 관리 | 전체 스토리 조회, 수정, 삭제 | MEDIUM |
| ADMIN-003 | 사용자 관리 | 사용자 목록, 역할 변경 | MEDIUM |
| ADMIN-004 | 서비스 로그 | HTTP 요청 로그 (method, path, status_code, duration_ms) | LOW |
| ADMIN-005 | API 로그 | Gemini API 호출 로그 (request/response, error) | MEDIUM |
| ADMIN-006 | 설정 수정 | prompt_config, gameplay_config 수정 | MEDIUM |
| ADMIN-007 | 상태창 프리셋 | status_presets CRUD (장르별 속성 정의) | LOW |
| ADMIN-008 | 위험 구역 | 전체 데이터 삭제 (스토리, 세션, 로그) | LOW |

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

### 4.1 성능 (Performance)

| ID | 요구사항 | 목표 | 측정 방법 |
|----|----------|------|----------|
| NFR-PERF-001 | API 응답 시간 | p95 < 500ms (non-streaming) | api_logs.duration_ms |
| NFR-PERF-002 | SSE 첫 응답 | < 2초 | game/start, game/chat |
| NFR-PERF-003 | 페이지 로드 | < 3초 (FCP) | Lighthouse |
| NFR-PERF-004 | DB 쿼리 | < 100ms (인덱스 활용) | EXPLAIN ANALYZE |

### 4.2 보안 (Security)

| ID | 요구사항 | 설명 |
|----|----------|------|
| NFR-SEC-001 | API 키 암호화 | 사용자 Gemini API 키 AES-256 암호화 저장 |
| NFR-SEC-002 | RLS (Row Level Security) | user_profiles, stories에 대한 접근 제어 |
| NFR-SEC-003 | Basic Auth (Admin) | 관리자 페이지 Basic 인증 |
| NFR-SEC-004 | SQL Injection 방지 | Prepared statements만 사용 |
| NFR-SEC-005 | XSS 방지 | React 기본 이스케이프, DOMPurify 사용 |

### 4.3 가용성 (Availability)

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-AVAIL-001 | 서버 가용성 | 99% Uptime |
| NFR-AVAIL-002 | 데이터 백업 | 매일 자동 백업 |

### 4.4 호환성 (Compatibility)

| ID | 요구사항 | 지원 범위 |
|----|----------|----------|
| NFR-COMP-001 | 브라우저 | Chrome 90+, Firefox 88+, Safari 14+ |
| NFR-COMP-002 | 화면 크기 | Desktop (1280+px), Tablet (768+px) |
| NFR-COMP-003 | Gemini API | models/gemini-2.0-flash-exp, gemini-2.5-pro-exp-03-25 |

### 4.5 확장성 (Scalability)

| ID | 요구사항 | 설명 |
|----|----------|------|
| NFR-SCALE-001 | 동시 사용자 | 100+ concurrent users |
| NFR-SCALE-002 | 스토리 수 | 10,000+ stories |
| NFR-SCALE-003 | 세션 수 | 100,000+ sessions |

---

## 5. 데이터 요구사항 (Data Requirements)

### 5.1 데이터 모델 (Entity Relationship)

**주요 엔티티:**
- `stories` - 스토리 템플릿
- `sessions` - 게임 세션
- `session_memory` - 구조화 메모리
- `presets` - 스토리 프리셋
- `status_presets` - 상태창 프리셋
- `config` - 앱 설정
- `service_logs` - HTTP 요청 로그
- `api_logs` - Gemini API 로그
- `user_profiles` - 사용자 프로필

**주요 관계:**
- sessions → stories (N:1)
- session_memory → sessions (N:1)
- stories → status_presets (N:1, optional)
- stories → user_profiles (N:1)
- sessions → user_profiles (N:1)

### 5.2 데이터 무결성 (Data Integrity)

| 제약 조건 | 설명 |
|----------|------|
| Primary Key | 모든 테이블의 id 컬럼 (UUID) |
| Foreign Key | stories.owner_uid, sessions.story_id 등 |
| Unique | session_memory(session_id, type) |
| Check | session_memory.type IN ('short_term', 'long_term', 'characters', 'goals') |
| Not Null | stories.title, sessions.title |

---

## 6. UI/UX 요구사항 (UI/UX Requirements)

### 6.1 페이지 구성

| 페이지 | 설명 | 주요 컴포넌트 |
|--------|------|--------------|
| Home (/) | 스토리 탐색 | HeroSection, FeaturedSection, FilterBar, StoryGrid |
| Play (/play/:storyId) | 게임 플레이 | SessionPanel, StoryContent, InputArea, InfoPanel (3-column) |
| Editor (/editor/:storyId?) | 스토리 작성 | EditorSidebar, EditorTextarea, PreviewPanel, TestPlayModal |
| Admin (/admin) | 관리자 | AdminNav, Dashboard, StoryManagement, ServiceLogs, ApiLogs |

### 6.2 디자인 원칙

1. **반응형 디자인** - Tailwind CSS를 활용한 모바일/데스크톱 지원
2. **다크 모드** - 시스템 테마 자동 감지
3. **접근성** - 키보드 네비게이션, ARIA 라벨
4. **일관성** - shadcn/ui 컴포넌트 라이브러리 사용

---

## 7. 인터페이스 요구사항 (Interface Requirements)

### 7.1 API 인터페이스

**Public Endpoints:**
- `GET /api/health` - 헬스체크
- `GET /api/config` - 앱 설정 조회
- `GET /api/stories` - 스토리 목록
- `GET /api/stories/stats` - 통계
- `GET /api/stories/:id` - 스토리 상세
- `GET /api/presets` - 프리셋 목록
- `GET /api/status-presets` - 상태창 프리셋 목록

**Auth Endpoints:**
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/me` - 내 프로필
- `PUT /api/me` - 프로필 수정
- `PUT /api/me/apikey` - API 키 등록

**Game Endpoints:**
- `POST /api/game/start` - 새 게임 시작 (SSE)
- `POST /api/game/chat` - 대화 전송 (SSE)

**Session Endpoints:**
- `GET /api/sessions` - 세션 목록
- `GET /api/sessions/:id` - 세션 상세
- `GET /api/sessions/:id/memory` - 세션 메모리
- `DELETE /api/sessions/:id` - 세션 삭제

**Story CRUD:**
- `POST /api/stories` - 스토리 생성
- `PUT /api/stories/:id` - 수정
- `DELETE /api/stories/:id` - 삭제

**Admin Endpoints:**
- `GET /api/admin/dashboard` - 대시보드 통계
- `GET/DELETE /api/admin/service-logs` - 서비스 로그
- `GET/DELETE /api/admin/api-logs` - API 로그
- `PUT /api/config` - 설정 수정
- CRUD `/api/admin/status-presets` - 상태창 프리셋
- DELETE `/api/admin/danger-zone/*` - 위험 구역

### 7.2 외부 API

**Gemini API:**
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent`
- Authentication: `x-goog-api-key: {사용자 API 키}`
- Response Format: Server-Sent Events (SSE)

---

## 8. 제약 사항 (Constraints)

### 8.1 기술적 제약
- Frontend는 React 19 이상 사용
- Backend는 Fastify 5 이상 사용
- Database는 Supabase (PostgreSQL 15+) 사용
- AI는 Google Gemini API만 사용

### 8.2 비즈니스 제약
- 사용자는 본인의 Gemini API 키를 제공해야 함
- 공개 스토리는 누구나 접근 가능
- 비공개 스토리는 작성자만 접근 가능

### 8.3 법적 제약
- 컨텐츠는 한국어 제공
- 안전성 설정은 BLOCK_NONE으로 고정 (사용자 책임)

---

## 9. 검수 기준 (Acceptance Criteria)

### 9.1 기능 테스트
- 모든 API 엔드포인트가 정상 동작
- SSE 스트리밍이 끊김 없이 동작
- RLS 정책이 올바르게 동작
- 메모리 시스템이 AI에 정확한 컨텍스트 제공

### 9.2 성능 테스트
- API 응답 시간 p95 < 500ms
- 페이지 로드 시간 < 3초
- 동시 100명 접속 시 안정적 동작

### 9.3 보안 테스트
- API 키가 평문으로 저장되지 않음
- RLS가 타用户의 데이터 접근 차단
- SQL Injection 취약점 없음

---

## 10. 용어 사전 (Glossary)

| 용어 | 영문 | 설명 |
|------|------|------|
| 인터랙티브 소설 | Interactive Fiction | 사용자 입력에 따라 이야기가 분기하는 게임 장르 |
| 프롬프트 | Prompt | AI에 전달하는 지시사항 |
| 토큰 | Token | 텍스트를 의미 단위로 분할한 것 (LLM 입력 단위) |
| 스트리밍 | Streaming | 데이터를 조각 단위로 실시간 전송 |
| SSE | Server-Sent Events | 서버에서 클라이언트로 일방향 이벤트 전송 |
| RLS | Row Level Security | 행 단위 접근 제어 (PostgreSQL) |
| 슬라이딩 윈도우 | Sliding Window | 고정 크기의 최근 데이터만 사용하는 방식 |

---

## 11. 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-03-31 | Business Analyst | 최초 작성 |
