# AI Story Game - 프로젝트 스펙 문서

## 개요

인터랙티브 AI 소설 게임. 사용자가 스토리를 선택하고, Gemini AI와 대화하며 이야기를 진행한다.

## 아키텍처

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

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Fastify 5 + TypeScript
- **Shared:** @story-game/shared (pnpm workspace, TypeScript 타입)
- **AI:** Google Gemini API (프론트엔드 직접 호출)
- **DB:** Supabase (PostgreSQL + RLS)
- **Monorepo:** pnpm workspaces

## DB 테이블

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| stories | 스토리 템플릿 | title, description, tags[], icon, world_setting, story, characters, system_rules, play_count, like_count, is_featured, is_public |
| sessions | 게임 세션 | story_id, title, messages(JSONB), model, turn_count, progress_pct, chapter_label |
| presets | 스토리 프리셋 | title, genre, icon, world_setting, story, characters, status_preset_id |
| config | 앱 설정 | prompt_config, gameplay_config, genre_list |
| session_memory | 구조화 메모리 | session_id, type(short_term/long_term/characters/goals), content(JSONB) |
| status_presets | 상태창 프리셋 | title, genre, attributes(JSONB) |
| service_logs | HTTP 요청 로그 | method, path, status_code, duration_ms, ip |
| api_logs | Gemini API 로그 | session_id, endpoint, request/response, duration_ms |
| profiles | 사용자 프로필 | display_name, email, avatar_url, gemini_api_key_encrypted |

## API 엔드포인트

### Public
- `GET /api/health` — 서버 상태 확인
- `GET /api/config` — 앱 설정 (promptConfig, gameplayConfig)
- `GET /api/stories` — 공개 스토리 목록 (필터: genre, search, sort, page)
- `GET /api/stories/:id` — 단일 스토리
- `GET /api/stories/stats` — 통계 (스토리수, 플레이수, 작성자수)
- `GET /api/presets` — 공개 프리셋 목록
- `GET /api/status-presets` — 상태창 프리셋 목록

### Auth
- `POST /api/auth/signup` — 회원가입
- `POST /api/auth/login` — 로그인
- `POST /api/auth/logout` — 로그아웃
- `GET /api/me` — 내 프로필
- `PUT /api/me` — 프로필 수정

### Game
- `POST /api/game/start` — 새 게임 시작 (SSE 스트리밍)
- `POST /api/game/chat` — 게임 진행 (SSE 스트리밍)

### Stories CRUD
- `POST /api/stories` — 스토리 생성
- `PUT /api/stories/:id` — 수정
- `DELETE /api/stories/:id` — 삭제

### Sessions
- `GET /api/sessions` — 내 세션 목록
- `GET /api/sessions/:id` — 세션 상세
- `GET /api/sessions/:id/memory` — 세션 메모리
- `DELETE /api/sessions/:id` — 세션 삭제

### Admin (Basic Auth)
- `PUT /api/config` — 설정 수정
- `GET /api/admin/dashboard` — 대시보드 통계
- `GET /api/admin/stories` — 전체 스토리 관리
- `GET/DELETE /api/admin/service-logs` — 서비스 로그
- `GET/DELETE /api/admin/api-logs` — API 로그
- CRUD `/api/admin/status-presets` — 상태창 프리셋 관리
- `DELETE /api/admin/danger-zone/*` — 위험 구역 (데이터 삭제)

## 로컬 개발

```bash
# 의존성 설치
pnpm install

# 공유 타입 빌드
cd packages/shared && npx tsc

# 백엔드 시작 (포트 3000)
npx tsx backend/src/server.ts

# 프론트엔드 시작 (포트 5173)
cd frontend && npx vite --port 5173 --host 0.0.0.0
```

## 환경변수 (.env)

| 변수 | 설명 |
|------|------|
| SUPABASE_URL | Supabase 프로젝트 URL |
| SUPABASE_ANON_KEY | Supabase anon key |
| SUPABASE_SERVICE_KEY | Supabase service_role key |
| API_KEY_ENCRYPTION_SECRET | AES-256 암호화 키 |
| SUPABASE_SCHEMA | DB 스키마 (기본: public) |

## 프론트엔드 페이지

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | 스토리 목록, 검색, 필터, 추천 |
| `/play/:storyId` | Play | 게임 플레이 (3-column: 세션|스토리|정보패널) |
| `/editor/:storyId?` | Editor | 스토리 에디터 (사이드바+폼+미리보기) |
| `/admin` | Admin | 관리자 (대시보드, 로그, 설정, 프리셋) |
