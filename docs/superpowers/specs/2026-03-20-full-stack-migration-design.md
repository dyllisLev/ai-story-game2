# AI Story Game - 풀스택 마이그레이션 설계서

## 개요

Cloudflare Workers + Vanilla JS 아키텍처를 Node.js (Fastify) + React (Vite) + TypeScript 기반의 전통적 웹서비스로 전환한다.

**마이그레이션 동기:**
- Cloudflare Workers 환경의 디버깅 한계 (`wrangler tail` + console.log 의존)
- 서버리스 특성상 복잡한 기능 구현의 어려움
- 프론트엔드 모듈화 부족 (빌드 도구 없는 Vanilla JS, app-play.js 47KB)
- localStorage + Supabase 이중 상태 관리의 복잡성

**마이그레이션 범위:** 백엔드 + 프론트엔드 전면 교체

## 기술 스택

| 레이어 | 기존 | 변경 후 |
|--------|------|---------|
| 백엔드 | Cloudflare Workers (JS) | **Fastify (TypeScript)** |
| 프론트엔드 | Vanilla JS (빌드 도구 없음) | **React + Vite (TypeScript)** |
| 상태 관리 | localStorage + Supabase 직접 | **Zustand + 백엔드 API 경유** |
| DB | Supabase 클라우드 | **Supabase 셀프호스팅 (OCI)** 전용 스키마 |
| 인증 | 없음 (UUID 기반) | **Supabase Auth (선택적)** |
| 배포 | GitHub push → Cloudflare 자동 | **Docker Compose → OCI 서버** |
| AI | Gemini (브라우저 직접 호출) | **Gemini (서버 경유, 사용자 API 키)** |

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    OCI Server (Docker)                   │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   Nginx      │    │   Backend    │    │ Supabase  │  │
│  │   (Reverse   │───→│   Fastify    │───→│ Self-host │  │
│  │    Proxy)    │    │   :3000      │    │ (기존)     │  │
│  └──────┬───────┘    └──────┬───────┘    └───────────┘  │
│         │                   │                            │
│         │            ┌──────┴───────┐                    │
│         │            │  Gemini API  │                    │
│         │            │  (외부 호출)  │                    │
│         │            └──────────────┘                    │
│  ┌──────┴───────┐                                       │
│  │   Frontend   │                                       │
│  │   React SPA  │                                       │
│  │   (빌드 정적) │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

**핵심 원칙:**
- 프론트엔드는 백엔드 API와만 통신 (Supabase 직접 접근 금지)
- Nginx가 `/api/*` → Fastify, 나머지 → React 정적 파일 서빙
- Gemini API 호출은 서버에서 수행 (프롬프트 노출 방지)
- 사용자 API 키는 요청 헤더로 전달, 서버에 저장하지 않음 (로그인 시 암호화 저장 가능)

## 2. 백엔드 구조 (Fastify + TypeScript)

```
backend/
├── src/
│   ├── server.ts                 # Fastify 앱 진입점, 플러그인 등록
│   ├── config.ts                 # 환경변수 로드 및 검증
│   │
│   ├── plugins/                  # Fastify 플러그인
│   │   ├── supabase.ts           # Supabase 클라이언트 (앱 데코레이터)
│   │   ├── auth.ts               # Supabase Auth 검증 미들웨어
│   │   └── cors.ts               # CORS 설정
│   │
│   ├── routes/                   # API 라우트 (기능별 분리)
│   │   ├── game/
│   │   │   ├── start.ts          # POST /api/game/start
│   │   │   └── chat.ts           # POST /api/game/chat (SSE)
│   │   ├── stories/
│   │   │   ├── list.ts           # GET /api/stories
│   │   │   ├── detail.ts         # GET /api/stories/:id
│   │   │   ├── crud.ts           # POST/PUT/DELETE /api/stories
│   │   │   └── presets.ts        # GET /api/presets
│   │   ├── sessions/
│   │   │   ├── list.ts           # GET /api/sessions
│   │   │   ├── detail.ts         # GET /api/sessions/:id
│   │   │   ├── crud.ts           # POST/PUT/DELETE
│   │   │   └── memory.ts         # GET /api/sessions/:id/memory
│   │   ├── config.ts             # GET/PUT /api/config
│   │   └── auth.ts               # POST /api/auth/signup, /login
│   │
│   ├── services/                 # 비즈니스 로직 (라우트에서 분리)
│   │   ├── gemini.ts             # Gemini API 호출, SSE 스트리밍
│   │   ├── prompt-builder.ts     # 시스템 프롬프트 조립
│   │   ├── memory-handler.ts     # 메모리 트리거 판단, 생성, 파싱
│   │   └── session-manager.ts    # 세션 생명주기, 슬라이딩 윈도우
│   │
│   └── types/                    # 공유 타입 정의
│       ├── game.ts
│       ├── story.ts
│       └── memory.ts
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

**설계 원칙:**
- 라우트 ↔ 서비스 분리: 라우트는 요청/응답 처리만, 비즈니스 로직은 services/에
- 기존 Worker 로직 재활용: prompt-builder, memory-handler, gemini-client를 TypeScript로 전환
- Fastify 플러그인 패턴: Supabase 클라이언트를 플러그인으로 등록
- types/를 프론트엔드와 공유 가능

**SSE 스트리밍 처리:**
1. 클라이언트 → POST /api/game/chat
2. Fastify가 프롬프트 조립
3. Gemini API에 스트리밍 요청
4. ReadableStream을 SSE로 변환하여 클라이언트에 전달
5. 스트림 완료 후 비동기로: 메시지 저장, 메모리 트리거 체크

## 3. 프론트엔드 구조 (React + Vite + TypeScript)

```
frontend/
├── src/
│   ├── main.tsx                    # 앱 진입점
│   ├── App.tsx                     # 라우팅 (React Router)
│   │
│   ├── api/                        # 백엔드 API 호출 레이어
│   │   ├── client.ts               # fetch 래퍼, 인증 헤더 자동 부착
│   │   ├── game.ts                 # /api/game/* 호출 + SSE 파싱
│   │   ├── stories.ts              # /api/stories/* 호출
│   │   ├── sessions.ts             # /api/sessions/* 호출
│   │   ├── config.ts               # /api/config 호출
│   │   └── auth.ts                 # /api/auth/* 호출
│   │
│   ├── pages/                      # 페이지 컴포넌트 (라우트 단위)
│   │   ├── HomePage/               # 스토리 목록
│   │   ├── PlayPage/               # 게임 플레이 (핵심)
│   │   ├── EditorPage/             # 스토리 에디터
│   │   └── AdminPage/              # 관리자 설정
│   │
│   ├── components/                 # 공유 UI 컴포넌트
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # 3단 레이아웃 쉘
│   │   │   ├── Sidebar.tsx         # 좌측 사이드바
│   │   │   └── SettingsPanel.tsx   # 우측 설정 패널
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx   # 메시지 렌더링 (Markdown+LaTeX)
│   │   │   ├── MessageInput.tsx    # 입력창 + 추천답변
│   │   │   └── StreamingText.tsx   # SSE 스트리밍 텍스트
│   │   ├── story/
│   │   │   ├── StoryCard.tsx
│   │   │   └── StoryGrid.tsx
│   │   ├── memory/
│   │   │   ├── MemoryBadge.tsx
│   │   │   └── MemoryModal.tsx     # 4탭 메모리 상세
│   │   └── common/
│   │       ├── Modal.tsx
│   │       ├── Button.tsx
│   │       └── ThemeToggle.tsx
│   │
│   ├── hooks/
│   │   ├── useSSE.ts               # SSE 스트리밍 연결/파싱
│   │   ├── useAuth.ts              # 인증 상태 관리
│   │   ├── useSession.ts           # 현재 세션 상태
│   │   └── useTheme.ts             # 다크/라이트 테마
│   │
│   ├── stores/                     # Zustand 상태 관리
│   │   ├── authStore.ts
│   │   ├── sessionStore.ts
│   │   └── settingsStore.ts
│   │
│   └── styles/
│       ├── globals.css
│       └── theme.css
│
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

**상태 관리:** Zustand (Redux보다 경량, 이 규모에 적합)
**Markdown 렌더링:** react-markdown + KaTeX (현재 기능 유지)
**라우팅:** React Router v7
**스타일링:** 6팀 UI/UX 리뷰 프로세스에서 결정

**현재 app-play.js (47KB) 분해:**

| 현재 (app-play.js 내) | 변경 후 |
|----------------------|---------|
| 세션 관리 로직 | `stores/sessionStore.ts` + `hooks/useSession.ts` |
| SSE 스트리밍 | `hooks/useSSE.ts` + `components/chat/StreamingText.tsx` |
| 메모리 UI | `components/memory/MemoryModal.tsx` + `MemoryBadge.tsx` |
| 설정 관리 | `stores/settingsStore.ts` + `SettingsPanel.tsx` |
| 토큰 추적 | `components/common/TokenTracker.tsx` |
| localStorage 캐싱 | 제거 — 모든 데이터는 백엔드 API 경유 |

**localStorage 최소화:** API 키 (익명 사용자) + 테마 설정만 유지

**wrtn 참고 레이아웃 (PlayPage):**

```
┌──────────────────────────────────────────────────┐
│  Header (스토리 제목, 모델 선택, 설정)              │
├────────┬─────────────────────┬───────────────────┤
│ 좌측    │   중앙               │  우측              │
│ 세션    │   스토리 본문         │  설정 패널          │
│ 목록    │   (메시지 스트림)     │  - 플레이 가이드    │
│        │                     │  - 캐릭터 정보      │
│ 채팅방  │                     │  - 유저 노트        │
│ 내역    │                     │  - 출력량 조절      │
│        │   ┌─수첩 오버레이──┐  │  - 메모리 요약      │
│        │   │캐릭터/관계/스탯│  │  - 단축키          │
│        │   └──────────────┘  │                   │
├────────┴─────────────────────┴───────────────────┤
│  입력창  [추천답변]                         [전송]  │
└──────────────────────────────────────────────────┘
```

**모바일 대응:** 데스크탑 우선, 모바일은 3단 → 단일 컬럼 반응형 축소

## 4. 데이터베이스 & 인증

### 스키마

기존 테이블 구조를 유지, 전용 스키마로 분리:

```sql
CREATE SCHEMA story_game;

-- 기존 테이블 (구조 동일)
story_game.stories
story_game.sessions
story_game.session_memory
story_game.presets
story_game.config
story_game.api_logs

-- 신규 테이블
story_game.user_profiles
  ├── id          UUID PK (= auth.users.id)
  ├── nickname    TEXT
  ├── api_key_enc TEXT (서버사이드 AES-256-GCM 암호화)
  ├── created_at  TIMESTAMPTZ
  └── updated_at  TIMESTAMPTZ
```

**변경사항:**
- `owner_uid` → Supabase Auth `auth.users.id`와 FK 연결
- `stories_safe` VIEW 제거 — 백엔드에서 password_hash 필터링
- RLS 간소화 — 백엔드가 service key로 접근, 최소한의 안전장치만 유지

### 인증 흐름

```
┌─────────────┬───────────────────────────────────┐
│  익명        │ 스토리 목록 조회                    │
│  (토큰 없음) │ 게임 플레이 (API 키 직접 입력)      │
│             │ 공개 스토리 읽기                    │
├─────────────┼───────────────────────────────────┤
│  로그인      │ 위 전부 +                         │
│  (JWT 토큰)  │ API 키 서버 저장/자동 로드          │
│             │ 스토리 생성/편집                    │
│             │ 내 세션 목록 관리                   │
├─────────────┼───────────────────────────────────┤
│  관리자      │ 위 전부 +                         │
│             │ config 수정, 프리셋 관리            │
└─────────────┴───────────────────────────────────┘
```

**인증 처리:**
1. React → POST /api/auth/signup → Fastify → Supabase Auth API → JWT 발급
2. 이후 요청: Authorization: Bearer <JWT> → Fastify auth 플러그인이 검증
3. 익명 요청: Authorization 헤더 없음 → req.user = null → 공개 라우트만 접근

**API 키 보안:**
- 로그인 사용자: AES-256-GCM 암호화 후 user_profiles.api_key_enc에 저장
- 익명 사용자: localStorage에 보관, 요청마다 헤더로 전송
- 서버는 API 키를 로그에 남기지 않음

## 5. API 설계

### 엔드포인트 맵

```
공개 (익명 허용)
├── GET    /api/stories              # 스토리 목록 (검색, 필터, 페이지네이션)
├── GET    /api/stories/:id          # 스토리 상세 (password_hash 제외)
├── GET    /api/presets              # 프리셋 목록
├── GET    /api/config               # 프롬프트/게임플레이 설정
├── POST   /api/auth/signup          # 회원가입
├── POST   /api/auth/login           # 로그인
├── POST   /api/game/start           # 게임 시작 (SSE)
└── POST   /api/game/chat            # 게임 대화 (SSE)

인증 필요 (JWT)
├── GET    /api/sessions             # 내 세션 목록
├── GET    /api/sessions/:id         # 세션 상세 (메시지 포함)
├── POST   /api/sessions             # 세션 생성
├── PUT    /api/sessions/:id         # 세션 수정
├── DELETE /api/sessions/:id         # 세션 삭제
├── GET    /api/sessions/:id/memory  # 세션 메모리 조회
├── POST   /api/stories              # 스토리 생성
├── PUT    /api/stories/:id          # 스토리 수정 (소유자만)
├── DELETE /api/stories/:id          # 스토리 삭제 (소유자만)
├── GET    /api/stories/:id/verify   # 스토리 비밀번호 검증
├── GET    /api/me                   # 내 프로필
├── PUT    /api/me/apikey            # API 키 저장/갱신
└── DELETE /api/me/apikey            # API 키 삭제

관리자 (JWT + admin role)
├── PUT    /api/config               # 설정 수정
├── POST   /api/presets              # 프리셋 생성
├── PUT    /api/presets/:id          # 프리셋 수정
└── DELETE /api/presets/:id          # 프리셋 삭제
```

### POST /api/game/chat (핵심 엔드포인트)

**Request:**
```json
{
  "sessionId": "uuid",
  "userMessage": "마을로 향한다",
  "apiKey": "sk-...",
  "regenerate": false
}
```

**Response (SSE Stream):**

| 이벤트 | 시점 | 데이터 |
|--------|------|--------|
| `token` | 스트리밍 중 | 텍스트 청크 |
| `done` | 응답 완료 | 토큰 사용량 |
| `memory` | 메모리 트리거 시 | 상태 알림 |
| `memory_complete` | 메모리 생성 완료 | 4카테고리 데이터 |
| `error` | 에러 발생 | 에러 코드 + 메시지 |

**에러 코드 체계:**

| 코드 | HTTP | 의미 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `INVALID_API_KEY` | 400 | Gemini API 키 무효 |
| `GEMINI_ERROR` | 502 | Gemini API 오류 |
| `SESSION_LIMIT` | 400 | 메시지 한도 초과 |

## 6. UI/UX 6팀 리뷰 프로세스

### 6팀 구성

| 팀 | 스킬 | 담당 영역 |
|----|------|----------|
| Team A | `ui-ux-pro-max` | 전체 UX 전략, 스타일 방향, 팔레트, 사용자 흐름 |
| Team B | `frontend-design` | 독창적 비주얼, 레이아웃 창의성, 차별화 포인트 |
| Team C | `design-system-patterns` | 디자인 토큰, 컴포넌트 규격, 테마 아키텍처 |
| Team D | `frontend-design-system` | 컴포넌트 재사용성, 일관성, 스케일러블 구조 |
| Team E | `penpot-uiux-design` | 와이어프레임, 화면 흐름, 인터랙션 패턴 |
| Team F | `bencium-innovative-ux-designer` | 혁신적 UX 아이디어, 접근성, 마이크로 인터랙션 |

### 프로세스

```
Phase 1: 개별 설계 (6팀 × 4페이지 = 24개 HTML)
  각 팀이 실제 동작하는 HTML 파일 작성
  브라우저에서 직접 확인 가능
         ↓
Phase 2: 교차 리뷰 & 병합
  6팀이 서로의 24개 화면을 평가
  각 페이지별로 최선의 요소들을 취합
         ↓
Phase 3: 최종 2안 (4페이지 × 2안 = 8개 HTML)
  사용자가 브라우저에서 직접 비교 후 선택
         ↓
Phase 4: 사용자 선택 → React 컴포넌트로 전환
```

**대상 페이지:**
- HomePage (스토리 목록)
- PlayPage (게임 플레이) ← 핵심
- EditorPage (스토리 에디터)
- AdminPage (관리자 설정)

**디자인 레퍼런스:** crack.wrtn.ai
- 3단 레이아웃 (세션 목록 / 본문 / 설정 패널)
- 수첩 오버레이 (캐릭터 정보, 관계, 스탯)
- 우측 설정 패널 (플레이 가이드, 유저 노트, 출력량 조절, 메모리 등)
- 이미지 기능은 제외

## 7. 배포 (Docker, 추후 진행)

Docker 배포는 모든 개발/테스트 완료 후 마지막에 진행한다.

### 모노레포 구조

```
ai-story-game2/
├── backend/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── nginx/
│   └── default.conf
├── docs/
├── supabase/
└── .env
```

### 로컬 개발 환경

```bash
# 터미널 1: 백엔드
cd backend && npm run dev     # → http://localhost:3000

# 터미널 2: 프론트엔드
cd frontend && npm run dev    # → http://localhost:5173
# Vite proxy: /api/* → localhost:3000
```

### Docker Compose (추후)

```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
    env_file: .env
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [backend]
    restart: unless-stopped
```

- 프론트엔드 Dockerfile: Vite 빌드 → Nginx 이미지에 정적 파일 복사
- Nginx: `/api/*` → backend:3000 프록시, 나머지 → React SPA 서빙
- 기존 OCI Supabase는 별도 운영 중이므로 compose에 미포함
- 도메인 DNS 변경 또는 새 도메인 사용

## 8. 구현 순서

```
1. 백엔드 API 구현 (Fastify + TypeScript)
2. 6팀 UI/UX 프로세스 → 24개 HTML → 교차 리뷰 → 최종 8개 HTML
3. 사용자 디자인 선택
4. 선택된 디자인을 React 컴포넌트로 구현
5. 통합 테스트 (로컬)
6. Docker 배포 (마지막, 추후 별도 진행)
```
