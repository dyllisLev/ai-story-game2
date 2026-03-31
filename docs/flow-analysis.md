# AI Story Game - 전체 플로우 분석

> 사용자/관리자/에디터 관점에서 전체 데이터 흐름을 정리한 문서.
> 모든 에이전트가 참조할 수 있도록 프론트엔드, 백엔드, DB를 함께 기술한다.

---

## 1. 사용자 플로우

### 1.1 회원가입 / 로그인

```
[Signup.tsx / Login.tsx]
  → POST /api/auth/signup | /api/auth/login
    → Supabase Auth (auth.users)
    → user_profiles 자동 생성 (trigger: on_auth_user_created)
  ← { user, accessToken, refreshToken }
  → localStorage에 토큰 저장
  → 재방문 시 GET /api/me로 세션 복원
```

| 계층 | 파일 |
|------|------|
| Frontend | `pages/Signup.tsx`, `pages/Login.tsx`, `lib/auth.tsx` (AuthProvider + useAuth) |
| Backend | `routes/auth.ts` — signup, login, logout, refresh |
| DB | `auth.users`, `user_profiles` (id, nickname, api_key_enc, role) |

**RLS:** user_profiles — SELECT/UPDATE는 `auth.uid() = id` (본인만)

---

### 1.2 스토리 목록 조회 및 선택

```
[Home.tsx]
  → useStories() → GET /api/stories?genre=&search=&sort=latest&page=1&limit=20
    → stories_safe 뷰 (is_public=true, password_hash 숨김)
  ← 페이지네이션된 스토리 배열
  → StoryCard 클릭 → /play/{storyId}
```

| 계층 | 파일 |
|------|------|
| Frontend | `pages/Home.tsx`, `components/home/*` (HeroSection, ContinueSection, FeaturedSection, FilterBar, StoryGrid, StoryList, StoryCard) |
| Hooks | `useStories()`, `useFeaturedStories()`, `useSessions()` (이어하기용) |
| Backend | `routes/stories/list.ts` — GET /api/stories, `routes/stories/detail.ts` — GET /api/stories/:id |
| DB | `stories` 테이블, `stories_safe` 뷰 |

**필터:** genre (tags 배열), search (title/description ilike), sort (latest/popular/name), featured

---

### 1.3 게임 세션 시작

```
[Play.tsx] — 3단 레이아웃 (세션목록 | 스토리 | 정보패널)
  → "새 세션 시작" 클릭
  → POST /api/game/start { storyId, model, options }
    → stories 테이블에서 스토리 조회
    → prompt-builder.buildPrompt() — 시스템 프롬프트 조합
    → sessions 테이블에 새 행 생성
  ← { sessionId, sessionToken, systemPrompt, startMessage, safetySettings }
  → useGameEngine 상태 초기화 + localStorage 저장
```

| 계층 | 파일 |
|------|------|
| Frontend | `pages/Play.tsx`, `components/play/*` (TopBar, SessionPanel, StoryContent, InputArea, InfoPanel) |
| Hooks | `useGameEngine()` (핵심 게임 로직), `useSession()` (세션 CRUD) |
| Backend | `routes/game/start.ts`, `services/prompt-builder.ts`, `services/session-manager.ts` |
| DB | `stories`, `sessions` |

**프롬프트 구성:** world_setting + story + characters + character_name/setting + user_note + system_rules + 상태창 규칙 + LaTeX 규칙 + 서술 길이 템플릿

---

### 1.4 채팅 기반 스토리 진행 (SSE 스트리밍)

```
[InputArea.tsx] — 사용자 입력 (모드 접두사: [행동], [생각], [대사], [장면 지시])
  → useGameEngine.sendMessage()
  → POST /api/game/chat { sessionId, userMessage, regenerate? }
    → session + story + session_memory 조회
    → 시스템 프롬프트 = story 프롬프트 + memory 프롬프트
    → sliding window 적용 (최근 N개 메시지)
  ← { systemPrompt, contents, safetySettings, model }
  → 프론트엔드가 Gemini API 직접 호출 (lib/sse.ts)
    → POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse
    → 헤더: x-goog-api-key: {사용자 API 키}
  ← SSE 스트림 → StoryContent 실시간 렌더링
  → 응답에서 상태창 블록 파싱 (```status...```)
  → 대화 기록 업데이트 → 자동 저장
```

| 계층 | 파일 |
|------|------|
| Frontend | `lib/sse.ts` (streamGenerate), `hooks/useGameEngine.ts`, `components/play/StoryContent.tsx` |
| Backend | `routes/game/chat.ts`, `services/prompt-builder.ts` (buildMemoryPrompt), `services/session-manager.ts` (applySlidingWindow, prepareContents) |
| DB | `sessions`, `session_memory` (short_term, long_term, characters, goals) |

**핵심 아키텍처:** Gemini API는 프론트엔드에서 직접 호출. 백엔드는 프롬프트 조합만 담당. 사용자 API 키 사용.

---

### 1.5 세션 저장 / 불러오기

```
저장 (자동):
  → 30초 간격 / 탭 전환 / 페이지 이탈 시
  → localStorage: ai-story-session-{sessionId}
  → PUT /api/sessions/{id} (클라우드 동기화)

불러오기:
  → localStorage 확인 → 없으면 GET /api/sessions/{id}
  → 메모리: GET /api/sessions/{id}/memory
```

| 계층 | 파일 |
|------|------|
| Frontend | `hooks/useSession.ts` (localStorage + API CRUD), `hooks/useMemory.ts` (메모리 관리) |
| Backend | `routes/sessions/crud.ts` (POST/PUT/DELETE), `routes/sessions/list.ts` (GET), `routes/sessions/detail.ts` (GET :id), `routes/sessions/memory.ts` |
| DB | `sessions` (messages JSONB, preset JSONB), `session_memory` (session_id + type UNIQUE) |

**localStorage 키:**
- `ai-story-game-sessions` — 세션 목록 (최근 50개)
- `ai-story-session-{id}` — 전체 세션 데이터
- `ai-story-session-{id}-memory` — 세션 메모리 캐시

---

### 1.6 프로필 / API 키 관리

```
[Settings.tsx] — 닉네임 수정
  → PUT /api/me { nickname }

[ApiKeySettings.tsx] — API 키 관리
  → GET /api/me/apikey ← { has_api_key, maskedKey }
  → PUT /api/me/apikey { apiKey } → AES 암호화 → user_profiles.api_key_enc
  → DELETE /api/me/apikey → null로 설정

[Play TopBar] — 세션 중 API 키 입력 → sessionStorage (DB 미저장)
```

| 계층 | 파일 |
|------|------|
| Frontend | `pages/Settings.tsx`, `pages/ApiKeySettings.tsx`, `components/play/TopBar.tsx` |
| Backend | `routes/me.ts` — GET/PUT /api/me, GET/PUT/DELETE /api/me/apikey |
| Service | `services/crypto.ts` — AES 암호화/복호화 |
| DB | `user_profiles` (api_key_enc) |

---

## 2. 관리자 플로우

### 2.1 대시보드

```
[Admin.tsx → Dashboard.tsx]
  → useAdminDashboard() → GET /api/admin/dashboard
  ← {
      stories: { total, public, featured },
      sessions: { total, active_today },
      users: { total, active_today },
      system: { error_rate_24h, avg_response_ms, total_requests_today },
      recent_events: ApiLog[]
    }
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/Dashboard.tsx`, `hooks/useAdminDashboard.ts` |
| Backend | `routes/admin/dashboard.ts` |
| DB | `stories`, `sessions`, `user_profiles`, `service_logs`, `api_logs` — 집계 쿼리 |

---

### 2.2 스토리 관리

```
[Admin.tsx → StoryManagement.tsx]
  → GET /api/admin/stories (비공개 포함, 필터/검색)
  → PUT /api/admin/stories/:id/featured (추천 토글)
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/StoryManagement.tsx` |
| Backend | `routes/admin/stories.ts` |
| DB | `stories` |

---

### 2.3 사용자 관리

```
[Admin.tsx → UserManagement.tsx]
  → GET /api/admin/users (역할 필터, 검색, 페이지네이션)
  → PUT /api/admin/users/:id/role { role: 'pending' | 'user' | 'admin' }
  → DELETE /api/admin/users/:id
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/UserManagement.tsx` |
| Backend | `routes/admin/users.ts` |
| DB | `user_profiles` (role 컬럼) |

---

### 2.4 시스템 설정 관리

```
[Admin.tsx → PromptSettings.tsx / GameParams.tsx]
  → useAdminConfig() → GET /api/config
  → PUT /api/config (admin only)
  → config 캐시 무효화
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/PromptSettings.tsx`, `components/admin/GameParams.tsx`, `hooks/useAdminConfig.ts` |
| Backend | `routes/config.ts`, `plugins/config-cache.ts` |
| DB | `config` 테이블 — `prompt_config`, `gameplay_config` (JSONB) |

**prompt_config:** system_preamble, narrative_length_template, latex_rules, safety_settings, memory_system_instruction, memory_request, game_start_message, cache_ttl

**gameplay_config:** default_narrative_length, sliding_window_size, max_history, message_limit, auto_save_interval_ms 등

---

### 2.5 상태창 프리셋 관리

```
[Admin.tsx → StatusPresets.tsx]
  → GET /api/admin/status-presets
  → POST /api/admin/status-presets { title, genre, attributes }
  → PUT /api/admin/status-presets/:id
  → DELETE /api/admin/status-presets/:id
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/StatusPresets.tsx`, `components/admin/PresetEditModal.tsx` |
| Backend | `routes/admin/status-presets.ts` |
| DB | `status_presets` (title, genre, attributes JSONB) |

**attributes 스키마:** `[{ name, type: "number"|"text"|"gauge", max_value }]`

**기본 프리셋:** 무협 기본, 판타지 기본, 현대 기본

---

### 2.6 서비스 / API 로그 확인

```
서비스 로그:
  → GET /api/admin/service-logs (status_code, path, from/to 필터)
  → GET /api/admin/service-logs/stats (error_rate_24h, avg_response_ms)

API 로그:
  → GET /api/admin/api-logs (endpoint, session_id, errors_only 필터)
  → GET /api/admin/api-logs/stats (total_calls_today, total_tokens_today)
  → GET /api/admin/api-logs/:id (상세 — 프롬프트, 메시지, 응답 전문)
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/ServiceLogs.tsx`, `components/admin/ApiLogs.tsx`, `components/admin/ApiLogDetail.tsx` |
| Backend | `routes/admin/service-logs.ts`, `routes/admin/api-logs.ts` |
| DB | `service_logs` (method, path, status_code, duration_ms), `api_logs` (endpoint, request/response 전문, duration_ms) |

---

### 2.7 위험 기능 (데이터 초기화)

```
[Admin.tsx → DangerZone.tsx]
  → DELETE /api/admin/danger-zone/sessions   — 전체 세션 삭제
  → DELETE /api/admin/danger-zone/logs       — 서비스+API 로그 삭제
  → DELETE /api/admin/danger-zone/all        — 세션 + 로그 전체 삭제
```

| 계층 | 파일 |
|------|------|
| Frontend | `components/admin/DangerZone.tsx` (확인 다이얼로그 포함) |
| Backend | `routes/admin/danger-zone.ts` |
| DB | `sessions`, `service_logs`, `api_logs` — TRUNCATE |

---

## 3. 에디터 플로우

### 3.1 스토리 기본 정보 편집

```
[Editor.tsx → BasicSettings.tsx]
  → 프리셋 선택 (dropdown)
  → 장르 (chip — 단일 선택)
  → 아이콘 (12개 이모지 그리드)
  → AI 모델 선택 (Gemini 2.0 Flash/Pro, 1.5 Pro)
  → 제목 (필수)
```

---

### 3.2 프롬프트 설정

```
[Editor.tsx → SystemRules.tsx + WorldSetting.tsx + StorySection.tsx + CharacterSection.tsx]
  → 시스템 규칙, 세계관, 스토리 배경, 캐릭터 설정
  → PromptPreview.tsx — 실시간 프롬프트 미리보기 (usePromptPreview 훅)
```

---

### 3.3 상태창 커스터마이징

```
[Editor.tsx → StatusSettings.tsx]
  → 상태창 ON/OFF 토글
  → 퀵 프리셋 (무협/판타지/현대)
  → 속성 테이블: 추가/편집/삭제/드래그 정렬
  → 속성 타입: bar, percent, number, text, list
  → 최대값 설정
```

**저장 위치:** `stories.preset` JSONB → `{ useStatusWindow, statusAttributes: [{id, name, type, max}] }`

---

### 3.4 출력 / 공개 설정

```
[Editor.tsx → OutputSettings.tsx + PublishSettings.tsx]
  → 서술 길이 슬라이더 (1~5)
  → LaTeX 사용 토글
  → 캐시 사용 토글
  → 공개/비공개 설정
  → 비밀번호 보호 (공개 시 선택)
```

---

### 에디터 저장 흐름

```
useStoryEditor 훅
  → 자동 저장: 1.2초 디바운스 + 60초 간격
  → POST /api/stories (신규) 또는 PUT /api/stories/:id (수정)
    → stories 테이블 업데이트
  → 완성도 추적: 5개 필수 필드 기반
```

| 계층 | 파일 |
|------|------|
| Frontend | `pages/Editor.tsx`, `components/editor/*` (BasicSettings, SystemRules, WorldSetting, StorySection, CharacterSection, StatusSettings, OutputSettings, PublishSettings, PromptPreview, PreviewPanel, ActionBar) |
| Hooks | `useStoryEditor()`, `usePromptPreview()`, `usePresets()` |
| Backend | `routes/stories/crud.ts` — POST/PUT/DELETE /api/stories |
| DB | `stories`, `presets` |

---

## 4. 데이터베이스 스키마

### 테이블 요약

| 테이블 | 용도 | RLS 정책 |
|--------|------|----------|
| `stories` | 스토리 설정 데이터 | SELECT: 공개 or 소유자 / INSERT·UPDATE·DELETE: 소유자만 |
| `sessions` | 게임 세션 (메시지 포함) | owner_uid 본인 or NULL (게스트) |
| `session_memory` | 세션별 메모리 (4종) | session의 owner 기준 |
| `presets` | 스토리 프리셋 템플릿 | SELECT: 전체 공개 / 쓰기: service_role |
| `status_presets` | 상태창 속성 프리셋 | SELECT: 전체 공개 / 쓰기: service_role |
| `config` | 앱 설정 (prompt, gameplay) | SELECT: 전체 공개 / 쓰기: service_role |
| `user_profiles` | 사용자 프로필 + API키 | SELECT·UPDATE: 본인만 |
| `api_logs` | Gemini API 호출 기록 | service_role만 접근 |
| `service_logs` | HTTP 요청 기록 | service_role만 접근 |

### 외래 키 관계

```
auth.users
├── stories.owner_uid
├── sessions.owner_uid
└── user_profiles.id (1:1)

stories
├── sessions.story_id
└── api_logs.session_id (간접)

sessions
├── session_memory.session_id (CASCADE)
└── api_logs.session_id

status_presets
└── presets.status_preset_id
```

### 뷰

- **stories_safe** — 공개 스토리만 노출, password_hash 숨김 (→ has_password boolean)

### 인덱스 전략

- **조회 성능:** is_public, created_at, play_count, is_featured
- **검색:** tags GIN 인덱스
- **FK:** owner_uid, story_id, session_id
- **정렬:** last_played_at DESC, turn_count DESC
- **감사:** api_logs.created_at, service_logs.timestamp

---

## 5. 인증 모델

| 수준 | 대상 | 접근 범위 |
|------|------|-----------|
| anon | 미인증 | 공개 스토리 조회, config/presets 읽기 |
| authenticated | 로그인 사용자 | 본인 스토리/세션 CRUD, 프로필 관리 |
| service_role | 백엔드 서버 | 관리자 API, 로깅, RPC, config 쓰기 |

**게스트 세션:** owner_uid IS NULL인 세션은 누구나 접근 가능 (인증 없이 플레이 지원)

---

## 6. 핵심 서비스

| 서비스 | 파일 | 역할 |
|--------|------|------|
| prompt-builder | `services/prompt-builder.ts` | 스토리+메모리 → 시스템 프롬프트 조합 |
| session-manager | `services/session-manager.ts` | sliding window, Gemini 포맷 변환 |
| gemini | `services/gemini.ts` | 메모리 생성용 Gemini 호출 (채팅은 프론트엔드 직접) |
| crypto | `services/crypto.ts` | API 키 AES 암호화/복호화 |

---

## 7. 플러그인

| 플러그인 | 파일 | 역할 |
|----------|------|------|
| supabase | `plugins/supabase.ts` | Supabase 클라이언트 초기화 |
| auth | `plugins/auth.ts` | JWT 검증 + 요청 데코레이터 |
| config-cache | `plugins/config-cache.ts` | config 테이블 캐싱 |
| request-logger | `plugins/request-logger.ts` | HTTP 요청 → service_logs 기록 |
