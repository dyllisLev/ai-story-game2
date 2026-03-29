// ============================================================
// useGameEngine — Core game logic
// Preserves all sliding window, memory triggers, auto-save logic
// from public/js/app-play.js
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { streamGenerate } from '@/lib/sse';
import { renderMarkdown, initMarked } from '@/lib/markdown';
import { api } from '@/lib/api';
import { parseStatusBlock } from '@/lib/status-parser';
import {
  messagesToStorage,
  messagesFromStorage,
  addToSessionList,
  saveSessionToLocal,
} from '@/hooks/useSession';
import type {
  GeminiMessage,
  SessionMemory,
  SaveStatus,
  TokenUsage,
  SessionPreset,
  SettingsData,
  GameStartResponse,
  ChatPromptResponse,
  MessageBlock,
} from '@/types/play';

// ---- session save helpers ----

interface SessionDocument {
  story_id: string | null;
  title: string;
  preset: SessionPreset;
  messages: ReturnType<typeof messagesToStorage>;
  model: string;
  summary: string;
  summary_up_to_index: number;
}

// ---- hook ----

export interface GameEngineState {
  messages: MessageBlock[];
  isGenerating: boolean;
  saveStatus: SaveStatus;
  currentSessionId: string | null;
  currentStoryId: string | null;
  conversationHistory: GeminiMessage[];
  tokenUsage: TokenUsage | null;
  narrativeLength: number;
  useLatex: boolean;
  useCache: boolean;
  settingsData: SettingsData;
  cachedContentName: string | null;
  streamingText: string;
  statusValues: Record<string, string>;
}

export interface GameEngineActions {
  startGame: (opts: {
    apiKey: string;
    model: string;
    storyId: string;
    options: {
      characterName?: string;
      characterSetting?: string;
      useLatex: boolean;
      useCache: boolean;
      narrativeLength: number;
    };
  }) => Promise<void>;
  sendMessage: (apiKey: string, userMessage: string) => Promise<void>;
  regenerate: (apiKey: string) => Promise<void>;
  loadSessionIntoEngine: (
    sessionId: string,
    data: {
      storyId?: string;
      title?: string;
      preset?: SessionPreset;
      messages?: { role: 'user' | 'model'; content: string; timestamp: number }[] | GeminiMessage[];
      model?: string;
      summary?: string;
      summaryUpToIndex?: number;
    },
    memory: SessionMemory | null
  ) => void;
  setNarrativeLength: (n: number) => void;
  setUseLatex: (v: boolean) => void;
  setUseCache: (v: boolean) => void;
  updateSettingsData: (patch: Partial<SettingsData>) => void;
  saveNow: () => Promise<void>;
  startNewGame: () => void;
}

export function useGameEngine(): GameEngineState & GameEngineActions {
  const [messages, setMessages] = useState<MessageBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [narrativeLength, setNarrativeLengthState] = useState(3);
  const [useLatex, setUseLatexState] = useState(false);
  const [useCache, setUseCacheState] = useState(false);
  const [settingsData, setSettingsDataState] = useState<SettingsData>({
    title: '',
    worldSetting: '',
    story: '',
    characterName: '',
    characterSetting: '',
    characters: '',
    userNote: '',
    systemRules: '',
  });
  const [cachedContentName, setCachedContentName] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [statusValues, setStatusValues] = useState<Record<string, string>>({});

  // refs for mutable state inside callbacks
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIdCounterRef = useRef(0);

  const stopAutoSave = useCallback((): void => {
    if (autoSaveIntervalRef.current !== null) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  }, []);

  const newMsgId = useCallback((): string => {
    return `msg-${Date.now()}-${msgIdCounterRef.current++}`;
  }, []);

  const isDirtyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const storyIdRef = useRef<string | null>(null);
  const historyRef = useRef<GeminiMessage[]>([]);
  const settingsRef = useRef<SettingsData>(settingsData);
  const narrativeLengthRef = useRef(narrativeLength);
  const useLatexRef = useRef(useLatex);
  const useCacheRef = useRef(useCache);
  const cachedNameRef = useRef<string | null>(null);
  const memoryRef = useRef<{ upToIndex: number }>({ upToIndex: 0 });

  useEffect(() => { initMarked(); }, []);

  // keep refs in sync
  useEffect(() => { sessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { storyIdRef.current = currentStoryId; }, [currentStoryId]);
  useEffect(() => { historyRef.current = conversationHistory; }, [conversationHistory]);
  useEffect(() => { settingsRef.current = settingsData; }, [settingsData]);
  useEffect(() => { narrativeLengthRef.current = narrativeLength; }, [narrativeLength]);
  useEffect(() => { useLatexRef.current = useLatex; }, [useLatex]);
  useEffect(() => { useCacheRef.current = useCache; }, [useCache]);
  useEffect(() => { cachedNameRef.current = cachedContentName; }, [cachedContentName]);

  // ---- Build session document ----
  const buildSessionDoc = useCallback((extraModel = ''): SessionDocument => ({
    story_id: storyIdRef.current,
    title: settingsRef.current.title || '제목 없음',
    preset: {
      worldSetting: settingsRef.current.worldSetting,
      story: settingsRef.current.story,
      characterName: settingsRef.current.characterName,
      characterSetting: settingsRef.current.characterSetting,
      characters: settingsRef.current.characters,
      userNote: settingsRef.current.userNote,
      systemRules: settingsRef.current.systemRules,
      useLatex: useLatexRef.current,
      useCache: useCacheRef.current,
      narrativeLength: narrativeLengthRef.current,
    },
    messages: messagesToStorage(historyRef.current),
    model: extraModel,
    summary: '',
    summary_up_to_index: memoryRef.current.upToIndex,
  }), []);

  // ---- Dirty / auto-save ----
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setSaveStatus('unsaved');
    const sid = sessionIdRef.current;
    if (sid) {
      const doc = buildSessionDoc();
      saveSessionToLocal(sid, { ...doc, updatedAt: Date.now(), lastPlayedAt: Date.now() });
      addToSessionList(sid, doc.title);
    }
  }, [buildSessionDoc]);

  const saveToCloud = useCallback(async (): Promise<void> => {
    const sid = sessionIdRef.current;
    if (!sid || !isDirtyRef.current) return;
    if (!navigator.onLine) { setSaveStatus('offline'); return; }
    setSaveStatus('saving');
    const doc = buildSessionDoc();
    saveSessionToLocal(sid, { ...doc, updatedAt: Date.now(), lastPlayedAt: Date.now() });
    addToSessionList(sid, doc.title);
    try {
      await api.put(`/sessions/${sid}`, doc);
      isDirtyRef.current = false;
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [buildSessionDoc]);

  // ---- visibility / pagehide save triggers ----
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current && sessionIdRef.current) {
        saveToCloud();
      }
    };
    const onPageHide = () => {
      if (!isDirtyRef.current || !sessionIdRef.current) return;
      const doc = buildSessionDoc();
      saveSessionToLocal(sessionIdRef.current, { ...doc, updatedAt: Date.now(), lastPlayedAt: Date.now() });
      addToSessionList(sessionIdRef.current, doc.title);
    };
    const onOnline = () => { if (isDirtyRef.current && sessionIdRef.current) saveToCloud(); };
    const onOffline = () => { if (sessionIdRef.current) setSaveStatus('offline'); };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [saveToCloud, buildSessionDoc]);

  // ---- Auto-save interval ----
  const startAutoSave = useCallback(() => {
    stopAutoSave();
    autoSaveIntervalRef.current = setInterval(() => {
      if (isDirtyRef.current && sessionIdRef.current) saveToCloud();
    }, 30_000); // 30s
  }, [saveToCloud, stopAutoSave]);

  // cleanup on unmount
  useEffect(() => () => stopAutoSave(), [stopAutoSave]);

  // ---- Stream a Gemini response and append to messages ----
  const streamAndAppend = useCallback(
    async (opts: {
      apiKey: string;
      model: string;
      geminiBody: object;
      systemPrompt: string;
      userMessage: string;
      isStart: boolean;
      msgId: string;
    }): Promise<string> => {
      const { apiKey, model, geminiBody, systemPrompt, userMessage, isStart, msgId } = opts;
      const startTime = Date.now();

      // Add streaming placeholder
      setMessages((prev) => [
        ...prev,
        { type: 'streaming', text: '', id: msgId } as MessageBlock,
      ]);

      let renderTimer: ReturnType<typeof setTimeout> | null = null;

      const { text: fullResponse, usageMetadata } = await streamGenerate({
        apiKey,
        model,
        body: geminiBody,
        onChunk(textSoFar) {
          if (renderTimer !== null) clearTimeout(renderTimer);
          renderTimer = setTimeout(() => {
            // Hide ```status block during streaming
            const display = textSoFar.replace(/```status[\s\S]*$/m, '').trimEnd();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId ? ({ type: 'streaming', text: display, id: msgId } as MessageBlock) : m
              )
            );
          }, 80);
        },
      });

      if (renderTimer !== null) clearTimeout(renderTimer);

      // Parse status block from response
      const { content: cleanContent, statusValues: parsed } = parseStatusBlock(fullResponse);
      if (parsed) setStatusValues(parsed);

      // Replace streaming block with final rendered narrator block
      const renderedHtml = renderMarkdown(cleanContent);
      setMessages((prev) =>
        prev.map((m) =>
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
      setConversationHistory((prev) => {
        const updated = [...prev, modelMsg];
        historyRef.current = updated;
        return updated;
      });
      markDirty();

      // Fire-and-forget save to worker
      api.post<{ memoryStatus?: string }>('/game/save', {
        apiKey,
        sessionId: sessionIdRef.current,
        userMessage,
        responseText: fullResponse,
        usageMetadata,
        systemPrompt,
        isStart,
        durationMs: Date.now() - startTime,
      }).catch(() => {/* ignore */});

      return fullResponse;
    },
    [markDirty]
  );

  // ---- Start Game ----
  const startGame = useCallback(
    async (opts: Parameters<GameEngineActions['startGame']>[0]): Promise<void> => {
      const { apiKey, model, storyId, options } = opts;
      if (isGenerating) return;

      setIsGenerating(true);
      stopAutoSave();
      setConversationHistory([]);
      historyRef.current = [];
      setMessages([]);
      setCachedContentName(null);
      cachedNameRef.current = null;
      setSaveStatus('idle');
      setStreamingText('');

      try {
        const geminiHeaders = apiKey ? { 'X-Gemini-Key': apiKey } : undefined;
        const data = await api.post<GameStartResponse>('/game/start', {
          storyId,
          model,
          options: {
            characterName: options.characterName,
            characterSetting: options.characterSetting,
            useLatex: options.useLatex,
            useCache: options.useCache,
            narrativeLength: options.narrativeLength,
          },
        }, geminiHeaders);
        const newSessionId = data.sessionId;
        const newSessionToken = data.sessionToken ?? null;

        setCurrentSessionId(newSessionId);
        setCurrentStoryId(storyId);
        setSessionToken(newSessionToken);
        sessionIdRef.current = newSessionId;
        sessionTokenRef.current = newSessionToken;
        storyIdRef.current = storyId;
        addToSessionList(newSessionId, settingsRef.current.title || '제목 없음');

        // Create Gemini cache if requested
        let cacheContentName: string | null = null;
        if (options.useCache) {
          cacheContentName = await createGeminiCache(apiKey, model, data.systemPrompt);
          setCachedContentName(cacheContentName);
          cachedNameRef.current = cacheContentName;
        }

        const geminiBody = cacheContentName
          ? {
              cachedContent: cacheContentName,
              contents: [{ role: 'user', parts: [{ text: data.startMessage }] }],
              safetySettings: data.safetySettings,
            }
          : {
              system_instruction: { parts: [{ text: data.systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: data.startMessage }] }],
              safetySettings: data.safetySettings,
            };

        const msgId = newMsgId();
        await streamAndAppend({
          apiKey, model, geminiBody,
          systemPrompt: data.systemPrompt,
          userMessage: data.startMessage,
          isStart: true,
          msgId,
        });

        startAutoSave();
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { type: 'system', text: `[오류] ${errorText}`, id: newMsgId() } as MessageBlock,
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, streamAndAppend, startAutoSave]
  );

  // ---- Send Message ----
  const sendMessage = useCallback(
    async (apiKey: string, userMessage: string): Promise<void> => {
      const sid = sessionIdRef.current;
      if (!apiKey) { console.warn('API Key를 입력해주세요.'); return; }
      if (!sid) { console.warn('게임을 먼저 시작해주세요.'); return; }
      if (isGenerating) return;

      setIsGenerating(true);

      // Add user message to history
      const userMsg: GeminiMessage = {
        role: 'user',
        parts: [{ text: userMessage }],
        _timestamp: Date.now(),
      };
      setConversationHistory((prev) => {
        const updated = [...prev, userMsg];
        historyRef.current = updated;
        return updated;
      });
      markDirty();

      // Add user bubble to UI
      setMessages((prev) => [
        ...prev,
        { type: 'user', text: userMessage, id: newMsgId() } as MessageBlock,
      ]);

      try {
        const chatHeaders: Record<string, string> = {};
        if (apiKey) chatHeaders['X-Gemini-Key'] = apiKey;
        if (sessionTokenRef.current) chatHeaders['X-Session-Token'] = sessionTokenRef.current;
        const prompt = await api.post<ChatPromptResponse>('/game/chat', { sessionId: sid, userMessage }, chatHeaders);

        const geminiBody = cachedNameRef.current && !prompt.hasMemory
          ? {
              cachedContent: cachedNameRef.current,
              contents: prompt.contents,
              safetySettings: prompt.safetySettings,
            }
          : {
              system_instruction: { parts: [{ text: prompt.systemPrompt }] },
              contents: prompt.contents,
              safetySettings: prompt.safetySettings,
            };

        const msgId = newMsgId();
        await streamAndAppend({
          apiKey,
          model: prompt.model,
          geminiBody,
          systemPrompt: prompt.systemPrompt,
          userMessage,
          isStart: false,
          msgId,
        });
      } catch (err) {
        // Remove last user msg from history on error
        setConversationHistory((prev) => {
          const updated = prev.slice(0, -1);
          historyRef.current = updated;
          return updated;
        });
        const errorText = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { type: 'system', text: `[오류] ${errorText}`, id: newMsgId() } as MessageBlock,
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, markDirty, streamAndAppend]
  );

  // ---- Regenerate ----
  const regenerate = useCallback(
    async (apiKey: string): Promise<void> => {
      const sid = sessionIdRef.current;
      if (!apiKey || !sid || isGenerating || historyRef.current.length < 2) return;

      setIsGenerating(true);

      // Remove last 2 messages from history (user + model)
      setConversationHistory((prev) => {
        const updated = prev.slice(0, -2);
        historyRef.current = updated;
        return updated;
      });

      // Remove last 2 message blocks from UI (user bubble + narrator)
      setMessages((prev) => prev.slice(0, -2));

      try {
        const regenHeaders: Record<string, string> = {};
        if (apiKey) regenHeaders['X-Gemini-Key'] = apiKey;
        if (sessionTokenRef.current) regenHeaders['X-Session-Token'] = sessionTokenRef.current;
        const prompt = await api.post<ChatPromptResponse>('/game/chat', { sessionId: sid, regenerate: true }, regenHeaders);

        const geminiBody = cachedNameRef.current && !prompt.hasMemory
          ? {
              cachedContent: cachedNameRef.current,
              contents: prompt.contents,
              safetySettings: prompt.safetySettings,
            }
          : {
              system_instruction: { parts: [{ text: prompt.systemPrompt }] },
              contents: prompt.contents,
              safetySettings: prompt.safetySettings,
            };

        const msgId = newMsgId();
        await streamAndAppend({
          apiKey,
          model: prompt.model,
          geminiBody,
          systemPrompt: prompt.systemPrompt,
          userMessage: prompt.contents[0]?.parts?.[0]?.text ?? '',
          isStart: false,
          msgId,
        });
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { type: 'system', text: `[오류] ${errorText}`, id: newMsgId() } as MessageBlock,
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, streamAndAppend]
  );

  // ---- Load session into engine ----
  const loadSessionIntoEngine = useCallback(
    (
      sessionId: string,
      data: Parameters<GameEngineActions['loadSessionIntoEngine']>[1],
      memory: SessionMemory | null
    ) => {
      stopAutoSave();

      setCurrentSessionId(sessionId);
      setCurrentStoryId(data.storyId ?? null);
      sessionIdRef.current = sessionId;
      storyIdRef.current = data.storyId ?? null;

      if (data.preset) {
        setNarrativeLengthState(data.preset.narrativeLength ?? narrativeLengthRef.current);
        setUseLatexState(data.preset.useLatex ?? false);
        setUseCacheState(data.preset.useCache ?? false);
        setSettingsDataState((prev) => ({
          ...prev,
          characterName: data.preset?.characterName ?? prev.characterName,
          characterSetting: data.preset?.characterSetting ?? prev.characterSetting,
        }));
        narrativeLengthRef.current = data.preset.narrativeLength ?? narrativeLengthRef.current;
        useLatexRef.current = data.preset.useLatex ?? false;
        useCacheRef.current = data.preset.useCache ?? false;
      }

      if (data.title) {
        setSettingsDataState((prev) => ({ ...prev, title: data.title ?? prev.title }));
      }

      memoryRef.current = { upToIndex: data.summaryUpToIndex ?? 0 };

      const rawMessages = data.messages ?? [];
      let history: GeminiMessage[];
      if (
        rawMessages.length > 0 &&
        'content' in rawMessages[0]
      ) {
        history = messagesFromStorage(rawMessages as { role: 'user' | 'model'; content: string; timestamp: number }[]);
      } else {
        history = rawMessages as GeminiMessage[];
      }

      setConversationHistory(history);
      historyRef.current = history;

      // Rebuild UI message blocks — strip status blocks for display only
      let lastStatus: Record<string, string> | null = null;
      const blocks: MessageBlock[] = history.map((msg) => {
        if (msg.role === 'user') {
          return { type: 'user', text: msg.parts[0]?.text ?? '', id: newMsgId() } as MessageBlock;
        } else {
          const raw = msg.parts[0]?.text ?? '';
          const { content, statusValues: parsed } = parseStatusBlock(raw);
          if (parsed) lastStatus = parsed;
          const rendered = renderMarkdown(content);
          return { type: 'narrator', text: rendered, id: newMsgId() } as MessageBlock;
        }
      });
      if (lastStatus) setStatusValues(lastStatus);
      setMessages(blocks);

      isDirtyRef.current = false;
      setSaveStatus('saved');
      // Keep existing lastPlayedAt — don't bump to now on load
      const lastMsg = history.filter(m => m.role === 'model').at(-1);
      const lastTs = lastMsg?._timestamp;
      addToSessionList(sessionId, data.title ?? '제목 없음', lastTs);
      startAutoSave();
    },
    [startAutoSave]
  );

  // ---- Setters ----
  const setNarrativeLength = useCallback((n: number) => {
    setNarrativeLengthState(n);
    narrativeLengthRef.current = n;
    markDirty();
  }, [markDirty]);

  const setUseLatex = useCallback((v: boolean) => {
    setUseLatexState(v);
    useLatexRef.current = v;
  }, []);

  const setUseCache = useCallback((v: boolean) => {
    setUseCacheState(v);
    useCacheRef.current = v;
  }, []);

  const updateSettingsData = useCallback((patch: Partial<SettingsData>) => {
    setSettingsDataState((prev) => {
      const updated = { ...prev, ...patch };
      settingsRef.current = updated;
      return updated;
    });
  }, []);

  const saveNow = useCallback(async () => {
    isDirtyRef.current = true;
    await saveToCloud();
  }, [saveToCloud]);

  const startNewGame = useCallback(() => {
    stopAutoSave();
    setCurrentSessionId(null);
    setCurrentStoryId(null);
    sessionIdRef.current = null;
    storyIdRef.current = null;
    setConversationHistory([]);
    historyRef.current = [];
    setMessages([]);
    setCachedContentName(null);
    cachedNameRef.current = null;
    setSaveStatus('idle');
    isDirtyRef.current = false;
    memoryRef.current = { upToIndex: 0 };
  }, []);

  return {
    messages,
    isGenerating,
    saveStatus,
    currentSessionId,
    currentStoryId,
    conversationHistory,
    tokenUsage,
    narrativeLength,
    useLatex,
    useCache,
    settingsData,
    cachedContentName,
    streamingText,
    statusValues,
    startGame,
    sendMessage,
    regenerate,
    loadSessionIntoEngine,
    setNarrativeLength,
    setUseLatex,
    setUseCache,
    updateSettingsData,
    saveNow,
    startNewGame,
  };
}

// ---- Gemini cache creation (standalone helper) ----
async function createGeminiCache(
  apiKey: string,
  model: string,
  systemPrompt: string
): Promise<string | null> {
  const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const TTL = '600s';
  try {
    const res = await fetch(`${GEMINI_BASE}/cachedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: `models/${model}`,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        ttl: TTL,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { name?: string };
    return data.name ?? null;
  } catch {
    return null;
  }
}

