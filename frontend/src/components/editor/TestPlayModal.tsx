// components/editor/TestPlayModal.tsx
import { type FC, useState, useEffect, useRef, useCallback } from 'react';
import type { EditorFormState } from '@/hooks/useStoryEditor';
import { useTestPlayEngine } from '@/hooks/useTestPlayEngine';
import { useUserApiKey } from '@/hooks/useUserApiKey';
import { api } from '@/lib/api';
import { TestPlayHeader } from './TestPlayHeader';
import { StoryContent } from '@/components/play/StoryContent';
import { InputArea } from '@/components/play/InputArea';
import { InfoPanel } from '@/components/play/InfoPanel';
import { CharacterModal } from '@/components/play/CharacterModal';
import type { SettingsData, StatusAttribute, InputMode } from '@/types/play';
import { useToast } from '@/components/ui/Toast';

import { useConfig } from '@/hooks/useConfig';
import type { GeminiModel } from '@/lib/sse';

// Test play has no live status tracking — status window shows attributes but no runtime values.
const EMPTY_STATUS_VALUES: Record<string, string> = {};

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
  const toast = useToast();
  const { data: appConfig } = useConfig();
  const defaultSuggestions = appConfig?.gameplayConfig.default_suggestions ?? [];
  const formRef = useRef<EditorFormState | null>(editorForm);
  formRef.current = editorForm;

  const engine = useTestPlayEngine(formRef);

  // Check if user has registered API key
  const { hasApiKey: hasStoredApiKey } = useUserApiKey();

  // API key persists across refreshes via localStorage (fallback for non-logged-in users)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini-api-key') ?? '');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [charModalOpen, setCharModalOpen] = useState(false);

  // useCache is UI-only in test play — the engine never sends a real cache token
  const [useCache, setUseCache] = useState(false);

  // Local display overrides for NotesTab fields (characterName, characterSetting, userNote).
  // These update what the user sees in the panel but do NOT reach the engine — the engine
  // reads editorFormRef which points to the parent's editorForm prop.
  const [settingsOverride, setSettingsOverride] = useState<Partial<SettingsData>>({});

  // Fetch models using stored API key when user has one
  useEffect(() => {
    if (!visible) return;

    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        if (hasStoredApiKey) {
          // Use stored API key from server
          const data = await api.get<{ models: GeminiModel[] }>('/me/models');
          setModels(data.models || []);
        } else if (apiKey) {
          // Fall back to localStorage API key
          const { fetchGeminiModels } = await import('@/lib/sse');
          const ac = new AbortController();
          const fetchedModels = await fetchGeminiModels(apiKey, ac.signal);
          setModels(fetchedModels);
        } else {
          setModels([]);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [visible, hasStoredApiKey, apiKey]);

  // Auto-select first model
  useEffect(() => {
    if (!model && models.length > 0) {
      setModel(models[0].id);
    }
  }, [models, model]);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    if (key) localStorage.setItem('gemini-api-key', key);
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<SettingsData>) => {
    setSettingsOverride(prev => ({ ...prev, ...patch }));
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

  const handleStart = useCallback(async () => {
    if (!apiKey) { toast.show('API Key를 입력해주세요.', 'warning'); return; }
    if (!model) { toast.show('모델을 선택해주세요.', 'warning'); return; }
    await engine.startGame(apiKey, model);
  }, [apiKey, model, engine, toast]);

  // InputMode is not used by the test play engine — it has no mode-specific prompt logic
  const handleSend = useCallback((text: string, _mode?: InputMode) => {
    engine.sendMessage(apiKey, model, text);
  }, [apiKey, model, engine]);

  const handleRegenerate = useCallback(() => {
    engine.regenerate(apiKey, model);
  }, [apiKey, model, engine]);

  const settingsData: SettingsData = {
    title: editorForm.title,
    worldSetting: editorForm.worldSetting,
    story: editorForm.story,
    characterName: editorForm.characterName,
    characterSetting: editorForm.characterSetting,
    characters: JSON.stringify(editorForm.characters),
    userNote: editorForm.userNote,
    systemRules: editorForm.systemRules,
    ...settingsOverride,
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
        models={models}
        isLoadingModels={isLoadingModels}
        hasStoredApiKey={hasStoredApiKey}
        rightPanelOpen={rightOpen}
        onToggleRightPanel={() => setRightOpen(v => !v)}
        onReset={onReset}
        onClose={onClose}
      />

      <div className={`test-play-body ${rightOpen ? '' : 'right-collapsed'}`}>
        <main className="test-play-center">
          <StoryContent
            storyTitle={editorForm.title}
            genre={editorForm.genre}
            messages={engine.messages}
            isGenerating={engine.isGenerating}
            streamingText={engine.streamingText}
            onRegenerate={handleRegenerate}
            suggestions={!engine.isGenerating && engine.messages.length > 0 ? defaultSuggestions : []}
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

        {rightOpen && (
          <InfoPanel
            memory={engine.memory}
            settingsData={settingsData}
            onUpdateSettings={handleUpdateSettings}
            onUpdateMemory={engine.updateMemory}
            narrativeLength={engine.narrativeLength}
            onNarrativeLengthChange={engine.setNarrativeLength}
            useLatex={engine.useLatex}
            onUseLatexChange={engine.setUseLatex}
            useCache={useCache}
            onUseCacheChange={setUseCache}
            saveStatus="idle"
            onSaveNow={() => { /* test play sessions are never saved to the DB */ }}
            hasSession={engine.gameStarted}
            onOpenCharModal={() => setCharModalOpen(true)}
            statusAttributes={editorForm.statusAttributes}
            statusValues={EMPTY_STATUS_VALUES}
          />
        )}
      </div>

      <div className="test-play-banner">
        ⚠️ 테스트 모드 — 세션이 저장되지 않습니다
      </div>

      <CharacterModal
        isOpen={charModalOpen}
        onClose={() => setCharModalOpen(false)}
        settingsData={settingsData}
        onSave={() => { /* character edits in test play are not persisted to the DB */ }}
      />
    </div>
  );
};
