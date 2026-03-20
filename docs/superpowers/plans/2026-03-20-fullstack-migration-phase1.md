# Full-Stack Migration Phase 1: Monorepo + Backend API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monorepo 구조를 설정하고, Supabase 셀프호스팅용 DB 마이그레이션 스크립트를 작성하고, 기존 Cloudflare Worker 로직을 Fastify + TypeScript 백엔드로 이전한다.

**Architecture:** pnpm workspace 기반 monorepo에서 `packages/shared` (타입), `backend` (Fastify), `frontend` (React, Phase 2)를 관리한다. 백엔드는 Fastify 플러그인 패턴으로 Supabase 연결, 인증, rate limiting을 처리하며, 기존 Worker의 게임/메모리/프롬프트 로직을 TypeScript 서비스로 전환한다.

**Tech Stack:** Fastify 5, TypeScript 5, pnpm workspaces, @supabase/supabase-js, @fastify/rate-limit, @fastify/cors, pino (Fastify built-in)

**Design Spec:** `docs/superpowers/specs/2026-03-20-full-stack-migration-design.md`

**Existing code to migrate:**
- `src/worker.js` → `backend/src/server.ts` + route files
- `src/game-handler.js` → `backend/src/routes/game/` + `backend/src/services/session-manager.ts`
- `src/prompt-builder.js` → `backend/src/services/prompt-builder.ts`
- `src/memory-handler.js` → `backend/src/services/memory-handler.ts`
- `src/gemini-client.js` → `backend/src/services/gemini.ts`
- `src/db.js` → `backend/src/plugins/supabase.ts` (Supabase JS SDK로 대체)

---

## File Structure

```
ai-story-game2/
├── pnpm-workspace.yaml
├── package.json                          # root: scripts for dev, lint
├── .env                                  # 기존 + 새 환경변수
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── story.ts              # Story, StoryPreset 타입
│       │   │   ├── session.ts            # Session, SessionMessage 타입
│       │   │   ├── memory.ts             # Memory 4카테고리 타입
│       │   │   ├── config.ts             # PromptConfig, GameplayConfig 타입
│       │   │   ├── auth.ts               # AuthUser, AuthResponse 타입
│       │   │   └── api.ts                # API 요청/응답 공통 타입, 에러 코드
│       │   └── index.ts                  # re-export all
│       ├── package.json
│       └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── server.ts                     # Fastify 앱 생성, 플러그인/라우트 등록
│   │   ├── config.ts                     # 환경변수 로드 + 검증 (envSchema)
│   │   │
│   │   ├── plugins/
│   │   │   ├── supabase.ts              # Supabase 클라이언트 데코레이터
│   │   │   ├── auth.ts                  # JWT/세션토큰 검증 미들웨어
│   │   │   └── config-cache.ts          # 인메모리 config 캐시 (5분 TTL)
│   │   │
│   │   ├── routes/
│   │   │   ├── health.ts                # GET /api/health
│   │   │   ├── auth.ts                  # POST /api/auth/signup, /login
│   │   │   ├── config.ts               # GET/PUT /api/config
│   │   │   ├── stories/
│   │   │   │   ├── list.ts             # GET /api/stories
│   │   │   │   ├── detail.ts           # GET /api/stories/:id
│   │   │   │   ├── crud.ts             # POST/PUT/DELETE /api/stories
│   │   │   │   ├── verify.ts           # GET /api/stories/:id/verify
│   │   │   │   └── presets.ts          # GET/POST/PUT/DELETE /api/presets
│   │   │   ├── sessions/
│   │   │   │   ├── list.ts             # GET /api/sessions
│   │   │   │   ├── detail.ts           # GET /api/sessions/:id
│   │   │   │   ├── crud.ts             # POST/PUT/DELETE /api/sessions
│   │   │   │   └── memory.ts           # GET /api/sessions/:id/memory
│   │   │   ├── game/
│   │   │   │   ├── start.ts            # POST /api/game/start (SSE)
│   │   │   │   └── chat.ts             # POST /api/game/chat (SSE)
│   │   │   └── me.ts                   # GET /api/me, PUT/DELETE /api/me/apikey
│   │   │
│   │   └── services/
│   │       ├── gemini.ts               # Gemini API (stream + batch)
│   │       ├── prompt-builder.ts       # 시스템 프롬프트 조립
│   │       ├── memory-handler.ts       # 메모리 트리거/생성/파싱
│   │       ├── session-manager.ts      # 슬라이딩 윈도우, 메시지 관리
│   │       └── crypto.ts              # AES-256-GCM 암호화 (API 키)
│   │
│   ├── package.json
│   └── tsconfig.json
│
└── supabase/
    └── migrations/
        ├── 00000000000001_create_story_game_schema.sql
        ├── 00000000000002_create_user_profiles.sql
        ├── 00000000000003_setup_rls.sql
        ├── 00000000000004_seed_config.sql
        └── 00000000000005_add_session_token.sql
```

---

## Task 1: Monorepo 스캐폴딩

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: pnpm-workspace.yaml 생성**

```yaml
packages:
  - 'packages/*'
  - 'backend'
  - 'frontend'
```

- [ ] **Step 2: 루트 package.json 생성**

```json
{
  "name": "ai-story-game",
  "private": true,
  "scripts": {
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: packages/shared 패키지 생성**

`packages/shared/package.json`:
```json
{
  "name": "@story-game/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: backend 패키지 생성**

`backend/package.json`:
```json
{
  "name": "@story-game/backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@story-game/shared": "workspace:*",
    "@supabase/supabase-js": "^2.49.0",
    "fastify": "^5.2.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/rate-limit": "^10.2.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  }
}
```

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "references": [
    { "path": "../packages/shared" }
  ]
}
```

- [ ] **Step 5: 의존성 설치**

Run: `pnpm install`
Expected: 모든 workspace 패키지 연결 완료

- [ ] **Step 6: 커밋**

```bash
git add pnpm-workspace.yaml package.json packages/ backend/package.json backend/tsconfig.json pnpm-lock.yaml
git commit -m "chore: scaffold pnpm monorepo with shared types and backend packages"
```

---

## Task 2: 공유 타입 정의

**Files:**
- Create: `packages/shared/src/types/story.ts`
- Create: `packages/shared/src/types/session.ts`
- Create: `packages/shared/src/types/memory.ts`
- Create: `packages/shared/src/types/config.ts`
- Create: `packages/shared/src/types/auth.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/index.ts`

타입은 기존 `supabase-schema.sql`의 테이블 구조와 `src/` 파일들의 실제 사용 패턴을 기반으로 정의한다.

- [ ] **Step 1: story.ts 타입**

```typescript
// packages/shared/src/types/story.ts
export interface Story {
  id: string;
  title: string;
  world_setting: string;
  story: string;
  character_name: string;
  character_setting: string;
  characters: string;
  user_note: string;
  system_rules: string;
  use_latex: boolean;
  is_public: boolean;
  has_password: boolean; // stories_safe VIEW에서 가져옴
  owner_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryCreateInput {
  title: string;
  world_setting?: string;
  story?: string;
  character_name?: string;
  character_setting?: string;
  characters?: string;
  user_note?: string;
  system_rules?: string;
  use_latex?: boolean;
  is_public?: boolean;
  password_hash?: string;
}

export interface StoryPreset {
  characterName: string;
  characterSetting: string;
  useLatex: boolean;
  narrativeLength: number;
}

export interface Preset {
  id: string;
  title: string;
  is_default: boolean;
  world_setting: string;
  story: string;
  characters: string;
  character_name: string;
  character_setting: string;
  user_note: string;
  system_rules: string;
  use_latex: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: session.ts 타입**

```typescript
// packages/shared/src/types/session.ts
export interface SessionMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  story_id: string | null;
  title: string;
  preset: Record<string, unknown>;
  messages: SessionMessage[];
  model: string;
  summary: string;
  summary_up_to_index: number;
  session_token: string;
  owner_uid: string | null;
  created_at: string;
  updated_at: string;
  last_played_at: string;
}

export interface SessionListItem {
  id: string;
  story_id: string | null;
  title: string;
  model: string;
  message_count: number;
  last_played_at: string;
  created_at: string;
}
```

- [ ] **Step 3: memory.ts 타입**

```typescript
// packages/shared/src/types/memory.ts
export interface ShortTermEntry {
  title: string;
  content: string;
}

export interface LongTermEntry {
  title: string;
  content: string;
}

export interface CharacterEntry {
  name: string;
  role: string;
  description: string;
}

export type MemoryType = 'short_term' | 'long_term' | 'characters' | 'goals';

export interface SessionMemory {
  shortTerm: ShortTermEntry[];
  longTerm: LongTermEntry[];
  characters: CharacterEntry[];
  goals: string;
}
```

- [ ] **Step 4: config.ts 타입**

```typescript
// packages/shared/src/types/config.ts
export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface PromptConfig {
  system_preamble: string;
  latex_rules: string;
  narrative_length_template: string;
  memory_system_instruction: string;
  memory_request: string;
  safety_settings: SafetySetting[];
  game_start_message: string;
  cache_ttl: string;
}

export interface GameplayConfig {
  default_narrative_length: number;
  narrative_length_min: number;
  narrative_length_max: number;
  sliding_window_size: number;
  max_history: number;
  message_limit: number;
  message_warning_threshold: number;
  memory_short_term_max: number;
  auto_save_interval_ms: number;
  max_session_list: number;
}

export interface AppConfig {
  promptConfig: PromptConfig;
  gameplayConfig: GameplayConfig;
}
```

- [ ] **Step 5: auth.ts 타입**

```typescript
// packages/shared/src/types/auth.ts
export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  role: 'user' | 'admin';
}

export interface AuthSignupInput {
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthLoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 6: api.ts 타입**

```typescript
// packages/shared/src/types/api.ts
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_API_KEY'
  | 'GEMINI_ERROR'
  | 'SESSION_LIMIT'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export interface GameStartRequest {
  storyId: string;
  model: string;
  options?: {
    characterName?: string;
    characterSetting?: string;
    useLatex?: boolean;
    narrativeLength?: number;
  };
}

export interface GameChatRequest {
  sessionId: string;
  userMessage: string;
  regenerate?: boolean;
}

// SSE event types
export type SSEEventType = 'token' | 'done' | 'memory' | 'memory_complete' | 'error';

export interface SSETokenEvent {
  text: string;
}

export interface SSEDoneEvent {
  tokenUsage: { input: number; output: number } | null;
  sessionId?: string;
  sessionToken?: string;
}

export interface SSEMemoryEvent {
  triggered: boolean;
  status: 'generating' | 'complete' | 'failed';
}

export interface SSEErrorEvent {
  code: ErrorCode;
  message: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  supabase: 'connected' | 'disconnected';
  uptime: number;
  version: string;
}
```

- [ ] **Step 7: index.ts에서 re-export**

```typescript
// packages/shared/src/index.ts
export * from './types/story.js';
export * from './types/session.js';
export * from './types/memory.js';
export * from './types/config.js';
export * from './types/auth.js';
export * from './types/api.js';
```

- [ ] **Step 8: 빌드 확인**

Run: `cd packages/shared && pnpm lint`
Expected: 타입 에러 없이 통과

- [ ] **Step 9: 커밋**

```bash
git add packages/shared/
git commit -m "feat: add shared type definitions for story, session, memory, config, auth, api"
```

---

## Task 3: DB 마이그레이션 스크립트

**Files:**
- Create: `supabase/migrations/00000000000001_create_story_game_schema.sql`
- Create: `supabase/migrations/00000000000002_create_user_profiles.sql`
- Create: `supabase/migrations/00000000000003_setup_rls.sql`
- Create: `supabase/migrations/00000000000004_seed_config.sql`
- Create: `supabase/migrations/00000000000005_add_session_token.sql`

기존 `supabase-schema.sql`의 구조를 `story_game` 스키마로 이전한다. **이 SQL은 아직 실행하지 않는다** — 백엔드 개발 완료 후 OCI Supabase에 적용한다.

- [ ] **Step 1: 스키마 + 핵심 테이블 생성**

`supabase/migrations/00000000000001_create_story_game_schema.sql`:
```sql
-- Story Game 전용 스키마 생성
CREATE SCHEMA IF NOT EXISTS story_game;

-- stories 테이블
CREATE TABLE story_game.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  world_setting TEXT DEFAULT '',
  story TEXT DEFAULT '',
  character_name TEXT DEFAULT '',
  character_setting TEXT DEFAULT '',
  characters TEXT DEFAULT '',
  user_note TEXT DEFAULT '',
  system_rules TEXT DEFAULT '',
  use_latex BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  password_hash TEXT,
  owner_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- sessions 테이블
CREATE TABLE story_game.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES story_game.stories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  preset JSONB DEFAULT '{}'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  model TEXT,
  summary TEXT DEFAULT '',
  summary_up_to_index INTEGER DEFAULT 0,
  owner_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_played_at TIMESTAMPTZ DEFAULT now()
);

-- session_memory 테이블
CREATE TABLE story_game.session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES story_game.sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

-- presets 테이블
CREATE TABLE story_game.presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  world_setting TEXT DEFAULT '',
  story TEXT DEFAULT '',
  characters TEXT DEFAULT '',
  character_name TEXT DEFAULT '',
  character_setting TEXT DEFAULT '',
  user_note TEXT DEFAULT '',
  system_rules TEXT DEFAULT '',
  use_latex BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- config 테이블
CREATE TABLE story_game.config (
  id TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- api_logs 테이블
CREATE TABLE story_game.api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES story_game.sessions(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_model TEXT,
  request_system_prompt TEXT,
  request_messages JSONB,
  request_body JSONB,
  response_text TEXT,
  response_usage JSONB,
  response_error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- stories_safe VIEW (password_hash 노출 방지)
CREATE VIEW story_game.stories_safe AS
SELECT
  id, title, world_setting, story, character_name, character_setting,
  characters, user_note, system_rules, use_latex, is_public,
  (password_hash IS NOT NULL) AS has_password,
  owner_uid, created_at, updated_at
FROM story_game.stories;

-- 인덱스
CREATE INDEX idx_sg_stories_public ON story_game.stories(is_public) WHERE is_public = true;
CREATE INDEX idx_sg_stories_created ON story_game.stories(created_at DESC);
CREATE INDEX idx_sg_sessions_story ON story_game.sessions(story_id);
CREATE INDEX idx_sg_sessions_owner ON story_game.sessions(owner_uid);
CREATE INDEX idx_sg_sessions_played ON story_game.sessions(last_played_at DESC);
CREATE INDEX idx_sg_presets_default ON story_game.presets(is_default) WHERE is_default = true;
CREATE INDEX idx_sg_api_logs_session ON story_game.api_logs(session_id);
CREATE INDEX idx_sg_api_logs_created ON story_game.api_logs(created_at DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION story_game.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at BEFORE UPDATE ON story_game.stories
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON story_game.sessions
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER presets_updated_at BEFORE UPDATE ON story_game.presets
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER config_updated_at BEFORE UPDATE ON story_game.config
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
CREATE TRIGGER session_memory_updated_at BEFORE UPDATE ON story_game.session_memory
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();
```

- [ ] **Step 2: user_profiles 테이블**

`supabase/migrations/00000000000002_create_user_profiles.sql`:
```sql
CREATE TABLE story_game.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  api_key_enc TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON story_game.user_profiles
  FOR EACH ROW EXECUTE FUNCTION story_game.update_updated_at();

-- 새 사용자 가입 시 자동으로 user_profiles 생성
CREATE OR REPLACE FUNCTION story_game.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO story_game.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION story_game.handle_new_user();
```

- [ ] **Step 3: RLS 정책 설정**

`supabase/migrations/00000000000003_setup_rls.sql`:
```sql
-- stories RLS
ALTER TABLE story_game.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_select" ON story_game.stories
  FOR SELECT USING (is_public = true OR auth.uid() = owner_uid);
CREATE POLICY "stories_insert" ON story_game.stories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_uid = auth.uid());
CREATE POLICY "stories_update" ON story_game.stories
  FOR UPDATE USING (auth.uid() = owner_uid);
CREATE POLICY "stories_delete" ON story_game.stories
  FOR DELETE USING (auth.uid() = owner_uid);

-- sessions RLS
ALTER TABLE story_game.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON story_game.sessions
  FOR SELECT USING (owner_uid = auth.uid() OR owner_uid IS NULL);
CREATE POLICY "sessions_insert" ON story_game.sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update" ON story_game.sessions
  FOR UPDATE USING (owner_uid = auth.uid() OR owner_uid IS NULL);
CREATE POLICY "sessions_delete" ON story_game.sessions
  FOR DELETE USING (owner_uid = auth.uid() OR owner_uid IS NULL);

-- session_memory RLS
ALTER TABLE story_game.session_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_memory_select" ON story_game.session_memory
  FOR SELECT USING (true);
CREATE POLICY "session_memory_insert" ON story_game.session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM story_game.sessions WHERE owner_uid = auth.uid() OR owner_uid IS NULL)
  );
CREATE POLICY "session_memory_update" ON story_game.session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM story_game.sessions WHERE owner_uid = auth.uid() OR owner_uid IS NULL)
  );

-- presets RLS
ALTER TABLE story_game.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_select" ON story_game.presets FOR SELECT USING (true);

-- config RLS
ALTER TABLE story_game.config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select" ON story_game.config FOR SELECT USING (true);

-- api_logs RLS (service key only)
ALTER TABLE story_game.api_logs ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS
ALTER TABLE story_game.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON story_game.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON story_game.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- stories_safe VIEW 권한
GRANT SELECT ON story_game.stories_safe TO anon, authenticated;
-- password_hash 직접 접근 차단
REVOKE SELECT (password_hash) ON story_game.stories FROM anon, authenticated;

-- 스토리 비밀번호 관련 함수
CREATE OR REPLACE FUNCTION story_game.get_story_salt(p_story_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = story_game AS $$
  SELECT split_part(password_hash, ':', 1)
  FROM stories WHERE id = p_story_id AND password_hash IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION story_game.verify_story_password(p_story_id uuid, p_input_hash text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = story_game AS $$
  SELECT EXISTS(
    SELECT 1 FROM stories WHERE id = p_story_id AND password_hash = p_input_hash
  );
$$;
```

- [ ] **Step 4: config 시드 데이터**

`supabase/migrations/00000000000004_seed_config.sql`:
기존 `supabase-schema.sql`의 prompt_config, gameplay_config INSERT 문을 `story_game.config`으로 복사.

- [ ] **Step 5: session_token 컬럼 추가**

`supabase/migrations/00000000000005_add_session_token.sql`:
```sql
ALTER TABLE story_game.sessions
  ADD COLUMN session_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX idx_sg_sessions_token ON story_game.sessions(session_token);
```

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat: add story_game schema migration scripts for OCI Supabase"
```

---

## Task 4: 백엔드 코어 — 환경변수 + Fastify 서버

**Files:**
- Create: `backend/src/config.ts`
- Create: `backend/src/server.ts`

- [ ] **Step 1: config.ts — 환경변수 로드 및 검증**

```typescript
// backend/src/config.ts
import 'dotenv/config';

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  API_KEY_ENCRYPTION_SECRET: string;
  CORS_ORIGIN: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function loadConfig(): EnvConfig {
  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: (process.env.NODE_ENV || 'development') as EnvConfig['NODE_ENV'],
    SUPABASE_URL: requireEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_KEY: requireEnv('SUPABASE_SERVICE_KEY'),
    API_KEY_ENCRYPTION_SECRET: requireEnv('API_KEY_ENCRYPTION_SECRET'),
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  };
}
```

- [ ] **Step 2: server.ts — Fastify 앱 생성 및 시작**

```typescript
// backend/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { loadConfig } from './config.js';

const config = loadConfig();

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
    redact: ['req.headers["x-gemini-key"]', 'req.headers["authorization"]'],
  },
  trustProxy: true,
});

// CORS
await app.register(cors, {
  origin: config.NODE_ENV === 'development' ? config.CORS_ORIGIN : false,
});

// Rate limiting
await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  allowList: (req) => req.url === '/api/health',
});

// Health check (no rate limit)
app.get('/api/health', async () => ({
  status: 'ok',
  supabase: 'connected',
  uptime: process.uptime(),
  version: '1.0.0',
}));

// Start server
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 3: pino-pretty 개발 의존성 추가**

Run: `cd backend && pnpm add -D pino-pretty`

- [ ] **Step 4: 서버 시작 확인**

`.env`에 새 환경변수 추가 (기존 값 유지 + 새로 추가):
```
API_KEY_ENCRYPTION_SECRET=dev-secret-key-change-in-production
```

Run: `cd backend && pnpm dev`
Expected: `Server listening at http://0.0.0.0:3000`

- [ ] **Step 5: health 엔드포인트 확인**

Run: `curl -s http://localhost:3000/api/health | python3 -m json.tool`
Expected: `{"status":"ok","supabase":"connected","uptime":...,"version":"1.0.0"}`

- [ ] **Step 6: 커밋**

```bash
git add backend/src/config.ts backend/src/server.ts backend/pnpm-lock.yaml .env
git commit -m "feat: add Fastify server with health check, CORS, rate limiting"
```

---

## Task 5: Supabase 플러그인

**Files:**
- Create: `backend/src/plugins/supabase.ts`

- [ ] **Step 1: Supabase 클라이언트 플러그인**

```typescript
// backend/src/plugins/supabase.ts
import fp from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;       // anon key (RLS 적용)
    supabaseAdmin: SupabaseClient;  // service key (RLS 우회)
  }
}

export default fp(async (app: FastifyInstance) => {
  const url = app.config.SUPABASE_URL;
  const anonKey = app.config.SUPABASE_ANON_KEY;
  const serviceKey = app.config.SUPABASE_SERVICE_KEY;

  const supabase = createClient(url, anonKey, {
    db: { schema: 'story_game' },
  });

  const supabaseAdmin = createClient(url, serviceKey, {
    db: { schema: 'story_game' },
  });

  // 연결 확인
  const { error } = await supabaseAdmin.from('config').select('id').limit(1);
  if (error) {
    app.log.warn({ error }, 'Supabase connection check failed');
  }

  app.decorate('supabase', supabase);
  app.decorate('supabaseAdmin', supabaseAdmin);
});
```

- [ ] **Step 2: fastify-plugin 설치 + config 데코레이터 추가**

Run: `cd backend && pnpm add fastify-plugin`

`server.ts`에 config 데코레이터 추가 (플러그인에서 `app.config` 접근용):
```typescript
// server.ts에 추가 (CORS 등록 전)
declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}
app.decorate('config', config);
```

그 후 supabase 플러그인 등록:
```typescript
import supabasePlugin from './plugins/supabase.js';
await app.register(supabasePlugin);
```

- [ ] **Step 3: 서버 재시작 후 health 체크에서 supabase 연결 확인**

서버 로그에 Supabase 연결 관련 에러가 없는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add backend/src/plugins/supabase.ts backend/src/server.ts
git commit -m "feat: add Supabase plugin with anon + admin clients"
```

---

## Task 6: Config 캐시 플러그인

**Files:**
- Create: `backend/src/plugins/config-cache.ts`
- Create: `backend/src/routes/config.ts`

- [ ] **Step 1: 인메모리 config 캐시 플러그인**

```typescript
// backend/src/plugins/config-cache.ts
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '@story-game/shared';

declare module 'fastify' {
  interface FastifyInstance {
    getAppConfig: () => Promise<AppConfig>;
    invalidateConfigCache: () => void;
  }
}

const CONFIG_TTL_MS = 5 * 60 * 1000; // 5분

export default fp(async (app: FastifyInstance) => {
  let cached: { data: AppConfig; expiresAt: number } | null = null;

  async function fetchConfig(): Promise<AppConfig> {
    const { data, error } = await app.supabaseAdmin
      .from('config')
      .select('id, value')
      .in('id', ['prompt_config', 'gameplay_config']);

    if (error || !data) throw new Error('Failed to fetch config');

    const result: Partial<AppConfig> = {};
    for (const row of data) {
      if (row.id === 'prompt_config') result.promptConfig = row.value;
      else if (row.id === 'gameplay_config') result.gameplayConfig = row.value;
    }

    if (!result.promptConfig || !result.gameplayConfig) {
      throw new Error('Missing prompt_config or gameplay_config');
    }

    return result as AppConfig;
  }

  async function getAppConfig(): Promise<AppConfig> {
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    const data = await fetchConfig();
    cached = { data, expiresAt: Date.now() + CONFIG_TTL_MS };
    return data;
  }

  function invalidateConfigCache(): void {
    cached = null;
  }

  app.decorate('getAppConfig', getAppConfig);
  app.decorate('invalidateConfigCache', invalidateConfigCache);
});
```

- [ ] **Step 2: config 라우트**

```typescript
// backend/src/routes/config.ts
import type { FastifyInstance } from 'fastify';

export default async function configRoutes(app: FastifyInstance) {
  // GET /api/config — 공개
  app.get('/api/config', async (request, reply) => {
    try {
      const config = await app.getAppConfig();
      return config;
    } catch (err) {
      app.log.error(err, 'Failed to load config');
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Configuration unavailable' } });
    }
  });

  // PUT /api/config — 관리자만 (Task 7에서 auth 미들웨어 적용 후 보호)
  app.put('/api/config', async (request, reply) => {
    const body = request.body as { promptConfig?: unknown; gameplayConfig?: unknown };
    if (!body.promptConfig || !body.gameplayConfig) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Missing promptConfig or gameplayConfig' } });
    }

    const { error: e1 } = await app.supabaseAdmin
      .from('config')
      .update({ value: body.promptConfig })
      .eq('id', 'prompt_config');

    const { error: e2 } = await app.supabaseAdmin
      .from('config')
      .update({ value: body.gameplayConfig })
      .eq('id', 'gameplay_config');

    if (e1 || e2) {
      app.log.error({ e1, e2 }, 'Config update failed');
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Config update failed' } });
    }

    app.invalidateConfigCache();
    return { ok: true };
  });
}
```

- [ ] **Step 3: 라우트를 server.ts에 등록**

```typescript
import configCachePlugin from './plugins/config-cache.js';
import configRoutes from './routes/config.js';

await app.register(configCachePlugin);
await app.register(configRoutes);
```

- [ ] **Step 4: 확인**

Run: `curl -s http://localhost:3000/api/config | python3 -m json.tool`
Expected: `{"promptConfig": {...}, "gameplayConfig": {...}}`

- [ ] **Step 5: 커밋**

```bash
git add backend/src/plugins/config-cache.ts backend/src/routes/config.ts backend/src/server.ts
git commit -m "feat: add config cache plugin and GET/PUT /api/config routes"
```

---

## Task 7: 인증 플러그인

**Files:**
- Create: `backend/src/plugins/auth.ts`
- Create: `backend/src/routes/auth.ts`

- [ ] **Step 1: auth 플러그인 — JWT + session_token 검증**

```typescript
// backend/src/plugins/auth.ts
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthUser } from '@story-game/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null);

  // preHandler로 등록 — 모든 요청에서 JWT를 파싱 (실패해도 진행, 공개 라우트 허용)
  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return;

    const token = authHeader.slice(7);
    const { data: { user }, error } = await app.supabase.auth.getUser(token);

    if (error || !user) return;

    // user_profiles에서 닉네임과 role 조회
    const { data: profile } = await app.supabaseAdmin
      .from('user_profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    // admin role은 config 테이블의 admin_uid와 비교
    const { data: adminConfig } = await app.supabaseAdmin
      .from('config')
      .select('value')
      .eq('id', 'admin_uid')
      .single();

    const isAdmin = adminConfig?.value === user.id;

    request.user = {
      id: user.id,
      email: user.email || '',
      nickname: profile?.nickname || null,
      role: isAdmin ? 'admin' : 'user',
    };
  });
});

// 라우트에서 사용할 인증 가드 함수들
export function requireAuth(request: FastifyRequest) {
  if (!request.user) {
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: '로그인이 필요합니다' };
  }
  return request.user;
}

export function requireAdmin(request: FastifyRequest) {
  const user = requireAuth(request);
  if (user.role !== 'admin') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' };
  }
  return user;
}

// 세션 토큰 검증 (익명 사용자용)
export async function verifySessionAccess(
  app: FastifyInstance,
  request: FastifyRequest,
  sessionId: string
): Promise<void> {
  // 로그인 사용자: owner_uid로 검증
  if (request.user) {
    const { data } = await app.supabaseAdmin
      .from('sessions')
      .select('owner_uid')
      .eq('id', sessionId)
      .single();

    if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Session not found' };
    if (data.owner_uid && data.owner_uid !== request.user.id) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 접근 권한이 없습니다' };
    }
    return;
  }

  // 익명 사용자: X-Session-Token으로 검증
  const sessionToken = request.headers['x-session-token'] as string;
  if (!sessionToken) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 토큰이 필요합니다' };
  }

  const { data } = await app.supabaseAdmin
    .from('sessions')
    .select('session_token')
    .eq('id', sessionId)
    .single();

  if (!data) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Session not found' };
  if (data.session_token !== sessionToken) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: '세션 토큰이 일치하지 않습니다' };
  }
}
```

- [ ] **Step 2: auth 라우트 — signup, login**

```typescript
// backend/src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import type { AuthSignupInput, AuthLoginInput } from '@story-game/shared';

export default async function authRoutes(app: FastifyInstance) {
  // rate limit override for auth routes
  const authRateConfig = { max: 5, timeWindow: '1 minute' };

  app.post('/api/auth/signup', { config: { rateLimit: authRateConfig } }, async (request, reply) => {
    const { email, password, nickname } = request.body as AuthSignupInput;
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required' } });
    }

    const { data, error } = await app.supabase.auth.signUp({ email, password });
    if (error) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    }

    if (nickname && data.user) {
      await app.supabaseAdmin
        .from('user_profiles')
        .update({ nickname })
        .eq('id', data.user.id);
    }

    return {
      user: {
        id: data.user!.id,
        email: data.user!.email || '',
        nickname: nickname || null,
        role: 'user' as const,
      },
      accessToken: data.session?.access_token || '',
      refreshToken: data.session?.refresh_token || '',
    };
  });

  app.post('/api/auth/login', { config: { rateLimit: authRateConfig } }, async (request, reply) => {
    const { email, password } = request.body as AuthLoginInput;
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required' } });
    }

    const { data, error } = await app.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } });
    }

    const { data: profile } = await app.supabaseAdmin
      .from('user_profiles')
      .select('nickname')
      .eq('id', data.user.id)
      .single();

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        nickname: profile?.nickname || null,
        role: 'user' as const,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  });
}
```

- [ ] **Step 3: 에러 핸들러를 server.ts에 추가**

```typescript
// server.ts — app 생성 후 추가
app.setErrorHandler((error, request, reply) => {
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: {
        code: (error as any).code || 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
  app.log.error(error);
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});
```

- [ ] **Step 4: 플러그인/라우트 등록**

```typescript
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';

await app.register(authPlugin);
await app.register(authRoutes);
```

- [ ] **Step 5: 커밋**

```bash
git add backend/src/plugins/auth.ts backend/src/routes/auth.ts backend/src/server.ts
git commit -m "feat: add auth plugin with JWT + session token verification, signup/login routes"
```

---

## Task 8: Stories + Presets 라우트

**Files:**
- Create: `backend/src/routes/stories/list.ts`
- Create: `backend/src/routes/stories/detail.ts`
- Create: `backend/src/routes/stories/crud.ts`
- Create: `backend/src/routes/stories/verify.ts`
- Create: `backend/src/routes/stories/presets.ts`
- Create: `backend/src/routes/stories/index.ts`

- [ ] **Step 1: stories list + detail**

```typescript
// backend/src/routes/stories/list.ts
import type { FastifyInstance } from 'fastify';

export default async function (app: FastifyInstance) {
  app.get('/api/stories', async (request) => {
    const { search, page = '1', limit = '20' } = request.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let query = app.supabaseAdmin
      .from('stories_safe')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return { stories: data || [], total: count || 0, page: pageNum, limit: limitNum };
  });
}
```

```typescript
// backend/src/routes/stories/detail.ts
import type { FastifyInstance } from 'fastify';

export default async function (app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/stories/:id', async (request, reply) => {
    const { id } = request.params;

    const { data, error } = await app.supabaseAdmin
      .from('stories_safe')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    }

    return data;
  });
}
```

- [ ] **Step 2: stories CRUD (인증 필요)**

```typescript
// backend/src/routes/stories/crud.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import type { StoryCreateInput } from '@story-game/shared';

export default async function (app: FastifyInstance) {
  app.post('/api/stories', async (request, reply) => {
    const user = requireAuth(request);
    const body = request.body as StoryCreateInput;

    const { data, error } = await app.supabaseAdmin
      .from('stories')
      .insert({ ...body, owner_uid: user.id, id: crypto.randomUUID() })
      .select('id')
      .single();

    if (error) {
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }

    return reply.status(201).send({ id: data.id });
  });

  app.put<{ Params: { id: string } }>('/api/stories/:id', async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params;

    // 소유자 확인
    const { data: existing } = await app.supabaseAdmin
      .from('stories')
      .select('owner_uid')
      .eq('id', id)
      .single();

    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    if (existing.owner_uid !== user.id) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: '소유자만 수정 가능합니다' } });

    const { error } = await app.supabaseAdmin
      .from('stories')
      .update(request.body as Record<string, unknown>)
      .eq('id', id);

    if (error) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/stories/:id', async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params;

    const { data: existing } = await app.supabaseAdmin
      .from('stories')
      .select('owner_uid')
      .eq('id', id)
      .single();

    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    if (existing.owner_uid !== user.id) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: '소유자만 삭제 가능합니다' } });

    await app.supabaseAdmin.from('stories').delete().eq('id', id);
    return { ok: true };
  });
}
```

- [ ] **Step 3: verify + presets**

```typescript
// backend/src/routes/stories/verify.ts
import type { FastifyInstance } from 'fastify';

export default async function (app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/api/stories/:id/verify', async (request, reply) => {
    const { id } = request.params;
    const { hash } = request.body as { hash: string };

    const { data } = await app.supabaseAdmin.rpc('verify_story_password', {
      p_story_id: id,
      p_input_hash: hash,
    });

    return { verified: !!data };
  });
}
```

```typescript
// backend/src/routes/stories/presets.ts
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.get('/api/presets', async () => {
    const { data } = await app.supabaseAdmin
      .from('presets')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  });

  app.post('/api/presets', async (request, reply) => {
    requireAdmin(request);
    const { data, error } = await app.supabaseAdmin
      .from('presets')
      .insert(request.body as Record<string, unknown>)
      .select('id')
      .single();

    if (error) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    return reply.status(201).send({ id: data.id });
  });

  app.put<{ Params: { id: string } }>('/api/presets/:id', async (request, reply) => {
    requireAdmin(request);
    const { error } = await app.supabaseAdmin
      .from('presets')
      .update(request.body as Record<string, unknown>)
      .eq('id', request.params.id);
    if (error) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/presets/:id', async (request, reply) => {
    requireAdmin(request);
    await app.supabaseAdmin.from('presets').delete().eq('id', request.params.id);
    return { ok: true };
  });
}
```

- [ ] **Step 4: index.ts에서 라우트 통합**

```typescript
// backend/src/routes/stories/index.ts
import type { FastifyInstance } from 'fastify';
import listRoute from './list.js';
import detailRoute from './detail.js';
import crudRoute from './crud.js';
import verifyRoute from './verify.js';
import presetsRoute from './presets.js';

export default async function storiesRoutes(app: FastifyInstance) {
  await app.register(listRoute);
  await app.register(detailRoute);
  await app.register(crudRoute);
  await app.register(verifyRoute);
  await app.register(presetsRoute);
}
```

server.ts에 등록:
```typescript
import storiesRoutes from './routes/stories/index.js';
await app.register(storiesRoutes);
```

- [ ] **Step 5: 커밋**

```bash
git add backend/src/routes/stories/
git commit -m "feat: add stories CRUD + presets routes"
```

---

## Task 9: Sessions 라우트

**Files:**
- Create: `backend/src/routes/sessions/list.ts`
- Create: `backend/src/routes/sessions/detail.ts`
- Create: `backend/src/routes/sessions/crud.ts`
- Create: `backend/src/routes/sessions/memory.ts`
- Create: `backend/src/routes/sessions/index.ts`

- [ ] **Step 1: sessions list + detail**

```typescript
// backend/src/routes/sessions/list.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.get('/api/sessions', async (request) => {
    const user = requireAuth(request);

    const { data } = await app.supabaseAdmin
      .from('sessions')
      .select('id, story_id, title, model, messages, last_played_at, created_at')
      .eq('owner_uid', user.id)
      .order('last_played_at', { ascending: false })
      .limit(50);

    const sessions = (data || []).map(s => ({
      ...s,
      message_count: Array.isArray(s.messages) ? s.messages.length : 0,
      messages: undefined, // 목록에서는 메시지 본문 제외
    }));

    return sessions;
  });
}
```

```typescript
// backend/src/routes/sessions/detail.ts
import type { FastifyInstance } from 'fastify';
import { verifySessionAccess } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;

    await verifySessionAccess(app, request, id);

    const { data, error } = await app.supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    return data;
  });
}
```

- [ ] **Step 2: sessions CRUD**

```typescript
// backend/src/routes/sessions/crud.ts
import type { FastifyInstance } from 'fastify';
import { verifySessionAccess } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.put<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    await verifySessionAccess(app, request, id);

    const { error } = await app.supabaseAdmin
      .from('sessions')
      .update(request.body as Record<string, unknown>)
      .eq('id', id);

    if (error) return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    await verifySessionAccess(app, request, id);

    await app.supabaseAdmin.from('sessions').delete().eq('id', id);
    return { ok: true };
  });
}
```

- [ ] **Step 3: session memory 조회**

```typescript
// backend/src/routes/sessions/memory.ts
import type { FastifyInstance } from 'fastify';
import { verifySessionAccess } from '../../plugins/auth.js';
import type { SessionMemory } from '@story-game/shared';

export default async function (app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/sessions/:id/memory', async (request) => {
    const { id } = request.params;
    await verifySessionAccess(app, request, id);

    const { data } = await app.supabaseAdmin
      .from('session_memory')
      .select('type, content')
      .eq('session_id', id);

    const memory: SessionMemory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
    for (const row of data || []) {
      if (row.type === 'short_term') memory.shortTerm = row.content;
      else if (row.type === 'long_term') memory.longTerm = row.content;
      else if (row.type === 'characters') memory.characters = row.content;
      else if (row.type === 'goals') memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
    }

    return memory;
  });
}
```

- [ ] **Step 4: index.ts + server.ts 등록**

```typescript
// backend/src/routes/sessions/index.ts
import type { FastifyInstance } from 'fastify';
import listRoute from './list.js';
import detailRoute from './detail.js';
import crudRoute from './crud.js';
import memoryRoute from './memory.js';

export default async function sessionsRoutes(app: FastifyInstance) {
  await app.register(listRoute);
  await app.register(detailRoute);
  await app.register(crudRoute);
  await app.register(memoryRoute);
}
```

- [ ] **Step 5: 커밋**

```bash
git add backend/src/routes/sessions/
git commit -m "feat: add sessions CRUD + memory routes"
```

---

## Task 10: 서비스 — prompt-builder + session-manager

**Files:**
- Create: `backend/src/services/prompt-builder.ts`
- Create: `backend/src/services/session-manager.ts`

기존 `src/prompt-builder.js`와 `src/game-handler.js`의 로직을 TypeScript로 전환.

- [ ] **Step 1: prompt-builder.ts**

기존 `src/prompt-builder.js`를 TypeScript로 직접 전환. 로직 변경 없음.

```typescript
// backend/src/services/prompt-builder.ts
import type { PromptConfig, SessionMemory } from '@story-game/shared';

interface StoryData {
  world_setting?: string;
  story?: string;
  character_name?: string;
  character_setting?: string;
  characters?: string;
  user_note?: string;
  system_rules?: string;
  use_latex?: boolean;
}

interface PresetData {
  characterName?: string;
  characterSetting?: string;
  useLatex?: boolean;
  narrativeLength?: number;
}

export function buildPrompt(story: StoryData, preset: PresetData, promptConfig: PromptConfig): string {
  const w = (story.world_setting || '').trim();
  const s = (story.story || '').trim();
  const cn = (preset.characterName || story.character_name || '').trim();
  const cs = (preset.characterSetting || story.character_setting || '').trim();
  const ch = (story.characters || '').trim();
  const un = (story.user_note || '').trim();
  const sr = (story.system_rules || '').trim();

  let prompt = promptConfig.system_preamble;

  if (preset.narrativeLength) {
    const nl = String(preset.narrativeLength);
    prompt += '\n\n' + promptConfig.narrative_length_template.replaceAll('{nl}', nl);
  }

  if (sr) prompt += `\n\n[시스템 규칙]\n${sr}`;
  if (w) prompt += `\n\n[세계관]\n${w}`;
  if (s) prompt += `\n\n[스토리]\n${s}`;
  if (ch) prompt += `\n\n[등장인물]\n${ch}`;
  if (cn || cs) {
    prompt += `\n\n[주인공]`;
    if (cn) prompt += `\n이름: ${cn}`;
    if (cs) prompt += `\n설정: ${cs}`;
  }
  if (un) prompt += `\n\n[유저노트]\n${un}`;

  const useLatex = preset.useLatex !== undefined ? preset.useLatex : story.use_latex;
  if (useLatex) {
    prompt += `\n\n${promptConfig.latex_rules}`;
  }

  if (cn) prompt = prompt.replaceAll('{{user}}', cn);

  return prompt;
}

export function buildMemoryPrompt(memory: SessionMemory | null): string {
  if (!memory) return '';

  const sections: string[] = [];

  if (memory.longTerm?.length > 0) {
    const items = memory.longTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 장기기억\n${items}`);
  }

  if (memory.shortTerm?.length > 0) {
    const items = memory.shortTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 단기기억\n${items}`);
  }

  if (memory.characters?.length > 0) {
    const items = memory.characters.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n');
    sections.push(`## 등장인물 현황\n${items}`);
  }

  if (memory.goals?.trim()) {
    sections.push(`## 현재 목표\n${memory.goals}`);
  }

  return sections.length > 0 ? `\n\n[메모리]\n${sections.join('\n\n')}` : '';
}
```

- [ ] **Step 2: session-manager.ts**

```typescript
// backend/src/services/session-manager.ts
import type { SessionMessage, GameplayConfig } from '@story-game/shared';

export function applySlidingWindow(
  messages: SessionMessage[],
  windowSize: number
): SessionMessage[] {
  const windowStart = Math.max(0, messages.length - windowSize);
  return messages.slice(windowStart);
}

export function prepareContents(messages: SessionMessage[]) {
  return messages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

export function shouldGenerateMemory(
  messages: SessionMessage[],
  summaryUpToIndex: number,
  gameplayConfig: GameplayConfig
): boolean {
  const windowSize = gameplayConfig.sliding_window_size || 20;
  if (messages.length <= windowSize) return false;
  if ((messages.length - summaryUpToIndex) < windowSize) return false;
  return true;
}
```

- [ ] **Step 3: 커밋**

```bash
git add backend/src/services/prompt-builder.ts backend/src/services/session-manager.ts
git commit -m "feat: add prompt-builder and session-manager services (migrated from Worker)"
```

---

## Task 11: 서비스 — Gemini 클라이언트 (SSE 스트리밍)

**Files:**
- Create: `backend/src/services/gemini.ts`

기존 `src/gemini-client.js`를 Fastify SSE 응답에 맞게 TypeScript로 전환.

- [ ] **Step 1: gemini.ts**

```typescript
// backend/src/services/gemini.ts
import type { FastifyReply } from 'fastify';
import type { SafetySetting } from '@story-game/shared';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiRequestBody {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: Record<string, unknown>;
  safetySettings?: SafetySetting[];
}

interface StreamResult {
  text: string;
  usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | null;
  error: string | null;
}

/**
 * Gemini 스트리밍 호출 → Fastify SSE 응답
 * reply를 직접 스트리밍하며, 완료 시 결과를 반환한다.
 */
export async function streamToSSE(
  apiKey: string,
  model: string,
  body: GeminiRequestBody,
  reply: FastifyReply
): Promise<StreamResult> {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성
  });

  let fullResponse = '';
  let lastUsage: StreamResult['usageMetadata'] = null;

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000), // 60초 타임아웃
      }
    );

    if (!res.ok) {
      const err = await res.text();
      sendSSE(reply, 'error', { code: 'GEMINI_ERROR', message: `API Error ${res.status}: ${err}` });
      reply.raw.end();
      return { text: '', usageMetadata: null, error: `API Error ${res.status}` };
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          if (data.usageMetadata) lastUsage = data.usageMetadata;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullResponse += text;
            sendSSE(reply, 'token', { text });
          }
        } catch { /* skip malformed JSON */ }
      }
    }

    return { text: fullResponse, usageMetadata: lastUsage, error: null };
  } catch (err: any) {
    const message = err?.name === 'TimeoutError' ? 'Gemini 응답 타임아웃 (60초)' : err.message;
    sendSSE(reply, 'error', { code: 'GEMINI_ERROR', message });
    return { text: fullResponse, usageMetadata: lastUsage, error: message };
  }
}

/**
 * Gemini 비스트리밍 호출 (메모리 생성용)
 */
export async function generate(
  apiKey: string,
  model: string,
  body: GeminiRequestBody
): Promise<{ text: string; usageMetadata: any }> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usageMetadata: data.usageMetadata || null,
  };
}

function sendSSE(reply: FastifyReply, event: string, data: unknown): void {
  if (!reply.raw.destroyed) {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add backend/src/services/gemini.ts
git commit -m "feat: add Gemini streaming + batch service (SSE output)"
```

---

## Task 12: 서비스 — Memory Handler

**Files:**
- Create: `backend/src/services/memory-handler.ts`

기존 `src/memory-handler.js`를 TypeScript로 전환.

- [ ] **Step 1: memory-handler.ts**

```typescript
// backend/src/services/memory-handler.ts
import { generate } from './gemini.js';
import type { FastifyInstance } from 'fastify';
import type { SessionMessage, SessionMemory, PromptConfig, GameplayConfig } from '@story-game/shared';

interface GenerateMemoryParams {
  app: FastifyInstance;
  apiKey: string;
  model: string;
  sessionId: string;
  messages: SessionMessage[];
  promptConfig: PromptConfig;
  gameplayConfig: GameplayConfig;
}

export async function generateAndSaveMemory(params: GenerateMemoryParams): Promise<SessionMemory> {
  const { app, apiKey, model, sessionId, messages, promptConfig, gameplayConfig } = params;
  const windowSize = gameplayConfig.sliding_window_size || 20;
  const windowStart = Math.max(0, messages.length - windowSize);
  const recentMessages = messages.slice(windowStart);

  // 기존 메모리 조회
  const { data: memoryRows } = await app.supabaseAdmin
    .from('session_memory')
    .select('type, content')
    .eq('session_id', sessionId);

  const existingMemory: SessionMemory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
  for (const row of memoryRows || []) {
    if (row.type === 'short_term') existingMemory.shortTerm = row.content;
    else if (row.type === 'long_term') existingMemory.longTerm = row.content;
    else if (row.type === 'characters') existingMemory.characters = row.content;
    else if (row.type === 'goals') existingMemory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
  }

  const memoryText = memoryRows?.length ? JSON.stringify(existingMemory, null, 2) : '없음';
  const messagesText = recentMessages.map(m => `[${m.role}] ${m.content}`).join('\n\n');

  const requestBody = promptConfig.memory_request
    .replace('{memory}', memoryText)
    .replace('{messages}', messagesText);

  const result = await generate(apiKey, model, {
    contents: [{ role: 'user', parts: [{ text: requestBody }] }],
    systemInstruction: { parts: [{ text: promptConfig.memory_system_instruction }] },
    generationConfig: { responseMimeType: 'application/json' },
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  });

  const parsed = parseMemoryResponse(result.text);

  // DB UPSERT
  await Promise.all([
    upsertMemory(app, sessionId, 'short_term', parsed.shortTerm),
    upsertMemory(app, sessionId, 'long_term', parsed.longTerm),
    upsertMemory(app, sessionId, 'characters', parsed.characters),
    upsertMemory(app, sessionId, 'goals', parsed.goals),
  ]);

  return parsed;
}

async function upsertMemory(app: FastifyInstance, sessionId: string, type: string, content: unknown) {
  await app.supabaseAdmin
    .from('session_memory')
    .upsert({ session_id: sessionId, type, content }, { onConflict: 'session_id,type' });
}

function parseMemoryResponse(text: string): SessionMemory {
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    json = JSON.parse(cleaned);
  }

  return {
    shortTerm: Array.isArray(json.shortTerm) ? json.shortTerm : [],
    characters: Array.isArray(json.characters) ? json.characters : [],
    goals: typeof json.goals === 'string' ? json.goals : '',
    longTerm: Array.isArray(json.longTerm) ? json.longTerm : [],
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git add backend/src/services/memory-handler.ts
git commit -m "feat: add memory-handler service (migrated from Worker)"
```

---

## Task 13: Game 라우트 (핵심 — SSE 스트리밍)

**Files:**
- Create: `backend/src/routes/game/start.ts`
- Create: `backend/src/routes/game/chat.ts`
- Create: `backend/src/routes/game/index.ts`

현재 Worker에서는 프론트가 Gemini를 직접 호출하지만, 새 아키텍처에서는 백엔드가 Gemini를 호출하고 SSE로 전달한다.

- [ ] **Step 1: game/start.ts — 게임 시작 (세션 생성 + 첫 SSE 스트리밍)**

```typescript
// backend/src/routes/game/start.ts
import type { FastifyInstance } from 'fastify';
import type { GameStartRequest } from '@story-game/shared';
import { buildPrompt } from '../../services/prompt-builder.js';
import { streamToSSE } from '../../services/gemini.js';

export default async function (app: FastifyInstance) {
  app.post('/api/game/start', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as GameStartRequest;
    const apiKey = resolveApiKey(app, request);

    if (!body.storyId || !body.model) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'storyId and model required' } });
    }
    if (!apiKey) {
      return reply.status(400).send({ error: { code: 'INVALID_API_KEY', message: 'API key required' } });
    }

    // 스토리 + 설정 조회
    const [storyResult, config] = await Promise.all([
      app.supabaseAdmin.from('stories').select('*').eq('id', body.storyId).single(),
      app.getAppConfig(),
    ]);

    if (storyResult.error || !storyResult.data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    }

    const story = storyResult.data;
    const preset = {
      characterName: body.options?.characterName || story.character_name || '',
      characterSetting: body.options?.characterSetting || story.character_setting || '',
      useLatex: body.options?.useLatex ?? story.use_latex,
      narrativeLength: body.options?.narrativeLength || config.gameplayConfig.default_narrative_length,
    };

    const systemPrompt = buildPrompt(story, preset, config.promptConfig);
    const startMessage = config.promptConfig.game_start_message || '게임을 시작해줘';

    // 세션 생성
    const sessionId = crypto.randomUUID();
    const { data: sessionData } = await app.supabaseAdmin
      .from('sessions')
      .insert({
        id: sessionId,
        story_id: body.storyId,
        title: story.title || '제목 없음',
        preset,
        messages: [],
        model: body.model,
        summary: '',
        summary_up_to_index: 0,
        owner_uid: request.user?.id || null,
      })
      .select('session_token')
      .single();

    // SSE 스트리밍 시작
    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: startMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      safetySettings: config.promptConfig.safety_settings,
    };

    const result = await streamToSSE(apiKey, body.model, geminiBody, reply);

    // done 이벤트 (sessionToken 포함)
    const doneData: any = {
      sessionId,
      sessionToken: sessionData?.session_token,
      tokenUsage: result.usageMetadata
        ? { input: result.usageMetadata.promptTokenCount || 0, output: result.usageMetadata.candidatesTokenCount || 0 }
        : null,
    };

    if (!reply.raw.destroyed) {
      reply.raw.write(`event: done\ndata: ${JSON.stringify(doneData)}\n\n`);
      reply.raw.end();
    }

    // 비동기: 메시지 저장 + API 로그
    if (result.text) {
      const messages = [
        { role: 'user', content: startMessage, timestamp: Date.now() },
        { role: 'model', content: result.text, timestamp: Date.now() },
      ];
      await app.supabaseAdmin
        .from('sessions')
        .update({ messages })
        .eq('id', sessionId);

      await app.supabaseAdmin.from('api_logs').insert({
        session_id: sessionId,
        endpoint: 'game/start',
        request_model: body.model,
        request_system_prompt: systemPrompt,
        request_messages: [{ role: 'user', content: startMessage }],
        response_text: result.text.slice(0, 500),
        response_usage: result.usageMetadata,
        response_error: result.error,
      });
    }
  });
}

function resolveApiKey(app: FastifyInstance, request: any): string | null {
  // 헤더에서 직접 가져오기
  const headerKey = request.headers['x-gemini-key'] as string;
  if (headerKey) return headerKey;

  // TODO: 로그인 사용자의 경우 DB에서 암호화된 키 복호화
  return null;
}
```

- [ ] **Step 2: game/chat.ts — 게임 대화 (SSE 스트리밍 + 메모리 트리거)**

```typescript
// backend/src/routes/game/chat.ts
import type { FastifyInstance } from 'fastify';
import type { GameChatRequest, SessionMessage } from '@story-game/shared';
import { buildPrompt, buildMemoryPrompt } from '../../services/prompt-builder.js';
import { applySlidingWindow, prepareContents, shouldGenerateMemory } from '../../services/session-manager.js';
import { streamToSSE } from '../../services/gemini.js';
import { generateAndSaveMemory } from '../../services/memory-handler.js';
import { verifySessionAccess } from '../../plugins/auth.js';

export default async function (app: FastifyInstance) {
  app.post('/api/game/chat', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as GameChatRequest;
    const apiKey = request.headers['x-gemini-key'] as string;

    if (!body.sessionId) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'sessionId required' } });
    }
    if (!body.regenerate && !body.userMessage) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'userMessage required' } });
    }
    if (!apiKey) {
      return reply.status(400).send({ error: { code: 'INVALID_API_KEY', message: 'API key required (X-Gemini-Key header)' } });
    }

    await verifySessionAccess(app, request, body.sessionId);

    // 세션 + 설정 + 스토리 + 메모리 조회
    const { data: session } = await app.supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', body.sessionId)
      .single();

    if (!session) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const [storyResult, config, memoryResult] = await Promise.all([
      app.supabaseAdmin.from('stories').select('*').eq('id', session.story_id).single(),
      app.getAppConfig(),
      app.supabaseAdmin.from('session_memory').select('type, content').eq('session_id', body.sessionId),
    ]);

    if (!storyResult.data) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Story not found' } });
    }

    // 메모리 조립
    const memory = { shortTerm: [] as any[], longTerm: [] as any[], characters: [] as any[], goals: '' };
    for (const row of memoryResult.data || []) {
      if (row.type === 'short_term') memory.shortTerm = row.content;
      else if (row.type === 'long_term') memory.longTerm = row.content;
      else if (row.type === 'characters') memory.characters = row.content;
      else if (row.type === 'goals') memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
    }

    let messages: SessionMessage[] = session.messages || [];
    let actualUserMessage = body.userMessage;

    // regenerate 처리
    if (body.regenerate && messages.length >= 2) {
      const lastModel = messages[messages.length - 1];
      const lastUser = messages[messages.length - 2];
      if (lastModel.role === 'model' && lastUser.role === 'user') {
        actualUserMessage = lastUser.content;
        messages = messages.slice(0, -2);
      }
    }

    // 프롬프트 조립
    let systemPrompt = buildPrompt(storyResult.data, session.preset || {}, config.promptConfig);
    systemPrompt += buildMemoryPrompt(memory);

    const windowSize = config.gameplayConfig.sliding_window_size || 20;
    const allMessages: SessionMessage[] = [
      ...messages,
      { role: 'user', content: actualUserMessage, timestamp: Date.now() },
    ];
    const windowMessages = applySlidingWindow(allMessages, windowSize);
    const contents = prepareContents(windowMessages);

    // SSE 스트리밍
    const geminiBody = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      safetySettings: config.promptConfig.safety_settings,
    };

    const result = await streamToSSE(apiKey, session.model || 'gemini-2.0-flash', geminiBody, reply);

    // done 이벤트
    const doneData = {
      tokenUsage: result.usageMetadata
        ? { input: result.usageMetadata.promptTokenCount || 0, output: result.usageMetadata.candidatesTokenCount || 0 }
        : null,
    };

    if (!reply.raw.destroyed) {
      reply.raw.write(`event: done\ndata: ${JSON.stringify(doneData)}\n\n`);
    }

    // 비동기: 메시지 저장 + 메모리 트리거
    if (result.text) {
      const updatedMessages: SessionMessage[] = [
        ...allMessages,
        { role: 'model', content: result.text, timestamp: Date.now() },
      ];

      const updateData: Record<string, unknown> = { messages: updatedMessages, last_played_at: new Date().toISOString() };
      const summaryUpToIndex = session.summary_up_to_index || 0;

      if (shouldGenerateMemory(updatedMessages, summaryUpToIndex, config.gameplayConfig)) {
        // 메모리 생성 알림
        if (!reply.raw.destroyed) {
          reply.raw.write(`event: memory\ndata: ${JSON.stringify({ triggered: true, status: 'generating' })}\n\n`);
        }

        try {
          const newMemory = await generateAndSaveMemory({
            app, apiKey,
            model: session.model || 'gemini-2.0-flash',
            sessionId: body.sessionId,
            messages: updatedMessages,
            promptConfig: config.promptConfig,
            gameplayConfig: config.gameplayConfig,
          });

          updateData.summary_up_to_index = updatedMessages.length;

          if (!reply.raw.destroyed) {
            reply.raw.write(`event: memory_complete\ndata: ${JSON.stringify(newMemory)}\n\n`);
          }
        } catch (err) {
          app.log.error(err, 'Memory generation failed');
          if (!reply.raw.destroyed) {
            reply.raw.write(`event: memory\ndata: ${JSON.stringify({ triggered: true, status: 'failed' })}\n\n`);
          }
        }
      }

      await app.supabaseAdmin
        .from('sessions')
        .update(updateData)
        .eq('id', body.sessionId);

      // API 로그
      await app.supabaseAdmin.from('api_logs').insert({
        session_id: body.sessionId,
        endpoint: 'game/chat',
        request_model: session.model,
        request_system_prompt: systemPrompt.slice(0, 500),
        request_messages: [{ role: 'user', content: actualUserMessage }],
        response_text: result.text.slice(0, 500),
        response_usage: result.usageMetadata,
        response_error: result.error,
      });
    }

    if (!reply.raw.destroyed) {
      reply.raw.end();
    }
  });
}
```

- [ ] **Step 3: game/index.ts**

```typescript
// backend/src/routes/game/index.ts
import type { FastifyInstance } from 'fastify';
import startRoute from './start.js';
import chatRoute from './chat.js';

export default async function gameRoutes(app: FastifyInstance) {
  await app.register(startRoute);
  await app.register(chatRoute);
}
```

server.ts에 등록:
```typescript
import gameRoutes from './routes/game/index.js';
await app.register(gameRoutes);
```

- [ ] **Step 4: 커밋**

```bash
git add backend/src/routes/game/ backend/src/server.ts
git commit -m "feat: add game/start and game/chat routes with SSE streaming"
```

---

## Task 14: Me 라우트 (프로필 + API 키 관리)

**Files:**
- Create: `backend/src/services/crypto.ts`
- Create: `backend/src/routes/me.ts`

- [ ] **Step 1: AES-256-GCM 암호화 서비스**

```typescript
// backend/src/services/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(text: string, secretKey: string): string {
  const key = Buffer.from(secretKey, 'hex').subarray(0, 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encrypted: string, secretKey: string): string | null {
  try {
    const key = Buffer.from(secretKey, 'hex').subarray(0, 32);
    const buf = Buffer.from(encrypted, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const data = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final('utf8');
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: me 라우트**

```typescript
// backend/src/routes/me.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { encrypt, decrypt } from '../services/crypto.js';

export default async function meRoutes(app: FastifyInstance) {
  app.get('/api/me', async (request) => {
    const user = requireAuth(request);

    const { data: profile } = await app.supabaseAdmin
      .from('user_profiles')
      .select('nickname, api_key_enc')
      .eq('id', user.id)
      .single();

    return {
      ...user,
      hasApiKey: !!profile?.api_key_enc,
    };
  });

  app.put('/api/me/apikey', async (request, reply) => {
    const user = requireAuth(request);
    const { apiKey } = request.body as { apiKey: string };

    if (!apiKey) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'apiKey required' } });
    }

    const encrypted = encrypt(apiKey, app.config.API_KEY_ENCRYPTION_SECRET);

    await app.supabaseAdmin
      .from('user_profiles')
      .update({ api_key_enc: encrypted })
      .eq('id', user.id);

    return { ok: true };
  });

  app.delete('/api/me/apikey', async (request) => {
    const user = requireAuth(request);

    await app.supabaseAdmin
      .from('user_profiles')
      .update({ api_key_enc: null })
      .eq('id', user.id);

    return { ok: true };
  });
}
```

server.ts에 등록:
```typescript
import meRoutes from './routes/me.js';
await app.register(meRoutes);
```

- [ ] **Step 3: 커밋**

```bash
git add backend/src/services/crypto.ts backend/src/routes/me.ts backend/src/server.ts
git commit -m "feat: add /api/me routes with AES-256-GCM API key encryption"
```

---

## Task 15: 최종 server.ts 통합 + 로컬 테스트

**Files:**
- Modify: `backend/src/server.ts` (최종 통합)

- [ ] **Step 1: server.ts에 모든 플러그인/라우트가 등록되어 있는지 확인**

최종 등록 순서:
```typescript
// 1. config 데코레이터
app.decorate('config', config);

// 2. 플러그인
await app.register(supabasePlugin);
await app.register(configCachePlugin);
await app.register(authPlugin);

// 3. 라우트
await app.register(configRoutes);
await app.register(authRoutes);
await app.register(storiesRoutes);
await app.register(sessionsRoutes);
await app.register(gameRoutes);
await app.register(meRoutes);
```

- [ ] **Step 2: TypeScript 빌드 확인**

Run: `cd backend && pnpm lint`
Expected: 타입 에러 없이 통과

- [ ] **Step 3: 서버 시작 확인**

Run: `cd backend && pnpm dev`
Expected: 서버가 에러 없이 시작되고 Supabase 연결 확인

- [ ] **Step 4: API 엔드포인트 확인**

```bash
# health
curl -s http://localhost:3000/api/health | python3 -m json.tool

# config
curl -s http://localhost:3000/api/config | python3 -m json.tool

# stories (빈 결과 예상 — 새 스키마에 데이터 없음)
curl -s http://localhost:3000/api/stories | python3 -m json.tool

# presets
curl -s http://localhost:3000/api/presets | python3 -m json.tool
```

- [ ] **Step 5: 최종 커밋**

```bash
git add -A backend/
git commit -m "feat: complete Phase 1 backend - all routes and services integrated"
```

---

## 다음 단계 (Phase 2: UI/UX)

Phase 1 완료 후, 별도 세션에서 Phase 2를 진행한다:

1. **6팀 UI/UX 프로세스** — 각 팀별 4페이지 HTML 생성 (24개)
2. **교차 리뷰** — 6팀이 서로 평가
3. **최종 2안** — 8개 HTML로 통합
4. **사용자 선택** — 브라우저에서 비교 후 결정
5. **React 컴포넌트 전환** — 선택된 디자인을 React로 구현
6. **통합 테스트** — 백엔드 + 프론트엔드 연동 검증
7. **Docker 배포** — 마지막 단계
