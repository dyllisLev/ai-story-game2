# Editor Test Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fullscreen modal to the Editor page that lets users test-play their story using the current editor form state, without saving.

**Architecture:** New backend endpoint `/api/game/test-prompt` returns system prompt + sliding-window contents as JSON (no SSE, no DB session). New frontend hook `useTestPlayEngine` manages test game state without any persistence side effects. Fullscreen modal reuses existing Play page components (StoryContent, InputArea, InfoPanel).

**Tech Stack:** Fastify (backend), React 19 + TypeScript (frontend), Gemini API (direct frontend streaming via `streamGenerate`)

**Spec:** `docs/superpowers/specs/2026-03-24-editor-test-play-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `backend/src/routes/game/test-prompt.ts` | POST `/api/game/test-prompt` — build system prompt from editor data, apply sliding window, return JSON |
| `frontend/src/hooks/useTestPlayEngine.ts` | Test-mode game engine hook — no persistence, calls test-prompt endpoint each turn |
| `frontend/src/components/editor/TestPlayModal.tsx` | Fullscreen modal container — wires up engine, reuses Play components |
| `frontend/src/components/editor/TestPlayHeader.tsx` | Modal header bar — title, API key input, model selector, reset, close |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/routes/game/index.ts` | Register `test-prompt` route |
| `frontend/src/components/editor/ActionBar.tsx` | Add "테스트" button + `onTestPlay` prop |
| `frontend/src/pages/Editor.tsx` | Add test play state, mount TestPlayModal |
| `frontend/src/styles/editor.css` | Modal overlay + layout styles |

---

## Task 1: Backend — `/api/game/test-prompt` Endpoint

**Files:**
- Create: `backend/src/routes/game/test-prompt.ts`
- Modify: `backend/src/routes/game/index.ts`

- [ ] **Step 1: Create test-prompt route**

Create `backend/src/routes/game/test-prompt.ts`:

```typescript
// backend/src/routes/game/test-prompt.ts
import type { FastifyInstance } from 'fastify';
import type { SessionMessage, SessionMemory } from '@story-game/shared';
import { buildPrompt, buildMemoryPrompt } from '../../services/prompt-builder.js';
import { applySlidingWindow, prepareContents } from '../../services/session-manager.js';

interface TestPromptRequest {
  editorData: {
    world_setting: string;
    story: string;
    character_name: string;
    character_setting: string;
    characters: string;
    user_note: string;
    system_rules: string;
    use_latex: boolean;
  };
  preset: {
    characterName?: string;
    characterSetting?: string;
    useLatex: boolean;
    narrativeLength: number;
  };
  messages?: SessionMessage[];
  memory?: SessionMemory;
  userMessage?: string;
  regenerate?: boolean;
}

export default async function (app: FastifyInstance) {
  app.post('/api/game/test-prompt', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as TestPromptRequest;

    if (!body.editorData || !body.preset) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'editorData and preset required' },
      });
    }

    const config = await app.getAppConfig();

    // Build system prompt
    let systemPrompt = buildPrompt(body.editorData, body.preset, config.promptConfig);
    if (body.memory) {
      systemPrompt += buildMemoryPrompt(body.memory);
    }

    const startMessage = config.promptConfig.game_start_message || '게임을 시작해줘';
    let messages: SessionMessage[] = body.messages || [];
    let actualUserMessage = body.userMessage;

    // Regenerate: strip last user+model pair
    if (body.regenerate && messages.length >= 2) {
      const lastModel = messages[messages.length - 1];
      const lastUser = messages[messages.length - 2];
      if (lastModel.role === 'model' && lastUser.role === 'user') {
        actualUserMessage = lastUser.content;
        messages = messages.slice(0, -2);
      }
    }

    // Build contents with sliding window
    let contents;
    if (actualUserMessage) {
      const allMessages: SessionMessage[] = [
        ...messages,
        { role: 'user', content: actualUserMessage, timestamp: Date.now() },
      ];
      const windowSize = config.gameplayConfig.sliding_window_size || 20;
      const windowMessages = applySlidingWindow(allMessages, windowSize);
      contents = prepareContents(windowMessages);
    } else {
      // Game start — only startMessage
      contents = [{ role: 'user', parts: [{ text: startMessage }] }];
    }

    // Async: log to api_logs (fire-and-forget)
    app.supabaseAdmin.from('api_logs').insert({
      session_id: null,
      endpoint: 'game/test-prompt',
      request_model: null,
      request_system_prompt: systemPrompt.slice(0, 500),
      request_messages: actualUserMessage ? [{ role: 'user', content: actualUserMessage }] : [],
      response_text: null,
      response_usage: null,
      response_error: null,
    }).catch((err: unknown) => {
      app.log.error(err, 'test-prompt: api_log insert failed');
    });

    return reply.send({
      systemPrompt,
      contents,
      startMessage,
      safetySettings: config.promptConfig.safety_settings,
    });
  });
}
```

- [ ] **Step 2: Register route in game/index.ts**

Modify `backend/src/routes/game/index.ts`:

```typescript
// backend/src/routes/game/index.ts
import type { FastifyInstance } from 'fastify';
import startRoute from './start.js';
import chatRoute from './chat.js';
import testPromptRoute from './test-prompt.js';

export default async function gameRoutes(app: FastifyInstance) {
  await app.register(startRoute);
  await app.register(chatRoute);
  await app.register(testPromptRoute);
}
```

- [ ] **Step 3: Build shared types and verify**

Run: `cd packages/shared && npx tsc`

Then start backend and test:

```bash
cd /Users/dyllislev/Documents/dev/ai-story-game2 && npx tsx backend/src/server.ts &
curl -X POST http://localhost:3000/api/game/test-prompt \
  -H 'Content-Type: application/json' \
  -d '{
    "editorData": {
      "world_setting": "판타지 세계",
      "story": "용사가 마왕을 무찌르는 이야기",
      "character_name": "용사",
      "character_setting": "검술의 달인",
      "characters": "[]",
      "user_note": "",
      "system_rules": "",
      "use_latex": false
    },
    "preset": {
      "characterName": "용사",
      "useLatex": false,
      "narrativeLength": 3
    }
  }'
```

Expected: JSON response with `systemPrompt`, `contents`, `startMessage`, `safetySettings`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/game/test-prompt.ts backend/src/routes/game/index.ts
git commit -m "feat: add /api/game/test-prompt endpoint for editor test play"
```

---

## Task 2: Frontend — `useTestPlayEngine` Hook

**Files:**
- Create: `frontend/src/hooks/useTestPlayEngine.ts`

**Reference files:**
- `frontend/src/hooks/useGameEngine.ts` — base logic to adapt from
- `frontend/src/lib/sse.ts` — `streamGenerate()` for Gemini direct calls
- `frontend/src/lib/markdown.ts` — `renderMarkdown()`, `initMarked()`
- `frontend/src/hooks/useStoryEditor.ts:25-45` — `EditorFormState` type
- `frontend/src/types/play.ts` — `MessageBlock`, `GeminiMessage`, `TokenUsage`, `SettingsData`

- [ ] **Step 1: Create useTestPlayEngine hook**

Create `frontend/src/hooks/useTestPlayEngine.ts`:

```typescript
// hooks/useTestPlayEngine.ts
// Lightweight game engine for editor test play — no persistence, no auto-save.
import { useState, useRef, useCallback, useEffect } from 'react';
import { streamGenerate } from '@/lib/sse';
import { renderMarkdown, initMarked } from '@/lib/markdown';
import { api } from '@/lib/api';
import { messagesToStorage } from '@/hooks/useSession';
import type { EditorFormState } from '@/hooks/useStoryEditor';
import type {
  GeminiMessage,
  SessionMemory,
  TokenUsage,
  MessageBlock,
} from '@/types/play';

// ---- Form → backend shape converters ----

interface StoryData {
  world_setting: string;
  story: string;
  character_name: string;
  character_setting: string;
  characters: string;
  user_note: string;
  system_rules: string;
  use_latex: boolean;
}

interface PresetData {
  characterName?: string;
  characterSetting?: string;
  useLatex: boolean;
  narrativeLength: number;
}

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

// ---- Test prompt response ----

interface TestPromptResponse {
  systemPrompt: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  startMessage: string;
  safetySettings: unknown[];
}

// ---- Hook ----

export interface TestPlayEngineState {
  messages: MessageBlock[];
  isGenerating: boolean;
  conversationHistory: GeminiMessage[];
  tokenUsage: TokenUsage | null;
  memory: SessionMemory;
  narrativeLength: number;
  useLatex: boolean;
  streamingText: string;
  gameStarted: boolean;
}

export interface TestPlayEngineActions {
  startGame: (apiKey: string, model: string) => Promise<void>;
  sendMessage: (apiKey: string, model: string, userMessage: string) => Promise<void>;
  regenerate: (apiKey: string, model: string) => Promise<void>;
  updateMemory: (updated: SessionMemory) => void;
  setNarrativeLength: (n: number) => void;
  setUseLatex: (v: boolean) => void;
}

const EMPTY_MEMORY: SessionMemory = {
  shortTerm: [],
  longTerm: [],
  characters: [],
  goals: '',
};

export function useTestPlayEngine(
  editorFormRef: React.RefObject<EditorFormState | null>
): TestPlayEngineState & TestPlayEngineActions {
  const [messages, setMessages] = useState<MessageBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [memory, setMemory] = useState<SessionMemory>(EMPTY_MEMORY);
  const [narrativeLength, setNarrativeLengthState] = useState(3);
  const [useLatex, setUseLatexState] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const historyRef = useRef<GeminiMessage[]>([]);
  const memoryRef = useRef<SessionMemory>(EMPTY_MEMORY);
  const msgIdCounterRef = useRef(0);

  useEffect(() => { initMarked(); }, []);
  useEffect(() => { historyRef.current = conversationHistory; }, [conversationHistory]);
  useEffect(() => { memoryRef.current = memory; }, [memory]);

  const newMsgId = useCallback((): string => {
    return `test-msg-${Date.now()}-${msgIdCounterRef.current++}`;
  }, []);

  // ---- Fetch test prompt from backend ----
  const fetchTestPrompt = useCallback(async (opts: {
    userMessage?: string;
    regenerate?: boolean;
  } = {}): Promise<TestPromptResponse> => {
    const form = editorFormRef.current;
    if (!form) throw new Error('Editor form not available');

    const storedMessages = messagesToStorage(historyRef.current);
    return api.post<TestPromptResponse>('/game/test-prompt', {
      editorData: formToStoryData(form),
      preset: formToPreset(form),
      messages: storedMessages,
      memory: memoryRef.current,
      userMessage: opts.userMessage,
      regenerate: opts.regenerate,
    });
  }, [editorFormRef]);

  // ---- Stream and append Gemini response ----
  const streamAndAppend = useCallback(
    async (opts: {
      apiKey: string;
      model: string;
      systemPrompt: string;
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      safetySettings: unknown[];
      userMessage: string;
      msgId: string;
    }): Promise<string> => {
      const { apiKey, model, systemPrompt, contents, safetySettings, userMessage, msgId } = opts;

      // Add streaming placeholder
      setMessages(prev => [
        ...prev,
        { type: 'streaming', text: '', id: msgId } as MessageBlock,
      ]);

      let renderTimer: ReturnType<typeof setTimeout> | null = null;

      const geminiBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        safetySettings,
      };

      const { text: fullResponse, usageMetadata } = await streamGenerate({
        apiKey,
        model,
        body: geminiBody,
        onChunk(textSoFar) {
          if (renderTimer !== null) clearTimeout(renderTimer);
          renderTimer = setTimeout(() => {
            setMessages(prev =>
              prev.map(m =>
                m.id === msgId ? ({ type: 'streaming', text: textSoFar, id: msgId } as MessageBlock) : m
              )
            );
          }, 80);
        },
      });

      if (renderTimer !== null) clearTimeout(renderTimer);

      // Replace streaming block with final rendered narrator block
      const renderedHtml = renderMarkdown(fullResponse);
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? ({ type: 'narrator', text: renderedHtml, id: msgId } as MessageBlock)
            : m
        )
      );

      if (usageMetadata) {
        setTokenUsage(usageMetadata as TokenUsage);
      }

      // Update conversation history
      const modelMsg: GeminiMessage = {
        role: 'model',
        parts: [{ text: fullResponse }],
        _timestamp: Date.now(),
      };
      setConversationHistory(prev => {
        const updated = [...prev, modelMsg];
        historyRef.current = updated;
        return updated;
      });

      return fullResponse;
    },
    []
  );

  // ---- Start Game ----
  const startGame = useCallback(
    async (apiKey: string, model: string): Promise<void> => {
      if (isGenerating) return;

      setIsGenerating(true);
      setConversationHistory([]);
      historyRef.current = [];
      setMessages([]);
      setTokenUsage(null);
      setMemory(EMPTY_MEMORY);
      memoryRef.current = EMPTY_MEMORY;
      setStreamingText('');

      try {
        const { systemPrompt, contents, startMessage, safetySettings } =
          await fetchTestPrompt();

        setGameStarted(true);

        // Record startMessage as the first user entry in conversation history
        // so that subsequent turns have proper user→model alternation
        const startUserMsg: GeminiMessage = {
          role: 'user',
          parts: [{ text: startMessage }],
          _timestamp: Date.now(),
        };
        setConversationHistory([startUserMsg]);
        historyRef.current = [startUserMsg];

        const msgId = newMsgId();
        await streamAndAppend({
          apiKey, model, systemPrompt, contents, safetySettings,
          userMessage: startMessage,
          msgId,
        });
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        setMessages(prev => [
          ...prev,
          { type: 'system', text: `[오류] ${errorText}`, id: newMsgId() } as MessageBlock,
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, fetchTestPrompt, streamAndAppend, newMsgId]
  );

  // ---- Send Message ----
  const sendMessage = useCallback(
    async (apiKey: string, model: string, userMessage: string): Promise<void> => {
      if (!apiKey || !gameStarted || isGenerating) return;

      setIsGenerating(true);

      // Add user message to history
      const userMsg: GeminiMessage = {
        role: 'user',
        parts: [{ text: userMessage }],
        _timestamp: Date.now(),
      };
      setConversationHistory(prev => {
        const updated = [...prev, userMsg];
        historyRef.current = updated;
        return updated;
      });

      // Add user bubble to UI
      setMessages(prev => [
        ...prev,
        { type: 'user', text: userMessage, id: newMsgId() } as MessageBlock,
      ]);

      try {
        const { systemPrompt, contents, safetySettings } =
          await fetchTestPrompt({ userMessage });

        const msgId = newMsgId();
        await streamAndAppend({
          apiKey, model, systemPrompt, contents, safetySettings,
          userMessage,
          msgId,
        });
      } catch (err) {
        // Remove last user msg from history on error
        setConversationHistory(prev => {
          const updated = prev.slice(0, -1);
          historyRef.current = updated;
          return updated;
        });
        const errorText = err instanceof Error ? err.message : String(err);
        setMessages(prev => [
          ...prev,
          { type: 'system', text: `[오류] ${errorText}`, id: newMsgId() } as MessageBlock,
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, gameStarted, fetchTestPrompt, streamAndAppend, newMsgId]
  );

  // ---- Regenerate ----
  const regenerate = useCallback(
    async (apiKey: string, model: string): Promise<void> => {
      if (!apiKey || !gameStarted || isGenerating || historyRef.current.length < 2) return;

      setIsGenerating(true);

      // Remove last 2 UI message blocks (user bubble + narrator)
      setMessages(prev => prev.slice(0, -2));

      // NOTE: Do NOT strip conversationHistory here.
      // Send full history with regenerate: true — the backend handles stripping
      // the last user+model pair and re-using the user message.

      try {
        const { systemPrompt, contents, safetySettings } =
          await fetchTestPrompt({ regenerate: true });

        // Now strip the frontend history to match backend's view
        setConversationHistory(prev => {
          const updated = prev.slice(0, -2);
          historyRef.current = updated;
          return updated;
        });

        const msgId = newMsgId();
        await streamAndAppend({
          apiKey, model, systemPrompt, contents, safetySettings,
          userMessage: '',
          msgId,
        });
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        setMessages(prev => [
          ...prev,
          { type: 'system', text: `[오류] ${errorText}`, id: newMsgId() } as MessageBlock,
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, gameStarted, fetchTestPrompt, streamAndAppend, newMsgId]
  );

  // ---- Setters ----
  const updateMemory = useCallback((updated: SessionMemory) => {
    setMemory(updated);
    memoryRef.current = updated;
  }, []);

  const setNarrativeLength = useCallback((n: number) => {
    setNarrativeLengthState(n);
  }, []);

  const setUseLatex = useCallback((v: boolean) => {
    setUseLatexState(v);
  }, []);

  return {
    messages,
    isGenerating,
    conversationHistory,
    tokenUsage,
    memory,
    narrativeLength,
    useLatex,
    streamingText,
    gameStarted,
    startGame,
    sendMessage,
    regenerate,
    updateMemory,
    setNarrativeLength,
    setUseLatex,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/dyllislev/Documents/dev/ai-story-game2/frontend && npx tsc --noEmit`

Fix any type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useTestPlayEngine.ts
git commit -m "feat: add useTestPlayEngine hook for editor test play"
```

---

## Task 3: Frontend — TestPlayHeader Component

**Files:**
- Create: `frontend/src/components/editor/TestPlayHeader.tsx`

**Reference:** `frontend/src/components/play/TopBar.tsx` for API key + model UI pattern.

- [ ] **Step 1: Create TestPlayHeader**

Create `frontend/src/components/editor/TestPlayHeader.tsx`:

```typescript
// components/editor/TestPlayHeader.tsx
import { type FC, useState, useEffect } from 'react';
import { fetchGeminiModels, type GeminiModel } from '@/lib/sse';

interface TestPlayHeaderProps {
  title: string;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  rightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const TestPlayHeader: FC<TestPlayHeaderProps> = ({
  title,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
  rightPanelOpen,
  onToggleRightPanel,
  onReset,
  onClose,
}) => {
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [showKey, setShowKey] = useState(false);

  // Fetch models when API key changes
  useEffect(() => {
    if (!apiKey) { setModels([]); return; }
    const ac = new AbortController();
    fetchGeminiModels(apiKey, ac.signal)
      .then(setModels)
      .catch(() => setModels([]));
    return () => ac.abort();
  }, [apiKey]);

  // Auto-select first model
  useEffect(() => {
    if (!model && models.length > 0) {
      onModelChange(models[0].id);
    }
  }, [models, model, onModelChange]);

  return (
    <header className="test-play-header">
      <div className="test-play-header-left">
        <span className="test-play-badge">테스트</span>
        <span className="test-play-title">{title || '제목 없음'}</span>
      </div>

      <div className="test-play-header-center">
        {/* API Key */}
        <div className="test-play-field">
          <input
            type={showKey ? 'text' : 'password'}
            className="test-play-input"
            placeholder="Gemini API Key"
            value={apiKey}
            onChange={e => onApiKeyChange(e.target.value)}
          />
          <button
            className="test-play-icon-btn"
            onClick={() => setShowKey(v => !v)}
            title={showKey ? '숨기기' : '보기'}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>

        {/* Model */}
        <select
          className="test-play-select"
          value={model}
          onChange={e => onModelChange(e.target.value)}
          disabled={models.length === 0}
        >
          {models.length === 0 && <option value="">모델 선택</option>}
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="test-play-header-right">
        <button
          className="test-play-icon-btn"
          onClick={onToggleRightPanel}
          title={rightPanelOpen ? '패널 닫기' : '패널 열기'}
        >
          {rightPanelOpen ? '📋' : '📋'}
        </button>
        <button className="test-play-icon-btn" onClick={onReset} title="새 테스트">
          🔄
        </button>
        <button className="test-play-icon-btn close" onClick={onClose} title="닫기">
          ✕
        </button>
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/editor/TestPlayHeader.tsx
git commit -m "feat: add TestPlayHeader component"
```

---

## Task 4: Frontend — TestPlayModal Component

**Files:**
- Create: `frontend/src/components/editor/TestPlayModal.tsx`

**Reference components (reused):**
- `frontend/src/components/play/StoryContent.tsx` — props: `StoryContentProps`
- `frontend/src/components/play/InputArea.tsx` — props: `InputAreaProps`
- `frontend/src/components/play/InfoPanel.tsx` — props: `InfoPanelProps`
- `frontend/src/components/play/CharacterModal.tsx`

- [ ] **Step 1: Create TestPlayModal**

Create `frontend/src/components/editor/TestPlayModal.tsx`:

```typescript
// components/editor/TestPlayModal.tsx
import { type FC, useState, useEffect, useRef, useCallback } from 'react';
import type { EditorFormState } from '@/hooks/useStoryEditor';
import { useTestPlayEngine } from '@/hooks/useTestPlayEngine';
import { TestPlayHeader } from './TestPlayHeader';
import { StoryContent } from '@/components/play/StoryContent';
import { InputArea } from '@/components/play/InputArea';
import { InfoPanel } from '@/components/play/InfoPanel';
import { CharacterModal } from '@/components/play/CharacterModal';
import type { SettingsData } from '@/types/play';

const DEFAULT_SUGGESTIONS = [
  '⚔️ 행동으로 맞서다',
  '🤔 신중하게 생각해보다',
  '💬 대화를 시도하다',
  '🌀 상황을 관찰하다',
];

interface TestPlayModalProps {
  editorForm: EditorFormState;
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
}

export const TestPlayModal: FC<TestPlayModalProps> = ({
  editorForm,
  visible,
  onClose,
  onReset,
}) => {
  // Keep form ref always up-to-date
  const formRef = useRef<EditorFormState | null>(editorForm);
  formRef.current = editorForm;

  const engine = useTestPlayEngine(formRef);

  // API key from sessionStorage (shared with Play page)
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('gemini-api-key') ?? '');
  const [model, setModel] = useState('');
  const [rightOpen, setRightOpen] = useState(true);
  const [charModalOpen, setCharModalOpen] = useState(false);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    if (key) sessionStorage.setItem('gemini-api-key', key);
  }, []);

  // ESC key to close
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  // Handlers
  const handleStart = async () => {
    if (!apiKey) { alert('API Key를 입력해주세요.'); return; }
    if (!model) { alert('모델을 선택해주세요.'); return; }
    await engine.startGame(apiKey, model);
  };

  const handleSend = (text: string) => {
    engine.sendMessage(apiKey, model, text);
  };

  const handleRegenerate = () => {
    engine.regenerate(apiKey, model);
  };

  // SettingsData adapter for InfoPanel
  const settingsData: SettingsData = {
    title: editorForm.title,
    worldSetting: editorForm.worldSetting,
    story: editorForm.story,
    characterName: editorForm.characterName,
    characterSetting: editorForm.characterSetting,
    characters: JSON.stringify(editorForm.characters),
    userNote: editorForm.userNote,
    systemRules: editorForm.systemRules,
  };

  return (
    <div
      className="test-play-overlay"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      <TestPlayHeader
        title={editorForm.title}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        model={model}
        onModelChange={setModel}
        rightPanelOpen={rightOpen}
        onToggleRightPanel={() => setRightOpen(v => !v)}
        onReset={onReset}
        onClose={onClose}
      />

      <div className={`test-play-body ${rightOpen ? '' : 'right-collapsed'}`}>
        {/* Center — Story + Input */}
        <main className="test-play-center">
          <StoryContent
            storyTitle={editorForm.title}
            genre={editorForm.genre}
            messages={engine.messages}
            isGenerating={engine.isGenerating}
            streamingText={engine.streamingText}
            onRegenerate={handleRegenerate}
            suggestions={!engine.isGenerating && engine.messages.length > 0 ? DEFAULT_SUGGESTIONS : []}
            onSuggestionSelect={handleSend}
          />
          <InputArea
            onSend={handleSend}
            onStart={handleStart}
            disabled={engine.isGenerating}
            isGenerating={engine.isGenerating}
            hasSession={engine.gameStarted}
            canRegenerate={engine.conversationHistory.length >= 2 && !engine.isGenerating}
            onRegenerate={handleRegenerate}
            tokenUsage={engine.tokenUsage}
          />
        </main>

        {/* Right Panel */}
        {rightOpen && (
          <InfoPanel
            memory={engine.memory}
            settingsData={settingsData}
            onUpdateSettings={() => {}}
            onUpdateMemory={engine.updateMemory}
            narrativeLength={engine.narrativeLength}
            onNarrativeLengthChange={engine.setNarrativeLength}
            useLatex={engine.useLatex}
            onUseLatexChange={engine.setUseLatex}
            useCache={false}
            onUseCacheChange={() => {}}
            saveStatus="idle"
            onSaveNow={() => {}}
            hasSession={engine.gameStarted}
            onOpenCharModal={() => setCharModalOpen(true)}
          />
        )}
      </div>

      {/* Test mode banner */}
      <div className="test-play-banner">
        ⚠️ 테스트 모드 — 세션이 저장되지 않습니다
      </div>

      {/* Character Modal */}
      <CharacterModal
        isOpen={charModalOpen}
        onClose={() => setCharModalOpen(false)}
        settingsData={settingsData}
        onSave={() => {}}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/dyllislev/Documents/dev/ai-story-game2/frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/editor/TestPlayModal.tsx
git commit -m "feat: add TestPlayModal component"
```

---

## Task 5: Frontend — ActionBar + Editor Integration

**Files:**
- Modify: `frontend/src/components/editor/ActionBar.tsx`
- Modify: `frontend/src/pages/Editor.tsx`

- [ ] **Step 1: Add test play button to ActionBar**

Modify `frontend/src/components/editor/ActionBar.tsx`:

Add `onTestPlay: () => void` to `ActionBarProps` interface.

Add test play button right after the "게임 시작" button (before the separator):

```tsx
{/* Test Play */}
<button
  className="action-bar-btn test-play"
  onClick={onTestPlay}
  aria-label="테스트 플레이"
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 12l2 2 4-4" />
  </svg>
  테스트
</button>
```

- [ ] **Step 2: Wire up in Editor.tsx**

Add imports and state to `frontend/src/pages/Editor.tsx`:

```typescript
import { TestPlayModal } from '../components/editor/TestPlayModal';

// Inside EditorPage component, add:
const [testPlayOpen, setTestPlayOpen] = useState(false);
const [testPlayKey, setTestPlayKey] = useState(0);

const openTestPlay = useCallback(() => setTestPlayOpen(true), []);
const closeTestPlay = useCallback(() => setTestPlayOpen(false), []);
const resetTestPlay = useCallback(() => setTestPlayKey(k => k + 1), []);
```

Pass `onTestPlay={openTestPlay}` to `ActionBar`.

Add the modal before the closing `</div>` of `editor-root`:

```tsx
{/* Test Play Modal */}
<TestPlayModal
  key={testPlayKey}
  editorForm={form}
  visible={testPlayOpen}
  onClose={closeTestPlay}
  onReset={resetTestPlay}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/dyllislev/Documents/dev/ai-story-game2/frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/editor/ActionBar.tsx frontend/src/pages/Editor.tsx
git commit -m "feat: wire up test play modal in editor"
```

---

## Task 6: CSS — Modal Styles

**Files:**
- Modify: `frontend/src/styles/editor.css`

- [ ] **Step 1: Add modal styles to editor.css**

Append to `frontend/src/styles/editor.css`:

```css
/* ============================================================
   Test Play Modal
   ============================================================ */

.test-play-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--bg-primary);
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.test-play-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  min-height: 48px;
  flex-shrink: 0;
}

.test-play-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.test-play-badge {
  background: var(--accent, #f59e0b);
  color: #000;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.test-play-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.test-play-header-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.test-play-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.test-play-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-primary);
  width: 200px;
}

.test-play-select {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-primary);
  min-width: 160px;
}

.test-play-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.test-play-icon-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: background 0.15s;
}

.test-play-icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.test-play-icon-btn.close {
  font-size: 16px;
  font-weight: 700;
  font-family: system-ui;
}

/* Body */
.test-play-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  flex: 1;
  overflow: hidden;
}

.test-play-body.right-collapsed {
  grid-template-columns: 1fr;
}

.test-play-center {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Banner */
.test-play-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* ActionBar test button */
.action-bar-btn.test-play {
  color: var(--accent, #f59e0b);
  border-color: var(--accent, #f59e0b);
}

.action-bar-btn.test-play:hover {
  background: color-mix(in srgb, var(--accent, #f59e0b) 10%, transparent);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/editor.css
git commit -m "feat: add test play modal CSS styles"
```

---

## Task 7: Integration Test — Full Flow

- [ ] **Step 1: Build shared types**

```bash
cd /Users/dyllislev/Documents/dev/ai-story-game2/packages/shared && npx tsc
```

- [ ] **Step 2: Start backend**

```bash
cd /Users/dyllislev/Documents/dev/ai-story-game2 && npx tsx backend/src/server.ts
```

Verify: `curl http://localhost:3000/api/health`

- [ ] **Step 3: Start frontend**

```bash
cd /Users/dyllislev/Documents/dev/ai-story-game2/frontend && npx vite --port 5173 --host 0.0.0.0
```

- [ ] **Step 4: Test in browser**

Open `http://0.0.0.0:5173/editor` using agent-browser skill.

Test checklist:
1. "테스트" button appears in action bar
2. Clicking opens fullscreen modal
3. API key input works (shared with sessionStorage)
4. Model selector populates after API key entry
5. "게임 시작" starts game, narrative streams in
6. User input sends messages, responses stream
7. Close modal (✕ or ESC) → reopen → previous conversation persists
8. "🔄 새 테스트" resets conversation
9. Edit story settings in editor → next turn reflects changes
10. InfoPanel shows with memory/output tabs

- [ ] **Step 5: Fix any issues found**

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: editor test play — integration fixes"
```
