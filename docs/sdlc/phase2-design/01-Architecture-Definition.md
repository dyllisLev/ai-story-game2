# AI Story Game - 아키텍처 정의서 (Architecture Definition)

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Software Architect
> **Phase:** SDLC Phase 2 - Design

---

## 1. 개요 (Overview)

### 1.1 문서 목적

본 문서는 AI Story Game 플랫폼의 시스템 아키텍처를 정의한다. Phase 1 요구사항 분석(SRS, RTM, UseCase, ERD, TO-BE Process)을 기반으로 시스템 구조, 컴포넌트, 기술 스택, 배포 구조를 상세화한다.

### 1.2 시스템 개요

**AI Story Game**은 Google Gemini API를 활용한 인터랙티브 소설 게임 플랫폼으로:
- 사용자가 AI와 대화하며 이야기를 진행
- 스토리 작성자가 자신만의 스토리를 생성/공유
- 관리자가 시스템을 모니터링하고 관리

### 1.3 아키텍처 원칙

| 원칙 | 설명 | 적용 |
|------|------|------|
| **계층 분리** | Presentation → Application → Data 계층 명확 분리 | 전체 시스템 |
| **무상태성** | 백엔드 서버는 상태를 저장하지 않음, 세션은 DB에 저장 | Fastify 서버 |
| **타입 안전성** | 프론트/백엔드 간 타입 계약 보장 | @story-game/shared |
| **보안 기본** | RLS, 암호화, 인증 모든 계층에 적용 | 전체 시스템 |
| **확장성** | 수평 확장 가능한 구조 설계 | Redis, 캐싱 |

---

## 2. 시스템 구조 (System Structure)

### 2.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                           │
│                    (React Frontend :5173)                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Pages → Components → Hooks → Lib (api, auth, sse, theme)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Layer                              │
│                    (Fastify Backend :3000)                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Routes (API endpoints) → Plugins → Services → Business Logic│  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Supabase Client
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Layer                                  │
│              (Supabase PostgreSQL + RLS + Functions)                │
│  Tables: stories, sessions, user_profiles, config, presets, etc.   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ REST API
┌─────────────────────────────────────────────────────────────────────┐
│                      External Services                              │
│          Gemini API (Direct from Frontend + Backend Prompt)         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 계층별 상세 구조

#### 2.2.1 Presentation Layer (Frontend)

**기술 스택:**
- **Framework:** React 19.0.0
- **Build Tool:** Vite 6.0.0
- **Language:** TypeScript 5.8.0
- **Styling:** Tailwind CSS 3.4.0
- **State Management:** React Hooks (useState, useEffect, useContext)
- **HTTP Client:** fetch API (backend) + SSE (Gemini API direct)

**디렉토리 구조:**
```
frontend/src/
├── pages/              # 페이지 컴포넌트 (Home, Play, Editor, Admin)
├── components/         # 재사용 컴포넌트
│   ├── home/          # 홈 페이지 컴포넌트
│   ├── play/          # 게임 플레이 컴포넌트
│   ├── editor/        # 에디터 컴포넌트
│   ├── admin/         # 관리자 컴포넌트
│   ├── layout/        # 레이아웃 컴포넌트
│   └── ui/            # UI 컴포넌트
├── hooks/             # 커스텀 훅 (12개)
├── lib/               # 유틸리티 라이브러리
└── styles/            # 페이지별 커스텀 CSS
```

**핵심 컴포넌트:**
| 컴포넌트 | 역할 | 연계 시스템 |
|---------|------|-----------|
| Home.tsx | 스토리 목록, 필터, 검색 | GET /api/stories |
| Play.tsx | 게임 플레이, Gemini API 직접 호출 | POST /api/game/start, /api/game/chat |
| Editor.tsx | 스토리 작성/편집 | GET/POST/PUT/DELETE /api/stories |
| Admin.tsx | 관리자 대시보드 | /api/admin/* |

#### 2.2.2 Application Layer (Backend)

**기술 스택:**
- **Framework:** Fastify 5.2.0
- **Language:** TypeScript 5.8.0
- **Auth:** Supabase Auth (JWT)
- **Database:** Supabase PostgreSQL 15
- **Rate Limiting:** @fastify/rate-limit
- **CORS:** @fastify/cors

**디렉토리 구조:**
```
backend/src/
├── server.ts          # Fastify 앱 생성, 플러그인 등록
├── config.ts          # 환경변수 로드
├── plugins/           # Fastify 플러그인
│   ├── supabase.ts   # Supabase 클라이언트 등록
│   ├── auth.ts       # JWT 인증, 요청별 user 객체
│   ├── config-cache.ts # 전역 설정 캐싱
│   └── request-logger.ts # 요청 로그 기록
├── routes/            # API 라우트
│   ├── auth.ts       # POST /api/auth/*
│   ├── me.ts         # GET/PUT /api/me
│   ├── config.ts     # GET/PUT /api/config
│   ├── stories/      # GET/POST/PUT/DELETE /api/stories
│   ├── sessions/     # GET/POST/PUT/DELETE /api/sessions
│   ├── game/         # POST /api/game/start, /api/game/chat (JSON 프롬프트)
│   └── admin/        # /api/admin/*
└── services/          # 비즈니스 로직
    ├── gemini.ts     # Gemini API 호출
    ├── prompt-builder.ts # 시스템 프롬프트 조합
    ├── memory-handler.ts # 세션 메모리 관리
    ├── session-manager.ts # 세션 상태 관리
    └── crypto.ts     # API 키 암호화/복호화
```

**핵심 플러그인:**
| 플러그인 | 역할 | 주요 기능 |
|---------|------|---------|
| supabase | DB 연결 | supabase, supabaseAdmin 데코레이터 |
| auth | 인증/인가 | JWT 검증, user 객체, requireAuth 등 |
| config-cache | 설정 캐싱 | config 테이블 in-memory 캐싱 |
| request-logger | 로깅 | service_logs 테이블에 요청 기록 |

#### 2.2.3 Data Layer (Database)

**기술 스택:**
- **Database:** Supabase PostgreSQL 15
- **Security:** Row Level Security (RLS)
- **Connection:** Supabase Client (server-side)

**테이블 구조:**
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │  user_profiles  │       │     stories     │
│  (Supabase)     │──1:1──│   (owner)       │──1:N──│   (template)    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email           │       │ display_name    │       │ title           │
│ created_at      │       │ email           │       │ description     │
│                 │       │ api_key_enc     │       │ tags[]          │
└─────────────────┘       │ role            │       │ world_setting   │
                           └─────────────────┘       │ story           │
                                                     │ characters      │
                                                     │ system_rules    │
                                                     │ status_preset_id│
                                                     │ is_public       │
                                                     └─────────────────┘
                                                            │
                                                            │ 1:N
                                                            ▼
                                                   ┌─────────────────┐
                                                   │    sessions     │
                                                   │   (play)        │
                                                   ├─────────────────┤
                                                   │ id (PK)         │
                                                   │ story_id (FK)   │
                                                   │ messages (JSONB)│
                                                   │ turn_count      │
                                                   │ progress_pct    │
                                                   └─────────────────┘
```

**전체 테이블 목록:**
| 테이블 | 역할 | 주요 컬럼 | RLS |
|-------|------|----------|-----|
| auth.users | Supabase 인증 | id, email | Supabase 관리 |
| user_profiles | 사용자 프로필 | display_name, api_key_encrypted, role | ✅ |
| stories | 스토리 템플릿 | title, description, tags[], is_public | ✅ |
| sessions | 게임 세션 | story_id, messages, turn_count | ✅ |
| session_memory | 세션 메모리 | session_id, type, content | ✅ |
| presets | 프리셋 템플릿 | title, genre, status_preset_id | ❌ (공개) |
| status_presets | 상태창 정의 | title, genre, attributes | ❌ (공개) |
| config | 전역 설정 | value (JSONB) | ❌ (공개) |
| api_logs | API 요청 로그 | session_id, endpoint, duration_ms | ❌ (관리자) |
| service_logs | 서비스 로그 | method, path, status_code | ❌ (관리자) |

---

## 3. 컴포넌트 상세 (Component Details)

### 3.1 프론트엔드 컴포넌트 계층 구조

```
┌─────────────────────────────────────────────────────────┐
│                      Pages (페이지)                      │
│  Home.tsx | Play.tsx | Editor.tsx | Admin.tsx           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Feature Components (기능)                │
│  home/ | play/ | editor/ | admin/ | layout/              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   UI Components (공통)                    │
│  ui/ - Button, Card, Modal, Input, etc.                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                      Hooks (상태 관리)                    │
│  useStories, useGameEngine, useStoryEditor, etc.        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                     Lib (유틸리티)                        │
│  api.ts | auth.ts | sse.ts | theme.ts | markdown.ts     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 백엔드 모듈 상세

#### 3.2.1 Routes (API 라우트)

| 라우트 | 파일 | 엔드포인트 | 인증 | 역할 |
|-------|------|-----------|------|------|
| auth | auth.ts | POST /api/auth/signup, login, logout, refresh | ❌ | 인증 |
| me | me.ts | GET/PUT /api/me, PUT /api/me/apikey | ✅ | 프로필 |
| config | config.ts | GET/PUT /api/config | ✅(admin) | 전역 설정 |
| stories | stories/*.ts | GET/POST/PUT/DELETE /api/stories | ✅(owner/admin) | 스토리 CRUD |
| sessions | sessions/*.ts | GET/POST/PUT/DELETE /api/sessions | ✅(owner) | 세션 CRUD |
| game | game/*.ts | POST /api/game/start, chat (JSON 프롬프트) | ✅ | 게임 플레이 (프롬프트 조합) |
| admin | admin/*.ts | /api/admin/dashboard, stories, users, logs | ✅(admin) | 관리자 |

#### 3.2.2 Services (비즈니스 로직)

| 서비스 | 파일 | 역할 | 의존성 |
|-------|------|------|--------|
| gemini | gemini.ts | Gemini API 직접 호출 | - |
| prompt-builder | prompt-builder.ts | 시스템 프롬프트 조합 | config, stories, session_memory |
| memory-handler | memory-handler.ts | 세션 메모리 생성/저장 | gemini, session_memory |
| session-manager | session-manager.ts | 세션 상태 관리, 슬라이딩 윈도우 | sessions |
| crypto | crypto.ts | API 키 AES-256 암호화/복호화 | node:crypto |

### 3.3 공유 타입 계약 (@story-game/shared)

**타입 패키지 구조:**
```
packages/shared/src/types/
├── story.ts      # Story, StoryListItem, StoryInput
├── session.ts    # Session, SessionMessage, SessionInput
├── memory.ts     # SessionMemory
├── config.ts     # PromptConfig, GameplayConfig, GlobalConfig
├── auth.ts       # AuthUser, LoginRequest, SignupRequest
├── api.ts        # ApiResponse, ApiError
├── status.ts     # StatusPreset, StatusAttribute
└── log.ts        # ApiLog, ServiceLog
```

**계약 보장:**
- 프론트엔드/백엔드 동일 타입 사용
- JSON Schema 런타임 검증
- OpenAPI/Swagger 자동 생성 가능

---

## 4. 기술 스택 상세 (Technology Stack)

### 4.1 프론트엔드 기술 스택

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| **Framework** | React | 19.0.0 | UI 라이브러리 |
| **Build Tool** | Vite | 6.0.0 | 개발 서버, 번들링 |
| **Language** | TypeScript | 5.8.0 | 타입 안전성 |
| **Styling** | Tailwind CSS | 3.4.0 | 유틸리티 CSS |
| **HTTP** | fetch API | 표준 | API 호출 |
| **SSE** | EventSource | 표준 | 실시간 스트리밍 |
| **Markdown** | marked | 14.0.0 | 마크다운 렌더링 |
| **DOMPurify** | DOMPurify | 3.0.0 | XSS 방지 |
| **Router** | react-router-dom | 6.22.0 | 클라이언트 라우팅 |

### 4.2 백엔드 기술 스택

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| **Framework** | Fastify | 5.2.0 | 웹 프레임워크 |
| **Language** | TypeScript | 5.8.0 | 타입 안전성 |
| **Database** | Supabase PostgreSQL | 15 | 데이터 저장소 |
| **Auth** | Supabase Auth | - | JWT 인증 |
| **Rate Limiting** | @fastify/rate-limit | 9.1.0 | 요청 속도 제한 |
| **CORS** | @fastify/cors | 9.0.0 | CORS 처리 |
| **Validation** | JSON Schema | - | 요청 검증 |
| **AI API** | Google Gemini API | - | AI 응답 생성 |

### 4.3 데이터베이스 기술 스택

| 카테고리 | 기술 | 버전 | 용도 |
|---------|------|------|------|
| **Database** | PostgreSQL | 15 | 관계형 데이터베이스 |
| **Hosting** | Supabase Cloud | - | 관리형 PostgreSQL |
| **Security** | RLS (Row Level Security) | - | 행 수준 보안 |
| **Indexes** | B-tree, GIN | - | 쿼리 성능 최적화 |
| **Triggers** | PL/pgSQL | - | 자동 프로필 생성 등 |

### 4.4 개발 도구

| 도구 | 버전 | 용도 |
|------|------|------|
| **Package Manager** | pnpm | 9.0.0 | Monorepo 관리 |
| **Monorepo** | pnpm workspaces | - | 공유 패키지 |
| **TypeScript** | TypeScript | 5.8.0 | 타입 검증 |
| **ESLint** | ESLint | - | 린팅 |
| **Prettier** | Prettier | - | 포맷팅 |
| **Git** | Git | - | 버전 관리 |

---

## 5. 배포 구조 (Deployment Architecture)

### 5.1 개발 환경 (Development)

```
┌─────────────────────────────────────────────────────────┐
│                  Local Machine                          │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │ Frontend (5173) │    │ Backend (3000)  │            │
│  │  Vite dev srv   │◄──►│  Fastify        │            │
│  └─────────────────┘    └────────┬────────┘            │
│                                 │                       │
│                                 ▼                       │
│                        ┌─────────────────┐            │
│                        │ Supabase Cloud  │            │
│                        │  (Remote DB)     │            │
│                        └─────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

**실행 방법:**
```bash
./dev.sh start     # shared 빌드 → 백엔드(3000) + 프론트엔드(5173) 시작
./dev.sh stop      # 모든 서비스 중지
./dev.sh logs      # 로그 확인
```

### 5.2 프로덕션 환경 (Production) - 미정

**계획된 아키텍처:**
```
┌─────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                     │
│                    정적 리소스 배포                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Load Balancer (Nginx/ALB)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  Frontend Pod 1 │  Frontend Pod 2 │  Frontend Pod N │
│   (React SPA)   │   (React SPA)   │   (React SPA)   │
└─────────────────┴─────────────────┴─────────────────┘
                          ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  Backend Pod 1  │  Backend Pod 2  │  Backend Pod N  │
│   (Fastify)     │   (Fastify)     │   (Fastify)     │
└─────────────────┴─────────────────┴─────────────────┘
           ↓                ↓                ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   Redis Cache   │   Redis Cache   │   Redis Cache   │
│  (Rate Limit)   │  (Rate Limit)   │  (Rate Limit)   │
└─────────────────┴─────────────────┴─────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Cloud (PostgreSQL)                │
│              (Primary DB + Read Replicas)                │
└─────────────────────────────────────────────────────────┘
```

**확장 전략:**
- **Frontend:** Kubernetes Deployment (HPA 기반 오토스케일링)
- **Backend:** Kubernetes Deployment (Stateless, 수평 확장 가능)
- **Redis:** Redis Cluster (분산 캐싱, rate limiting)
- **Database:** Supabase Read Replicas (읽기 전용 복제본)

---

## 6. 보안 아키텍처 (Security Architecture)

### 6.1 인증 및 인가 흐름

```
┌─────────────┐
│  사용자     │
└──────┬──────┘
       │ 1. 이메일/비밀번호
       ▼
┌─────────────────────┐
│  Supabase Auth      │
│  (auth.users)       │
└──────┬──────────────┘
       │ 2. JWT (Access Token + Refresh Token)
       ▼
┌─────────────────────┐
│  Frontend Storage   │
│  (localStorage)     │
└──────┬──────────────┘
       │ 3. Authorization: Bearer <token>
       ▼
┌─────────────────────┐
│  Backend Middleware │
│  (auth.ts plugin)   │
└──────┬──────────────┘
       │ 4. request.user 설정
       ▼
┌─────────────────────┐
│  Route Handlers     │
│  (requireAuth)      │
└─────────────────────┘
```

### 6.2 계층별 보안 메커니즘

| 계층 | 보안 메커니즘 | 구현 |
|------|-------------|------|
| **Presentation** | XSS 방지 | DOMPurify, React escaping |
| **Application** | 인증/인가 | JWT, requireAuth, requireAdmin |
| **Data** | RLS | Row Level Security 정책 |
| **Transport** | HTTPS | TLS 1.3 |
| **Secrets** | 암호화 | AES-256-GCM (API 키) |

### 6.3 RLS 정책 요약

| 테이블 | 정책 | 규칙 |
|-------|------|------|
| user_profiles | 사용자 프로필 | `auth.uid() = id` 또는 admin |
| stories | 스토리 조회 | `auth.uid() = owner_uid OR is_public = true` |
| stories | 스토리 수정 | `auth.uid() = owner_uid` |
| sessions | 세션 조회 | `auth.uid() = owner_uid` |
| sessions | 익명 세션 | `session_token = headers['x-session-token']` |
| api_logs | 로그 조회 | role = admin |
| service_logs | 로그 조회 | role = admin |

---

## 7. 데이터 흐름 (Data Flow)

### 7.1 스토리 플레이 흐름

```
┌──────────┐
│ 사용자   │
└────┬─────┘
     │ 1. 스토리 선택
     ▼
┌─────────────────┐
│  Frontend       │
│  (Play.tsx)     │
└────┬────────────┘
     │ 2. POST /api/game/start
     ▼
┌─────────────────┐
│  Backend        │
│  (game/start)   │
└────┬────────────┘
     │ 3. 시스템 프롬프트 조합
     │    - stories 테이블 조회
     │    - config 테이블 조회
     │    - prompt-builder.ts
     ▼
┌─────────────────┐
│  Database       │
│  (Supabase)     │
└─────────────────┘
     │ 4. 세션 생성 + 프롬프트 데이터 반환 (JSON)
     ▼
┌─────────────────┐
│  Frontend       │
│  (프롬프트 수신) │
└────┬────────────┘
     │ 5. POST /api/game/chat (사용자 입력)
     ▼
┌─────────────────┐
│  Backend        │
│  (game/chat)    │  ← 프롬프트 재조합
└────┬────────────┘  ← 세션 메모리 통합
     │ 6. 프롬프트 데이터 반환 (JSON)
     ▼
┌─────────────────┐
│  Frontend       │
│  (prompt 데이터) │
└────┬────────────┘
     │ 7. Gemini API 직접 호출 (SSE)
     ▼
┌─────────────────┐
│  Gemini API     │
│  (generativelanguage.googleapis.com) │
└────┬────────────┘
     │ 8. SSE 스트리밍 응답
     ▼
┌─────────────────┐
│  Frontend       │
│  (실시간 표시)  │
└─────────────────┘
```

**참고:** SSE 스트리밍은 Frontend ↔ Gemini API 간에만 발생합니다. 백엔드는 프롬프트 조합과 세션 관리만 담당합니다.

### 7.2 메모리 생성 흐름

```
┌─────────────────┐
│  Backend        │
│  (game/chat)    │
└────┬────────────┘
     │ 1. 메시지 저장
     ▼
┌─────────────────┐
│  Database       │
│  (sessions)     │
└─────────────────┘
     │ 2. 슬라이딩 윈도우 추출
     ▼
┌─────────────────┐
│  memory-handler │
│  서비스         │
└────┬────────────┘
     │ 3. Gemini API 호출
     ▼
┌─────────────────┐
│  Gemini API     │
└────┬────────────┘
     │ 4. 메모리 생성
     ▼
┌─────────────────┐
│  Database       │
│  (session_memory)│
└─────────────────┘
```

---

## 8. 통합 패턴 (Integration Patterns)

### 8.1 동기 통신 (Synchronous)

**HTTP REST API:**
- 클라이언트 요청 → 백엔드 처리 → 응답
- 사용: CRUD 작업, 설정 조회

**예시:**
```typescript
// Frontend
const response = await fetch('/api/stories', {
  headers: { Authorization: `Bearer ${token}` }
});
const stories = await response.json();
```

### 8.2 비동기 통신 (Asynchronous)

**SSE (Server-Sent Events) — 아키텍처:**
- **프론트엔드 ↔ Gemini API 간** SSE 스트리밍
- 백엔드는 프롬프트 조합만 담당 (JSON 응답)
- 사용: AI 응답 실시간 스트리밍

**데이터 흐름:**
```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 1. POST /api/game/chat (JSON)
       ▼
┌─────────────┐
│  Backend    │  ← 프롬프트 조합
│  (Fastify)  │  ← 세션 관리
└──────┬──────┘  ← 메모리 처리
       │ 2. JSON 응답
       │    { systemPrompt, contents,
       │      safetySettings, model }
       ▼
┌─────────────┐
│  Frontend   │  ← prompt 데이터 수신
└──────┬──────┘
       │ 3. Gemini API 직접 호출 (SSE)
       │    POST models/{model}:streamGenerateContent
       ▼
┌─────────────┐
│ Gemini API  │  ← AI 응답 생성
└──────┬──────┘
       │ 4. SSE 스트리밍
       ▼
┌─────────────┐
│  Frontend   │  ← 실시간 텍스트 표시
└─────────────┘
```

**프론트엔드 SSE 예시 (Gemini API 직접 호출):**
```typescript
// Frontend → Gemini API 직접 호출
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': userApiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: contents,  // 백엔드에서 받은 데이터
      safetySettings: safetySettings,
    }),
  }
);

// SSE 스트리밍 파싱
const reader = res.body.getReader();
const decoder = new TextDecoder();
let fullResponse = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 실시간 텍스트 표시
  fullResponse += decoder.decode(value);
  appendMessage(fullResponse);
}
```

### 8.3 외부 API 통합

**Gemini API:**
- **프론트엔드에서 직접 호출** (사용자 API 키 사용)
- 백엔드는 프롬프트 조합만 담당
- 이유: 비용 분산, 사용자 책임 명확화, 백엔드 부하 감소

---

## 9. 성능 최적화 (Performance Optimization)

### 9.1 데이터베이스 최적화

**인덱스 전략:**
```sql
-- stories 테이블
CREATE INDEX idx_stories_owner_uid ON stories(owner_uid);
CREATE INDEX idx_stories_is_public ON stories(is_public) WHERE is_public = true;
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_owner_public_idx ON stories(owner_uid, is_public, created_at);

-- sessions 테이블 (추가 필요)
CREATE INDEX idx_sessions_owner_updated ON sessions(owner_uid, updated_at);
CREATE INDEX idx_sessions_story_id ON sessions(story_id);
```

**RLS 최적화:**
- 복합 인덱스로 RLS 정책 성능 개선
- 부분 인덱스로 공개 스토리 조회 최적화

### 9.2 캐싱 전략 (미구현)

**계획된 캐싱:**
- **Redis - Stories:** 공개 스토리 목록 (TTL: 5분)
- **Redis - Presets:** 프리셋 목록 (TTL: 10분)
- **Redis - Config:** 전역 설정 (TTL: 1분)
- **In-Memory:** 현재 config 캐시 구현됨

### 9.3 프론트엔드 최적화

**코드 스플리팅:**
```typescript
// 라우트 기반 스플리팅
const Home = lazy(() => import('./pages/Home'));
const Play = lazy(() => import('./pages/Play'));
const Editor = lazy(() => import('./pages/Editor'));
const Admin = lazy(() => import('./pages/Admin'));
```

---

## 10. 확장성 전략 (Scalability Strategy)

### 10.1 수직 확장 (Vertical Scaling)

**현재 상태:**
- 단일 Fastify 서버 (2 vCPU, 4GB RAM 예상)
- Supabase Cloud (관리형 PostgreSQL)

**향후 계획:**
- 서버 사양 증설 (4 vCPU, 8GB RAM)
- Database connection pooling (PgBouncer)

### 10.2 수평 확장 (Horizontal Scaling)

**현재 제약:**
- 메모리 기반 rate limiting → 분산 불가
- 상태 없는(stateless) 서버로 설계됨

**향후 계획:**
```
┌─────────────────────────────────────────────────┐
│              Load Balancer                      │
└─────────────────────────────────────────────────┘
              │              │              │
     ┌────────┴────────┐ ┌──┴──────┐ ┌───┴─────┐
     │  Backend Pod 1  │ │ Pod 2   │ │ Pod N   │
     └─────────────────┘ └─────────┘ └─────────┘
              │              │              │
     ┌────────┴────────┐ ┌──┴──────┐ ┌───┴─────┐
     │  Redis Cluster  │ │  Redis  │ │  Redis  │
     └─────────────────┘ └─────────┘ └─────────┘
```

**필요 구현:**
- Redis 기반 rate limiting
- Redis 기반 캐싱
- Sticky session 없음 (stateless)

---

## 11. 모니터링 및 로깅 (Monitoring & Logging)

### 11.1 현재 상태

**구현됨:**
- service_logs 테이블 (모든 요청 로그)
- api_logs 테이블 (API 호출 로그)
- Fastify pino logger (콘솔 로그)

**미구현:**
- APM (Application Performance Monitoring)
- 에러 추적 (Sentry)
- 로그 집계 (ELK Stack)

### 11.2 계획된 모니터링

**메트릭:**
- API 응답 시간 (p50, p95, p99)
- DB 쿼리 시간
- SSE 첫 응답 시간
- 에러율
-吞吐量 (requests/sec)

**대시보드:**
- Grafana + Prometheus
- Supabase Dashboard (DB 성능)

---

## 12. 재해 복구 (Disaster Recovery)

### 12.1 백업 전략

**Supabase:**
- 자동 백업 (일일)
- Point-in-time recovery (7일 보관)
- Geography: 현재 단일 리전

### 12.2 고가용성 (High Availability)

**현재:**
- Supabase Cloud (자동 장애 조치)
- 단일 백엔드 서버

**향후:**
- 백엔드 다중 AZ 배포
- Database read replicas
- CDN (정적 리소스)

---

## 13. 기술 부채 (Technical Debt)

### 13.1 현재 기술 부채

| 항목 | 심각도 | 영향 | 계획 |
|------|--------|------|------|
| API 버저닝 없음 | 높음 | Breaking change 시 클라이언트 영향 | P0 |
| Redis rate limiting | 높음 | 분산 환경에서 동작 안함 | P0 |
| 단위 테스트 부족 | 중간 | 리팩토링 위험 | P1 |
| OpenAPI 문서 부족 | 중간 | API 계약 불명확 | P1 |
| 캐싱 전략 부족 | 중간 | DB 부하 높음 | P1 |

### 13.2 개선 로드맵

**Q2 2026:**
- Redis 도입 (rate limiting + caching)
- API 버저닝 (/api/v1/...)
- 단위 테스트 추가 (services/ 레이어)
- OpenAPI/Swagger 도입

**Q3 2026:**
- 통합 테스트 추가
- Sentry 에러 추적
- 로그 파티셔닝

**Q4 2026:**
- APM 대시보드
- 컨테이너화 (Docker + K8s)

---

## 14. 참고 문서 (References)

### 14.1 입력 문서 (Phase 1)

- `docs/sdlc/phase1-requirements/01-SRS.md` - 요구사항 정의서
- `docs/sdlc/phase1-requirements/02-RTM.md` - 요구사항 추적 매트릭스
- `docs/sdlc/phase1-requirements/03-UseCase-Specifications.md` - 유스케이스 명세서
- `docs/sdlc/phase1-requirements/04-Conceptual-ERD.md` - 개념 ERD
- `docs/sdlc/phase1-requirements/05-TO-BE-Process-Definitions.md` - TO-BE 프로세스 정의서

### 14.2 기존 설계 문서

- `CLAUDE.md` - 프로젝트 구조 및 개발 가이드
- `docs/PROJECT-SPEC.md` - 프로젝트 기술 스펙
- `docs/flow-analysis.md` - 전체 플로우 분석
- `docs/superpowers/specs/` - 기존 설계 스펙

### 14.3 관련 문서 (Phase 2)

- `docs/sdlc/phase2-design/02-API-Design-Specification.md` - API 설계서
- `docs/sdlc/phase2-design/03-Program-Listing.md` - 프로그램 목록
- `docs/sdlc/phase2-design/XX-Screen-Design.md` - 화면 설계서 (Designer 작성)
- `docs/sdlc/phase2-design/XX-Table-Definition.md` - 테이블 정의서 (DBA 작성)

---

## 부록 A: 아키텍처 결정 기록 (Architecture Decision Records)

| ADR | 결정 | 상태 | 날짜 |
|-----|------|------|------|
| ADR-001 | Gemini API를 프론트엔드에서 직접 호출 | 수락 | 2026-03-31 |
| ADR-002 | Supabase Auth로 JWT 관리 | 수락 | 2026-03-31 |
| ADR-003 | SSE로 실시간 스트리밍 구현 | 수락 | 2026-03-31 |
| ADR-004 | RLS로 행 수준 보안 구현 | 수락 | 2026-03-31 |
| ADR-005 | @story-game/shared로 타입 계약 보장 | 수락 | 2026-03-31 |

---

## 부록 B: 용어 정의

| 용어 | 정의 |
|------|------|
| **SSE** | Server-Sent Events, 서버→클라이언트 단방향 실시간 통신 |
| **RLS** | Row Level Security, PostgreSQL 행 수준 보안 |
| **JWT** | JSON Web Token, 인증 토큰 표준 |
| **TTL** | Time To Live, 캐시 만료 시간 |
| **AZ** | Availability Zone, 데이터 센터 분리 단위 |
| **HPA** | Horizontal Pod Autoscaler, K8s 오토스케일링 |
