# 에디터 테스트 플레이 기능 설계

> 작성일: 2026-03-24

## 1. 개요

에디터에서 스토리를 작성하는 도중, 저장 없이 현재 폼 상태 그대로 게임을 테스트 플레이할 수 있는 기능.
풀스크린 모달로 Play 페이지의 거의 모든 기능을 제공하며, 에디터 수정사항이 다음 턴부터 실시간 반영된다.

## 2. 핵심 결정사항

| 항목 | 결정 |
|------|------|
| 트리거 | 에디터에서 언제든 현재 폼 상태로 즉시 테스트 (저장 불필요) |
| UI 형태 | 유지형 풀스크린 모달 (에디터 위 오버레이) |
| 기능 범위 | 채팅, 상태창, 메모리, 입력모드 전환 — Play 페이지와 동일 수준 |
| API 키 | `sessionStorage`에서 Play 페이지와 공유, 없으면 모달 내 입력 |
| 설정 반영 | 에디터 폼 변경 → 다음 턴부터 즉시 반영 (시스템 프롬프트 재구성) |
| 캐시 | 테스트 모드에서 강제 비활성 (`useCache: false`) |
| 세션 수명 | 모달 닫아도 유지, "새 테스트" 버튼으로 리셋, 페이지 이탈 시 자동 정리 |
| 세션 저장 | DB에 저장하지 않음 (메모리 내 임시 세션) |

## 3. 아키텍처

### 3.1 현재 아키텍처 분석

현재 게임 플로우 (start/chat):
1. 프론트엔드 → `api.post('/game/start')` → 백엔드가 JSON 응답 (`{ sessionId, systemPrompt, startMessage, safetySettings }`)
2. 프론트엔드 → `streamGenerate()` → Gemini API 직접 SSE 스트리밍

> **참고**: 백엔드 `start.ts`/`chat.ts`에는 `streamToSSE()` 호출이 있으나, 프론트엔드 `useGameEngine`은 JSON 응답을 기대하고 Gemini를 직접 호출하는 패턴을 사용. CLAUDE.md에도 "Gemini API: 프론트엔드에서 직접 호출"로 명시.

### 3.2 테스트 플레이 아키텍처

테스트 플레이는 **백엔드에 새 엔드포인트 `/api/game/test-prompt`**를 추가하여 시스템 프롬프트만 받아오고, Gemini 호출과 세션 관리는 모두 프론트엔드에서 처리한다.

```
에디터 폼 상태 (useStoryEditor.form)
        │
        ▼
  TestPlayModal
        │
        ├─ 게임 시작: POST /api/game/test-prompt (editorData → systemPrompt 반환)
        │   └─ 프론트엔드에서 streamGenerate() → Gemini 직접 호출
        │
        ├─ 매 턴: POST /api/game/test-prompt (최신 editorData → 새 systemPrompt)
        │   └─ 프론트엔드에서 대화 히스토리 관리 + streamGenerate()
        │
        └─ 세션/메모리: 전부 컴포넌트 state (DB 저장 없음)
```

이 방식의 장점:
- 기존 `/api/game/start`, `/api/game/chat` 수정 불필요
- `verifySessionAccess` 우회 불필요
- DB에 테스트 세션 생성/조회/저장 불필요
- 백엔드 변경 최소화 (새 엔드포인트 1개만 추가)

### 3.3 컴포넌트 구조

```
Editor.tsx
├── (기존 에디터 컴포넌트들)
├── ActionBar — "테스트 플레이" 버튼 추가
└── TestPlayModal (NEW)  ← key={testPlayKey} 로 리셋 제어
    ├── TestPlayHeader — 모달 헤더 (타이틀, API 키, 모델 선택, 새 테스트, 닫기)
    ├── useTestPlayEngine (NEW) — 테스트 전용 게임 엔진
    ├── Play 컴포넌트 재사용:
    │   ├── StoryContent — 내러티브 표시
    │   ├── InputArea — 사용자 입력
    │   ├── InfoPanel — 메모리, 설정, 출력 탭
    │   └── CharacterModal — 캐릭터 편집
    └── (SessionPanel 제외 — 테스트 세션은 단일)
```

### 3.4 새 백엔드 엔드포인트: `/api/game/test-prompt`

시스템 프롬프트를 구성하고, 슬라이딩 윈도우를 적용하여 반환하는 JSON 엔드포인트.
DB 조회/저장 없음. SSE 스트리밍 없음.

```typescript
// POST /api/game/test-prompt

// Request
{
  editorData: {                     // StoryData와 동일한 snake_case 필드
    world_setting: string,
    story: string,
    character_name: string,
    character_setting: string,
    characters: string,             // JSON string
    user_note: string,
    system_rules: string,
    use_latex: boolean,
  },
  preset: {                         // PresetData와 동일
    characterName?: string,
    characterSetting?: string,
    useLatex: boolean,
    narrativeLength: number,
  },
  messages?: SessionMessage[],      // 대화 히스토리 (start 시 비어있음)
  memory?: SessionMemory,           // 현재 메모리 state (프론트엔드에서 관리)
  userMessage?: string,             // chat 시 현재 유저 입력
  regenerate?: boolean,             // true면 messages의 마지막 user+model 쌍을 제거 후 처리
}

// Response
{
  systemPrompt: string,             // buildPrompt + buildMemoryPrompt 결과
  contents: GeminiContent[],        // 슬라이딩 윈도우 적용된 대화 내용 (start 시 startMessage만 포함)
  startMessage: string,             // 게임 시작 메시지 (config.promptConfig.game_start_message)
  safetySettings: SafetySetting[],
}
```

로직:
1. `app.getAppConfig()` 로 promptConfig + gameplayConfig 조회
2. `buildPrompt(editorData, preset, promptConfig)` 호출
3. `memory`가 있으면 `buildMemoryPrompt(memory)` 결과를 systemPrompt에 추가
4. `regenerate: true`이면 `messages`에서 마지막 user+model 쌍을 제거하고, 제거된 user 메시지를 `userMessage`로 사용
5. `messages` + `userMessage`에 `applySlidingWindow()` + `prepareContents()` 적용
6. JSON 응답 반환

### 3.5 `useTestPlayEngine` 훅 (새로 생성)

`useGameEngine`을 기반으로 하되, 테스트 모드에 맞게 경량화한 전용 훅.

`useGameEngine`과의 차이점:

| 기능 | useGameEngine | useTestPlayEngine |
|------|---------------|-------------------|
| 세션 ID | DB에서 발급 | 없음 (불필요) |
| auto-save interval | 30초마다 | 없음 |
| `markDirty()` → localStorage | O | X |
| `api.post('/game/save')` | O | X |
| visibility/pagehide 저장 | O | X |
| `addToSessionList()` | O | X |
| 캐시 (`useCache`) | 사용자 선택 | 강제 비활성 |
| 시스템 프롬프트 | 게임 시작 시 1회 | 매 턴마다 `/api/game/test-prompt`로 재구성 |
| 메모리 생성 | 백엔드 `generateAndSaveMemory` | 없음 (프론트엔드 state만) |
| 에디터 폼 연동 | X | `editorFormRef`로 최신 폼 참조 |

핵심 동작:
```typescript
function useTestPlayEngine(editorFormRef: RefObject<EditorFormState>) {
  // ... 기본 상태 (messages, isGenerating, conversationHistory 등)

  const startGame = async (apiKey: string, model: string) => {
    // 1. 에디터 폼 → snake_case 변환
    const editorData = formToStoryData(editorFormRef.current);
    const preset = formToPreset(editorFormRef.current);

    // 2. /api/game/test-prompt 호출 → systemPrompt 획득
    const { systemPrompt, startMessage, safetySettings } =
      await api.post('/game/test-prompt', { editorData, preset });

    // 3. Gemini 직접 호출 (streamGenerate)
    await streamAndAppend({ apiKey, model, systemPrompt, startMessage, safetySettings });
  };

  const sendMessage = async (apiKey: string, model: string, userMessage: string) => {
    // 1. 최신 에디터 폼 + 대화 히스토리 + 메모리를 백엔드에 전달
    const editorData = formToStoryData(editorFormRef.current);
    const preset = formToPreset(editorFormRef.current);
    const messages = messagesToStorage(conversationHistory);  // GeminiMessage → SessionMessage
    const { systemPrompt, contents, safetySettings } =
      await api.post('/game/test-prompt', { editorData, preset, messages, memory, userMessage });

    // 2. 백엔드가 슬라이딩 윈도우 적용한 contents로 Gemini 직접 호출
    await streamAndAppend({ apiKey, model, systemPrompt, contents, safetySettings, userMessage });
  };
}
```

### 3.6 EditorFormState → StoryData 변환

프론트엔드에서 에디터 폼(camelCase)을 백엔드의 `StoryData`(snake_case)로 변환:

```typescript
function formToStoryData(form: EditorFormState): StoryData {
  return {
    world_setting: form.worldSetting,
    story: form.story,
    character_name: form.characterName,
    character_setting: form.characterSetting,
    characters: JSON.stringify(form.characters),
    user_note: form.userNote,
    system_rules: form.systemRules,
    use_latex: form.useLatex,
  };
}

function formToPreset(form: EditorFormState): PresetData {
  return {
    characterName: form.characterName,
    characterSetting: form.characterSetting,
    useLatex: form.useLatex,
    narrativeLength: form.narrativeLength,
  };
}
```

### 3.7 모달 상태 관리

항상 마운트 상태로 유지하고, CSS `display: none`으로 숨김 처리하여 세션을 보존한다.
"새 테스트"는 `key` 변경으로 React가 자동 재마운트하여 클린 리셋.

```typescript
// Editor.tsx에 추가되는 상태
const [testPlayOpen, setTestPlayOpen] = useState(false);
const [testPlayKey, setTestPlayKey] = useState(0);

// 모달 열기
const openTestPlay = () => setTestPlayOpen(true);

// 모달 닫기 (숨기기만 — 세션 유지)
const closeTestPlay = () => setTestPlayOpen(false);

// 새 테스트: key 변경으로 컴포넌트 재마운트 → 엔진 리셋
const resetTestPlay = () => setTestPlayKey(k => k + 1);

// JSX — 항상 마운트, visible prop으로 display 제어
<TestPlayModal
  key={testPlayKey}
  editorForm={form}
  visible={testPlayOpen}
  onClose={closeTestPlay}
  onReset={resetTestPlay}
/>
```

- `visible=false` → `display: none` (컴포넌트 state 유지)
- `visible=true` → 모달 표시 (이전 대화 그대로)
- `resetTestPlay()` → key 변경 → 재마운트 → 엔진 초기화

### 3.8 메모리 처리

- 테스트 세션은 빈 메모리로 시작 (`{ shortTerm: [], longTerm: [], characters: [], goals: '' }`)
- 백엔드 메모리 생성 트리거(`generateAndSaveMemory`) 호출하지 않음
- InfoPanel에서 메모리 편집 시 컴포넌트 state에만 반영 (DB 저장 없음)
- 메모리 프롬프트는 `buildMemoryPrompt()`를 프론트엔드에서 호출하거나, `/api/game/test-prompt`에 memory를 같이 보내서 처리

### 3.9 슬라이딩 윈도우

슬라이딩 윈도우는 `/api/game/test-prompt` 엔드포인트에서 처리한다 (Section 3.4 참조).
프론트엔드는 대화 히스토리를 그대로 보내고, 백엔드가 `applySlidingWindow()` + `prepareContents()` 를 적용한 `contents`를 반환한다.
이렇게 하면 `session-manager.ts`의 로직을 중복 없이 재사용할 수 있다.

## 4. UI 설계

### 4.1 테스트 플레이 버튼

`ActionBar`에 기존 "게임 시작" 버튼 옆에 "🧪 테스트" 버튼 추가.
- 저장 상태와 무관하게 항상 활성

### 4.2 모달 레이아웃

```
┌──────────────────────────────────────────────────────┐
│ [TestPlayHeader]                                     │
│  🧪 테스트: {제목}  | API Key | Model | 🔄새로 | ✕   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────┐  ┌──────────────────┐  │
│  │                         │  │   InfoPanel       │  │
│  │    StoryContent         │  │   (메모리/설정/   │  │
│  │    (내러티브)            │  │    출력/메모)     │  │
│  │                         │  │                  │  │
│  │                         │  │                  │  │
│  ├─────────────────────────┤  │                  │  │
│  │    InputArea            │  │                  │  │
│  │    (입력 + 모드 전환)    │  │                  │  │
│  └─────────────────────────┘  └──────────────────┘  │
│                                                      │
│  ⚠️ 테스트 모드 — 세션이 저장되지 않습니다            │
└──────────────────────────────────────────────────────┘
```

- 풀스크린 오버레이 (`position: fixed, inset: 0, z-index: 1000`)
- 좌우 2컬럼: 메인(StoryContent + InputArea) + InfoPanel
- SessionPanel 제외 (단일 테스트 세션이므로)
- 하단에 테스트 모드 안내 배너
- ESC 키로 모달 닫기

### 4.3 InfoPanel 제한사항

- **출력 탭**: 캐시 토글 비활성 (강제 off), narrativeLength와 useLatex는 편집 가능
- **메모리 탭**: 편집 가능하지만 state에만 반영
- **기타**: Play 페이지와 동일

## 5. 파일 목록

### 새 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/components/editor/TestPlayModal.tsx` | 테스트 플레이 모달 컨테이너 |
| `frontend/src/components/editor/TestPlayHeader.tsx` | 모달 헤더 |
| `frontend/src/hooks/useTestPlayEngine.ts` | 테스트 전용 게임 엔진 훅 |
| `backend/src/routes/game/test-prompt.ts` | 시스템 프롬프트 구성 엔드포인트 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `frontend/src/pages/Editor.tsx` | 테스트 플레이 상태 + 모달 마운트 |
| `frontend/src/components/editor/ActionBar.tsx` | "테스트 플레이" 버튼 추가 |
| `frontend/src/styles/editor.css` | 모달 스타일 |
| `backend/src/routes/game/index.ts` (또는 등록부) | 새 라우트 등록 |

### 수정하지 않는 파일

| 파일 | 이유 |
|------|------|
| `useGameEngine.ts` | 테스트 전용 훅을 별도 생성 (기존 훅 오염 방지) |
| `backend/src/routes/game/start.ts` | 테스트 모드는 별도 엔드포인트 사용 |
| `backend/src/routes/game/chat.ts` | 테스트 모드는 별도 엔드포인트 사용 |
| `backend/src/services/prompt-builder.ts` | 이미 `StoryData` + `PresetData`를 받으므로 수정 불필요 |

## 6. 테스트 시나리오

1. **기본 플로우**: 에디터에서 설정 입력 → 테스트 플레이 클릭 → API 키/모델 설정 → 게임 시작 → 대화 진행
2. **설정 실시간 반영**: 모달 닫기 → 에디터에서 세계관 수정 → 모달 다시 열기 → 다음 턴에서 새 세계관 반영 확인
3. **세션 유지**: 모달 닫기 → 다시 열기 → 이전 대화 유지 확인
4. **새 테스트**: "새 테스트" 버튼 → 대화 리셋 확인
5. **캐시 비활성**: 출력 설정에서 캐시 토글 불가 확인 (강제 off)
6. **페이지 이탈**: 다른 페이지 이동 → 돌아왔을 때 세션 없음 확인
7. **에러 처리**: API 키 없이 시작 시도 → 안내 메시지
8. **ESC 키**: 모달에서 ESC 누르면 닫힘 확인
9. **대화 히스토리**: 20턴 이상 대화 → 슬라이딩 윈도우 정상 작동 확인
