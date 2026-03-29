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
import { useToast } from '@/components/ui/Toast';

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
  const toast = useToast();
  const formRef = useRef<EditorFormState | null>(editorForm);
  formRef.current = editorForm;

  const engine = useTestPlayEngine(formRef);

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

  const handleStart = async () => {
    if (!apiKey) { toast.show('API Key를 입력해주세요.', 'warning'); return; }
    if (!model) { toast.show('모델을 선택해주세요.', 'warning'); return; }
    await engine.startGame(apiKey, model);
  };

  const handleSend = (text: string) => {
    engine.sendMessage(apiKey, model, text);
  };

  const handleRegenerate = () => {
    engine.regenerate(apiKey, model);
  };

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

      <div className="test-play-banner">
        ⚠️ 테스트 모드 — 세션이 저장되지 않습니다
      </div>

      <CharacterModal
        isOpen={charModalOpen}
        onClose={() => setCharModalOpen(false)}
        settingsData={settingsData}
        onSave={() => {}}
      />
    </div>
  );
};
