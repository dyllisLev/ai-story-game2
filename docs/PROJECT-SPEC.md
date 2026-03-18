# AI Story Game - 프로젝트 스펙 문서

## 개요

인터랙티브 AI 소설 게임. 사용자가 스토리를 선택하고, Gemini AI와 대화하며 이야기를 진행한다.

## 아키텍처

```
[브라우저] ──→ [Cloudflare Workers] ──→ [Supabase PostgreSQL]
    │                │
    │                └─ /api/config (GET/PUT)
    │                └─ 정적 파일 서빙 (Assets)
    │
    └─ [Gemini API] (직접 호출, 서버 경유 없음)
```

- **프론트엔드:** Vanilla HTML/CSS/JS (빌드 도구 없음, ES Modules)
- **백엔드:** Cloudflare Workers (config API + 정적 파일 서빙만)
- **AI:** Google Gemini API (브라우저에서 직접 호출)
- **DB:** Supabase (PostgreSQL + RLS + 익명 인증)
- **배포:** GitHub push → Cloudflare 자동 배포

## 접속 정보

### Supabase

| 항목 | 값 |
|-----|---|
| Project Ref | `cjpbsgdjpodrfdyqhaja` |
| URL | `https://cjpbsgdjpodrfdyqhaja.supabase.co` |
| Region | `ap-southeast-2` (Sydney) |
| DB Pooler | `.env` 의 `SUPABASE_DB_POOLER` 참조 |
| DB Password | `.env` 의 `SUPABASE_DB_PASSWORD` 참조 |

**psql 접속:**
```bash
# .env에서 자동으로 읽기
source .env
PGPASSWORD=$SUPABASE_DB_PASSWORD psql "$SUPABASE_DB_POOLER"
```

### Cloudflare

| 항목 | 값 |
|-----|---|
| Worker 이름 | `ai-story-game` |
| Account ID | `.env` 의 `CLOUDFLARE_ACCOUNT_ID` 참조 |

### 로컬 개발

```bash
npx wrangler dev          # → http://localhost:8787
npx wrangler dev --port 3000  # 포트 충돌 시
```

## 파일 구조 및 역할

```
src/
  worker.js                 # Cloudflare Worker (API 라우팅 + Basic Auth)

public/
  index.html                # 홈 - 스토리 목록
  play.html                 # 게임 플레이 (메인 기능)
  editor.html               # 스토리 에디터
  base_story_admin.html     # 관리자 설정 (Basic Auth 보호)

  js/
    supabase-config.js      # Supabase 클라이언트 초기화, config 로드
    supabase-ops.js         # DB CRUD (stories, sessions, presets, session_memory)
    gemini-api.js           # Gemini API 래퍼 (stream/batch generate, cache, models)
    prompt-builder.js       # 시스템 프롬프트 조립 (스토리 설정 + 메모리)
    memory-manager.js       # 구조화 메모리 생성/파싱/캐시
    markdown-renderer.js    # Markdown + LaTeX(KaTeX) 렌더링
    token-tracker.js        # 토큰 사용량/비용 추적
    crypto.js               # PBKDF2 패스워드 해싱
    theme.js                # 다크/라이트 테마
    utils.js                # HTML 이스케이프 유틸리티
    app-play.js             # 게임 엔진 (세션, 대화, 메모리 트리거)
    app-editor.js           # 에디터 로직
    app-admin.js            # 관리자 패널 로직

  styles/
    theme.css               # CSS 변수 (다크/라이트)
    base.css                # 공통 레이아웃
    markdown.css            # Markdown 렌더링
    editor.css              # 에디터 전용

  presets/
    default.json            # 기본 프리셋
    basic-murim.json        # 무림 프리셋 예시

wrangler.jsonc              # Cloudflare 배포 설정
supabase-schema.sql         # DB 스키마 (참조용, 실행은 Supabase에서)
.env                        # 로컬 환경변수 (git에 포함 안됨)
```

## 데이터베이스 테이블

### stories
스토리 템플릿. 세계관, 등장인물, 규칙 등을 저장.

| 컬럼 | 타입 | 설명 |
|-----|------|-----|
| id | UUID PK | |
| title | TEXT | 스토리 제목 |
| world_setting | TEXT | 세계관 |
| story | TEXT | 스토리 도입부 |
| character_name, character_setting | TEXT | 주인공 설정 |
| characters | TEXT | NPC 목록 |
| user_note, system_rules | TEXT | AI 지시 |
| use_latex | BOOLEAN | LaTeX 연출 |
| is_public | BOOLEAN | 공개 여부 |
| password_hash | TEXT | 비밀번호 (salt:hash) |
| owner_uid | UUID | 작성자 |

### sessions
게임 플레이 세션. 대화 기록과 설정을 저장.

| 컬럼 | 타입 | 설명 |
|-----|------|-----|
| id | UUID PK | |
| story_id | UUID FK→stories | |
| title | TEXT | 세션 제목 |
| preset | JSONB | 스토리 설정 스냅샷 |
| messages | JSONB | 대화 배열 `[{role, content, timestamp}]` |
| model | TEXT | 사용한 Gemini 모델 |
| summary | TEXT | 레거시 요약 (하위 호환) |
| summary_up_to_index | INT | 요약 기준 인덱스 |
| owner_uid | UUID | |

### session_memory
구조화된 메모리. 세션별 4개 카테고리.

| 컬럼 | 타입 | 설명 |
|-----|------|-----|
| id | UUID PK | |
| session_id | UUID FK→sessions | CASCADE DELETE |
| type | TEXT | `short_term`, `characters`, `goals`, `long_term` |
| content | JSONB | 카테고리별 데이터 |
| UNIQUE | (session_id, type) | |

**content 형식:**
- `short_term`: `[{title, content}]` — 최근 이벤트 (최대 10개)
- `long_term`: `[{title, content}]` — 누적 서사
- `characters`: `[{name, role, description}]` — 등장인물 상태
- `goals`: `"텍스트"` — 현재 목표 (JSON 문자열)

### config
관리자 설정. `prompt_config`과 `gameplay_config` 두 row.

| 컬럼 | 타입 | 설명 |
|-----|------|-----|
| id | TEXT PK | `'prompt_config'` 또는 `'gameplay_config'` |
| value | JSONB | 설정 JSON |

### presets
공개 프리셋 (관리자만 수정).

### stories_safe (VIEW)
`password_hash`를 제외한 공개 스토리 뷰.

## API 엔드포인트

### GET /api/config
Supabase 연결 정보 + 프롬프트/게임플레이 설정 반환. 5분 캐시.

```bash
curl http://localhost:8787/api/config | jq '.gameplayConfig.sliding_window_size'
```

### PUT /api/config
관리자 설정 업데이트. Basic Auth 필요.

```bash
curl -X PUT http://localhost:8787/api/config \
  -u "dyllislev:PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"promptConfig": {...}, "gameplayConfig": {...}}'
```

## 핵심 설정값 (gameplay_config)

| 키 | 기본값 | 설명 |
|---|-------|-----|
| sliding_window_size | 20 | Gemini에 전송하는 최근 메시지 수 |
| memory_short_term_max | 10 | 단기기억 최대 이벤트 수 |
| message_limit | 500 | 세션 최대 메시지 수 |
| auto_save_interval_ms | 300000 | 자동 저장 간격 (5분) |
| default_narrative_length | 3 | 기본 서술 문단 수 |

## 핵심 설정값 (prompt_config)

| 키 | 설명 |
|---|-----|
| system_preamble | AI 역할 기본 프롬프트 |
| latex_rules | LaTeX 연출 규칙 |
| narrative_length_template | 문단 수 지시 템플릿 |
| memory_system_instruction | 메모리 생성 AI 시스템 프롬프트 |
| memory_request | 메모리 생성 요청 템플릿 |
| safety_settings | Gemini 안전 설정 (BLOCK_NONE) |
| game_start_message | 게임 시작 시 첫 메시지 |

## 메모리 시스템

### 흐름
1. 메시지가 `sliding_window_size` 초과 + `memoryUpToIndex` 이후 `interval`만큼 쌓이면 트리거
2. Gemini API에 현재 윈도우 메시지 + 기존 메모리 전송 (`responseMimeType: application/json`)
3. 4개 카테고리 JSON 응답 파싱
4. `session_memory` 테이블에 UPSERT + localStorage 캐시
5. 시스템 프롬프트에 `[메모리]` 섹션으로 주입

### 동시 실행 방지
`isGeneratingMemory` 플래그로 중복 API 호출 차단.

### 실패 처리
실패 시 `memoryUpToIndex` 미갱신 → 다음 메시지에서 자동 재트리거. 뱃지에 "실패" 표시 + 재시도 버튼.

## localStorage 키

| 키 | 용도 |
|---|-----|
| `ai-story-game-sessions` | 세션 목록 메타데이터 |
| `ai-story-session-{id}` | 세션 전체 데이터 캐시 |
| `ai-story-session-{id}-memory` | 구조화 메모리 캐시 |
| `gemini-api-key` | Gemini API 키 |
| `ai-story-game-theme` | 테마 설정 |

## RLS 정책 요약

| 테이블 | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|---------------------|
| stories | 공개 OR 소유자 | 소유자만 |
| sessions | 전체 공개 (UUID가 비밀) | 소유자만 |
| session_memory | 전체 공개 | 세션 소유자만 |
| presets | 전체 공개 | 관리자만 |
| config | 인증 사용자 (admin 제외) | 서비스 키만 (RLS 우회) |

## 디버깅

### 브라우저 콘솔
- Supabase 연결 실패: `supabase-config.js`에서 `/api/config` 응답 확인
- 메모리 생성 실패: `memory-manager.js`의 JSON 파싱 에러 확인
- LaTeX 렌더링 에러: KaTeX 에러 로그 확인

### API 디버깅
```bash
# config 로드 확인
curl -s http://localhost:8787/api/config | python3 -m json.tool

# 특정 설정 확인
curl -s http://localhost:8787/api/config | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('memory_instruction:', 'YES' if 'memory_system_instruction' in d.get('promptConfig',{}) else 'NO')
"
```

### DB 디버깅
```bash
# psql 접속
source .env
PGPASSWORD=$SUPABASE_DB_PASSWORD psql "$SUPABASE_DB_POOLER"

# 세션 메모리 확인
SELECT session_id, type, jsonb_array_length(content) as items
FROM session_memory
ORDER BY updated_at DESC LIMIT 10;

# config 키 확인
SELECT id, jsonb_object_keys(value) FROM config;
```

### Cloudflare 로그
```bash
npx wrangler tail              # 실시간 로그
npx wrangler deployments list  # 배포 이력
```

## 주의사항

- **배포는 반드시 `git push origin main`으로.** `wrangler deploy` 직접 실행 금지.
- **.env 파일은 git에 포함되지 않음.** 접속 정보는 `.env`에서 참조.
- **Gemini API 키는 브라우저에서 직접 사용.** 서버를 경유하지 않음.
- **config 테이블의 PK는 `id` (TEXT).** `key`가 아님.
- **RLS 정책 때문에 DB 직접 수정 시 서비스 키 필요.** psql은 RLS를 우회함.
