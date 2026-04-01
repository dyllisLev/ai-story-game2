# AI Story Game - 프로그램 목록 (Program Listing)

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Software Architect
> **Phase:** SDLC Phase 2 - Design

---

## 1. 개요 (Overview)

### 1.1 문서 목적

본 문서는 AI Story Game 플랫폼의 전체 프로그램(모듈/컴포넌트) 목록을 제공하고, 각 모듈의 담당 영역과 의존성을 정의한다.

### 1.2 프로그램 구조 개요

```
ai-story-game2/
├── packages/shared/          # 공유 타입 패키지
│   └── src/types/           # 8개 타입 모듈
├── backend/                 # 백엔드 (Fastify)
│   └── src/
│       ├── plugins/         # 4개 플러그인
│       ├── routes/          # 7개 라우트 그룹
│       └── services/        # 5개 서비스
└── frontend/                # 프론트엔드 (React)
    └── src/
        ├── pages/           # 6개 페이지
        ├── components/      # 45+ 컴포넌트
        ├── hooks/           # 12개 커스텀 훅
        └── lib/             # 8개 유틸리티
```

---

## 2. 공유 타입 패키지 (@story-game/shared)

### 2.1 패키지 개요

| 항목 | 값 |
|------|-----|
| **패키지명** | @story-game/shared |
| **위치** | packages/shared/src/types/ |
| **언어** | TypeScript |
| **목적** | 프론트엔드/백엔드 간 타입 계약 보장 |

### 2.2 타입 모듈 목록

| 모듈 | 파일 | 주요 타입 | 설명 |
|------|------|----------|------|
| **스토리** | story.ts | Story, StoryListItem, StoryInput | 스토리 엔티티 |
| **세션** | session.ts | Session, SessionMessage, SessionInput | 게임 세션 |
| **메모리** | memory.ts | SessionMemory | 세션 메모리 구조 |
| **설정** | config.ts | PromptConfig, GameplayConfig, GlobalConfig | 전역 설정 |
| **인증** | auth.ts | AuthUser, LoginRequest, SignupRequest | 인증 관련 |
| **API** | api.ts | ApiResponse, ApiError | API 응답 형식 |
| **상태창** | status.ts | StatusPreset, StatusAttribute | 상태창 프리셋 |
| **로그** | log.ts | ApiLog, ServiceLog | 로그 엔티티 |

### 2.3 의존성

```json
{
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

---

## 3. 백엔드 모듈 (Backend Modules)

### 3.1 백엔드 개요

| 항목 | 값 |
|------|-----|
| **프레임워크** | Fastify 5.2.0 |
| **위치** | backend/src/ |
| **언어** | TypeScript |
| **진입점** | server.ts |

### 3.2 플러그인 (Plugins)

| ID | 모듈 | 파일 | 역할 | 의존성 |
|----|------|------|------|--------|
| **BP-01** | Supabase | plugins/supabase.ts | Supabase 클라이언트 등록 | @supabase/supabase-js |
| **BP-02** | Auth | plugins/auth.ts | JWT 인증, user 객체 | BP-01 |
| **BP-03** | Config Cache | plugins/config-cache.ts | 전역 설정 캐싱 | BP-01 |
| **BP-04** | Request Logger | plugins/request-logger.ts | 요청 로그 기록 | BP-01 |

#### BP-01: Supabase Plugin

**담당:** Supabase 클라이언트 초기화, 데코레이터 등록

**주요 기능:**
```typescript
app.decorate('supabase', supabaseClient);
app.decorate('supabaseAdmin', supabaseAdminClient);
```

**의존성:**
- `@supabase/supabase-js`
- 환경변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

**호출 관계:**
```
server.ts → BP-01 → 모든 라우트/서비스
```

#### BP-02: Auth Plugin

**담당:** JWT 검증, user 객체 설정, 인증 가드

**주요 기능:**
```typescript
app.decorateRequest('user', null);
// requireAuth(), requireAdmin(), verifyResourceOwner()
```

**의존성:**
- BP-01 (Supabase)
- `auth.users`, `user_profiles` 테이블

**호출 관계:**
```
server.ts → BP-02 → 모든 인증 필요 라우트
```

#### BP-03: Config Cache Plugin

**담당:** config 테이블 in-memory 캐싱

**주요 기능:**
```typescript
app.getAppConfig(): Promise<GlobalConfig>
```

**의존성:**
- BP-01 (Supabase)
- `config` 테이블

**호출 관계:**
```
routes/config.ts → BP-03
routes/game/*.ts → BP-03
services/prompt-builder.ts → BP-03
```

#### BP-04: Request Logger Plugin

**담당:** 모든 요청 로그 기록

**주요 기능:**
```typescript
service_logs 테이블에 기록
```

**의존성:**
- BP-01 (Supabase)
- `service_logs` 테이블

**호출 관계:**
```
server.ts → BP-04 → service_logs 테이블
```

### 3.3 라우트 (Routes)

| ID | 모듈 | 파일 | 엔드포인트 | 인증 | 의존성 |
|----|------|------|-----------|------|--------|
| **BR-01** | Auth | routes/auth.ts | POST /api/auth/* | ❌ | BP-02 |
| **BR-02** | Me | routes/me.ts | GET/PUT /api/me | ✅ | BP-02, BS-05 |
| **BR-03** | Config | routes/config.ts | GET/PUT /api/config | ✅(admin) | BP-02, BP-03 |
| **BR-04** | Stories | routes/stories/*.ts | GET/POST/PUT/DELETE /api/stories | ✅(owner/admin) | BP-02 |
| **BR-05** | Sessions | routes/sessions/*.ts | GET/POST/PUT/DELETE /api/sessions | ✅(owner) | BP-02 |
| **BR-06** | Game | routes/game/*.ts | POST /api/game/* (SSE) | ✅ | BP-02, BP-03, BS-01~05 |
| **BR-07** | Admin | routes/admin/*.ts | /api/admin/* | ✅(admin) | BP-02 |

#### BR-01: Auth Routes

**담당:** 회원가입, 로그인, 로그아웃, 토큰 갱신

**파일:** routes/auth.ts

**엔드포인트:**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

**의존성:**
- BP-02 (Auth plugin)
- Supabase Auth

**호출 관계:**
```
Frontend → BR-01 → Supabase Auth → auth.users, user_profiles
```

#### BR-02: Me Routes

**담당:** 프로필 조회/수정, API 키 관리

**파일:** routes/me.ts

**엔드포인트:**
- `GET /api/me`
- `PUT /api/me`
- `PUT /api/me/apikey`
- `DELETE /api/me/apikey`

**의존성:**
- BP-02 (requireAuth)
- BS-05 (crypto service)

**호출 관계:**
```
Frontend → BR-02 → BS-05 → user_profiles.api_key_encrypted
```

#### BR-03: Config Routes

**담당:** 전역 설정 조회/수정

**파일:** routes/config.ts

**엔드포인트:**
- `GET /api/config`
- `PUT /api/config`

**의존성:**
- BP-02 (requireAdmin)
- BP-03 (config cache)

**호출 관계:**
```
Frontend → BR-03 → BP-03 → config 테이블
```

#### BR-04: Stories Routes

**담당:** 스토리 CRUD, 내 스토리, 통계

**파일:** routes/stories/list.ts, crud.ts, stats.ts

**엔드포인트:**
- `GET /api/stories`
- `GET /api/stories/{id}`
- `POST /api/stories`
- `PUT /api/stories/{id}`
- `DELETE /api/stories/{id}`
- `GET /api/stories/mine`
- `GET /api/stories/stats`

**의존성:**
- BP-02 (requireAuth, verifyResourceOwner)
- `stories`, `status_presets`, `presets` 테이블

**호출 관계:**
```
Frontend → BR-04 → stories 테이블
```

#### BR-05: Sessions Routes

**담당:** 세션 CRUD

**파일:** routes/sessions/list.ts, crud.ts

**엔드포인트:**
- `GET /api/sessions`
- `GET /api/sessions/{id}`
- `POST /api/sessions`
- `PUT /api/sessions/{id}`
- `DELETE /api/sessions/{id}`

**의존성:**
- BP-02 (requireAuth, verifySessionAccess)
- `sessions`, `session_memory` 테이블

**호출 관계:**
```
Frontend → BR-05 → sessions, session_memory 테이블
```

#### BR-06: Game Routes

**담당:** 게임 시작, 대화(SSE), 프롬프트 미리보기

**파일:** routes/game/start.ts, chat.ts, test-prompt.ts

**엔드포인트:**
- `POST /api/game/start`
- `POST /api/game/chat`
- `POST /api/game/test-prompt`

**의존성:**
- BP-02 (requireAuth)
- BP-03 (getConfig)
- BS-01 (gemini)
- BS-02 (prompt-builder)
- BS-03 (memory-handler)
- BS-04 (session-manager)

**호출 관계:**
```
Frontend → BR-06 → BS-02 → stories, config 테이블
           → BS-01 → Gemini API
           → BS-03 → session_memory 테이블
           → BS-04 → sessions 테이블
```

#### BR-07: Admin Routes

**담당:** 대시보드, 스토리/사용자/로그/프리셋 관리, 위험 구역

**파일:** routes/admin/*.ts

**엔드포인트:**
- `GET /api/admin/dashboard`
- `GET /api/admin/stories`
- `DELETE /api/admin/stories/{id}`
- `GET /api/admin/users`
- `PUT /api/admin/users/{id}/role`
- `GET /api/admin/service-logs`
- `GET /api/admin/api-logs`
- `GET /api/admin/status-presets`
- `POST /api/admin/status-presets`
- `POST /api/admin/danger-zone/*`

**의존성:**
- BP-02 (requireAdmin)
- 모든 테이블

**호출 관계:**
```
Frontend → BR-07 → 모든 테이블
```

### 3.4 서비스 (Services)

| ID | 모듈 | 파일 | 역할 | 의존성 |
|----|------|------|------|--------|
| **BS-01** | Gemini | services/gemini.ts | Gemini API 호출 | - |
| **BS-02** | Prompt Builder | services/prompt-builder.ts | 시스템 프롬프트 조합 | BP-03, BR-04 |
| **BS-03** | Memory Handler | services/memory-handler.ts | 세션 메모리 생성/저장 | BS-01 |
| **BS-04** | Session Manager | services/session-manager.ts | 세션 상태 관리 | - |
| **BS-05** | Crypto | services/crypto.ts | API 키 암호화/복호화 | node:crypto |

#### BS-01: Gemini Service

**담당:** Gemini API 직접 호출, 스트리밍 처리

**파일:** services/gemini.ts

**주요 함수:**
```typescript
callGeminiGenerate(params): AsyncGenerator<string>
callGeminiStream(params): AsyncGenerator<string>
```

**의존성:**
- Google Gemini API (fetch)
- 환경변수 없음 (사용자 API 키)

**호출 관계:**
```
BR-06 → BS-01 → Gemini API
BS-03 → BS-01 → Gemini API
```

#### BS-02: Prompt Builder Service

**담당:** 시스템 프롬프트 조합

**파일:** services/prompt-builder.ts

**주요 함수:**
```typescript
buildSystemPrompt(params): Promise<string>
```

**의존성:**
- BP-03 (getConfig)
- BR-04 (getStory)
- `config`, `stories`, `status_presets` 테이블

**호출 관계:**
```
BR-06 → BS-02 → BP-03, BR-04
```

#### BS-03: Memory Handler Service

**담당:** 세션 메모리 생성, 저장, 조회

**파일:** services/memory-handler.ts

**주요 함수:**
```typescript
generateAndSaveMemory(params): Promise<SessionMemory>
buildMemoryFromRows(rows): SessionMemory
```

**의존성:**
- BS-01 (gemini)
- BS-04 (session-manager)
- `session_memory` 테이블

**호출 관계:**
```
BR-06 → BS-03 → BS-01, session_memory 테이블
```

#### BS-04: Session Manager Service

**담당:** 세션 상태 관리, 슬라이딩 윈도우

**파일:** services/session-manager.ts

**주요 함수:**
```typescript
getSlidingWindow(messages, size): SessionMessage[]
```

**의존성:**
- 없음 (순수 함수)

**호출 관계:**
```
BS-03 → BS-04
```

#### BS-05: Crypto Service

**담당:** API 키 AES-256-GCM 암호화/복호화

**파일:** services/crypto.ts

**주요 함수:**
```typescript
encryptApiKey(apiKey): Promise<string>
decryptApiKey(encrypted): Promise<string>
```

**의존성:**
- `node:crypto`
- 환경변수: `API_KEY_ENCRYPTION_SECRET`

**호출 관계:**
```
BR-02 → BS-05 → user_profiles.api_key_encrypted
```

---

## 4. 프론트엔드 모듈 (Frontend Modules)

### 4.1 프론트엔드 개요

| 항목 | 값 |
|------|-----|
| **프레임워크** | React 19.0.0 |
| **빌드 도구** | Vite 6.0.0 |
| **위치** | frontend/src/ |
| **언어** | TypeScript |
| **진입점** | main.js |

### 4.2 페이지 (Pages)

| ID | 모듈 | 파일 | 라우트 | 역할 | 의존성 |
|----|------|------|--------|------|--------|
| **FP-01** | Home | pages/Home.tsx | / | 스토리 목록, 검색, 필터 | FC-01~05, FH-01 |
| **FP-02** | Play | pages/Play.tsx | /play/:id | 게임 플레이 | FC-06~16, FH-02 |
| **FP-03** | Editor | pages/Editor.tsx | /editor/:id? | 스토리 작성/편집 | FC-17~30, FH-03 |
| **FP-04** | Admin | pages/Admin.tsx | /admin | 관리자 대시보드 | FC-31~41, FH-04 |
| **FP-05** | Login | pages/Login.tsx | /login | 로그인 | FH-05 |
| **FP-06** | Signup | pages/Signup.tsx | /signup | 회원가입 | FH-05 |
| **FP-07** | Settings | pages/Settings.tsx | /settings | 설정 | FH-05, FH-06 |

#### FP-01: Home Page

**담당:** 스토리 발견, 탐색

**파일:** pages/Home.tsx

**주요 기능:**
- 추천 스토리 표시
- 스토리 목록 (페이지네이션)
- 장르 필터, 검색, 정렬
- 최근 플레이 세션 (이어하기)

**의존성:**
- FC-01: HeroSection
- FC-02: FeaturedSection
- FC-03: FilterBar
- FC-04: StoryGrid
- FC-05: ContinueSection
- FH-01: useStories

**호출 관계:**
```
Router → FP-01 → FC-01~05, FH-01 → BR-04
```

#### FP-02: Play Page

**담당:** 게임 플레이, SSE 연결

**파일:** pages/Play.tsx

**주요 기능:**
- AI와 대화
- 실시간 스트리밍
- 메모리/정보/노트 탭
- 세션 관리

**의존성:**
- FC-06: TopBar
- FC-07: StoryContent
- FC-08: InputArea
- FC-09: InfoPanel
- FC-10: SessionPanel
- FC-11: SuggestionChips
- FC-12: SystemEvent
- FC-13: DialogueBlock
- FC-14: NarratorBlock
- FC-15: CharacterModal
- FC-16: UserMessage
- FH-02: useGameEngine

**호출 관계:**
```
Router → FP-02 → FC-06~16, FH-02 → BR-06 (SSE)
```

#### FP-03: Editor Page

**담당:** 스토리 작성/편집

**파일:** pages/Editor.tsx

**주요 기능:**
- 기본 설정, 세계관, 캐릭터, 시스템 룰
- 상태창 설정, 게시 설정
- 프롬프트 미리보기
- 테스트 플레이

**의존성:**
- FC-17: EditorHeader
- FC-18: EditorSidebar
- FC-19: StorySection
- FC-20: CharacterSection
- FC-21: WorldSetting
- FC-22: SystemRules
- FC-23: BasicSettings
- FC-24: StatusSettings
- FC-25: OutputSettings
- FC-26: PublishSettings
- FC-27: ActionBar
- FC-28: PromptPreview
- FC-29: TestPlayModal
- FC-30: CharacterCard
- FH-03: useStoryEditor

**호출 관계:**
```
Router → FP-03 → FC-17~30, FH-03 → BR-04
```

#### FP-04: Admin Page

**담당:** 관리자 대시보드

**파일:** pages/Admin.tsx

**주요 기능:**
- 대시보드 (통계)
- 스토리/사용자 관리
- 서비스/API 로그
- 상태창 프리셋
- 게임 파라미터
- 위험 구역

**의존성:**
- FC-31: AdminNav
- FC-32: Dashboard
- FC-33: StoryManagement
- FC-34: UserManagement
- FC-35: ServiceLogs
- FC-36: ApiLogs
- FC-37: StatusPresets
- FC-38: GameParams
- FC-39: PromptSettings
- FC-40: DangerZone
- FC-41: AdminTablePlaceholder
- FH-04: useAdminDashboard

**호출 관계:**
```
Router → FP-04 → FC-31~41, FH-04 → BR-07
```

#### FP-05~07: Auth/Settings Pages

**담당:** 로그인, 회원가입, 설정

**파일:** pages/Login.tsx, pages/Signup.tsx, pages/Settings.tsx

**의존성:**
- FH-05: useAuth
- FH-06: useConfig

**호출 관계:**
```
Router → FP-05~07 → FH-05~06 → BR-01, BR-02, BR-03
```

### 4.3 컴포넌트 (Components)

| ID | 모듈 | 파일 | 역할 | 의존성 |
|----|------|------|------|--------|
| **FC-01** | HeroSection | components/home/HeroSection.tsx | 히어로 배너 | FH-01 |
| **FC-02** | FeaturedSection | components/home/FeaturedSection.tsx | 추천 스토리 | FH-01 |
| **FC-03** | FilterBar | components/home/FilterBar.tsx | 필터/검색/정렬 | - |
| **FC-04** | StoryGrid | components/home/StoryGrid.tsx | 스토리 카드 목록 | - |
| **FC-05** | StoryCard | components/home/StoryCard.tsx | 스토리 카드 | - |
| **FC-06** | ContinueSection | components/home/ContinueSection.tsx | 이어하기 | FH-07 |
| **FC-07** | Pagination | components/ui/Pagination.tsx | 페이지네이션 | - |
| **FC-08** | Toast | components/ui/Toast.tsx | 알림 메시지 | - |
| **FC-09** | TopBar | components/play/TopBar.tsx | 플레이 상단바 | FH-07 |
| **FC-10** | StoryContent | components/play/StoryContent.tsx | 스토리 내용 | FL-05, FL-06 |
| **FC-11** | InputArea | components/play/InputArea.tsx | 입력 영역 | FH-02 |
| **FC-12** | SuggestionChips | components/play/SuggestionChips.tsx | 제안 칩 | - |
| **FC-13** | InfoPanel | components/play/InfoPanel.tsx | 정보 패널 | FH-08 |
| **FC-14** | SessionPanel | components/play/SessionPanel.tsx | 세션 패널 | FH-07 |
| **FC-15** | SystemEvent | components/play/SystemEvent.tsx | 시스템 이벤트 | - |
| **FC-16** | DialogueBlock | components/play/DialogueBlock.tsx | 대화 블록 | FL-05 |
| **FC-17** | NarratorBlock | components/play/NarratorBlock.tsx | 내레이션 블록 | FL-05 |
| **FC-18** | UserMessage | components/play/UserMessage.tsx | 사용자 메시지 | - |
| **FC-19** | MemoryTab | components/play/MemoryTab.tsx | 메모리 탭 | FH-08 |
| **FC-20** | InfoTab | components/play/InfoTab.tsx | 정보 탭 | - |
| **FC-21** | NotesTab | components/play/NotesTab.tsx | 노트 탭 | - |
| **FC-22** | OutputTab | components/play/OutputTab.tsx | 출력 탭 | FL-05 |
| **FC-23** | EditorHeader | components/editor/EditorHeader.tsx | 에디터 헤더 | - |
| **FC-24** | EditorSidebar | components/editor/EditorSidebar.tsx | 에디터 사이드바 | - |
| **FC-25** | StorySection | components/editor/StorySection.tsx | 스토리 섹션 | - |
| **FC-26** | CharacterSection | components/editor/CharacterSection.tsx | 캐릭터 섹션 | - |
| **FC-27** | WorldSetting | components/editor/WorldSetting.tsx | 세계관 설정 | - |
| **FC-28** | SystemRules | components/editor/SystemRules.tsx | 시스템 룰 | - |
| **FC-29** | BasicSettings | components/editor/BasicSettings.tsx | 기본 설정 | - |
| **FC-30** | StatusSettings | components/editor/StatusSettings.tsx | 상태창 설정 | - |
| **FC-31** | OutputSettings | components/editor/OutputSettings.tsx | 출력 설정 | - |
| **FC-32** | PublishSettings | components/editor/PublishSettings.tsx | 게시 설정 | - |
| **FC-33** | ActionBar | components/editor/ActionBar.tsx | 액션 바 | - |
| **FC-34** | PromptPreview | components/editor/PromptPreview.tsx | 프롬프트 미리보기 | FH-09 |
| **FC-35** | TestPlayModal | components/editor/TestPlayModal.tsx | 테스트 플레이 모달 | FH-10 |
| **FC-36** | CharacterCard | components/editor/CharacterCard.tsx | 캐릭터 카드 | - |
| **FC-37** | AdminNav | components/admin/AdminNav.tsx | 관리자 네비게이션 | - |
| **FC-38** | Dashboard | components/admin/Dashboard.tsx | 대시보드 | FH-04 |
| **FC-39** | StoryManagement | components/admin/StoryManagement.tsx | 스토리 관리 | FH-11 |
| **FC-40** | UserManagement | components/admin/UserManagement.tsx | 사용자 관리 | FH-12 |
| **FC-41** | ServiceLogs | components/admin/ServiceLogs.tsx | 서비스 로그 | FH-13 |
| **FC-42** | ApiLogs | components/admin/ApiLogs.tsx | API 로그 | FH-14 |
| **FC-43** | ApiLogDetail | components/admin/ApiLogDetail.tsx | API 로그 상세 | - |
| **FC-44** | StatusPresets | components/admin/StatusPresets.tsx | 상태창 프리셋 | FH-15 |
| **FC-45** | GameParams | components/admin/GameParams.tsx | 게임 파라미터 | FH-06 |
| **FC-46** | PromptSettings | components/admin/PromptSettings.tsx | 프롬프트 설정 | FH-06 |
| **FC-47** | DangerZone | components/admin/DangerZone.tsx | 위험 구역 | FH-06 |
| **FC-48** | AdminTablePlaceholder | components/admin/AdminTablePlaceholder.tsx | 테이블 플레이스홀더 | - |
| **FC-49** | Header | components/layout/Header.tsx | 헤더 | FH-05 |
| **FC-50** | PendingApproval | components/PendingApproval.tsx | 승인 대기 페이지 | - |

### 4.4 훅 (Hooks)

| ID | 모듈 | 파일 | 역할 | 의존성 |
|----|------|------|------|--------|
| **FH-01** | useStories | hooks/useStories.ts | 스토리 목록 조회/필터 | FL-01 |
| **FH-02** | useGameEngine | hooks/useGameEngine.ts | 게임 엔진 (SSE 연결) | FL-01, FL-02 |
| **FH-03** | useStoryEditor | hooks/useStoryEditor.ts | 스토리 에디터 | FL-01 |
| **FH-04** | useAdminDashboard | hooks/useAdminDashboard.ts | 관리자 대시보드 | FL-01 |
| **FH-05** | useAuth | hooks/useAuth.ts | 인증 (로그인/로그아웃) | FL-03 |
| **FH-06** | useConfig | hooks/useConfig.ts | 전역 설정 | FL-01 |
| **FH-07** | useSessions | hooks/useSessions.ts | 세션 목록/삭제 | FL-01 |
| **FH-08** | useMemory | hooks/useMemory.ts | 세션 메모리 조회 | FL-01 |
| **FH-09** | usePromptPreview | hooks/usePromptPreview.ts | 프롬프트 미리보기 | FL-01 |
| **FH-10** | useTestPlayEngine | hooks/useTestPlayEngine.ts | 테스트 플레이 엔진 | FL-01, FL-02 |
| **FH-11** | useAdminStories | hooks/useAdminStories.ts | 관리자 스토리 관리 | FL-01 |
| **FH-12** | useAdminUsers | hooks/useAdminUsers.ts | 관리자 사용자 관리 | FL-01 |
| **FH-13** | useLogs | hooks/useLogs.ts | 로그 조회 | FL-04 |
| **FH-14** | usePresets | hooks/usePresets.ts | 프리셋 관리 | FL-01 |
| **FH-15** | useStatusPresets | hooks/useStatusPresets.ts | 상태창 프리셋 | FL-01 |

#### FH-01: useStories

**담당:** 스토리 목록 조회, 필터, 검색, 정렬

**파일:** hooks/useStories.ts

**주요 함수:**
```typescript
useStories(params): { stories, loading, error, refetch }
```

**의존성:**
- FL-01 (api client)

**호출 관계:**
```
FP-01 → FH-01 → FL-01 → BR-04
```

#### FH-02: useGameEngine

**담당:** 게임 엔진, SSE 연결, 메시지 전송

**파일:** hooks/useGameEngine.ts

**주요 함수:**
```typescript
useGameEngine(sessionId): { messages, send, loading, error }
```

**의존성:**
- FL-01 (api client)
- FL-02 (sse client)

**호출 관계:**
```
FP-02 → FH-02 → FL-01, FL-02 → BR-06 (SSE)
```

#### FH-05: useAuth

**담당:** 로그인, 로그아웃, 토큰 관리

**파일:** hooks/useAuth.ts

**주요 함수:**
```typescript
useAuth(): { user, login, logout, signup, loading }
```

**의존성:**
- FL-03 (auth client)

**호출 관계:**
```
FP-05~07 → FH-05 → FL-03 → BR-01
```

### 4.5 라이브러리 (Lib)

| ID | 모듈 | 파일 | 역할 | 의존성 |
|----|------|------|------|--------|
| **FL-01** | api | lib/api.ts | API 클라이언트 (fetch wrapper) | FH-05 |
| **FL-02** | sse | lib/sse.ts | SSE 클라이언트 (EventSource wrapper) | - |
| **FL-03** | auth | lib/auth.ts | 인증 클라이언트 (토큰 관리) | - |
| **FL-04** | format | lib/format.ts | 포맷 유틸 (날짜, 숫자) | - |
| **FL-05** | markdown | lib/markdown.ts | 마크다운 렌더러 (marked + DOMPurify) | - |
| **FL-06** | status-parser | lib/status-parser.ts | 상태창 파서 (```status 블록) | - |
| **FL-07** | theme | lib/theme.ts | 테마 유틸 (다크모드) | - |
| **FL-08** | genre | lib/genre.ts | 장르 유틸 (아이콘, 색상) | - |
| **FL-09** | constants | lib/constants.ts | 상수 정의 | - |

#### FL-01: API Client

**담당:** HTTP API 호출

**파일:** lib/api.ts

**주요 함수:**
```typescript
api.get(url, options)
api.post(url, data, options)
api.put(url, data, options)
api.delete(url, options)
```

**의존성:**
- FL-03 (auth - 토큰 주입)

**호출 관계:**
```
모든 FH → FL-01 → BR-01~07
```

#### FL-02: SSE Client

**담당:** SSE 스트리밍

**파일:** lib/sse.ts

**주요 함수:**
```typescript
connectSSE(url, handlers): EventSource
```

**의존성:**
- FL-03 (auth - 토큰 주입)

**호출 관계:**
```
FH-02 → FL-02 → BR-06 (SSE)
```

#### FL-03: Auth Client

**담당:** JWT 토큰 저장소, 주입

**파일:** lib/auth.ts

**주요 함수:**
```typescript
getAccessToken(): string | null
setAccessToken(token): void
clearAccessToken(): void
getAuthHeaders(): { Authorization: string }
```

**의존성:**
- localStorage

**호출 관계:**
```
FL-01 → FL-03 (토큰 주입)
FL-02 → FL-03 (토큰 주입)
```

---

## 5. 의존성 매트릭스 (Dependency Matrix)

### 5.1 백엔드 모듈 의존성

```
server.ts
  ├─→ BP-01 (Supabase)
  ├─→ BP-02 (Auth) ──→ BP-01
  ├─→ BP-03 (Config Cache) ──→ BP-01
  ├─→ BP-04 (Request Logger) ──→ BP-01
  └─→ Routes
      ├─→ BR-01 (Auth) ──→ BP-02
      ├─→ BR-02 (Me) ──→ BP-02, BS-05
      ├─→ BR-03 (Config) ──→ BP-02, BP-03
      ├─→ BR-04 (Stories) ──→ BP-02
      ├─→ BR-05 (Sessions) ──→ BP-02
      ├─→ BR-06 (Game) ──→ BP-02, BP-03, BS-01~04
      └─→ BR-07 (Admin) ──→ BP-02

Services
  ├─→ BS-01 (Gemini)
  ├─→ BS-02 (Prompt Builder) ──→ BP-03, BR-04
  ├─→ BS-03 (Memory Handler) ──→ BS-01, BS-04
  ├─→ BS-04 (Session Manager)
  └─→ BS-05 (Crypto)
```

### 5.2 프론트엔드 모듈 의존성

```
main.js
  └─→ App.tsx
      └─→ Pages (FP-01~07)
          ├─→ Components (FC-01~50)
          │   └─→ Hooks (FH-01~15)
          │       └─→ Lib (FL-01~09)
          └─→ Hooks (FH-01~15)
              └─→ Lib (FL-01~09)

Lib (FL-01~09)
  ├─→ FL-01 (api) ──→ FL-03 (auth)
  ├─→ FL-02 (sse) ──→ FL-03 (auth)
  ├─→ FL-03 (auth) ──→ localStorage
  ├─→ FL-04~09 ──→ (독립)
```

### 5.3 크로스-레이어 의존성

```
Frontend (FL-01~03)
  └─→ Backend (BR-01~07)
      └─→ Services (BS-01~05)
          └─→ External APIs (Gemini, Supabase)
```

---

## 6. 모듈별 담당 영역 (Module Responsibilities)

### 6.1 백엔드 모듈

| 모듈 | 담당 영역 |
|------|----------|
| **BP-01** | DB 연결, 쿼리 실행 |
| **BP-02** | 인증/인가, 사용자 컨텍스트 |
| **BP-03** | 전역 설정 캐싱 |
| **BP-04** | 요청 로그 기록 |
| **BR-01** | 회원가입, 로그인, 로그아웃 |
| **BR-02** | 프로필 관리, API 키 |
| **BR-03** | 전역 설정 조회/수정 |
| **BR-04** | 스토리 CRUD |
| **BR-05** | 세션 CRUD |
| **BR-06** | 게임 로직, SSE 스트리밍 |
| **BR-07** | 관리자 기능 |
| **BS-01** | AI API 호출 |
| **BS-02** | 프롬프트 조합 |
| **BS-03** | 메모리 생성/저장 |
| **BS-04** | 세션 상태 관리 |
| **BS-05** | 암호화/복호화 |

### 6.2 프론트엔드 모듈

| 모듈 | 담당 영역 |
|------|----------|
| **FP-01** | 스토리 탐색 |
| **FP-02** | 게임 플레이 |
| **FP-03** | 스토리 작성/편집 |
| **FP-04** | 관리자 대시보드 |
| **FP-05~07** | 인증, 설정 |
| **FC-01~50** | UI 컴포넌트 |
| **FH-01~15** | 상태 관리, 비즈니스 로직 |
| **FL-01~09** | API 통신, 유틸리티 |

---

## 7. 모듈 인터페이스 (Module Interfaces)

### 7.1 공유 인터페이스 (@story-game/shared)

```typescript
// Story
export interface Story {
  id: string;
  title: string;
  description: string;
  tags: string[];
  // ... 전체 필드는 story.ts 참고
}

// Session
export interface Session {
  id: string;
  storyId: string;
  title: string;
  messages: SessionMessage[];
  // ... 전체 필드는 session.ts 참고
}

// AuthUser
export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  role: 'pending' | 'user' | 'admin';
}
```

### 7.2 백엔드 인터페이스

```typescript
// Plugin
export interface FastifyPlugin {
  (app: FastifyInstance): Promise<void>;
}

// Route Handler
export interface RouteHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

// Service
export interface Service {
  // 각 서비스마다 다름
}
```

### 7.3 프론트엔드 인터페이스

```typescript
// Hook
export interface UseStoriesResult {
  stories: StoryListItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Component Props
export interface StoryCardProps {
  story: StoryListItem;
  onPlay: (storyId: string) => void;
}
```

---

## 8. 모듈 변경 영향 분석 (Change Impact Analysis)

### 8.1 백엔드 변경 영향

| 변경 모듈 | 영향 받는 모듈 |
|----------|---------------|
| **BP-01** | 모든 라우트, 모든 서비스 |
| **BP-02** | 모든 라우트 |
| **BP-03** | BR-03, BR-06, BS-02 |
| **BR-04** | FP-01, FP-03, FH-01, FH-03 |
| **BR-06** | FP-02, FH-02 |
| **BS-01** | BR-06, BS-03 |

### 8.2 프론트엔드 변경 영향

| 변경 모듈 | 영향 받는 모듈 |
|----------|---------------|
| **FL-01** | 모든 훅 (FH-01~15) |
| **FL-03** | FL-01, FL-02 |
| **FH-01** | FP-01, FC-01~05 |
| **FH-02** | FP-02, FC-06~16 |

### 8.3 공유 타입 변경 영향

| 변경 모듈 | 영향 받는 모듈 |
|----------|---------------|
| **story.ts** | BR-04, FH-01, FH-03, FP-01, FP-03 |
| **session.ts** | BR-05, BR-06, FH-02, FH-07, FP-02 |
| **auth.ts** | BR-01, BR-02, FH-05, FP-05~07 |
| **config.ts** | BR-03, BS-02, FH-06, FP-04 |

---

## 9. 모듈 테스트 범위 (Module Test Scope)

### 9.1 단위 테스트 (미구현)

| 모듈 | 테스트 항목 | 우선순위 |
|------|-----------|---------|
| **BS-01** | Gemini API 호출, 스트리밍 | P1 |
| **BS-02** | 프롬프트 조합 로직 | P1 |
| **BS-03** | 메모리 생성, 저장 | P1 |
| **BS-04** | 슬라이딩 윈도우 | P1 |
| **BS-05** | 암호화/복호화 | P1 |
| **FL-01~03** | API 클라이언트 | P1 |
| **FL-05~06** | 마크다운, 파서 | P2 |
| **FH-01~15** | 훅 로직 | P2 |

### 9.2 통합 테스트 (미구현)

| 모듈 | 테스트 항목 | 우선순위 |
|------|-----------|---------|
| **BR-01** | 인증 플로우 | P1 |
| **BR-04** | 스토리 CRUD | P1 |
| **BR-06** | 게임 플레이 플로우 | P1 |
| **FH-02** | 게임 엔진 | P2 |

### 9.3 E2E 테스트 (계획됨)

| 시나리오 | 테스트케이스 수 |
|---------|---------------|
| **Home** | 32개 |
| **Play** | 60개 |
| **Editor** | 73개 |
| **Admin** | 70개 |
| **전체** | 235개 |

---

## 10. 참고 문서

### 10.1 관련 문서 (Phase 2)

- `docs/sdlc/phase2-design/01-Architecture-Definition.md` - 아키텍처 정의서
- `docs/sdlc/phase2-design/02-API-Design-Specification.md` - API 설계서
- `docs/sdlc/phase2-design/XX-Screen-Design.md` - 화면 설계서 (Designer)
- `docs/sdlc/phase2-design/XX-Table-Definition.md` - 테이블 정의서 (DBA)

### 10.2 소스 코드 참고

- `packages/shared/src/types/` - 공유 타입
- `backend/src/` - 백엔드 소스
- `frontend/src/` - 프론트엔드 소스

---

## 부록 A: 모듈 ID 색인

### A.1 백엔드 모듈 ID

- **BP-01~04**: Backend Plugins
- **BR-01~07**: Backend Routes
- **BS-01~05**: Backend Services

### A.2 프론트엔드 모듈 ID

- **FP-01~07**: Frontend Pages
- **FC-01~50**: Frontend Components
- **FH-01~15**: Frontend Hooks
- **FL-01~09**: Frontend Lib

---

## 부록 B: 용어 정의

| 용어 | 정의 |
|------|------|
| **모듈** | 기능적으로 독립적인 코드 단위 (파일/디렉토리) |
| **컴포넌트** | React UI 컴포넌트 |
| **훅** | React 커스텀 훅 (상태 관리, 비즈니스 로직) |
| **서비스** | 백엔드 비즈니스 로직 모듈 |
| **플러그인** | Fastify 플러그인 (미들웨어) |
| **라우트** | Fastify 라우트 핸들러 |
| **의존성** | 모듈 간 참조 관계 |
