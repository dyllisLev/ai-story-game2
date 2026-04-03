// ============================================================
// Play Page — 3-column grid layout
// ============================================================
import { type FC, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import '@/styles/play.css';

import { useGameEngine } from '@/hooks/useGameEngine';
import { useSession } from '@/hooks/useSession';
import { useMemory } from '@/hooks/useMemory';
import { useConfig } from '@/hooks/useConfig';
import { useUserApiKey } from '@/hooks/useUserApiKey';

import { TopBar } from '@/components/play/TopBar';
import { SessionPanel } from '@/components/play/SessionPanel';
import { StoryContent } from '@/components/play/StoryContent';
import { InputArea } from '@/components/play/InputArea';
import { InfoPanel } from '@/components/play/InfoPanel';
import { CharacterModal } from '@/components/play/CharacterModal';
import { MobileBottomNav } from '@/components/play/MobileBottomNav';
import { FeedbackModal } from '@/components/play/FeedbackModal';

import type { SessionMemory } from '@story-game/shared';
import type { SettingsData, StatusAttribute, InputMode } from '@/types/play';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

// ---- Theme ----
type Theme = 'dark' | 'light';
const THEME_KEY = 'ai-story-game-theme';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// ---- Play Page ----
const Play: FC = () => {
  const { data: config } = useConfig();

  // Build mode prefixes from config
  const inputModes = config?.gameplayConfig.input_modes ?? [];
  const MODE_PREFIXES: Partial<Record<InputMode, string>> = {};
  inputModes.forEach(({ id, prefix }) => {
    MODE_PREFIXES[id as InputMode] = prefix;
  });
  const DEFAULT_SUGGESTIONS = config?.gameplayConfig.default_suggestions ?? [];
  // --- Route params ---
  const { storyId: routeStoryId } = useParams<{ storyId?: string }>();

  // --- Toast (non-blocking alert replacement) ---
  const toast = useToast();

  // --- Auth ---
  const { user } = useAuth();
  const { hasApiKey, isLoading: isLoadingApiKey } = useUserApiKey();

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

  // --- Mobile navigation ---
  const [mobileTab, setMobileTab] = useState<'session' | 'info' | 'notes'>('session');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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

  // --- Feedback modal ---
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackRequested, setFeedbackRequested] = useState<Set<string>>(new Set());

  // Auto-show feedback modal after sufficient gameplay
  useEffect(() => {
    const FEEDBACK_MESSAGE_THRESHOLD = 10; // Show feedback prompt after 10 messages
    const FEEDBACK_STORAGE_KEY = 'story-game:feedback-requested';

    // Load previously requested sessions from localStorage
    const loadRequestedSessions = (): Set<string> => {
      try {
        const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    };

    // Check if we should show feedback modal
    const checkFeedbackTrigger = () => {
      if (!engine.currentSessionId) return;

      const requested = loadRequestedSessions();
      setFeedbackRequested(requested);

      // Don't show if already requested for this session
      if (requested.has(engine.currentSessionId)) return;

      // Check message count
      const messageCount = engine.messages.filter(m => m.role === 'model').length;

      // Show feedback modal after threshold
      if (messageCount >= FEEDBACK_MESSAGE_THRESHOLD) {
        // Mark as requested
        const updated = new Set(requested);
        updated.add(engine.currentSessionId);
        setFeedbackRequested(updated);

        try {
          localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([...updated]));
        } catch (e) {
          console.warn('Failed to save feedback request state:', e);
        }

        // Show modal with a small delay for better UX
        setTimeout(() => {
          setFeedbackModalOpen(true);
        }, 500);
      }
    };

    checkFeedbackTrigger();
  }, [engine.messages, engine.currentSessionId]);

  // --- Status window config ---
  const [statusAttributes, setStatusAttributes] = useState<StatusAttribute[]>([]);

  // --- Story genre ---
  const [storyGenre, setStoryGenre] = useState<string | undefined>(undefined);

  // --- Game engine ---
  const engine = useGameEngine();

  // --- Session ---
  const { sessionList, refreshSessionList, loadSession } = useSession();

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
      const data = await api.get<{
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
        preset?: {
          useStatusWindow?: boolean;
          statusAttributes?: StatusAttribute[];
        };
      }>(`/stories/${storyId}`);
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
      if (data.genre) setStoryGenre(data.genre);
      if (data.preset?.useStatusWindow && data.preset.statusAttributes?.length) {
        setStatusAttributes(data.preset.statusAttributes);
      }
    } catch {
      // ignore
    }
  }, [engine]);

  // --- Load session ---
  const handleLoadSession = useCallback(async (sessionId: string) => {
    const data = await loadSession(sessionId);
    if (!data) {
      toast.show('세션을 찾을 수 없습니다.', 'error');
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
    if (!apiKey) { toast.show('API Key를 입력해주세요.', 'warning'); return; }
    if (!model)  { toast.show('모델을 선택해주세요.', 'warning'); return; }

    const storyId = engine.currentStoryId ?? routeStoryId;
    if (!storyId) { toast.show('스토리를 선택해주세요.', 'warning'); return; }

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
  const handleSend = (text: string, mode: InputMode = 'action') => {
    const prefix = MODE_PREFIXES[mode] ?? '';
    engine.sendMessage(apiKey, `${prefix}${text}`);
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

  // --- Mobile navigation ---
  const handleMobileTabChange = (tab: 'session' | 'info' | 'notes') => {
    setMobileTab(tab);
    setMobilePanelOpen(true);
  };

  const handleCloseMobilePanel = () => {
    setMobilePanelOpen(false);
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
          genre={storyGenre}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          model={model}
          onModelChange={setModel}
          leftPanelOpen={leftOpen}
          rightPanelOpen={rightOpen}
          onToggleLeft={() => setLeftOpen((v) => !v)}
          onToggleRight={() => setRightOpen((v) => !v)}
          onOpenCharModal={() => setCharModalOpen(true)}
          onOpenFeedbackModal={() => {
            if (!engine.currentSessionId || !engine.currentStoryId) {
              toast.show('피드백을 제출하려면 먼저 게임을 시작해주세요.', 'warning');
              return;
            }
            setFeedbackModalOpen(true);
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          username={user?.nickname ?? user?.email}
          showApiKeyInput={!user || !hasApiKey}
          isLoadingApiKey={isLoadingApiKey}
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
        {!leftOpen && <div className="panel-left panel-collapsed" style={{ overflow: 'hidden' }} />}

        {/* Center — Story + Input */}
        <main className="panel-center">
          <StoryContent
            storyTitle={engine.settingsData.title}
            genre={storyGenre}
            messages={engine.messages}
            isGenerating={engine.isGenerating}
            streamingText={''}
            onRegenerate={handleRegenerate}
            suggestions={!engine.isGenerating && engine.messages.length > 0 ? DEFAULT_SUGGESTIONS : []}
            onSuggestionSelect={(text) => handleSend(text, 'action')}
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
            selectedModel={model}
          />
        </main>

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
            statusAttributes={statusAttributes}
            statusValues={engine.statusValues}
          />
        )}
        {!rightOpen && <div className="panel-right panel-collapsed" style={{ overflow: 'hidden' }} />}
      </div>

      {/* Character Modal */}
      <CharacterModal
        isOpen={charModalOpen}
        onClose={() => setCharModalOpen(false)}
        settingsData={engine.settingsData}
        onSave={handleSaveChar}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        sessionId={engine.currentSessionId ?? ''}
        storyId={engine.currentStoryId ?? ''}
        genre={storyGenre ?? 'fantasy'}
        onSubmitSuccess={() => {
          toast.show('피드백이 제출되었습니다. 감사합니다!', 'success');
        }}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
      />

      {/* Mobile Panel Overlay */}
      {mobilePanelOpen && (
        <div className="mobile-panel-overlay">
          {mobileTab === 'session' && (
            <SessionPanel
              sessions={sessionList}
              currentSessionId={engine.currentSessionId}
              onSelectSession={handleLoadSession}
              onNewSession={handleNewSession}
              onLoadById={handleLoadSession}
              onClose={handleCloseMobilePanel}
            />
          )}
          {mobileTab === 'info' && (
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
              statusAttributes={statusAttributes}
              statusValues={engine.statusValues}
            />
          )}
          {mobileTab === 'notes' && (
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
              statusAttributes={statusAttributes}
              statusValues={engine.statusValues}
            />
          )}
          <button
            className="mobile-close-button"
            onClick={handleCloseMobilePanel}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default Play;
