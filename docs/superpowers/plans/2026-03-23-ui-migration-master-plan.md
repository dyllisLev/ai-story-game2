# UI 마이그레이션 Phase 2: DB 확장 + 신규 API + React 프론트엔드

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1(monorepo + Fastify 백엔드 코어)이 완료된 상태에서, DB 스키마를 확장하고 신규 API 라우트를 추가한 뒤, React 프론트엔드 4페이지를 구현한다.

**Architecture:** Phase 1에서 구축한 pnpm monorepo 구조(`packages/shared`, `backend`)에 `frontend` 패키지를 추가한다. DB 마이그레이션은 `supabase/migrations/` 시퀀스를 이어간다. 백엔드 라우트는 Phase 1의 Fastify 플러그인 패턴을 따른다. 프론트엔드는 Vite + React + TypeScript로 빌드하며, 공유 타입을 `@story-game/shared`에서 import한다.

**Tech Stack:** React 19, Vite 6, TypeScript 5, React Router 7, TanStack Query 5, Zustand 5, Tailwind CSS 4, @story-game/shared (workspace)

**Design Spec:** `docs/superpowers/specs/2026-03-19-backend-migration-design.md`
**Task Reference:** `docs/migration-tasks.md`
**Phase 1 Plan:** `docs/superpowers/plans/2026-03-20-fullstack-migration-phase1.md`

---

## 의존성 그래프

```
Phase 2-A (DB 확장)
  Task 1 (stories 확장) ──┐
  Task 2 (sessions 확장) ─┤
  Task 3 (status_presets) ┤──→ Phase 2-B (신규 API)
  Task 4 (presets 확장) ──┤      Task 8 (stories API)
  Task 5 (profiles 확장) ─┤      Task 9 (admin routes)
  Task 6 (service_logs) ──┤      Task 10 (auth routes)
  Task 7 (config 확장) ───┘      Task 11 (request logger)
                                  Task 12 (game-handler 업데이트)
                                        │
                                        ▼
                              Phase 2-C (React 프론트엔드)
                                  Task 13 (React 프로젝트 셋업)
                                  Task 14 (공통 컴포넌트 + hooks)
                                  Task 15 (Home 페이지)
                                  Task 16 (Play 페이지)
                                  Task 17 (Editor 페이지)
                                  Task 18 (Admin 페이지)
```

---

# Phase 2-A: DB 스키마 확장

## Task 1: stories 테이블 확장

**Files:**
- Create: `supabase/migrations/00000000000010_extend_stories.sql`
- Modify: `packages/shared/src/types/story.ts`
- Modify: `packages/shared/src/index.ts`

Phase 1에서 생성한 `story_game.stories` 테이블에 UI에 필요한 메타데이터 컬럼을 추가하고, `stories_safe` VIEW를 재생성한다.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/00000000000010_extend_stories.sql`:
```sql
-- stories 테이블에 UI 메타데이터 컬럼 추가
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

-- 성능 인덱스
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

-- play_count 증가 RPC 함수
CREATE OR REPLACE FUNCTION story_game.increment_play_count(p_story_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE story_game.stories SET play_count = play_count + 1 WHERE id = p_story_id;
$$;
```

- [ ] **Step 2: Shared 타입 업데이트 — Story 인터페이스 확장**

`packages/shared/src/types/story.ts`에 다음 필드를 `Story` 인터페이스에 추가:
```typescript
// 기존 Story 인터페이스에 추가
description: string;
tags: string[];
icon: string;
banner_gradient: string;
play_count: number;
like_count: number;
badge: 'new' | 'hot' | null;
is_featured: boolean;
owner_name: string;
```

같은 파일에 `StoryListItem`, `StoryStats` 인터페이스 추가:
```typescript
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

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && pnpm lint`
Expected: 타입 에러 없이 통과

---

## Task 2: sessions 테이블 확장

**Files:**
- Create: `supabase/migrations/00000000000011_extend_sessions.sql`
- Modify: `packages/shared/src/types/session.ts`

Phase 1에서 생성한 `story_game.sessions` 테이블에 턴 추적, 진행도 컬럼을 추가한다.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/00000000000011_extend_sessions.sql`:
```sql
ALTER TABLE story_game.sessions
  ADD COLUMN turn_count INTEGER DEFAULT 0,
  ADD COLUMN progress_pct REAL DEFAULT 0,
  ADD COLUMN chapter_label TEXT DEFAULT '';
```

- [ ] **Step 2: Shared 타입 업데이트 — Session 인터페이스 확장**

`packages/shared/src/types/session.ts`에 기존 `Session` 인터페이스에 필드 추가:
```typescript
// 기존 Session 인터페이스에 추가
turn_count: number;
progress_pct: number;
chapter_label: string;
```

`SessionListItem`에도 동일 필드 + story JOIN 필드 추가:
```typescript
// 기존 SessionListItem 인터페이스에 추가
turn_count: number;
progress_pct: number;
chapter_label: string;
story_icon: string;    // JOIN story.icon
story_tags: string[];  // JOIN story.tags
```

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && pnpm lint`

---

## Task 3: status_presets 테이블 신규

**Files:**
- Create: `supabase/migrations/00000000000009_create_status_presets.sql`
- Create: `packages/shared/src/types/status.ts`
- Modify: `packages/shared/src/index.ts`

상태창 프리셋을 저장하는 신규 테이블. Task 4(presets 확장)에서 FK로 참조하므로 먼저 생성한다.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/00000000000009_create_status_presets.sql`:
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

- [ ] **Step 2: Shared 타입 생성 — status.ts**

`packages/shared/src/types/status.ts`:
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

- [ ] **Step 3: index.ts에 re-export 추가**

`packages/shared/src/index.ts`에 추가:
```typescript
export * from './types/status.js';
```

- [ ] **Step 4: 빌드 확인**

Run: `cd packages/shared && pnpm lint`

---

## Task 4: presets 테이블 확장

**Files:**
- Create: `supabase/migrations/00000000000012_extend_presets.sql`
- Modify: `packages/shared/src/types/story.ts`

**의존성:** Task 3 (status_presets) — FK 참조 대상

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/00000000000012_extend_presets.sql`:
```sql
ALTER TABLE story_game.presets
  ADD COLUMN genre TEXT DEFAULT '',
  ADD COLUMN icon TEXT DEFAULT '📖',
  ADD COLUMN status_preset_id UUID REFERENCES story_game.status_presets(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Shared 타입 업데이트 — Preset 인터페이스 확장**

`packages/shared/src/types/story.ts`의 `Preset` 인터페이스에 추가:
```typescript
// 기존 Preset 인터페이스에 추가
genre: string;
icon: string;
status_preset_id: string | null;
```

- [ ] **Step 3: 빌드 확인**

Run: `cd packages/shared && pnpm lint`

---

## Task 5: profiles 테이블 확장

**Files:**
- Modify: `packages/shared/src/types/auth.ts`

Phase 1에서 `user_profiles` 테이블과 `auth.ts` 타입을 이미 생성했다. 여기서는 프론트엔드에서 필요한 추가 타입만 정의한다.

- [ ] **Step 1: Shared 타입 업데이트 — UserProfile 확장**

`packages/shared/src/types/auth.ts`에 `UserProfile` 인터페이스가 없으면 추가:
```typescript
export interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  has_api_key: boolean;  // api_key_enc IS NOT NULL
  created_at: string;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd packages/shared && pnpm lint`

---

## Task 6: service_logs 테이블 신규

**Files:**
- Create: `supabase/migrations/00000000000013_create_service_logs.sql`
- Create: `packages/shared/src/types/log.ts`
- Modify: `packages/shared/src/index.ts`

HTTP 요청 로그를 저장하는 신규 테이블. admin 대시보드에서 시스템 상태를 모니터링하는 데 사용.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/00000000000013_create_service_logs.sql`:
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

- [ ] **Step 2: Shared 타입 생성 — log.ts**

`packages/shared/src/types/log.ts`:
```typescript
// === Service Logs ===

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
  hourly_counts: { hour: number; count: number }[];
}

// === API Logs ===

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

- [ ] **Step 3: index.ts에 re-export 추가**

`packages/shared/src/index.ts`에 추가:
```typescript
export * from './types/log.js';
```

- [ ] **Step 4: 빌드 확인**

Run: `cd packages/shared && pnpm lint`

---

## Task 7: config 확장 (장르 목록, 상태창 기본값)

**Files:**
- Create: `supabase/migrations/00000000000014_extend_config.sql`
- Modify: `packages/shared/src/types/config.ts`
- Modify: `packages/shared/src/types/api.ts`

**의존성:** Task 3 (status_presets) — 상태창 기본 설정 참조

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/00000000000014_extend_config.sql`:
```sql
-- 장르 목록 및 상태창 기본 설정 추가
INSERT INTO story_game.config (id, value) VALUES
  ('genre_list', '["무협","판타지","현대","로맨스","공포","SF","미스터리","역사","심리"]'::jsonb),
  ('status_window_defaults', '{"enabled": false, "default_preset_genre": "무협"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

- [ ] **Step 2: Shared 타입 업데이트 — AppConfig 확장**

`packages/shared/src/types/config.ts`의 `AppConfig`에 필드 추가:
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

- [ ] **Step 3: Shared 타입 업데이트 — API 페이지네이션 타입**

`packages/shared/src/types/api.ts`에 공통 페이지네이션 타입 추가:
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

- [ ] **Step 4: 빌드 확인**

Run: `cd packages/shared && pnpm lint`

- [ ] **Step 5: Phase 2-A 전체 커밋**

```bash
git add supabase/migrations/0000000000000{9,10,11,12,13,14}_*.sql packages/shared/
git commit -m "feat: Phase 2-A DB schema extensions + shared type updates"
```

---

# Phase 2-B: 신규 Fastify 라우트

## Task 8: Stories CRUD 라우트

**Files:**
- Create: `backend/src/routes/stories/list.ts`
- Create: `backend/src/routes/stories/detail.ts`
- Create: `backend/src/routes/stories/crud.ts`
- Create: `backend/src/routes/stories/stats.ts`
- Create: `backend/src/routes/stories/presets.ts`

Phase 1에서 만든 Fastify 서버 + Supabase 플러그인 위에 스토리 관련 CRUD 라우트를 추가한다.

- [ ] **Step 1: stories/list.ts — 공개 스토리 목록**

`backend/src/routes/stories/list.ts`:
```typescript
import type { FastifyPluginAsync } from 'fastify';
import type { StoryFilterParams, PaginatedResponse, StoryListItem } from '@story-game/shared';

const storiesListRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: StoryFilterParams;
  }>('/api/stories', async (request, reply) => {
    const { genre, search, sort = 'latest', featured, page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    let query = fastify.supabase
      .from('stories_safe')
      .select('*', { count: 'exact' });

    if (genre) query = query.contains('tags', [genre]);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if (featured) query = query.eq('is_featured', true);

    // 정렬
    const sortMap = {
      latest: { column: 'created_at', ascending: false },
      popular: { column: 'play_count', ascending: false },
      name: { column: 'title', ascending: true },
    } as const;
    const { column, ascending } = sortMap[sort];
    query = query.order(column, { ascending });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const response: PaginatedResponse<StoryListItem> = {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    };
    return reply.send(response);
  });
};

export default storiesListRoute;
```

- [ ] **Step 2: stories/detail.ts — 단일 스토리 조회 + 비밀번호 검증**

`backend/src/routes/stories/detail.ts`:
- `GET /api/stories/:id` → 공개 스토리 또는 본인 비공개 스토리 반환
- `GET /api/stories/:id/verify` → 비밀번호 검증 (`story_game.verify_story_password` RPC 호출)

```typescript
// 핵심 로직
fastify.get('/api/stories/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  // 먼저 공개 스토리에서 검색
  const { data } = await fastify.supabase.from('stories_safe').select('*').eq('id', id).single();
  if (data) return reply.send(data);
  // 인증된 사용자의 비공개 스토리 검색
  if (request.user) {
    const { data: privateData } = await fastify.supabase
      .from('stories').select('*').eq('id', id).eq('owner_uid', request.user.id).single();
    if (privateData) return reply.send(privateData);
  }
  return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
});
```

- [ ] **Step 3: stories/crud.ts — 스토리 생성/수정/삭제**

`backend/src/routes/stories/crud.ts`:
- `POST /api/stories` → `preHandler: [fastify.authenticate]`, `owner_uid = request.user.id`
- `PUT /api/stories/:id` → owner 또는 admin만 수정 가능
- `DELETE /api/stories/:id` → owner 또는 admin만 삭제 가능
- 요청 body에 새 필드(description, tags, icon, banner_gradient) 허용

- [ ] **Step 4: stories/stats.ts — 스토리 통계**

`backend/src/routes/stories/stats.ts`:
```typescript
fastify.get('/api/stories/stats', async (request, reply) => {
  const { count: total_stories } = await fastify.supabase
    .from('stories_safe').select('*', { count: 'exact', head: true });

  const { data: playData } = await fastify.supabase
    .from('stories_safe').select('play_count');
  const total_plays = (playData ?? []).reduce((sum, s) => sum + (s.play_count ?? 0), 0);

  const { data: authorData } = await fastify.supabase
    .from('stories').select('owner_uid').not('owner_uid', 'is', null);
  const total_authors = new Set((authorData ?? []).map(a => a.owner_uid)).size;

  return reply.send({ total_stories: total_stories ?? 0, total_plays, total_authors });
});
```

- [ ] **Step 5: stories/presets.ts — 프리셋 CRUD**

`backend/src/routes/stories/presets.ts`:
- `GET /api/presets` → 전체 목록 (genre, icon, status_preset JOIN 포함)
- `GET /api/status-presets` → 에디터용 상태창 프리셋 공개 목록
- `POST /api/presets` → admin 전용 생성
- `PUT /api/presets/:id` → admin 전용 수정
- `DELETE /api/presets/:id` → admin 전용 삭제

Supabase query 예시:
```typescript
const { data } = await fastify.supabase
  .from('presets')
  .select('*, status_preset:status_presets(title, genre)')
  .order('created_at', { ascending: false });
```

- [ ] **Step 6: server.ts에 라우트 등록**

`backend/src/server.ts`에 stories 라우트 import + register:
```typescript
import storiesListRoute from './routes/stories/list.js';
import storiesDetailRoute from './routes/stories/detail.js';
import storiesCrudRoute from './routes/stories/crud.js';
import storiesStatsRoute from './routes/stories/stats.js';
import presetsRoute from './routes/stories/presets.js';

await app.register(storiesListRoute);
await app.register(storiesDetailRoute);
await app.register(storiesCrudRoute);
await app.register(storiesStatsRoute);
await app.register(presetsRoute);
```

- [ ] **Step 7: 빌드 확인**

Run: `cd backend && pnpm lint`

---

## Task 9: Admin 라우트

**Files:**
- Create: `backend/src/routes/admin/stories.ts`
- Create: `backend/src/routes/admin/status-presets.ts`
- Create: `backend/src/routes/admin/service-logs.ts`
- Create: `backend/src/routes/admin/api-logs.ts`
- Create: `backend/src/routes/admin/dashboard.ts`
- Create: `backend/src/routes/admin/danger-zone.ts`

모든 admin 라우트는 `preHandler: [fastify.authenticate, fastify.requireAdmin]`을 사용한다. `requireAdmin`은 Phase 1의 auth 플러그인에서 구현된 admin 역할 검증 preHandler.

- [ ] **Step 1: admin/stories.ts — 관리자 스토리 관리**

```typescript
// GET /api/admin/stories → 비공개 포함 전체 목록 (AdminStoryFilterParams)
// PUT /api/admin/stories/:id/featured → 추천 토글
//   await fastify.supabase.from('stories').update({ is_featured: body.featured }).eq('id', id);
```

- [ ] **Step 2: admin/status-presets.ts — 상태창 프리셋 CRUD**

```typescript
// GET    /api/admin/status-presets     → 전체 목록
// POST   /api/admin/status-presets     → 생성
// PUT    /api/admin/status-presets/:id → 수정 (title, genre, attributes)
// DELETE /api/admin/status-presets/:id → 삭제
```

- [ ] **Step 3: admin/service-logs.ts — 서비스 로그 조회**

```typescript
// GET    /api/admin/service-logs       → 필터 + 페이지네이션
//   쿼리: status_code, path, from, to, page, limit
// GET    /api/admin/service-logs/stats → 집계 (오류율, 평균 응답시간, 시간별 추이)
// DELETE /api/admin/service-logs       → 전체 삭제 (위험 구역)
```

Stats 집계 쿼리 핵심:
```typescript
// 24시간 오류율
const { count: totalCount } = await fastify.supabase
  .from('service_logs').select('*', { count: 'exact', head: true })
  .gte('timestamp', twentyFourHoursAgo);
const { count: errorCount } = await fastify.supabase
  .from('service_logs').select('*', { count: 'exact', head: true })
  .gte('timestamp', twentyFourHoursAgo)
  .gte('status_code', 400);
```

- [ ] **Step 4: admin/api-logs.ts — API 로그 조회**

```typescript
// GET    /api/admin/api-logs       → 필터 + 페이지네이션
//   쿼리: endpoint, session_id, from, to, errors_only, page, limit
// GET    /api/admin/api-logs/stats → 오늘 호출 통계 (총 호출, 토큰 사용량, 에러 수)
// GET    /api/admin/api-logs/:id   → 단일 로그 상세 (프롬프트, 메시지, 응답 전문)
// DELETE /api/admin/api-logs       → 전체 삭제 (위험 구역)
```

- [ ] **Step 5: admin/dashboard.ts — 대시보드 집계**

```typescript
// GET /api/admin/dashboard → 통합 통계
// {
//   stories: { total, public, featured },
//   sessions: { total, active_today },
//   users: { total, active_today },
//   system: { error_rate_24h, avg_response_ms, total_requests_today },
//   recent_events: ApiLog[]  (최근 10건)
// }
```

- [ ] **Step 6: admin/danger-zone.ts — 위험 구역 작업**

```typescript
// DELETE /api/admin/danger-zone/sessions   → 전체 세션 데이터 초기화
// DELETE /api/admin/danger-zone/all        → 전체 DB 초기화 (세션 + 로그)
// DELETE /api/admin/danger-zone/logs       → 모든 로그 삭제 (service_logs + api_logs)
```

- [ ] **Step 7: server.ts에 admin 라우트 등록**

```typescript
import adminStoriesRoute from './routes/admin/stories.js';
import adminStatusPresetsRoute from './routes/admin/status-presets.js';
import adminServiceLogsRoute from './routes/admin/service-logs.js';
import adminApiLogsRoute from './routes/admin/api-logs.js';
import adminDashboardRoute from './routes/admin/dashboard.js';
import adminDangerZoneRoute from './routes/admin/danger-zone.js';

await app.register(adminStoriesRoute);
await app.register(adminStatusPresetsRoute);
await app.register(adminServiceLogsRoute);
await app.register(adminApiLogsRoute);
await app.register(adminDashboardRoute);
await app.register(adminDangerZoneRoute);
```

- [ ] **Step 8: 빌드 확인**

Run: `cd backend && pnpm lint`

---

## Task 10: Auth 라우트

**Files:**
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/routes/me.ts`
- Create: `backend/src/services/crypto.ts`

Phase 1에서 auth 플러그인(`plugins/auth.ts`)과 타입(`auth.ts`)을 정의했다. 여기서는 실제 라우트 핸들러를 구현한다.

- [ ] **Step 1: auth.ts — 인증 라우트**

`backend/src/routes/auth.ts`:
```typescript
import type { FastifyPluginAsync } from 'fastify';
import type { AuthSignupInput, AuthLoginInput, AuthResponse } from '@story-game/shared';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 회원가입
  fastify.post<{ Body: AuthSignupInput }>('/api/auth/signup', async (request, reply) => {
    const { email, password, nickname } = request.body;
    const { data, error } = await fastify.supabase.auth.signUp({ email, password });
    if (error) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });

    // 닉네임 설정
    if (nickname && data.user) {
      await fastify.supabaseAdmin
        .from('user_profiles')
        .update({ nickname })
        .eq('id', data.user.id);
    }

    return reply.status(201).send({
      user: { id: data.user!.id, email: data.user!.email!, nickname: nickname ?? null, role: 'user' },
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    });
  });

  // 로그인
  fastify.post<{ Body: AuthLoginInput }>('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body;
    const { data, error } = await fastify.supabase.auth.signInWithPassword({ email, password });
    if (error) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } });
    // 프로필 조회
    const { data: profile } = await fastify.supabaseAdmin
      .from('user_profiles').select('nickname').eq('id', data.user.id).single();
    return reply.send({
      user: { id: data.user.id, email: data.user.email!, nickname: profile?.nickname ?? null, role: 'user' },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    } satisfies AuthResponse);
  });

  // 로그아웃
  fastify.post('/api/auth/logout', async (request, reply) => {
    await fastify.supabase.auth.signOut();
    return reply.status(204).send();
  });

  // 토큰 갱신
  fastify.post('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    const { data, error } = await fastify.supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } });
    return reply.send({
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    });
  });
};

export default authRoutes;
```

- [ ] **Step 2: me.ts — 프로필 라우트**

`backend/src/routes/me.ts`:
```typescript
// GET    /api/me         → 프로필 조회 (nickname, has_api_key)
// PUT    /api/me         → 프로필 수정 (nickname)
// PUT    /api/me/apikey  → API 키 암호화 저장
// DELETE /api/me/apikey  → API 키 삭제
// GET    /api/me/apikey  → API 키 마스킹 반환 (앞 4자리 + ****)
```

모든 라우트에 `preHandler: [fastify.authenticate]` 적용.

API 키 암호화/복호화에 `crypto.ts` 서비스 사용:
```typescript
import { encrypt, decrypt } from '../services/crypto.js';

// PUT /api/me/apikey
const encrypted = encrypt(apiKey, config.API_KEY_ENCRYPTION_SECRET);
await fastify.supabaseAdmin.from('user_profiles').update({ api_key_enc: encrypted }).eq('id', userId);

// GET /api/me/apikey
const { data } = await fastify.supabaseAdmin.from('user_profiles').select('api_key_enc').eq('id', userId).single();
const decrypted = decrypt(data.api_key_enc, config.API_KEY_ENCRYPTION_SECRET);
const masked = decrypted.slice(0, 4) + '****' + decrypted.slice(-4);
```

- [ ] **Step 3: services/crypto.ts — AES-256-GCM 암호화**

`backend/src/services/crypto.ts`:
```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, secret: string): string {
  const key = scryptSync(secret, 'salt', KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv:authTag:encrypted (hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string, secret: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const key = scryptSync(secret, 'salt', KEY_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
```

- [ ] **Step 4: server.ts에 auth/me 라우트 등록**

- [ ] **Step 5: 빌드 확인**

Run: `cd backend && pnpm lint`

---

## Task 11: Request Logging 미들웨어

**Files:**
- Create: `backend/src/plugins/request-logger.ts`
- Modify: `backend/src/server.ts`

모든 HTTP 요청을 `service_logs` 테이블에 자동 기록하는 Fastify 플러그인.

- [ ] **Step 1: request-logger.ts 플러그인 작성**

`backend/src/plugins/request-logger.ts`:
```typescript
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const EXCLUDE_PATHS = ['/api/health'];

const requestLoggerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onResponse', async (request, reply) => {
    if (EXCLUDE_PATHS.includes(request.url)) return;

    // fire-and-forget: 로깅 실패가 요청에 영향 주지 않도록
    fastify.supabaseAdmin.from('service_logs').insert({
      method: request.method,
      path: request.url,
      status_code: reply.statusCode,
      duration_ms: Math.round(reply.elapsedTime),
      ip: request.headers['x-forwarded-for']?.toString().split(',')[0] ?? request.ip,
      user_agent: request.headers['user-agent'] ?? '',
    }).then(({ error }) => {
      if (error) fastify.log.warn({ error }, 'Failed to log request');
    });
  });
};

export default fp(requestLoggerPlugin, { name: 'request-logger', dependencies: ['supabase'] });
```

- [ ] **Step 2: server.ts에 플러그인 등록**

`backend/src/server.ts`에 추가 (Supabase 플러그인 등록 이후):
```typescript
import requestLoggerPlugin from './plugins/request-logger.js';
await app.register(requestLoggerPlugin);
```

- [ ] **Step 3: 빌드 확인**

Run: `cd backend && pnpm lint`

---

## Task 12: game-handler 업데이트 (turn_count, preview_text)

**Files:**
- Modify: `backend/src/routes/game/chat.ts`
- Modify: `backend/src/routes/game/start.ts`
- Modify: `backend/src/services/session-manager.ts`

Phase 1에서 구현한 게임 채팅 라우트에 턴 카운트 및 챕터 레이블 갱신 로직을 추가한다.

- [ ] **Step 1: session-manager.ts에 턴/챕터 업데이트 메서드 추가**

`backend/src/services/session-manager.ts`에 추가:
```typescript
export async function updateTurnCount(supabase: SupabaseClient, sessionId: string): Promise<void> {
  // messages 배열 길이 기반으로 turn_count 계산
  const { data } = await supabase
    .from('sessions').select('messages').eq('id', sessionId).single();
  if (!data) return;
  const messages = data.messages as unknown[];
  const userTurns = messages.filter((m: any) => m.role === 'user').length;
  await supabase.from('sessions').update({ turn_count: userTurns }).eq('id', sessionId);
}

export async function updateChapterLabel(
  supabase: SupabaseClient,
  sessionId: string,
  label: string
): Promise<void> {
  await supabase.from('sessions').update({ chapter_label: label }).eq('id', sessionId);
}
```

- [ ] **Step 2: game/chat.ts에서 턴 완료 시 호출**

`backend/src/routes/game/chat.ts`의 SSE `done` 이벤트 전송 직전에:
```typescript
// 턴 카운트 갱신
await updateTurnCount(fastify.supabaseAdmin, sessionId);

// 챕터 레이블 감지 (AI 응답에서 "제N장", "Chapter N" 패턴)
const chapterMatch = aiResponse.match(/(?:제\s*(\d+)\s*장|Chapter\s+(\d+))\s*[:\-—]\s*(.+)/);
if (chapterMatch) {
  const label = chapterMatch[0];
  await updateChapterLabel(fastify.supabaseAdmin, sessionId, label);
}
```

- [ ] **Step 3: game/start.ts에서 play_count 증가**

`backend/src/routes/game/start.ts`에서 게임 시작 시:
```typescript
// 스토리 play_count 증가
await fastify.supabaseAdmin.rpc('increment_play_count', { p_story_id: storyId });
```

- [ ] **Step 4: sessions/list.ts에서 story JOIN 포함**

`backend/src/routes/sessions/list.ts` 수정:
```typescript
// 기존 세션 목록에 story JOIN 추가
const { data } = await fastify.supabase
  .from('sessions')
  .select('*, story:stories(icon, tags, title)')
  .order('last_played_at', { ascending: false });
```

- [ ] **Step 5: 빌드 확인**

Run: `cd backend && pnpm lint`

- [ ] **Step 6: Phase 2-B 전체 커밋**

```bash
git add backend/src/
git commit -m "feat: Phase 2-B add stories CRUD, admin, auth routes + request logger"
```

---

# Phase 2-C: React 프론트엔드

## Task 13: React 프로젝트 셋업

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: pnpm-workspace.yaml에 frontend 추가**

```yaml
packages:
  - 'packages/*'
  - 'backend'
  - 'frontend'
```

- [ ] **Step 2: frontend/package.json 생성**

```json
{
  "name": "@story-game/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@story-game/shared": "workspace:*",
    "@supabase/supabase-js": "^2.49.0",
    "@tanstack/react-query": "^5.62.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 3: frontend/vite.config.ts 생성**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: frontend/tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../packages/shared" }
  ]
}
```

- [ ] **Step 5: Tailwind CSS 설정**

`frontend/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6366f1', 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
        surface: { DEFAULT: '#1a1a2e', light: '#f8fafc' },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: 엔트리 파일 생성**

`frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Story Game</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`frontend/src/main.tsx`:
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

`frontend/src/App.tsx`:
```typescript
import { Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';
import EditorPage from './pages/EditorPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/:sessionId?" element={<PlayPage />} />
        <Route path="/editor/:storyId?" element={<EditorPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </AuthProvider>
  );
}
```

`frontend/src/index.css`:
```css
@import 'tailwindcss';
```

- [ ] **Step 7: 의존성 설치 + 빌드 확인**

```bash
pnpm install
cd frontend && pnpm lint
```

- [ ] **Step 8: 커밋**

```bash
git add frontend/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat: scaffold React frontend with Vite + Tailwind + React Router"
```

---

## Task 14: 공통 컴포넌트, API 클라이언트, Hooks

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/hooks/useConfig.ts`
- Create: `frontend/src/hooks/useStories.ts`
- Create: `frontend/src/hooks/useTheme.ts`
- Create: `frontend/src/hooks/useSearch.ts`
- Create: `frontend/src/hooks/useAutoSave.ts`
- Create: `frontend/src/hooks/useIntersectionObserver.ts`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`
- Create: `frontend/src/components/layout/ThemeToggle.tsx`
- Create: `frontend/src/components/common/Toast.tsx`
- Create: `frontend/src/components/common/Pagination.tsx`
- Create: `frontend/src/components/common/Badge.tsx`
- Create: `frontend/src/components/common/TagChip.tsx`
- Create: `frontend/src/components/common/EmptyState.tsx`

- [ ] **Step 1: lib/api.ts — API 클라이언트**

```typescript
const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { code: 'INTERNAL_ERROR', message: res.statusText } }));
    throw err.error;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 2: lib/supabase.ts — Supabase 클라이언트 (Auth 전용)**

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 3: context/AuthContext.tsx — 인증 상태 관리**

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '@story-game/shared';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('access_token', session.access_token);
        // 프로필 fetch → setUser
      }
      setLoading(false);
    });
    // 세션 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('access_token', session.access_token);
      } else {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // login, signup, logout 구현은 api.post('/auth/...') 호출

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
```

- [ ] **Step 4: hooks 작성**

`hooks/useConfig.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AppConfig } from '@story-game/shared';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<AppConfig>('/config'),
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}
```

`hooks/useStories.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PaginatedResponse, StoryListItem, StoryFilterParams } from '@story-game/shared';

export function useStories(params: StoryFilterParams) {
  const searchParams = new URLSearchParams();
  if (params.genre) searchParams.set('genre', params.genre);
  if (params.search) searchParams.set('search', params.search);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.featured) searchParams.set('featured', 'true');
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('limit', String(params.limit ?? 20));

  return useQuery({
    queryKey: ['stories', params],
    queryFn: () => api.get<PaginatedResponse<StoryListItem>>(`/stories?${searchParams}`),
  });
}
```

`hooks/useTheme.ts`:
```typescript
import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(prev => !prev) };
}
```

`hooks/useSearch.ts`:
```typescript
import { useEffect, useRef, useState } from 'react';

export function useSearch() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { query, setQuery, inputRef };
}
```

`hooks/useAutoSave.ts`:
```typescript
import { useCallback, useEffect, useRef } from 'react';

export function useAutoSave(saveFn: () => Promise<void>, intervalMs = 60000, debounceMs = 1200) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const debouncedSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveFn, debounceMs);
  }, [saveFn, debounceMs]);

  useEffect(() => {
    intervalRef.current = setInterval(saveFn, intervalMs);
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timerRef.current);
    };
  }, [saveFn, intervalMs]);

  return { debouncedSave };
}
```

`hooks/useIntersectionObserver.ts`:
```typescript
import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(ids: string[]) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [ids]);

  return activeId;
}
```

- [ ] **Step 5: 레이아웃 컴포넌트**

`components/layout/Header.tsx`:
- 로고(SVG), 검색 입력(useSearch), 테마 토글, 인증 영역(비로그인: 로그인/회원가입, 로그인: 만들기 버튼 + 아바타 드롭다운)
- 반응형: 모바일에서 햄버거 메뉴

`components/layout/Footer.tsx`:
- 로고, 서비스 설명, 링크(GitHub, "[데모: 로그인]")

`components/layout/ThemeToggle.tsx`:
- 태양/달 아이콘 토글 버튼, `useTheme` hook 사용

- [ ] **Step 6: 공통 컴포넌트**

`components/common/Toast.tsx`:
- 하단 중앙 토스트 알림, Zustand store로 전역 관리
- `useToast()` → `{ show(message, type) }`

`components/common/Pagination.tsx`:
- 이전/다음 + 페이지 번호 버튼
- Props: `{ page, totalPages, onPageChange }`

`components/common/Badge.tsx`:
- 상태 배지: NEW(초록), HOT(빨강), FEATURED(보라), 잠금(회색)
- Props: `{ variant: 'new' | 'hot' | 'featured' | 'locked' }`

`components/common/TagChip.tsx`:
- 장르 태그 칩 (장르별 컬러 매핑: 무협=빨강, 판타지=보라, SF=파랑 등)
- Props: `{ genre: string; onClick?: () => void; active?: boolean }`

`components/common/EmptyState.tsx`:
- 아이콘 + 메시지 + 선택적 CTA 버튼
- Props: `{ icon, message, action? }`

- [ ] **Step 7: 빌드 확인**

```bash
cd frontend && pnpm lint
```

---

## Task 15: Home 페이지

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/components/story/StoryCard.tsx`
- Create: `frontend/src/components/story/StoryListRow.tsx`
- Create: `frontend/src/components/story/FeaturedCard.tsx`
- Create: `frontend/src/components/story/StoryStats.tsx`
- Create: `frontend/src/components/story/StoryFilter.tsx`
- Create: `frontend/src/components/story/GenreFilter.tsx`
- Create: `frontend/src/components/session/SessionCard.tsx`
- Create: `frontend/src/components/session/SessionList.tsx`

- [ ] **Step 1: HomePage.tsx — 페이지 레이아웃**

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface">
      <Header />
      <main>
        <HeroSection />
        <ContinuePlayingSection />
        <FeaturedSection />
        <StoryListSection />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: HeroSection — 아이브로우 + 타이틀 + 통계 + CTA**

- 아이브로우: "AI-Powered Interactive Fiction"
- 타이틀: "당신만의 이야기를 시작하세요"
- 서브텍스트
- CTA 버튼: "새 스토리 시작하기" → `/editor`
- `StoryStats` 컴포넌트: `useQuery(['stats'], () => api.get('/stories/stats'))`
- 통계 표시: "N개의 활성 스토리 / N회 플레이 / N명의 작성자"

- [ ] **Step 3: ContinuePlayingSection — 이어서 플레이**

- `useQuery(['sessions'])` → `GET /api/sessions` (최근 5개)
- `SessionCard`: 스토리 아이콘, 제목, 턴 수("N턴"), 진행도 바(progress_pct), 챕터 레이블, 태그
- `SessionList`: 오늘/어제/이전 그룹 라벨, 빈 상태 처리
- 인증 안 된 경우 비노출

- [ ] **Step 4: FeaturedSection — 추천 스토리**

- `useStories({ featured: true, limit: 5 })`
- `FeaturedCard`: 배너 그라디언트 배경, FEATURED 배지, 잠금 배지(has_password), 장르 태그, 설명, 플레이 수/좋아요 수, 작성자명
- 가로 스크롤 (overflow-x-auto)

- [ ] **Step 5: StoryListSection — 스토리 목록**

- `StoryFilter`:
  - 장르 필터 칩 그룹(`GenreFilter` — config.genreList 기반)
  - 검색 칩(검색어 표시 + X 버튼)
  - 정렬 셀렉트(최신/인기/이름순)
  - 보기 방식 토글(그리드/리스트 아이콘)
- 그리드 뷰(`StoryCard`): 배너, 잠금 배지, 상태 배지(NEW/HOT), 장르 태그, 플레이 수/좋아요 수
- 리스트 뷰(`StoryListRow`): 아이콘, 제목, 설명, 장르 태그, 플레이 수/좋아요 수, 작성자명
- `Pagination` 하단

상태 관리:
```typescript
const [filters, setFilters] = useState<StoryFilterParams>({ sort: 'latest', page: 1, limit: 20 });
const { data, isLoading } = useStories(filters);
```

- [ ] **Step 6: 빌드 확인 + 로컬 테스트**

```bash
cd frontend && pnpm lint
pnpm dev  # → http://localhost:5173
```

---

## Task 16: Play 페이지

**Files:**
- Create: `frontend/src/pages/PlayPage.tsx`
- Create: `frontend/src/components/play/TopBar.tsx`
- Create: `frontend/src/components/play/LeftPanel.tsx`
- Create: `frontend/src/components/play/CenterPanel.tsx`
- Create: `frontend/src/components/play/RightPanel.tsx`
- Create: `frontend/src/components/play/MessageBlock.tsx`
- Create: `frontend/src/components/play/InputArea.tsx`
- Create: `frontend/src/components/play/SuggestedActions.tsx`
- Create: `frontend/src/components/play/CharacterStatus.tsx`
- Create: `frontend/src/components/play/CharacterModal.tsx`
- Create: `frontend/src/hooks/useGameChat.ts`
- Create: `frontend/src/hooks/useSSE.ts`

- [ ] **Step 1: PlayPage.tsx — 3패널 레이아웃**

```typescript
export default function PlayPage() {
  const { sessionId } = useParams();
  // 세션 데이터 fetch
  // SSE 스트리밍 상태 관리

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: hooks/useSSE.ts — SSE 스트리밍 처리**

```typescript
export function useSSE(url: string, body: unknown) {
  // fetch + ReadableStream으로 SSE 파싱
  // event types: 'token' | 'done' | 'memory' | 'memory_complete' | 'error'
  // token 이벤트마다 state 업데이트 → 스트리밍 텍스트 표시
  // done 이벤트에서 세션 데이터 갱신
}
```

핵심 구현:
```typescript
const response = await fetch('/api/game/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ sessionId, userMessage }),
});
const reader = response.body!.getReader();
const decoder = new TextDecoder();
// SSE 이벤트 파싱 루프
```

- [ ] **Step 3: hooks/useGameChat.ts — 게임 채팅 상태 관리**

- 메시지 목록, 스트리밍 상태, 입력 모드 관리
- `sendMessage(text)`: POST /api/game/chat (SSE)
- `startGame(storyId, options)`: POST /api/game/start (SSE)
- `regenerate()`: 마지막 메시지 재생성

- [ ] **Step 4: TopBar — 스토리 정보 + 컨트롤**

- 로고(링크 → Home), 스토리 제목, 장르 배지
- API 키 표시(마스킹), 모델 셀렉트, 등장인물 버튼
- 사용자 아바타/닉네임

- [ ] **Step 5: LeftPanel — 세션 기록**

- 세션 그룹(오늘/어제/이전)
- `SessionCard`: 아이콘, 제목(장 번호), 미리보기, 턴 수
- "ID로 불러오기" 입력
- 새 세션 버튼

- [ ] **Step 6: CenterPanel — 채팅 영역**

- 스토리 헤더(제목 + 장르 배지)
- 챕터 구분선(장 번호 + 제목)
- `MessageBlock` 종류:
  - 내레이터 블록: 기억 배지, AI 코멘트
  - 캐릭터 대사 블록: 아바타, 이름, 직함, 기억 배지, 복사/재생성 액션
  - 사용자 입력 블록: 아바타, 복사 버튼
  - 시스템 이벤트 메시지
- `SuggestedActions`: 추천 답변 칩 4개 (AI가 생성)
- `InputArea`:
  - 모드 툴바(행동/생각/대사/장면 탭)
  - 텍스트 입력
  - 토큰 카운터
  - 전송 버튼

- [ ] **Step 7: RightPanel — 정보/기억/노트/출력 탭**

- 탭 바: 정보, 기억, 노트, 출력
- 정보 탭:
  - `CharacterStatus`: 상태창 속성 기반 렌더링 (게이지, 숫자, 텍스트)
  - 등장인물 요약 리스트
  - 임무 섹션
- 기억 탭: 섹션 제목 + 개수 (단기기억, 장기기억, 인물, 목표)
- 출력 탭: 마크다운 렌더링 토글, SSE 토큰 표시, 추천 답변 토글

- [ ] **Step 8: CharacterModal — 등장인물 상세**

- 아바타, 이름, 관계 태그, 성격, AI 동향
- TopBar의 "등장인물" 버튼으로 열기

- [ ] **Step 9: 빌드 확인**

```bash
cd frontend && pnpm lint
```

---

## Task 17: Editor 페이지

**Files:**
- Create: `frontend/src/pages/EditorPage.tsx`
- Create: `frontend/src/components/editor/EditorSidebar.tsx`
- Create: `frontend/src/components/editor/BasicSettingsSection.tsx`
- Create: `frontend/src/components/editor/SystemRulesSection.tsx`
- Create: `frontend/src/components/editor/WorldSettingSection.tsx`
- Create: `frontend/src/components/editor/StorySection.tsx`
- Create: `frontend/src/components/editor/CharactersSection.tsx`
- Create: `frontend/src/components/editor/StatusWindowSection.tsx`
- Create: `frontend/src/components/editor/OutputSettingsSection.tsx`
- Create: `frontend/src/components/editor/PublishSection.tsx`
- Create: `frontend/src/components/editor/PromptPreview.tsx`
- Create: `frontend/src/components/editor/PreviewPanel.tsx`
- Create: `frontend/src/components/editor/GenreSelector.tsx`

- [ ] **Step 1: EditorPage.tsx — 전체 레이아웃**

```typescript
export default function EditorPage() {
  const { storyId } = useParams();
  // 기존 스토리 fetch (storyId가 있으면)
  // 자동 저장 (useAutoSave)
  // Intersection Observer (useIntersectionObserver)

  return (
    <div className="min-h-screen flex flex-col">
      <EditorHeader saveStatus={saveStatus} onPreview={togglePreview} />
      <div className="flex-1 flex">
        <EditorSidebar activeSection={activeSection} completeness={completeness} />
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          <BasicSettingsSection />
          <SystemRulesSection />
          <WorldSettingSection />
          <StorySection />
          <CharactersSection />
          <StatusWindowSection />
          <OutputSettingsSection />
          <PublishSection />
        </main>
        {showPreview && <PreviewPanel />}
      </div>
      <ActionBar lastSaved={lastSaved} />
    </div>
  );
}
```

- [ ] **Step 2: EditorSidebar — 네비게이션 + 완성도**

- 8개 섹션 항목 (아이콘 + 라벨)
- `useIntersectionObserver`로 스크롤 위치 기반 활성 항목 하이라이트
- 완성도 프로그레스 바 (필수 필드 기반)
- 클릭 시 해당 섹션으로 스크롤

- [ ] **Step 3: BasicSettingsSection — 기본 설정**

- 프리셋 드롭다운 (힌트 텍스트 포함)
- 스토리 제목 입력
- `GenreSelector`: config.genreList 기반 장르 태그 chip 선택 (다중 선택)
- 아이콘 그리드 선택 (이모지 팔레트)
- 캐릭터 이름, 캐릭터 설정 입력

- [ ] **Step 4: 나머지 섹션들**

- `SystemRulesSection`: 시스템 규칙 textarea
- `WorldSettingSection`: 세계관 textarea
- `StorySection`: 스토리 textarea
- `CharactersSection`: 등장인물 textarea
- `StatusWindowSection`: 상태창 토글, 상태 프리셋 선택 드롭다운(`GET /api/status-presets`), 속성 목록, 추가 버튼, 힌트 박스
- `OutputSettingsSection`: LaTeX 토글, 서술 길이 슬라이더, 사용자 메모 textarea
- `PublishSection`: 공개/비공개 토글, 비밀번호 설정

- [ ] **Step 5: PromptPreview — 프롬프트 미리보기**

- 조립된 시스템 프롬프트 표시
- [상태창 규칙] 섹션 포함
- 토큰 수 표시 (근사값)

- [ ] **Step 6: PreviewPanel — 미리보기 패널**

- 상태창 프롬프트 미리보기
- 캐릭터 상태 미리보기 그리드
- 총 토큰 수

- [ ] **Step 7: 자동 저장 + 저장 상태 표시**

- `useAutoSave(saveFn, 60000, 1200)`: 60초 인터벌 + 1.2초 디바운스
- 저장 상태: "저장됨" / "저장 중..." / "변경사항 있음"
- Action Bar: "마지막 저장" 타임스탬프

- [ ] **Step 8: 빌드 확인**

```bash
cd frontend && pnpm lint
```

---

## Task 18: Admin 페이지

**Files:**
- Create: `frontend/src/pages/AdminPage.tsx`
- Create: `frontend/src/components/layout/AdminLayout.tsx`
- Create: `frontend/src/components/admin/AdminSidebar.tsx`
- Create: `frontend/src/components/admin/DashboardStats.tsx`
- Create: `frontend/src/components/admin/RecentEvents.tsx`
- Create: `frontend/src/components/admin/HourlyChart.tsx`
- Create: `frontend/src/components/admin/ServiceLogTable.tsx`
- Create: `frontend/src/components/admin/ServiceLogFilter.tsx`
- Create: `frontend/src/components/admin/ApiLogTable.tsx`
- Create: `frontend/src/components/admin/ApiLogDetail.tsx`
- Create: `frontend/src/components/admin/ApiLogFilter.tsx`
- Create: `frontend/src/components/admin/PromptSettings.tsx`
- Create: `frontend/src/components/admin/GameParams.tsx`
- Create: `frontend/src/components/admin/PresetList.tsx`
- Create: `frontend/src/components/admin/PresetEditModal.tsx`
- Create: `frontend/src/components/admin/StoryManagement.tsx`
- Create: `frontend/src/components/admin/StatusPresetCard.tsx`
- Create: `frontend/src/components/admin/StatusPresetEditor.tsx`
- Create: `frontend/src/components/admin/DangerZone.tsx`
- Create: `frontend/src/components/auth/AuthGuard.tsx`

- [ ] **Step 1: AdminPage.tsx + AdminLayout — 관리자 레이아웃**

```typescript
export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminLayout>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="service-logs" element={<ServiceLogs />} />
          <Route path="api-logs" element={<ApiLogs />} />
          <Route path="prompts" element={<PromptSettings />} />
          <Route path="game-params" element={<GameParams />} />
          <Route path="presets" element={<PresetList />} />
          <Route path="stories" element={<StoryManagement />} />
          <Route path="status-presets" element={<StatusPresets />} />
          <Route path="system" element={<SystemSettings />} />
        </Routes>
      </AdminLayout>
    </AuthGuard>
  );
}
```

`AdminLayout`:
- Top Bar: 로고, "Admin" 배지, "사이트로" 링크
- Left Nav (AdminSidebar): 모니터링(대시보드, 서비스 로그, API 로그) / 설정(프롬프트, 게임 파라미터, 스토리 프리셋, 상태창 프리셋) / 시스템(스토리 관리, 시스템) — 배지 표시(에러 수 등)
- Bottom Action Bar: "마지막 저장" 타임스탬프

- [ ] **Step 2: AuthGuard — 인증 래퍼**

```typescript
export function AuthGuard({ children, requireAdmin }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuthContext();
  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginOverlay />;
  if (requireAdmin && user.role !== 'admin') return <ForbiddenPage />;
  return children;
}
```

`LoginOverlay`: 로그인 오버레이 (이메일/비밀번호 폼)

- [ ] **Step 3: Dashboard — 대시보드**

- `DashboardStats`: 통계 카드 4개 (활성 스토리, 오늘 세션, 활성 사용자, 오류율)
  - `useQuery(['admin-dashboard'], () => api.get('/admin/dashboard'))`
- `HourlyChart`: 시간별 API 호출 추이 바 차트 (간단한 div 기반)
- `RecentEvents`: 최근 이벤트 테이블 (시간, 타입, 세션ID, 상태, 소요시간)

- [ ] **Step 4: ServiceLogs — 서비스 로그**

- `ServiceLogFilter`: 상태코드 필터(전체/2xx/4xx/5xx), 경로 필터, 시간 드롭다운(1시간/24시간/7일)
- `ServiceLogTable`: 데이터 테이블 (시간, 메서드 배지, 경로, 상태코드 배지, 응답시간, IP)
- `Pagination` 하단

- [ ] **Step 5: ApiLogs — API 로그**

- `ApiLogFilter`: 엔드포인트 필터, 세션ID 검색, 시간 드롭다운, "오류만" 토글
- `ApiLogTable`: 데이터 테이블 (시간, 세션ID, 엔드포인트, 모델, 토큰(in/out), 소요시간, 상태)
- `ApiLogDetail`: 행 클릭 시 확장 상세 (요청 탭: 시스템 프롬프트 + 메시지 / 응답 탭: 응답 텍스트 / 에러 탭)
- `Pagination` 하단

- [ ] **Step 6: PromptSettings — 프롬프트 설정**

- 카드 구조: 시스템 프리앰블, LaTeX 규칙, 서술 길이 템플릿, 메모리 지시, 메모리 요청, 안전 설정, 게임 시작 메시지
- 각 카드: 라벨 + textarea + 힌트
- `PUT /api/config` 저장

- [ ] **Step 7: GameParams — 게임 파라미터**

- 카드 구조: 서술 길이(기본/최소/최대), 슬라이딩 윈도우, 히스토리 한도, 메시지 제한/경고, 단기기억 최대, 자동 저장 간격, 세션 목록 한도
- 숫자 입력 + 슬라이더
- `PUT /api/config` 저장

- [ ] **Step 8: PresetList + PresetEditModal — 스토리 프리셋**

- `PresetList`: 프리셋 카드 (제목, 장르 태그, 항목 수, 편집/삭제 버튼)
- "프리셋 추가" 버튼
- `PresetEditModal`:
  - 프리셋 제목, 장르 드롭다운
  - 연결 상태창 프리셋 드롭다운 (`GET /api/status-presets`)
  - 세계관, 스토리, 등장인물 등 textarea
  - 닫기/저장 버튼

- [ ] **Step 9: StoryManagement — 스토리 관리**

- 필터 바(검색, 장르, 공개 여부)
- 데이터 테이블(제목, 작성자, 장르, 플레이 수, 공개 여부, 추천 토글)
- 추천 토글: `PUT /api/admin/stories/:id/featured`
- `Pagination`

- [ ] **Step 10: StatusPresets — 상태창 프리셋**

- `StatusPresetCard`: 프리셋 카드 (제목, 장르 태그, 속성 수, 편집/삭제)
- `StatusPresetEditor`: 속성 테이블 편집 (속성명, 타입 셀렉트, 최대값, 삭제 버튼)
- 속성 추가 버튼, 드래그 정렬 (선택적)
- CRUD: `/api/admin/status-presets`

- [ ] **Step 11: SystemSettings + DangerZone — 시스템 설정**

- 배포 정보 카드(버전, 배포일, 환경)
- 상태 요약(DB 연결, 서비스 상태)
- `DangerZone`:
  - "세션 데이터 초기화" 버튼 → 확인 다이얼로그 → `DELETE /api/admin/danger-zone/sessions`
  - "서비스 로그 삭제" → `DELETE /api/admin/danger-zone/logs`
  - "전체 DB 초기화" → 이중 확인 → `DELETE /api/admin/danger-zone/all`

- [ ] **Step 12: 빌드 확인**

```bash
cd frontend && pnpm lint
```

- [ ] **Step 13: Phase 2-C 전체 커밋**

```bash
git add frontend/
git commit -m "feat: Phase 2-C React frontend with all 4 pages"
```

---

## File Structure (Phase 2 전체)

```
ai-story-game2/
├── supabase/migrations/
│   ├── ... (Phase 1: 00001~00005)
│   ├── 00000000000009_create_status_presets.sql    # Task 3
│   ├── 00000000000010_extend_stories.sql           # Task 1
│   ├── 00000000000011_extend_sessions.sql          # Task 2
│   ├── 00000000000012_extend_presets.sql            # Task 4
│   ├── 00000000000013_create_service_logs.sql       # Task 6
│   └── 00000000000014_extend_config.sql             # Task 7
│
├── packages/shared/src/types/
│   ├── ... (Phase 1: story, session, memory, config, auth, api)
│   ├── status.ts                                    # Task 3
│   └── log.ts                                       # Task 6
│
├── backend/src/
│   ├── plugins/
│   │   └── request-logger.ts                        # Task 11
│   ├── routes/
│   │   ├── auth.ts                                  # Task 10
│   │   ├── me.ts                                    # Task 10
│   │   ├── stories/
│   │   │   ├── list.ts                             # Task 8
│   │   │   ├── detail.ts                           # Task 8
│   │   │   ├── crud.ts                             # Task 8
│   │   │   ├── stats.ts                            # Task 8
│   │   │   └── presets.ts                          # Task 8
│   │   └── admin/
│   │       ├── stories.ts                          # Task 9
│   │       ├── status-presets.ts                   # Task 9
│   │       ├── service-logs.ts                     # Task 9
│   │       ├── api-logs.ts                         # Task 9
│   │       ├── dashboard.ts                        # Task 9
│   │       └── danger-zone.ts                      # Task 9
│   └── services/
│       └── crypto.ts                               # Task 10
│
└── frontend/                                        # Task 13~18
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── lib/
        │   ├── api.ts
        │   └── supabase.ts
        ├── context/
        │   └── AuthContext.tsx
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useConfig.ts
        │   ├── useStories.ts
        │   ├── useTheme.ts
        │   ├── useSearch.ts
        │   ├── useAutoSave.ts
        │   ├── useIntersectionObserver.ts
        │   ├── useGameChat.ts
        │   └── useSSE.ts
        ├── pages/
        │   ├── HomePage.tsx
        │   ├── PlayPage.tsx
        │   ├── EditorPage.tsx
        │   └── AdminPage.tsx
        └── components/
            ├── layout/
            │   ├── Header.tsx
            │   ├── Footer.tsx
            │   ├── ThemeToggle.tsx
            │   └── AdminLayout.tsx
            ├── common/
            │   ├── Toast.tsx
            │   ├── Pagination.tsx
            │   ├── Badge.tsx
            │   ├── TagChip.tsx
            │   └── EmptyState.tsx
            ├── auth/
            │   └── AuthGuard.tsx
            ├── story/
            │   ├── StoryCard.tsx
            │   ├── StoryListRow.tsx
            │   ├── FeaturedCard.tsx
            │   ├── StoryStats.tsx
            │   ├── StoryFilter.tsx
            │   └── GenreFilter.tsx
            ├── session/
            │   ├── SessionCard.tsx
            │   └── SessionList.tsx
            ├── play/
            │   ├── TopBar.tsx
            │   ├── LeftPanel.tsx
            │   ├── CenterPanel.tsx
            │   ├── RightPanel.tsx
            │   ├── MessageBlock.tsx
            │   ├── InputArea.tsx
            │   ├── SuggestedActions.tsx
            │   ├── CharacterStatus.tsx
            │   └── CharacterModal.tsx
            ├── editor/
            │   ├── EditorSidebar.tsx
            │   ├── BasicSettingsSection.tsx
            │   ├── SystemRulesSection.tsx
            │   ├── WorldSettingSection.tsx
            │   ├── StorySection.tsx
            │   ├── CharactersSection.tsx
            │   ├── StatusWindowSection.tsx
            │   ├── OutputSettingsSection.tsx
            │   ├── PublishSection.tsx
            │   ├── PromptPreview.tsx
            │   ├── PreviewPanel.tsx
            │   └── GenreSelector.tsx
            └── admin/
                ├── AdminSidebar.tsx
                ├── DashboardStats.tsx
                ├── RecentEvents.tsx
                ├── HourlyChart.tsx
                ├── ServiceLogTable.tsx
                ├── ServiceLogFilter.tsx
                ├── ApiLogTable.tsx
                ├── ApiLogDetail.tsx
                ├── ApiLogFilter.tsx
                ├── PromptSettings.tsx
                ├── GameParams.tsx
                ├── PresetList.tsx
                ├── PresetEditModal.tsx
                ├── StoryManagement.tsx
                ├── StatusPresetCard.tsx
                ├── StatusPresetEditor.tsx
                └── DangerZone.tsx
```
