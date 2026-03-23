# 마이그레이션 구현 태스크

> UI 데이터 체크리스트의 미구현 항목(`- [ ]`)을 DB 테이블/서비스 기준으로 그룹화한 문서
> 새 스택: **pnpm monorepo** / **Fastify 5 + TypeScript** (backend) / **React** (frontend, Phase 2) / **Supabase JS SDK** / **`@story-game/shared`** 공유 타입
> 생성일: 2026-03-23 (rewrite)

---

## 의존성 그래프

```
Task 1 (stories 확장) ──┐
Task 2 (sessions 확장) ─┤
Task 4 (presets 확장) ──┤──→ Task 8 (stories API) ──→ Task 10 (프론트엔드 전용)
Task 5 (status_presets) ┤
Task 9 (config 확장) ───┘
Task 3 (users/profiles) ──→ Task 8 (owner 인증이 필요)
Task 6 (service_logs) ─────→ Task 7 (api_logs) ──→ Task 10 (admin 뷰어)

우선순위:
Phase 1-A: Task 1 → 2 → 4 → 5 → 9 (DB 스키마 + shared 타입)
Phase 1-B: Task 3 (인증 시스템)
Phase 1-C: Task 6 → 7 (로깅 시스템)
Phase 1-D: Task 8 (stories API — 1-A, 1-B 완료 후)
Phase 2:   Task 10 (React 프론트엔드 — 모든 백엔드 완료 후)
```

---

## Task 1: stories 테이블 확장

### Supabase Migration

**파일:** `supabase/migrations/00000000000010_extend_stories.sql`

```sql
ALTER TABLE story_game.stories
  ADD COLUMN description TEXT DEFAULT '',
  ADD COLUMN tags TEXT[] DEFAULT '{}',
  ADD COLUMN icon TEXT DEFAULT '📖',
  ADD COLUMN banner_gradient TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  ADD COLUMN play_count INTEGER DEFAULT 0,
  ADD COLUMN like_count INTEGER DEFAULT 0,
  ADD COLUMN badge TEXT CHECK (badge IN ('new', 'hot')),
  ADD COLUMN is_featured BOOLEAN DEFAULT false,
  ADD COLUMN owner_name TEXT DEFAULT '';

CREATE INDEX idx_sg_stories_featured ON story_game.stories(is_featured) WHERE is_featured = true;
CREATE INDEX idx_sg_stories_play_count ON story_game.stories(play_count DESC);
CREATE INDEX idx_sg_stories_tags ON story_game.stories USING GIN(tags);

-- stories_safe VIEW 재생성 (새 컬럼 포함)
DROP VIEW IF EXISTS story_game.stories_safe;
CREATE VIEW story_game.stories_safe
  WITH (security_invoker = false)
AS SELECT
  id, title, description, tags, icon, banner_gradient,
  play_count, like_count, badge, is_featured, owner_name,
  world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex, is_public,
  (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM story_game.stories
WHERE is_public = true;

GRANT SELECT ON story_game.stories_safe TO anon, authenticated;
```

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/story.ts` — 기존 `Story` 인터페이스 확장

```typescript
// 추가 필드
export interface Story {
  // ... 기존 필드 ...
  description: string;
  tags: string[];
  icon: string;
  banner_gradient: string;
  play_count: number;
  like_count: number;
  badge: 'new' | 'hot' | null;
  is_featured: boolean;
  owner_name: string;
}

export interface StoryListItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  icon: string;
  banner_gradient: string;
  play_count: number;
  like_count: number;
  badge: 'new' | 'hot' | null;
  is_featured: boolean;
  has_password: boolean;
  owner_name: string;
  created_at: string;
}

export interface StoryStats {
  total_stories: number;
  total_plays: number;
  total_authors: number;
}
```

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/stories/list.ts` — 변경

- `GET /api/stories` 응답에 새 필드 포함 (description, tags, icon, banner_gradient, play_count, like_count, badge, is_featured, owner_name)
- 쿼리 파라미터 추가: `genre` (태그 필터), `sort` (latest/popular/name), `featured` (추천만)
- Supabase JS SDK: `supabase.from('stories_safe').select('*').contains('tags', [genre])`

**파일:** `backend/src/routes/stories/crud.ts` — 변경

- `POST /api/stories` 요청 body에 새 필드 허용
- `PUT /api/stories/:id` 요청 body에 새 필드 허용

**파일:** `backend/src/routes/stories/stats.ts` — 신규

- `GET /api/stories/stats` → `{ total_stories, total_plays, total_authors }` 집계 쿼리

### React Components (Phase 2)

**파일:** `frontend/src/components/story/StoryCard.tsx` — 그리드 카드 (배너, 배지, 태그, 통계)
**파일:** `frontend/src/components/story/StoryListRow.tsx` — 리스트 행 (아이콘, 설명, 태그, 통계)
**파일:** `frontend/src/components/story/FeaturedCard.tsx` — 추천 카드 (배너+그라디언트, FEATURED 배지)
**파일:** `frontend/src/components/story/StoryStats.tsx` — Hero 통계 (활성 스토리/플레이/작성자)
**파일:** `frontend/src/pages/HomePage.tsx` — 추천 섹션, 스토리 목록 섹션 통합

### 대응 UI 항목

- Home > 1.9 스토리 객체 필드 (description, tags, play_count, like_count, owner_name, is_featured, icon, banner_gradient, badge)
- Home > 1.4 추천 스토리 카드 — 배너 그라디언트, FEATURED 배지, 잠금 배지, 장르 태그, 설명, 플레이 수, 좋아요 수, 작성자명
- Home > 1.5.2 그리드 뷰 — 잠금 배지, 상태 배지(NEW/HOT), 배너, 장르 태그, 플레이 수, 좋아요 수
- Home > 1.5.3 리스트 뷰 — 아이콘, 설명, 장르 태그, 플레이 수, 좋아요 수, 작성자명
- Home > 1.2 Hero — 서비스 통계
- Home > 1.10 지원 장르 태그
- Editor > 3.3 장르 태그 chip, 아이콘 그리드
- Play > 2.1 장르 배지
- Admin > 4.10 스토리 관리 테이블 — 장르, 플레이 수, 추천 토글

---

## Task 2: sessions 테이블 확장

### Supabase Migration

**파일:** `supabase/migrations/00000000000011_extend_sessions.sql`

```sql
ALTER TABLE story_game.sessions
  ADD COLUMN turn_count INTEGER DEFAULT 0,
  ADD COLUMN progress_pct REAL DEFAULT 0,
  ADD COLUMN chapter_label TEXT DEFAULT '';
```

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/session.ts` — 기존 `Session` 인터페이스 확장

```typescript
export interface Session {
  // ... 기존 필드 ...
  turn_count: number;
  progress_pct: number;
  chapter_label: string;
}

export interface SessionListItem {
  // ... 기존 필드 ...
  turn_count: number;
  progress_pct: number;
  chapter_label: string;
  story_icon: string;   // JOIN story.icon
  story_tags: string[];  // JOIN story.tags
}
```

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/sessions/list.ts` — 변경

- `GET /api/sessions` 응답에 turn_count, progress_pct, chapter_label 포함
- story JOIN으로 icon, tags 포함
- Supabase JS SDK: `supabase.from('sessions').select('*, story:stories(icon, tags, title)')`

**파일:** `backend/src/routes/game/chat.ts` — 변경

- 매 턴 완료 시 `turn_count` 자동 증가: `messages` 배열 길이 기반 계산
- chapter_label 업데이트 로직 (AI 응답에서 챕터 전환 감지 시)

**파일:** `backend/src/services/session-manager.ts` — 변경

- `updateTurnCount(sessionId)` — 메시지 저장 후 turn_count 동기화
- `updateChapterLabel(sessionId, label)` — 챕터 레이블 갱신

### React Components (Phase 2)

**파일:** `frontend/src/components/session/SessionCard.tsx` — 턴 수, 진행도 바, 챕터 레이블
**파일:** `frontend/src/components/session/SessionList.tsx` — 세션 그룹(오늘/어제/이전), 세션 아이콘, 미리보기
**파일:** `frontend/src/pages/HomePage.tsx` — "이어서 플레이" 섹션 강화
**파일:** `frontend/src/components/play/LeftPanel.tsx` — 세션 목록 패널 (세션 아이콘, 제목, 턴 수, ID 복사)

### 대응 UI 항목

- Home > 1.3 이어서 플레이 — 턴 수("N턴"), 진행도 바, 챕터 레이블, 썸네일 아이콘, 태그
- Home > 1.9 세션 객체 필드 (turn_count, progress_pct, chapter_label)
- Play > 2.2 Left Panel — 세션 아이콘, 제목(장 번호), 미리보기, 턴 수
- Play > 2.3.2 챕터 구분선 — 장 번호 + 제목

---

## Task 3: users/profiles 신규

### 의존성

- 없음 (독립적으로 진행 가능, 단 Task 8의 owner 인증에 필요)

### Supabase Migration

**파일:** `supabase/migrations/00000000000002_create_user_profiles.sql` (기존 Phase 1 계획에 포함)

- Supabase Auth 활용 (`auth.users` 테이블)
- `story_game.user_profiles` 테이블: `id`, `nickname`, `api_key_enc`, `created_at`, `updated_at`
- `on_auth_user_created` 트리거로 프로필 자동 생성
- RLS: 본인 프로필만 읽기/수정

**파일:** `supabase/migrations/00000000000003_setup_rls.sql` — profiles RLS 포함

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/auth.ts` (기존 Phase 1 계획에 포함)

```typescript
export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  role: 'user' | 'admin';
}

export interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  has_api_key: boolean;  // api_key_enc IS NOT NULL
  created_at: string;
}

export interface AuthSignupInput { email: string; password: string; nickname?: string; }
export interface AuthLoginInput { email: string; password: string; }
export interface AuthResponse { user: AuthUser; accessToken: string; refreshToken: string; }
```

### Fastify Routes & Plugins (`backend`)

**파일:** `backend/src/plugins/auth.ts` — 인증 플러그인

- Supabase Auth JWT 검증 데코레이터
- `fastify.authenticate` preHandler: `Authorization: Bearer <token>` → Supabase `auth.getUser(token)`
- 비인증 요청 허용 옵션 (`optional: true`)

**파일:** `backend/src/routes/auth.ts` — 인증 라우트

- `POST /api/auth/signup` → `supabase.auth.signUp({ email, password })`
- `POST /api/auth/login` → `supabase.auth.signInWithPassword({ email, password })`
- `POST /api/auth/logout` → `supabase.auth.signOut()`
- `POST /api/auth/refresh` → `supabase.auth.refreshSession()`

**파일:** `backend/src/routes/me.ts` — 프로필 라우트

- `GET /api/me` → 프로필 조회 (nickname, has_api_key)
- `PUT /api/me` → 프로필 수정 (nickname)
- `PUT /api/me/apikey` → API 키 암호화 저장
- `DELETE /api/me/apikey` → API 키 삭제
- `GET /api/me/apikey` → API 키 복호화 반환 (마스킹)

**파일:** `backend/src/services/crypto.ts` — AES-256-GCM 암호화

- `encrypt(plaintext, secret)` / `decrypt(ciphertext, secret)`
- 환경변수 `ENCRYPTION_KEY`로 API 키 암호화

### React Components (Phase 2)

**파일:** `frontend/src/pages/LoginPage.tsx` — 로그인/회원가입 페이지
**파일:** `frontend/src/components/auth/AuthGuard.tsx` — 인증 래퍼
**파일:** `frontend/src/components/layout/UserDropdown.tsx` — 아바타 + 드롭다운 메뉴
**파일:** `frontend/src/hooks/useAuth.ts` — Supabase Auth 상태 관리 (onAuthStateChange)
**파일:** `frontend/src/context/AuthContext.tsx` — 전역 인증 상태

### 대응 UI 항목

- Home > 1.1 Header — 비로그인(로그인/회원가입 버튼), 로그인(만들기 버튼, 아바타, 드롭다운)
- Home > 1.2 Hero — 작성자 수 통계
- Home > 1.7 Footer — "[데모: 로그인]" 링크
- Play > 2.1 Top Bar — API 키 마스킹 표시, 사용자 아바타/닉네임
- Play > 2.3.5 사용자 입력 블록 — 사용자 아바타
- Editor > 3.1 Header — 브레드크럼 "내 스토리"
- Admin > 4.1 Auth Gate — 로그인 오버레이
- Admin > 4.4 대시보드 — 활성 사용자 통계

---

## Task 4: presets 테이블 확장

### 의존성

- Task 5 (status_presets) — `status_preset_id` FK 참조

### Supabase Migration

**파일:** `supabase/migrations/00000000000012_extend_presets.sql`

```sql
ALTER TABLE story_game.presets
  ADD COLUMN genre TEXT DEFAULT '',
  ADD COLUMN icon TEXT DEFAULT '📖',
  ADD COLUMN status_preset_id UUID REFERENCES story_game.status_presets(id) ON DELETE SET NULL;
```

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/story.ts` — 기존 `Preset` 인터페이스 확장

```typescript
export interface Preset {
  // ... 기존 필드 ...
  genre: string;
  icon: string;
  status_preset_id: string | null;
}
```

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/stories/presets.ts` — 변경

- `GET /api/presets` 응답에 genre, icon, status_preset_id 포함
- `POST /api/presets` / `PUT /api/presets/:id` 요청에 새 필드 허용
- Supabase JS SDK: `supabase.from('presets').select('*, status_preset:status_presets(title, genre)')`

### React Components (Phase 2)

**파일:** `frontend/src/components/admin/PresetEditModal.tsx` — 장르 드롭다운, 상태창 프리셋 연결 드롭다운
**파일:** `frontend/src/components/admin/PresetList.tsx` — 프리셋 카드 (장르 태그, 항목 수)

### 대응 UI 항목

- Admin > 4.9 스토리 프리셋 — 장르 태그, 항목 수
- Admin > 4.13 프리셋 편집 모달 — 장르 드롭다운, 연결 상태창 프리셋 드롭다운, 닫기 버튼
- Editor > 3.3 기본 설정 — 프리셋 힌트 텍스트

---

## Task 5: status_presets 테이블 신규

### 의존성

- 없음 (Task 4보다 먼저 생성 필요 — FK 참조 대상)

### Supabase Migration

**파일:** `supabase/migrations/00000000000009_create_status_presets.sql`

```sql
CREATE TABLE story_game.status_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT '',
  attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- attributes 예: [{"name": "내공", "type": "number", "max_value": 100}, ...]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER status_presets_updated_at BEFORE UPDATE ON story_game.status_presets
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();

-- RLS: 읽기 전체 공개, 쓰기 admin만 (service_role 사용)
ALTER TABLE story_game.status_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_presets_select" ON story_game.status_presets FOR SELECT USING (true);
```

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/status.ts` — 신규

```typescript
export interface StatusAttribute {
  name: string;
  type: 'number' | 'text' | 'gauge';
  max_value?: number;
}

export interface StatusPreset {
  id: string;
  title: string;
  genre: string;
  attributes: StatusAttribute[];
  created_at: string;
  updated_at: string;
}

export type StatusPresetCreateInput = Omit<StatusPreset, 'id' | 'created_at' | 'updated_at'>;
```

**파일:** `packages/shared/src/index.ts` — `export * from './types/status.js';` 추가

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/admin/status-presets.ts` — 신규 (admin 전용 CRUD)

- `GET /api/admin/status-presets` → 전체 목록
- `POST /api/admin/status-presets` → 생성
- `PUT /api/admin/status-presets/:id` → 수정
- `DELETE /api/admin/status-presets/:id` → 삭제
- 인증: `preHandler: [fastify.authenticate, fastify.requireAdmin]`
- Supabase JS SDK: `supabase.from('status_presets').select('*').order('genre')`

**파일:** `backend/src/routes/stories/presets.ts` — 공개 읽기

- `GET /api/status-presets` → 에디터용 공개 목록 (admin 인증 불필요)

### React Components (Phase 2)

**파일:** `frontend/src/pages/AdminPage.tsx` — 상태창 프리셋 섹션 추가
**파일:** `frontend/src/components/admin/StatusPresetCard.tsx` — 프리셋 카드 (장르 태그, 속성 수, 편집/삭제)
**파일:** `frontend/src/components/admin/StatusPresetEditor.tsx` — 속성 테이블 편집 (이름, 타입, 최대값, 삭제, 드래그)
**파일:** `frontend/src/components/editor/StatusWindowSection.tsx` — 에디터 상태창 설정 (토글, 프리셋 선택, 속성 목록)
**파일:** `frontend/src/components/play/CharacterStatus.tsx` — 플레이 화면 캐릭터 상태창 렌더링

### 대응 UI 항목

- Admin > 4.11 상태창 프리셋 — 전체 (카드, 속성 테이블, 추가 버튼)
- Editor > 3.8 상태창 설정 — 토글, 프리셋 선택, 속성 목록, 추가 버튼, 힌트 박스
- Editor > 3.11 프롬프트 미리보기 — [상태창 규칙] 섹션
- Editor > 3.12 Preview Panel — 상태창 프롬프트, 상태 미리보기 그리드
- Play > 2.4.2 정보 탭 — 캐릭터 상태창 속성 기반 렌더링
- Play > 2.4.2 정보 탭 — 임무 섹션

---

## Task 6: service_logs 테이블 신규

### 의존성

- 없음 (독립적으로 진행 가능)

### Supabase Migration

**파일:** `supabase/migrations/00000000000013_create_service_logs.sql`

```sql
CREATE TABLE story_game.service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX idx_sg_service_logs_timestamp ON story_game.service_logs(timestamp DESC);
CREATE INDEX idx_sg_service_logs_status ON story_game.service_logs(status_code);
CREATE INDEX idx_sg_service_logs_path ON story_game.service_logs(path);

-- RLS: 클라이언트 접근 차단 (service_role만)
ALTER TABLE story_game.service_logs ENABLE ROW LEVEL SECURITY;
```

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/log.ts` — 신규

```typescript
export interface ServiceLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip: string;
  user_agent: string;
}

export interface ServiceLogFilter {
  status_code?: number;
  path?: string;
  from?: string;   // ISO 시간
  to?: string;
  page?: number;
  limit?: number;
}

export interface ServiceLogStats {
  error_rate_24h: number;    // 24시간 오류율 (%)
  avg_response_ms: number;   // 평균 응답시간
  total_requests_today: number;
  hourly_counts: { hour: number; count: number }[];  // 시간별 호출 추이
}
```

**파일:** `packages/shared/src/index.ts` — `export * from './types/log.js';` 추가

### Fastify Middleware & Routes (`backend`)

**파일:** `backend/src/plugins/request-logger.ts` — 신규 (Fastify 플러그인)

- `onResponse` 훅에서 모든 HTTP 요청을 service_logs에 기록
- pino 로거와 통합 (Fastify 내장)
- `method`, `path`, `status_code`, `duration_ms`, `ip` (X-Forwarded-For), `user_agent` 수집
- 헬스체크(`/api/health`) 등 특정 경로 제외 옵션

```typescript
// 핵심 로직
fastify.addHook('onResponse', async (request, reply) => {
  const duration = reply.elapsedTime;
  await fastify.supabase.from('service_logs').insert({
    method: request.method,
    path: request.url,
    status_code: reply.statusCode,
    duration_ms: Math.round(duration),
    ip: request.ip,
    user_agent: request.headers['user-agent'],
  });
});
```

**파일:** `backend/src/routes/admin/service-logs.ts` — 신규

- `GET /api/admin/service-logs` → 필터 + 페이지네이션 조회
  - 쿼리 파라미터: `status_code`, `path`, `from`, `to`, `page`, `limit`
  - Supabase: `.from('service_logs').select('*', { count: 'exact' }).order('timestamp', { ascending: false })`
- `GET /api/admin/service-logs/stats` → 집계 통계 (오류율, 평균 응답시간, 시간별 추이)
- `DELETE /api/admin/service-logs` → 전체 삭제 (위험 구역)
- 인증: admin 전용

### React Components (Phase 2)

**파일:** `frontend/src/pages/AdminPage.tsx` — 서비스 로그 섹션 추가
**파일:** `frontend/src/components/admin/ServiceLogTable.tsx` — 데이터 테이블 (시간, 메서드, 경로, 상태, 응답시간, IP)
**파일:** `frontend/src/components/admin/ServiceLogFilter.tsx` — 필터 바 (상태코드, 경로, 시간 드롭다운)
**파일:** `frontend/src/components/admin/DashboardStats.tsx` — 대시보드 시스템 상태 (오류율, 응답시간)
**파일:** `frontend/src/components/admin/HourlyChart.tsx` — 시간별 바 차트

### 대응 UI 항목

- Admin > 4.3 Left Nav — "서비스 로그" (배지: "3")
- Admin > 4.5 서비스 로그 — 헤더, 필터 바, 데이터 테이블, 페이지네이션
- Admin > 4.4 대시보드 — 오류율(24h), 평균 응답시간, API 호출 추이 차트
- Admin > 4.12 시스템 > 위험 구역 — "서비스 로그 삭제"

---

## Task 7: api_logs API 노출

### 의존성

- Task 6 (service_logs) — 대시보드 통계에서 두 로그 소스 함께 사용

### Supabase Migration

**파일:** 없음 (api_logs 테이블은 `00000000000001_create_story_game_schema.sql`에 이미 존재)

- RLS 확인: service_role만 접근 가능 (클라이언트 직접 접근 차단됨)
- 필요 시 admin 전용 SELECT 정책 추가

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/log.ts` — 추가

```typescript
export interface ApiLog {
  id: string;
  session_id: string | null;
  endpoint: string;
  request_model: string | null;
  request_system_prompt: string | null;
  request_messages: unknown[];
  request_body: Record<string, unknown> | null;
  response_text: string | null;
  response_usage: { input: number; output: number } | null;
  response_error: string | null;
  duration_ms: number;
  created_at: string;
}

export interface ApiLogFilter {
  endpoint?: string;
  session_id?: string;
  from?: string;
  to?: string;
  errors_only?: boolean;
  page?: number;
  limit?: number;
}

export interface ApiLogStats {
  total_calls_today: number;
  total_tokens_today: { input: number; output: number };
  error_count_today: number;
}
```

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/admin/api-logs.ts` — 신규

- `GET /api/admin/api-logs` → 필터 + 페이지네이션 조회
  - 쿼리 파라미터: `endpoint`, `session_id`, `from`, `to`, `errors_only`, `page`, `limit`
  - Supabase: `.from('api_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false })`
  - `errors_only=true` → `.not('response_error', 'is', null)`
- `GET /api/admin/api-logs/stats` → 오늘 호출 통계 (총 호출, 토큰 사용량, 에러 수)
- `GET /api/admin/api-logs/:id` → 단일 로그 상세 (시스템 프롬프트, 메시지 배열, 응답 텍스트 전문)
- `DELETE /api/admin/api-logs` → 전체 삭제 (위험 구역)
- 인증: admin 전용

### React Components (Phase 2)

**파일:** `frontend/src/components/admin/ApiLogTable.tsx` — 데이터 테이블 (시간, 세션ID, 엔드포인트, 모델, 토큰, 소요시간, 상태)
**파일:** `frontend/src/components/admin/ApiLogDetail.tsx` — 확장 상세 (요청 탭/응답 탭/에러 탭)
**파일:** `frontend/src/components/admin/ApiLogFilter.tsx` — 필터 바 (엔드포인트, 세션ID 검색, 시간, 오류만 토글)
**파일:** `frontend/src/components/admin/RecentEvents.tsx` — 대시보드 최근 이벤트 테이블

### 대응 UI 항목

- Admin > 4.3 Left Nav — "API 로그"
- Admin > 4.6 API 로그 — 헤더, 필터 바, 데이터 테이블, 확장 상세, 페이지네이션
- Admin > 4.4 대시보드 — 오늘 API 호출 통계, 최근 이벤트 테이블
- Admin > 4.12 시스템 > 위험 구역 — "API 로그 삭제"

---

## Task 8: stories API

### 의존성

- Task 1 (stories 확장) — 새 컬럼 필요
- Task 3 (users/profiles) — owner 인증, admin 역할 검증
- Task 4 (presets 확장) — 프리셋 CRUD에 genre/icon 필드 필요

### Supabase Migration

**파일:** 없음 (stories, presets 테이블은 이미 존재, Task 1/4에서 확장)

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/api.ts` — 추가

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface StoryFilterParams {
  genre?: string;
  search?: string;
  sort?: 'latest' | 'popular' | 'name';
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminStoryFilterParams extends StoryFilterParams {
  is_public?: boolean;
}
```

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/stories/list.ts` — 공개 스토리 목록

- `GET /api/stories` → `PaginatedResponse<StoryListItem>`
  - 쿼리: genre, search, sort, featured, page, limit
  - Supabase: `from('stories_safe').select('*', { count: 'exact' })`
  - 장르 필터: `.contains('tags', [genre])`
  - 검색: `.or('title.ilike.%query%,description.ilike.%query%')`
  - 정렬: latest=`created_at DESC`, popular=`play_count DESC`, name=`title ASC`

**파일:** `backend/src/routes/stories/detail.ts` — 단일 스토리 조회

- `GET /api/stories/:id` → `Story` (공개 + 본인 비공개)
- `GET /api/stories/:id/verify` → 비밀번호 검증

**파일:** `backend/src/routes/stories/crud.ts` — 스토리 CRUD (인증 필요)

- `POST /api/stories` → 스토리 생성 (owner_uid = 현재 사용자)
- `PUT /api/stories/:id` → 스토리 수정 (owner 또는 admin)
- `DELETE /api/stories/:id` → 스토리 삭제 (owner 또는 admin)

**파일:** `backend/src/routes/stories/stats.ts` — 통계

- `GET /api/stories/stats` → `StoryStats`

**파일:** `backend/src/routes/admin/stories.ts` — 신규 (admin 전용)

- `GET /api/admin/stories` → 관리자 스토리 목록 (비공개 포함, 필터/검색/페이지네이션)
- `PUT /api/admin/stories/:id/featured` → 추천 토글
- 인증: admin 전용

**파일:** `backend/src/routes/stories/presets.ts` — 프리셋 CRUD

- `GET /api/presets` → 전체 프리셋 목록
- `POST /api/presets` → 프리셋 생성 (admin)
- `PUT /api/presets/:id` → 프리셋 수정 (admin)
- `DELETE /api/presets/:id` → 프리셋 삭제 (admin)

### React Components (Phase 2)

**파일:** `frontend/src/pages/HomePage.tsx` — 스토리 목록/필터/정렬/페이지네이션 통합
**파일:** `frontend/src/components/story/StoryFilter.tsx` — 장르 필터 칩, 검색 칩, 정렬 셀렉트, 보기 방식 토글
**파일:** `frontend/src/components/common/Pagination.tsx` — 이전/다음/페이지 번호 버튼
**파일:** `frontend/src/pages/EditorPage.tsx` — 스토리 CRUD (자동 저장, 저장 상태 표시)
**파일:** `frontend/src/components/admin/StoryManagement.tsx` — 관리자 스토리 테이블 (필터, 추천 토글)
**파일:** `frontend/src/hooks/useStories.ts` — 스토리 목록 fetch + 필터 상태 관리

### 대응 UI 항목

- Home > 1.4 추천 스토리 섹션 — 헤더, 추천 카드
- Home > 1.5 스토리 목록 — 필터 바, 그리드/리스트 뷰 전체
- Home > 1.6 페이지네이션
- Home > 1.2 Hero — 서비스 통계
- Admin > 4.10 스토리 관리 — 헤더, 필터 바, 데이터 테이블, 페이지네이션
- Admin > 4.12 시스템 > 위험 구역 — "세션 데이터 초기화", "전체 DB 초기화"
- Editor > 3.1 Header — 저장 상태 표시, 자동 저장
- Editor > 3.13 Action Bar — "마지막 저장" 타임스탬프
- Editor > 3.14 글로벌 기능 — 자동 저장 (60초 + 1.2초 디바운스)

---

## Task 9: config 확장

### 의존성

- Task 5 (status_presets) — 상태창 기본 설정 참조

### Supabase Migration

**파일:** `supabase/migrations/00000000000014_extend_config.sql`

```sql
-- 장르 목록 config 항목 추가
INSERT INTO story_game.config (id, value) VALUES
  ('genre_list', '["무협","판타지","현대","로맨스","공포","SF","미스터리","역사","심리"]'::jsonb),
  ('status_window_defaults', '{"enabled": false, "default_preset_genre": "무협"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

### Shared Types (`packages/shared`)

**파일:** `packages/shared/src/types/config.ts` — 확장

```typescript
export interface AppConfig {
  promptConfig: PromptConfig;
  gameplayConfig: GameplayConfig;
  genreList: string[];
  statusWindowDefaults: {
    enabled: boolean;
    default_preset_genre: string;
  };
}
```

### Fastify Routes (`backend`)

**파일:** `backend/src/routes/config.ts` — 변경

- `GET /api/config` 응답에 `genre_list`, `status_window_defaults` 포함
- 인메모리 캐시 (`backend/src/plugins/config-cache.ts`)에 새 설정 포함
- `PUT /api/config` (admin) — genre_list, status_window_defaults 수정 가능

### React Components (Phase 2)

**파일:** `frontend/src/hooks/useConfig.ts` — `/api/config` fetch + 캐시
**파일:** `frontend/src/components/story/GenreFilter.tsx` — config.genreList 기반 장르 필터 칩
**파일:** `frontend/src/components/editor/GenreSelector.tsx` — 에디터 장르 태그 chip 선택
**파일:** `frontend/src/components/admin/PromptSettings.tsx` — 프롬프트 설정 카드 (구조 변경)
**파일:** `frontend/src/components/admin/GameParams.tsx` — 게임 파라미터 카드 (구조 변경)

### 대응 UI 항목

- Home > 1.10 지원 장르 태그 — 장르 목록 (config에서 동적 로드)
- Home > 1.5.1 필터 바 — 장르 필터 칩 그룹
- Editor > 3.3 기본 설정 — 장르 태그 chip 선택
- Admin > 4.7 프롬프트 설정 — 카드 구조 변경
- Admin > 4.8 게임 파라미터 — 카드 구조 변경
- Admin > 4.4 대시보드 — 통계 카드

---

## Task 10: 프론트엔드 전용 (DB 불필요)

### 의존성

- Task 1~9 백엔드 API 완료 후 진행 (Phase 2)
- React 프로젝트 스캐폴딩 (Phase 1에서 `frontend/` 디렉토리 준비)

### 프로젝트 설정

**파일:** `frontend/package.json` — React + Vite + TypeScript
**파일:** `frontend/vite.config.ts` — Vite 설정 (proxy → backend)
**파일:** `frontend/tsconfig.json` — shared 패키지 참조
**파일:** `frontend/src/main.tsx` — 엔트리포인트
**파일:** `frontend/src/App.tsx` — 라우팅 (React Router)

### React Components — Layout

**파일:** `frontend/src/components/layout/Header.tsx` — 로고(SVG), 검색, 테마 토글, 인증 영역
**파일:** `frontend/src/components/layout/Footer.tsx` — 로고, 설명, 링크
**파일:** `frontend/src/components/layout/AdminLayout.tsx` — Top Bar, Left Nav, Bottom Action Bar
**파일:** `frontend/src/components/layout/ThemeToggle.tsx` — 다크/라이트 모드 토글

### React Components — Common

**파일:** `frontend/src/components/common/Toast.tsx` — 하단 중앙 토스트 알림
**파일:** `frontend/src/components/common/Pagination.tsx` — 페이지네이션 (이전/다음/번호)
**파일:** `frontend/src/components/common/Badge.tsx` — 상태 배지 (NEW/HOT/FEATURED/잠금)
**파일:** `frontend/src/components/common/TagChip.tsx` — 장르 태그 칩 (컬러 매핑)
**파일:** `frontend/src/components/common/EmptyState.tsx` — 빈 상태 (아이콘 + 메시지)

### React Pages — Home

**파일:** `frontend/src/pages/HomePage.tsx`

- Hero 영역 (아이브로우, 타이틀, 서브텍스트, CTA 버튼)
- 이어서 플레이 섹션 (세션 카드 리스트)
- 추천 스토리 섹션 (FeaturedCard 가로 스크롤)
- 스토리 목록 (필터+정렬 + 그리드/리스트 뷰 토글)
- 페이지네이션

### React Pages — Play

**파일:** `frontend/src/pages/PlayPage.tsx`

- Top Bar (로고, 스토리 제목, 장르 배지, API키, 모델, 등장인물 버튼)
- Left Panel (세션 기록: 그룹 라벨, 세션 카드, ID 불러오기)
- Center Panel:
  - 스토리 헤더 + 챕터 구분선
  - 내레이터 블록 (기억 배지, 코멘트)
  - 캐릭터 대사 블록 (아바타, 이름, 직함, 기억 배지, 액션)
  - 사용자 입력 블록 (아바타, 복사)
  - 시스템 이벤트 메시지
  - 추천 답변 칩 (4개 선택지)
  - 입력 영역 (모드 툴바: 행동/생각/대사/장면, 토큰 카운터)
- Right Panel:
  - 탭 바 (정보/기억/노트/출력)
  - 정보 탭 (캐릭터 상태, 등장인물, 임무)
  - 기억 탭 (섹션 제목 + 개수)
  - 출력 탭 (마크다운/SSE/추천답변 토글)
- 등장인물 모달 (아바타, 관계 태그, 성격, AI 동향)

### React Pages — Editor

**파일:** `frontend/src/pages/EditorPage.tsx`

- Header (로고, 브레드크럼, 저장 상태, 미리보기 버튼)
- Sidebar (네비게이션 8개 항목 + 완성도 프로그레스)
- 섹션들: 기본 설정, 시스템 규칙, 세계관, 스토리, 등장인물, 상태창 설정, 출력 설정, 공개 설정
- 프롬프트 미리보기 (토큰 수)
- Preview Panel (상태창, 캐릭터, 총 토큰)
- Action Bar (저장 타임스탬프)
- 글로벌: Intersection Observer 스크롤 하이라이트, 반응형

### React Pages — Admin

**파일:** `frontend/src/pages/AdminPage.tsx`

- Top Bar (로고, Admin 배지, "사이트로" 링크)
- Left Nav (모니터링/설정/시스템 섹션)
- 대시보드 (통계 카드, 이벤트 테이블, 차트)
- 시스템 (배포 정보, 상태 요약, 위험 구역)
- Bottom Action Bar (마지막 저장)

### Hooks

**파일:** `frontend/src/hooks/useTheme.ts` — 테마 상태 (localStorage 연동)
**파일:** `frontend/src/hooks/useSearch.ts` — 검색 입력 + 단축키 `/` 바인딩
**파일:** `frontend/src/hooks/useIntersectionObserver.ts` — 에디터 스크롤 하이라이트
**파일:** `frontend/src/hooks/useAutoSave.ts` — 자동 저장 (60초 인터벌 + 1.2초 디바운스)

### 대응 UI 항목

- Home > 1.1 Header — 로고, 검색, 테마 전환
- Home > 1.2 Hero — 아이브로우, 타이틀, CTA 버튼
- Home > 1.5.1 필터 바 — 구분선, 검색 칩, 보기 방식 토글
- Home > 1.5.2 그리드 뷰 — 카드 레이아웃
- Home > 1.7 Footer — 로고, 설명, 링크
- Home > 1.8 Toast 알림
- Play > 2.1~2.6 전체 UI 컴포넌트
- Editor > 3.1~3.14 전체 UI 컴포넌트
- Admin > 4.2~4.14 전체 UI 컴포넌트
