// ============================================================
// Play Page — 3-column grid layout
// ============================================================
import { type FC, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import '@/styles/play.css';

import { useGameEngine } from '@/hooks/useGameEngine';
import { useSession } from '@/hooks/useSession';
import { useMemory } from '@/hooks/useMemory';

import { TopBar } from '@/components/play/TopBar';
import { SessionPanel } from '@/components/play/SessionPanel';
import { StoryContent } from '@/components/play/StoryContent';
import { InputArea } from '@/components/play/InputArea';
import { InfoPanel } from '@/components/play/InfoPanel';
import { CharacterModal } from '@/components/play/CharacterModal';

import type { SessionMemory } from '@story-game/shared';
import type { SettingsData } from '@/types/play';

// ---- Theme ----
type Theme = 'dark' | 'light';
const THEME_KEY = 'ai-story-game-theme';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// ---- Suggestion chips (static for now) ----
const DEFAULT_SUGGESTIONS = [
  '⚔️ 행동으로 맞서다',
  '🤔 신중하게 생각해보다',
  '💬 대화를 시도하다',
  '🌀 상황을 관찰하다',
];

// ---- Play Page ----
const Play: FC = () => {
  // --- Route params ---
  const { storyId: routeStoryId } = useParams<{ storyId?: string }>();

  // --- Theme ---
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // --- Panel visibility ---
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const layoutClass = [
    'play-layout',
    !leftOpen && !rightOpen ? 'both-collapsed' : '',
    !leftOpen && rightOpen ? 'left-collapsed' : '',
    leftOpen && !rightOpen ? 'right-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // --- API key + model ---
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('gemini-api-key') ?? '');
  const [model, setModel] = useState('');

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (key) sessionStorage.setItem('gemini-api-key', key);
  };

  // --- Char modal ---
  const [charModalOpen, setCharModalOpen] = useState(false);

  // --- Game engine ---
  const engine = useGameEngine();

  // --- Session ---
  const { sessionList, refreshSessionList, loadSession, deleteSession } = useSession();

  // --- Memory ---
  const { memory, loadMemory, updateMemory } = useMemory();

  // --- URL params on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('storyId') ?? routeStoryId;
    const sessionId = params.get('sessionId');

    if (sessionId) {
      handleLoadSession(sessionId);
    } else if (storyId) {
      loadStoryData(storyId);
    }

    if (params.get('storyId') || params.get('sessionId')) {
      history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStoryId]);

  // --- Load story data ---
  const loadStoryData = useCallback(async (storyId: string) => {
    try {
      const res = await fetch(`/api/stories/${storyId}`);
      if (!res.ok) return;
      const data = await res.json() as {
        title?: string;
        world_setting?: string;
        story?: string;
        character_name?: string;
        character_setting?: string;
        characters?: string;
        user_note?: string;
        system_rules?: string;
        use_latex?: boolean;
        genre?: string;
      };
      engine.updateSettingsData({
        title: data.title ?? '',
        worldSetting: data.world_setting ?? '',
        story: data.story ?? '',
        characterName: data.character_name ?? '',
        characterSetting: data.character_setting ?? '',
        characters: data.characters ?? '',
        userNote: data.user_note ?? '',
        systemRules: data.system_rules ?? '',
      });
      if (data.use_latex !== undefined) engine.setUseLatex(data.use_latex);
    } catch {
      // ignore
    }
  }, [engine]);

  // --- Load session ---
  const handleLoadSession = useCallback(async (sessionId: string) => {
    const data = await loadSession(sessionId);
    if (!data) {
      alert('세션을 찾을 수 없습니다.');
      return;
    }

    // Load story data if available
    if (data.storyId) {
      await loadStoryData(data.storyId);
    }

    // Load memory — use returned value to avoid stale state reference
    const mem = await loadMemory(sessionId);

    engine.loadSessionIntoEngine(
      sessionId,
      {
        storyId: data.storyId,
        title: data.title,
        preset: data.preset,
        messages: data.messages as Parameters<typeof engine.loadSessionIntoEngine>[1]['messages'],
        model: data.model,
        summary: data.summary,
        summaryUpToIndex: data.summaryUpToIndex,
      },
      mem
    );

    if (data.model) setModel(data.model);
    refreshSessionList();
  }, [loadSession, loadStoryData, loadMemory, engine, refreshSessionList]);

  // --- New session ---
  const handleNewSession = () => {
    engine.startNewGame();
  };

  // --- Start game ---
  const handleStart = async () => {
    if (!apiKey) { alert('API Key를 입력해주세요.'); return; }
    if (!model)  { alert('모델을 선택해주세요.'); return; }

    // Use storyId from URL or settingsData — for now we pass empty (worker handles it)
    const storyId = engine.currentStoryId ?? engine.settingsData.title;
    if (!storyId) { alert('스토리를 선택해주세요.'); return; }

    await engine.startGame({
      apiKey,
      model,
      storyId,
      options: {
        characterName: engine.settingsData.characterName,
        characterSetting: engine.settingsData.characterSetting,
        useLatex: engine.useLatex,
        useCache: engine.useCache,
        narrativeLength: engine.narrativeLength,
      },
    });
    refreshSessionList();
    if (engine.currentSessionId) {
      await loadMemory(engine.currentSessionId);
    }
  };

  // --- Send message ---
  const handleSend = (text: string) => {
    engine.sendMessage(apiKey, text);
  };

  // --- Regenerate ---
  const handleRegenerate = () => {
    engine.regenerate(apiKey);
  };

  // --- Update settings ---
  const handleUpdateSettings = (patch: Partial<SettingsData>) => {
    engine.updateSettingsData(patch);
  };

  // --- Update memory ---
  const handleUpdateMemory = (updated: SessionMemory) => {
    if (engine.currentSessionId) {
      updateMemory(engine.currentSessionId, updated);
    }
  };

  // --- Save char from modal ---
  const handleSaveChar = (name: string, setting: string) => {
    engine.updateSettingsData({ characterName: name, characterSetting: setting });
  };

  return (
    <div
      className="play-root"
      data-theme={theme}
    >
      <div className={layoutClass} id="playLayout">
        {/* Top Bar */}
        <TopBar
          storyTitle={engine.settingsData.title}
          genre={undefined}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          model={model}
          onModelChange={setModel}
          leftPanelOpen={leftOpen}
          rightPanelOpen={rightOpen}
          onToggleLeft={() => setLeftOpen((v) => !v)}
          onToggleRight={() => setRightOpen((v) => !v)}
          onOpenCharModal={() => setCharModalOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          username={undefined}
        />

        {/* Left Panel */}
        {leftOpen && (
          <SessionPanel
            sessions={sessionList}
            currentSessionId={engine.currentSessionId}
            onSelectSession={handleLoadSession}
            onNewSession={handleNewSession}
            onLoadById={handleLoadSession}
            onClose={() => setLeftOpen(false)}
          />
        )}
        {/* placeholder to maintain grid when left is closed */}
        {!leftOpen && <div style={{ overflow: 'hidden' }} />}

        {/* Center — Story + Input */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <StoryContent
            storyTitle={engine.settingsData.title}
            genre={undefined}
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
            disabled={!engine.currentSessionId && engine.isGenerating}
            isGenerating={engine.isGenerating}
            hasSession={!!engine.currentSessionId}
            canRegenerate={engine.conversationHistory.length >= 2 && !engine.isGenerating}
            onRegenerate={handleRegenerate}
            tokenUsage={engine.tokenUsage}
          />
        </div>

        {/* Right Panel */}
        {rightOpen && (
          <InfoPanel
            memory={memory}
            settingsData={engine.settingsData}
            onUpdateSettings={handleUpdateSettings}
            onUpdateMemory={handleUpdateMemory}
            narrativeLength={engine.narrativeLength}
            onNarrativeLengthChange={engine.setNarrativeLength}
            useLatex={engine.useLatex}
            onUseLatexChange={engine.setUseLatex}
            useCache={engine.useCache}
            onUseCacheChange={engine.setUseCache}
            saveStatus={engine.saveStatus}
            onSaveNow={engine.saveNow}
            hasSession={!!engine.currentSessionId}
            onOpenCharModal={() => setCharModalOpen(true)}
          />
        )}
        {!rightOpen && <div style={{ overflow: 'hidden' }} />}
      </div>

      {/* Character Modal */}
      <CharacterModal
        isOpen={charModalOpen}
        onClose={() => setCharModalOpen(false)}
        settingsData={engine.settingsData}
        onSave={handleSaveChar}
      />
    </div>
  );
};

export default Play;
