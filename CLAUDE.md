# AI Story Game - Development Guide

> **설계 문서:** [docs/superpowers/specs/2026-03-19-backend-migration-design.md](docs/superpowers/specs/2026-03-19-backend-migration-design.md)
> **구현 계획:** [docs/superpowers/plans/2026-03-20-fullstack-migration-phase1.md](docs/superpowers/plans/2026-03-20-fullstack-migration-phase1.md) (Phase 1) + [docs/superpowers/plans/2026-03-23-ui-migration-master-plan.md](docs/superpowers/plans/2026-03-23-ui-migration-master-plan.md) (Phase 2)
> **UI 체크리스트:** [docs/ui-data-checklist.md](docs/ui-data-checklist.md)
> **마이그레이션 태스크:** [docs/migration-tasks.md](docs/migration-tasks.md)

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Fastify 5 + TypeScript
- **Shared Types:** `@story-game/shared` (pnpm workspace)
- **AI:** Google Gemini API (프론트엔드에서 직접 호출, 백엔드가 프롬프트 조합)
- **DB:** Supabase (PostgreSQL + RLS)
- **Monorepo:** pnpm workspaces

## Project Structure

```
ai-story-game2/
├── pnpm-workspace.yaml
├── package.json                  # root workspace
├── .env                          # 환경변수 (배포 안됨)
│
├── packages/shared/              # @story-game/shared
│   └── src/types/                # 공유 TypeScript 타입 (story, session, memory, config, auth, api, status, log)
│
├── backend/                      # @story-game/backend (Fastify)
│   └── src/
│       ├── server.ts             # Fastify 앱 생성 + 플러그인/라우트 등록
│       ├── config.ts             # 환경변수 로드
│       ├── plugins/              # supabase, auth, config-cache, request-logger
│       ├── routes/
│       │   ├── config.ts         # GET/PUT /api/config
│       │   ├── auth.ts           # POST /api/auth/signup|login|logout|refresh
│       │   ├── me.ts             # GET/PUT /api/me, /api/me/apikey
│       │   ├── game/             # POST /api/game/start|chat (SSE streaming)
│       │   ├── sessions/         # GET/POST/PUT/DELETE /api/sessions
│       │   ├── stories/          # GET/POST/PUT/DELETE /api/stories
│       │   └── admin/            # dashboard, service-logs, api-logs, status-presets, danger-zone
│       └── services/             # gemini, prompt-builder, memory-handler, session-manager, crypto
│
├── frontend/                     # @story-game/frontend (React + Vite)
│   └── src/
│       ├── pages/                # Home, Play, Editor, Admin
│       ├── components/           # home/, play/, editor/, admin/, ui/, layout/
│       ├── hooks/                # useStories, useGameEngine, useStoryEditor, useAdminConfig 등 12개
│       ├── lib/                  # api, auth, theme, sse, markdown, format, genre, constants
│       └── styles/               # play.css, editor.css, admin.css (페이지별 커스텀 CSS)
│
├── supabase/migrations/          # DB 마이그레이션 SQL
│   ├── 00000000000001~5.sql      # 기본 스키마 (stories, sessions, presets, config, session_memory, api_logs)
│   └── 20260323010000~60000.sql  # 확장 (stories 확장, sessions 확장, status_presets, service_logs 신규)
│
└── docs/
    ├── ui-designs/final/         # UI 디자인 시안 (home, play, editor, admin.html)
    ├── ui-data-checklist.md      # UI 데이터 항목 체크리스트
    ├── migration-tasks.md        # 마이그레이션 태스크 그룹
    └── superpowers/              # 설계 스펙 + 구현 계획
```

## Development Workflow (필수 준수)

### 1. 요구사항 확인
- 사용자 요청을 정확히 파악한다.
- 불명확한 부분은 반드시 질문하여 확인한다.
- 변경 범위(영향받는 파일/기능)를 식별한다.

### 2. 구체화
- 변경할 파일과 수정 내용을 구체적으로 정리한다.
- 기존 코드를 반드시 읽고 이해한 후 수정 계획을 세운다.

### 3. 구현
- 코드를 수정하거나 새로 작성한다.
- 보안 취약점(XSS, 인젝션 등)에 주의한다.
- 공유 타입은 반드시 `@story-game/shared`에서 import한다.
- API 호출은 `frontend/src/lib/api.ts` 클라이언트를 사용한다.

### 4. 코드 정리 (1회)
- `/simplify` 스킬을 실행하여 변경된 코드의 중복, 품질, 효율성을 점검한다.

### 5. 로컬 테스트

서비스 관리는 `dev.sh` 스크립트를 사용한다:

```bash
./dev.sh start     # shared 빌드 → 백엔드(3000) + 프론트엔드(5173) 시작
./dev.sh stop      # 모든 서비스 중지
./dev.sh restart   # 중지 후 재시작
./dev.sh status    # 실행 상태 확인
./dev.sh logs            # 전체 로그 tail
./dev.sh logs backend    # 백엔드 로그만
./dev.sh logs frontend   # 프론트엔드 로그만
```

- 시작 시 포트 점유 프로세스를 자동 정리한다.
- 로그 파일: `logs/backend.log`, `logs/frontend.log`
- `agent-browser` 스킬을 사용하여 http://localhost:5173 에서 동작을 확인한다.
- 백엔드 헬스체크: `curl http://localhost:3000/api/health`

### 6. 테스트 실패 시 → 3으로
### 7. 보안 점검 → `security-auditor` 에이전트 사용
### 8. 커밋

## Environment Variables (.env)

```
SUPABASE_URL=<Supabase 프로젝트 URL>
SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_KEY=<Supabase service_role key>
API_KEY_ENCRYPTION_SECRET=<AES-256 암호화 키>
SUPABASE_SCHEMA=public          # cloud: public, self-hosted: story_game
```

## E2E 테스트

- **테스트케이스 관리:** [Google Sheets](https://docs.google.com/spreadsheets/d/1vXwfGaAxOy4iE8Yxz1oiN4_osW77tmzkkB7E2U8ze0c/edit)
- 탭: Home(32), Play(60), Editor(73), Admin(70) = 총 235개 테스트케이스
- 실제 브라우저(Chrome) 기반 E2E 테스트로 검증
- 테스트 결과와 발견된 버그는 시트의 "결과" 컬럼에 기록

## Key Architecture Decisions

- **Gemini API**: 프론트엔드에서 직접 호출 (사용자 API 키 사용), 백엔드는 프롬프트 조합만 담당
- **인증**: Supabase Auth (현재 개발 단계에서 비로그인 허용 — 프로덕션 전 필수 적용)
- **상태창**: status_presets 테이블로 장르별 속성 정의, 에디터에서 커스터마이징
- **메모리**: session_memory 테이블 (short_term, long_term, characters, goals 4카테고리)
- **SSE 스트리밍**: Fastify reply.raw를 통한 Server-Sent Events
