# Backend Migration Design — AI Story Game

## Overview

프론트엔드에서 수행하던 프롬프트 조합, Gemini API 호출, 메모리 생성을 Cloudflare Worker(백엔드)로 이관한다. 프론트엔드는 API Key + 사용자 입력만 전송하고, 백엔드가 DB 조회/프롬프트 조합/AI 호출/응답 스트리밍/메모리 생성을 모두 처리한다.

## Motivation

- 프론트엔드 JS 메모리 변수(`settingsData`)에 의존하여 페이지 새로고침/세션 이어하기 시 프롬프트 데이터(systemRules 등)가 누락되는 버그 발생
- 스토리 프롬프트 수정 시 기존 세션에 즉시 반영되지 않는 문제
- API Key가 브라우저에서 직접 외부 API로 전송되는 보안 구조

## API Endpoints

### `POST /api/game/start`

새 게임 시작. 세션 생성 + 첫 턴 AI 응답 스트리밍.

**Request:**
```json
{
  "apiKey": "Gemini API Key",
  "storyId": "uuid",
  "model": "gemini-3.1-flash-lite",
  "options": {
    "useLatex": true,
    "narrativeLength": 5,
    "characterName": "이연",
    "characterSetting": "남자\n고지능 우주함대..."
  }
}
```

**Response:** SSE stream
```
data: {"type":"chunk","text":"습한 흙냄새와..."}
data: {"type":"done","sessionId":"uuid","usage":{...},"memoryStatus":"none"}
```

**Worker 처리:**
1. 새 세션 UUID 생성
2. `storyId`로 stories 테이블에서 스토리 설정 조회
3. config 테이블에서 prompt_config, gameplay_config 조회
4. 프롬프트 조합 (prompt-builder)
5. Gemini API 스트리밍 호출 (game_start_message 사용)
6. 세션 INSERT (preset에 options + 스토리 참조 저장)
7. 메시지 저장 (user: game_start_message, model: AI 응답)
8. api_logs INSERT
9. SSE로 응답 스트리밍

### `POST /api/game/chat`

게임 진행. 매 턴 호출.

**Request:**
```json
{
  "apiKey": "Gemini API Key",
  "sessionId": "uuid",
  "userMessage": "사용자 입력 텍스트"
}
```

**Response:** SSE stream
```
data: {"type":"chunk","text":"사마겸은..."}
data: {"type":"done","sessionId":"uuid","usage":{...},"memoryStatus":"generated"}
```

**Worker 처리:**
1. `sessionId`로 세션 조회 (messages, story_id, preset)
2. `story_id`로 스토리 조회 (worldSetting, story, characters, systemRules 등)
3. config 조회 (prompt_config, gameplay_config)
4. session_memory 조회 (4종)
5. 프롬프트 조합 (스토리 설정 + 메모리 + config 템플릿)
6. 슬라이딩 윈도우 적용 (최근 N개 메시지만)
7. Gemini API 스트리밍 호출
8. 응답 완료 → 세션에 user+model 메시지 추가 저장
9. 메모리 트리거 조건 체크 → 충족 시 메모리 생성/저장
10. api_logs INSERT
11. SSE로 응답 스트리밍

### `GET /api/session/:id`

세션 데이터 조회. 이어하기 시 화면 복원용.

**Response:**
```json
{
  "sessionId": "uuid",
  "storyId": "uuid",
  "title": "무림",
  "model": "gemini-3.1-flash-lite",
  "preset": { "useLatex": true, "narrativeLength": 5, ... },
  "messages": [{ "role": "user", "content": "...", "timestamp": ... }, ...],
  "memoryStatus": "exists"
}
```

### `GET /api/session/:id/memory`

메모리 조회. 프론트에서 메모리 모달 열 때 호출.

**Response:**
```json
{
  "shortTerm": [{ "title": "...", "content": "..." }],
  "longTerm": [{ "title": "...", "content": "..." }],
  "characters": [{ "name": "...", "role": "...", "description": "..." }],
  "goals": "텍스트"
}
```

### `DELETE /api/session/:id`

세션 삭제.

## Worker Module Structure

```
src/
  worker.js              # 라우터 (엔드포인트 분기만)
  game-handler.js        # /api/game/start, /api/game/chat 핵심 로직
  prompt-builder.js      # 프롬프트 조합 (프론트에서 이관)
  memory-handler.js      # 메모리 생성/저장 (프론트에서 이관)
  gemini-client.js       # Gemini API 호출 + 스트리밍
  db.js                  # Supabase 쿼리 헬퍼
```

### worker.js
엔드포인트 라우팅만 담당. 기존 `/api/config`, admin 인증 로직 유지.

### game-handler.js
`handleGameStart(request, env)`, `handleGameChat(request, env)` 함수.
DB 조회 → 프롬프트 조합 → Gemini 호출 → 저장 → 로깅의 오케스트레이션.

### prompt-builder.js
프론트의 `public/js/prompt-builder.js`를 Worker용으로 이관.
`buildPrompt(storyData, options, promptConfig)` + `buildMemoryPrompt(memory)` 동일 로직.

### memory-handler.js
프론트의 `public/js/memory-manager.js`를 Worker용으로 이관.
트리거 조건 체크 + Gemini 비스트리밍 호출로 메모리 생성 + DB 저장.

### gemini-client.js
Gemini API 호출 래퍼.
- `streamGenerate({ apiKey, model, body })` → ReadableStream 반환
- `generate({ apiKey, model, body })` → 비스트리밍 응답 (메모리 생성용)

### db.js
Supabase REST API를 직접 호출하는 헬퍼 함수들:
- `getSession(env, sessionId)` → 세션 + 메시지
- `getStory(env, storyId)` → 스토리 설정 전체
- `getConfig(env)` → prompt_config + gameplay_config
- `getSessionMemory(env, sessionId)` → 4종 메모리
- `saveMessages(env, sessionId, messages)` → 메시지 배열 업데이트
- `createSession(env, data)` → 세션 INSERT
- `saveMemory(env, sessionId, type, content)` → 메모리 UPSERT
- `insertApiLog(env, logData)` → 로그 INSERT

## Database Changes

### 새 테이블: api_logs

```sql
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
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

CREATE INDEX idx_api_logs_session ON api_logs(session_id);
CREATE INDEX idx_api_logs_created ON api_logs(created_at DESC);

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
-- 클라이언트 접근 차단 (service_role만 접근)
```

### 기존 테이블 변경 없음

sessions, stories, session_memory, config 테이블은 변경 없이 그대로 사용.

## Frontend Changes

### 제거되는 모듈
- `gemini-api.js` — AI 호출을 더 이상 프론트에서 하지 않음
- `prompt-builder.js` — Worker로 이관 (프론트 파일은 삭제 또는 미사용)
- `memory-manager.js` — Worker로 이관

### 제거되는 로직 (app-play.js)
- `sendToGemini()` → `sendMessage()` (Worker API 호출)로 대체
- `getPrompt()`, `buildMemoryPrompt()` 호출
- `generateSessionMemory()`
- 캐시 관련 로직 (`createCache`, `clearCache`, `cachedContentName`)
- `token-tracker.js`의 가격 계산 로직 (Worker가 usage를 응답에 포함)

### 변경되는 로직 (app-play.js)
- 게임 시작: `POST /api/game/start` 호출
- 매 턴: `POST /api/game/chat` 호출
- SSE 스트리밍 수신 + 렌더링 (기존 스트리밍 렌더링 로직 재사용)
- 세션 이어하기: `GET /api/session/:id` → 대화 기록 렌더링
- 메모리 모달: `GET /api/session/:id/memory` → 모달 데이터 표시

### 유지되는 로직
- UI (사이드패널, 모달, 테마, 폰트)
- 스토리/세션 목록 관리
- 마크다운/LaTeX 렌더링
- 주인공 프로필, 유저 노트 편집 → 세션 preset 업데이트

### 옵션 저장
useLatex, narrativeLength, characterName/Setting 변경 시 프론트에서 직접 세션 preset 업데이트 (기존 saveToCloud 로직). Worker는 매 chat 요청 시 세션에서 최신 preset을 읽으므로 자동 반영.

## Data Flow

```
[프론트엔드]                    [Worker]                      [Supabase]        [Gemini]
    |                              |                              |                 |
    |-- POST /api/game/chat ------>|                              |                 |
    |   { apiKey, sessionId,       |-- 세션 조회 ---------------->|                 |
    |     userMessage }            |<-- messages, story_id -------|                 |
    |                              |-- 스토리 조회 -------------->|                 |
    |                              |<-- worldSetting, rules... ---|                 |
    |                              |-- config 조회 -------------->|                 |
    |                              |<-- prompt_config ------------|                 |
    |                              |-- 메모리 조회 -------------->|                 |
    |                              |<-- session_memory -----------|                 |
    |                              |                              |                 |
    |                              |-- 프롬프트 조합              |                 |
    |                              |-- 슬라이딩 윈도우 적용       |                 |
    |                              |                              |                 |
    |                              |-- streamGenerate ----------->|                 |
    |<-- SSE chunk ----------------|<-- SSE chunk ----------------|                 |
    |<-- SSE chunk ----------------|<-- SSE chunk ----------------|                 |
    |<-- SSE done -----------------|                              |                 |
    |                              |-- 메시지 저장 -------------->|                 |
    |                              |-- api_logs INSERT ---------->|                 |
    |                              |-- 메모리 생성 (조건 시) ---->|                 |
    |                              |                              |                 |
```

## Regenerate (재생성)

프론트의 "재생성" 버튼 처리. `/api/game/chat`에 `regenerate: true` 플래그를 추가:

```json
{
  "apiKey": "...",
  "sessionId": "uuid",
  "regenerate": true
}
```

Worker가 마지막 user+model 메시지 쌍을 DB에서 제거하고, 마지막 user 메시지를 다시 Gemini에 전송. `userMessage`는 불필요 (DB에서 읽음).

## Worker Lifecycle

- 메모리 생성, api_logs INSERT 등 응답 완료 후 처리는 `ctx.waitUntil()`을 사용하여 Worker 종료를 지연
- SSE done 이벤트의 `memoryStatus`는 `"pending"` (메모리 생성이 아직 완료되지 않았으므로). 프론트는 메모리 모달 열 때 `GET /api/session/:id/memory`로 최신 상태를 조회

## Model 변경

`model`은 `/api/game/start`에서만 설정. 세션 중 모델 변경은 프론트에서 세션 preset을 직접 업데이트하고, Worker는 매 chat 요청 시 세션에서 model을 읽음.

## Error Handling

- Gemini API 에러 → `data: {"type":"error","message":"API Error 429: ..."}` SSE 이벤트로 전달
- DB 조회 실패 → HTTP 500 + JSON 에러 응답
- 세션 없음 → HTTP 404
- apiKey 누락 → HTTP 400
- 메모리 생성 실패 → 무시 (게임 진행에 영향 없음, api_logs에 에러 기록)
- 모든 에러는 api_logs에 `response_error`로 기록

## Security

- API Key는 Worker 메모리에서만 사용, DB에 저장하지 않음, 로그에도 기록하지 않음
- API Key는 프론트 → Worker로 매 요청 전송 (브라우저 DevTools에서 보임). 현행 대비 개선 (외부 API 직접 노출 → Worker 경유)
- Worker ↔ Supabase: service_role key 사용 (RLS 바이패스)
- api_logs는 service_role만 접근 가능
- 기존 admin 인증(Basic Auth) 유지
- 세션 소유권 검증: UUID 기반 비밀 링크 방식 유지 (기존과 동일)
