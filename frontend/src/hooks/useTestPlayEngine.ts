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
      const { apiKey, model, systemPrompt, contents, safetySettings, userMessage: _userMessage, msgId } = opts;

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
