# 요약 메모리 시스템 설계

## 개요

슬라이딩 윈도우를 초과하는 이야기를 4개 카테고리로 분류하여 요약 저장하는 시스템.
기존 단일 `summary` 텍스트를 구조화된 메모리 시스템으로 대체한다.

## 메모리 카테고리

| 카테고리 | 용도 | 데이터 형식 |
|---------|------|-----------|
| 장기기억 (long_term) | 누적된 이야기의 압축 서사 | `[{title, content}]` |
| 단기기억 (short_term) | 최근 주요 이벤트 요약 (최대 10개) | `[{title, content}]` |
| 관계도 (characters) | 등장인물 상태/관계 | `[{name, role, description}]` |
| 목표 (goals) | 이야기 흐름상 목표 | `string` (자유 텍스트) |

## 데이터베이스

### 새 테이블: `session_memory`

```sql
CREATE TABLE session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_session_memory_updated_at
  BEFORE UPDATE ON session_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 정책 (sessions 테이블과 동일한 패턴: UUID를 아는 사람은 읽기 가능, 소유자만 쓰기)
ALTER TABLE session_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_memory_select" ON session_memory
  FOR SELECT USING (true);

CREATE POLICY "session_memory_insert" ON session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

CREATE POLICY "session_memory_update" ON session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

CREATE POLICY "session_memory_delete" ON session_memory
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );
```

- `sessions.summary`, `sessions.summary_up_to_index`는 하위 호환을 위해 유지
- `goals` 타입은 content에 JSON 문자열로 저장 (예: `'"목표 텍스트"'::jsonb`)

### 카테고리별 content 예시

```jsonc
// long_term
[
  {"title": "관계의 변화", "content": "제 27록, 甲午年.2月.1日 | 午時 12시 12분 하랑, 청란, 나린과의 관계가 파탄 난 후..."},
  {"title": "새로운 만남", "content": "..."}
]

// short_term
[
  {"title": "협상 결렬", "content": "甲午年.2月.1日 | 戌時 19시 06분 이연은 모미령의 뒷배 제안을 거절하고..."},
  {"title": "별채 담판", "content": "甲午年.2月.1日 | 戌時 19시 02분 저녁 식사 중 찾아온..."}
]

// characters
[
  {"name": "당소백", "role": "관전객", "description": "사천당가의 후기지수. 이연이 오미상단을 농락하는 상황을 흥미롭게 관전하며 이연을 주시함."},
  {"name": "마유현", "role": "호위무사", "description": "모미령의 호위무사. 이연이 모미령을 희롱하고 자신을 하대하는 것에 극도의 분노와 적의를 품고 있음."}
]

// goals
"용봉지회를 구경하며 새로운 유희 대상을 찾고, 세 여인을 완전히 길들이는 것."
```

## 트리거 로직

### 조건

```javascript
const interval = gameplayConfig.sliding_window_size; // 20
const totalMessages = conversationHistory.length;

// 동시 실행 방지
if (isGeneratingMemory) return;

// 메시지가 윈도우를 초과하고, 이전 요약 이후 interval만큼 쌓였을 때 트리거
// 첫 트리거: 메시지 21+ (윈도우 밖 메시지가 생길 때)
// 이후: memoryUpToIndex 기준으로 interval만큼 새 메시지가 쌓였을 때
if (totalMessages > interval && (totalMessages - memoryUpToIndex) >= interval) {
  generateMemory();
}
```

- 첫 트리거는 윈도우를 초과하는 시점 (메시지 21개 이상)
- 이후 memoryUpToIndex 기준 interval 간격으로 트리거
- `isGeneratingMemory` 플래그로 동시 실행 방지
- 모든 카테고리를 한 번의 API 호출로 생성/갱신

### 단기→장기 전환

- AI 프롬프트 규칙에 "shortTerm 최대 10개, 초과 시 오래된 것은 longTerm으로 통합" 명시
- AI가 기존 메모리를 입력받고 한 번의 호출에서 자동 판단하여 처리 (별도 API 호출 없음)
- 클라이언트 코드에서는 10개 제한을 검증하지 않음 — AI 인스트럭션에 위임

### 실패 시 트리거 복구

- 메모리 생성 실패 시 `memoryUpToIndex`를 갱신하지 않음
- 다음 메시지에서 조건이 여전히 충족되므로 자연스럽게 재트리거됨
- 재트리거 시 현재 윈도우 전체 + 기존 메모리를 다시 전달하므로 누락 없음

## AI 요약 프롬프트

### 시스템 인스트럭션 (`memory_system_instruction`)

```
너는 인터랙티브 소설의 메모리 관리자다.
주어진 대화 내용과 기존 메모리를 분석하여 아래 JSON 형식으로 반환하라.
반드시 JSON만 출력하라. 다른 텍스트를 포함하지 마라.

{
  "shortTerm": [
    {"title": "이벤트 제목", "content": "작중 시간 | 상세 내용 요약"}
  ],
  "characters": [
    {"name": "인물명", "role": "역할/직함", "description": "주인공과의 관계, 현재 상태, 감정"}
  ],
  "goals": "현재 이야기 흐름상 주인공의 목표를 자연스러운 문장으로 서술",
  "longTerm": [
    {"title": "사건 제목", "content": "해당 사건의 전체 맥락 요약"}
  ]
}

규칙:
- shortTerm: 최근 주요 이벤트를 시간순으로 최대 10개. 각 이벤트는 제목과 작중 시간 포함 상세 내용으로 구성. 10개 초과 시 오래된 이벤트는 longTerm으로 통합
- characters: 등장하는 모든 인물의 이름, 역할/직함, 주인공과의 관계 및 현재 상태. 퇴장한 인물도 유지하되 상태에 반영
- goals: 현재 진행 중인 목표를 자연스러운 문장으로 서술. 완료된 목표는 제거하고 새 목표 반영
- longTerm: 기존 장기기억 + 단기에서 넘어온 이벤트를 통합. 각 항목은 제목과 전체 맥락 요약으로 구성. 시간순 정렬
```

### 요청 메시지 (`memory_request`)

```
## 기존 메모리
{기존 4개 카테고리 JSON 또는 "없음"}

## 최근 대화
{윈도우 내 메시지들}
```

### Gemini API 호출 설정

- `responseMimeType: "application/json"` 설정으로 JSON 출력 강제
- 추가로 JSON 파싱 실패 시 코드펜스 제거 후 재시도하는 fallback 포함

### 입력 데이터

- 현재 윈도우 내 메시지 (최근 20개) — 트리거 시점에 윈도우가 곧 요약 대상 전체
- 기존 메모리 4개 카테고리 (있으면)

### 키 매핑 (AI 응답 camelCase → DB snake_case)

| AI 응답 키 | DB type 값 |
|-----------|-----------|
| `shortTerm` | `short_term` |
| `longTerm` | `long_term` |
| `characters` | `characters` |
| `goals` | `goals` |

### `{memory}` 치환 형식

기존 메모리가 있을 때:
```json
{
  "shortTerm": [...기존 단기기억],
  "characters": [...기존 관계도],
  "goals": "기존 목표 텍스트",
  "longTerm": [...기존 장기기억]
}
```

기존 메모리가 없을 때: `"없음"`

### `{messages}` 치환 형식

```
[user] 사용자 입력 내용
[model] AI 응답 내용
[user] ...
```

## 시스템 프롬프트 주입

메모리가 존재하면 기존 스토리 설정 뒤에 `[메모리]` 섹션 추가:

```
[메모리]
## 장기기억
- 관계의 변화: 제 27록, 甲午年.2月.1日 | ...
- 새로운 만남: ...

## 단기기억
- 협상 결렬: 甲午年.2月.1日 | 戌時 19시 06분 ...
- 별채 담판: ...

## 등장인물 현황
- 당소백 (관전객): 사천당가의 후기지수. ...
- 마유현 (호위무사): 모미령의 호위무사. ...

## 현재 목표
용봉지회를 구경하며 새로운 유희 대상을 찾고...
```

- 기존 `[이전 이야기 요약]` 섹션을 `[메모리]` 섹션으로 교체
- 비어있는 카테고리는 생략

## 저장/로드 흐름

### 저장

1. 메모리 생성 완료
2. `session_memory` 테이블에 4개 row UPSERT (Supabase `.upsert()` 배열로 한 번에 전송)
3. `localStorage`에 캐시 (`ai-story-session-{id}-memory`)
4. 인메모리 `memoryUpToIndex`를 현재 `conversationHistory.length`로 갱신

### 로드 (세션 복원)

1. `session_memory`에서 `session_id`로 4개 row SELECT
2. 없으면 기존 `sessions.summary` fallback (마이그레이션 호환)
3. 인메모리 변수에 저장
4. `localStorage`에 캐시

### 마이그레이션

기존 `sessions.summary`가 있고 `session_memory`가 없는 경우:
- 기존 summary를 `long_term` 카테고리의 단일 항목으로 자동 변환

## 실패 처리

- API 호출 실패 시 게임 진행 차단 없음
- 재시도 버튼 표시 (토스트 또는 인라인)
- 다음 주기까지 기존 메모리 유지

## config 변경

### `gameplay_config`

```jsonc
{
  // 제거
  // "summary_max_chars": 500,
  // "summary_trigger_offset": 10,

  // 유지 (트리거 간격으로 사용)
  "sliding_window_size": 20,

  // 추가
  "memory_short_term_max": 10
}
```

### `prompt_config`

```jsonc
{
  // 제거
  // "summary_system_instruction": "...",
  // "summary_request_new": "...",
  // "summary_request_update": "...",

  // 추가
  "memory_system_instruction": "너는 인터랙티브 소설의 메모리 관리자다...",
  "memory_request": "## 기존 메모리\n{memory}\n\n## 최근 대화\n{messages}"
}
```

## UI 설계

### 진입점

기존 사이드바의 "이야기 요약" 항목 클릭 → "요약 메모리" 모달 열림

### 모달 구조

```
┌─ 요약 메모리 ──────────────────── ✕ ─┐
│                                       │
│  [장기 기억] [단기 기억] [관계도] [목표] │  ← 탭
│                                       │
│  총 N개                    최신순 ▾    │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  (탭별 내용)                     │  │
│  │                                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│                        [편집] [추가]   │  ← 장기기억 탭만
│                              [확인]   │  ← 나머지 탭
└───────────────────────────────────────┘
```

### 탭별 UI

| 탭 | 표시 방식 | 버튼 |
|---|----------|------|
| 장기 기억 | 아코디언 (제목 클릭→펼침/접힘) | 편집, 추가 |
| 단기 기억 | 카드형 (제목 볼드 + 내용 노출) | 확인 |
| 관계도 | "이름 (역할)" 볼드 + 설명 | 확인 |
| 목표 | 편집 가능한 textarea | 확인 |

### 편집/추가 기능 (장기기억)

- **편집**: 선택한 항목의 title/content를 인라인 편집 → 직접 DB 저장
- **추가**: 빈 항목 추가 → 사용자가 title/content 입력 → DB 저장
- 사용자가 수동 편집한 내용은 다음 AI 메모리 생성 시 "기존 메모리"로 전달되므로 AI가 자연스럽게 유지/통합함

### 상태 표시

- 메모리 없음: 기존처럼 "없음" 뱃지
- 메모리 있음: 카테고리별 항목 수 뱃지 또는 "있음"
- 생성 중: 로딩 스피너
- 실패: 재시도 버튼

## 영향 받는 파일

| 파일 | 변경 내용 |
|-----|---------|
| `supabase-schema.sql` | `session_memory` 테이블 + RLS 추가 |
| `public/js/app-play.js` | 기존 `generateSummary()` → `generateMemory()` 교체, 트리거 로직 변경, 프롬프트 주입 변경 |
| `public/js/prompt-builder.js` | `[메모리]` 섹션 조립 함수 추가 |
| `public/js/supabase-ops.js` | `session_memory` CRUD 함수 추가 |
| `public/play.html` | 요약 메모리 모달 HTML 추가 |
| `public/styles/play.css` | 모달/탭/아코디언 스타일 |
| `public/js/gemini-api.js` | 변경 없음 (기존 `generate` 함수 재사용) |
| `src/worker.js` | 변경 없음 (config은 기존 구조 활용) |
