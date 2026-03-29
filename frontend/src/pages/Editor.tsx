// pages/Editor.tsx
// 3-panel layout: sidebar + form + preview (prompt live / preview panel)

import { type FC, type RefObject, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';

import { useStoryEditor } from '../hooks/useStoryEditor';
import { usePresets } from '../hooks/usePresets';
import { usePromptPreview } from '../hooks/usePromptPreview';

import '@/styles/editor.css';
import { useToast } from '@/components/ui/Toast';

import { EditorHeader } from '../components/editor/EditorHeader';
import { EditorSidebar, type SectionId } from '../components/editor/EditorSidebar';
import { BasicSettings } from '../components/editor/BasicSettings';
import { SystemRules } from '../components/editor/SystemRules';
import { WorldSetting } from '../components/editor/WorldSetting';
import { StorySection } from '../components/editor/StorySection';
import { CharacterSection } from '../components/editor/CharacterSection';
import { StatusSettings } from '../components/editor/StatusSettings';
import { OutputSettings } from '../components/editor/OutputSettings';
import { PublishSettings } from '../components/editor/PublishSettings';
import { PromptPreview } from '../components/editor/PromptPreview';
import { PreviewPanel } from '../components/editor/PreviewPanel';
import { ActionBar } from '../components/editor/ActionBar';
import { TestPlayModal } from '../components/editor/TestPlayModal';

// ─── Theme ───────────────────────────────────────────────────────────────────

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return true;
  return document.documentElement.dataset.theme !== 'light';
}

function applyTheme(isDark: boolean) {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
}

// ─── IntersectionObserver hook ───────────────────────────────────────────────

const SECTION_IDS: SectionId[] = ['basic', 'rules', 'world', 'story', 'chars', 'status', 'output', 'visibility'];

function useActiveSection(scrollContainerRef: RefObject<HTMLElement | null>): SectionId {
  const [active, setActive] = useState<SectionId>('basic');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('section-', '') as SectionId;
            setActive(id);
          }
        }
      },
      {
        root: container,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      },
    );

    observerRef.current = observer;

    for (const id of SECTION_IDS) {
      const el = document.getElementById(`section-${id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [scrollContainerRef]);

  return active;
}

// ─── Editor page ─────────────────────────────────────────────────────────────

const EditorPage: FC = () => {
  const params = useParams<{ storyId?: string }>();
  const navigate = useNavigate();

  const toast = useToast();
  const { presets, statusPresets } = usePresets();

  const {
    form,
    storyId,
    saveStatus,
    lastSaved,
    completeness,
    setField,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addStatusAttribute,
    updateStatusAttribute,
    removeStatusAttribute,
    reorderStatusAttributes,
    save,
    load,
    deleteStory,
    applyPreset,
  } = useStoryEditor({ storyId: params.storyId });

  const promptData = usePromptPreview(form);

  // UI state
  const [showPromptPreview, setShowPromptPreview] = useState(true);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [isDark, setIsDark] = useState(getInitialTheme);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeSection = useActiveSection(scrollRef as RefObject<HTMLElement | null>);

  // Theme
  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  }, []);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to section
  const handleNavigate = useCallback((id: SectionId) => {
    const el = document.getElementById(`section-${id}`);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Preset application
  const handlePresetChange = useCallback(async (presetId: string) => {
    setField('presetId', presetId);
    if (!presetId) return;
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    applyPreset({
      systemRules: preset.system_rules || form.systemRules,
      worldSetting: preset.world_setting || form.worldSetting,
      story: preset.story || form.story,
      characterName: preset.character_name || form.characterName,
      characterSetting: preset.character_setting || form.characterSetting,
      genre: preset.genre || form.genre,
      icon: preset.icon || form.icon,
    });
  }, [presets, form, setField, applyPreset]);

  // Load story
  const handleLoad = useCallback(() => {
    const id = window.prompt('불러올 스토리 ID를 입력하세요:');
    if (id) load(id);
  }, [load]);

  // Delete story
  const handleDelete = useCallback(async () => {
    if (!storyId) return;
    if (!window.confirm('스토리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    await deleteStory();
    navigate('/');
  }, [storyId, deleteStory, navigate]);

  // Share story
  const handleShare = useCallback(() => {
    if (!storyId) {
      toast.show('먼저 스토리를 저장해주세요.', 'warning');
      return;
    }
    const url = `${window.location.origin}/play/${storyId}`;
    navigator.clipboard.writeText(url).then(() => toast.show('링크가 복사되었습니다.', 'success'));
  }, [storyId]);

  // Start game
  const handleStartGame = useCallback(async () => {
    await save();
    if (storyId) {
      navigate(`/play/${storyId}`);
    }
  }, [save, storyId, navigate]);

  // Test play
  const [testPlayOpen, setTestPlayOpen] = useState(false);
  const [testPlayKey, setTestPlayKey] = useState(0);
  const openTestPlay = useCallback(() => setTestPlayOpen(true), []);
  const closeTestPlay = useCallback(() => setTestPlayOpen(false), []);
  const resetTestPlay = useCallback(() => setTestPlayKey(k => k + 1), []);

  // Toggle prompt preview (50/50 split) independently
  const handleTogglePromptPreview = useCallback(() => {
    setShowPromptPreview(prev => !prev);
  }, []);

  // Toggle preview panel (340px right panel) independently
  const handleTogglePreviewPanel = useCallback(() => {
    setShowPreviewPanel(prev => !prev);
  }, []);

  const handleClosePreviewPanel = useCallback(() => {
    setShowPreviewPanel(false);
  }, []);

  return (
    <div
      className="editor-root"
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* Header */}
      <EditorHeader
        title={form.title}
        saveStatus={saveStatus}
        showPromptPreview={showPromptPreview}
        showPreviewPanel={showPreviewPanel}
        onTogglePromptPreview={handleTogglePromptPreview}
        onTogglePreviewPanel={handleTogglePreviewPanel}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />

      {/* Editor layout */}
      <div className="editor-layout">
        {/* Sidebar */}
        <EditorSidebar
          activeSection={activeSection}
          completeness={completeness}
          onNavigate={handleNavigate}
        />

        {/* Main content area: form + prompt preview */}
        <div className="form-main">
          {/* Form scroll area */}
          <div ref={scrollRef} className="form-scroll">
            <div className="form-inner">
              {/* Section: Basic settings */}
              <BasicSettings
                title={form.title}
                presetId={form.presetId}
                genre={form.genre}
                icon={form.icon}
                aiModel={form.aiModel}
                presets={presets}
                onTitleChange={v => setField('title', v)}
                onPresetChange={handlePresetChange}
                onGenreChange={v => setField('genre', v)}
                onIconChange={v => setField('icon', v)}
                onAiModelChange={v => setField('aiModel', v)}
              />

              <SectionDivider />

              {/* Section: System rules */}
              <SystemRules
                value={form.systemRules}
                onChange={v => setField('systemRules', v)}
              />

              <SectionDivider />

              {/* Section: World setting */}
              <WorldSetting
                value={form.worldSetting}
                onChange={v => setField('worldSetting', v)}
              />

              <SectionDivider />

              {/* Section: Story */}
              <StorySection
                value={form.story}
                onChange={v => setField('story', v)}
              />

              <SectionDivider />

              {/* Section: Characters */}
              <CharacterSection
                characters={form.characters}
                onAdd={addCharacter}
                onUpdate={updateCharacter}
                onRemove={removeCharacter}
              />

              <SectionDivider />

              {/* Section: Status settings */}
              <StatusSettings
                enabled={form.useStatusWindow}
                attributes={form.statusAttributes}
                statusPresets={statusPresets}
                onToggle={v => setField('useStatusWindow', v)}
                onAddAttribute={addStatusAttribute}
                onUpdateAttribute={updateStatusAttribute}
                onRemoveAttribute={removeStatusAttribute}
                onReorder={reorderStatusAttributes}
                onApplyPreset={attrs => setField('statusAttributes', attrs)}
              />

              <SectionDivider />

              {/* Section: Output settings */}
              <OutputSettings
                narrativeLength={form.narrativeLength}
                useLatex={form.useLatex}
                useCache={form.useCache}
                onNarrativeLengthChange={v => setField('narrativeLength', v)}
                onLatexChange={v => setField('useLatex', v)}
                onCacheChange={v => setField('useCache', v)}
              />

              <SectionDivider />

              {/* Section: Publish settings */}
              <PublishSettings
                isPublic={form.isPublic}
                password={form.password}
                onPublicChange={v => setField('isPublic', v)}
                onPasswordChange={v => setField('password', v)}
              />
            </div>
          </div>

          {/* Prompt preview (right 50% of form-main) */}
          {showPromptPreview && (
            <PromptPreview data={promptData} />
          )}
        </div>

        {/* Preview panel (340px separate right panel — status window + character summary) */}
        {showPreviewPanel && (
          <PreviewPanel
            form={form}
            promptData={promptData}
            onClose={handleClosePreviewPanel}
          />
        )}
      </div>

      {/* Action bar */}
      <ActionBar
        lastSaved={lastSaved}
        isSaving={saveStatus === 'saving'}
        onStartGame={handleStartGame}
        onTestPlay={openTestPlay}
        onSave={save}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onShare={handleShare}
      />

      {/* Test Play Modal */}
      <TestPlayModal
        key={testPlayKey}
        editorForm={form}
        visible={testPlayOpen}
        onClose={closeTestPlay}
        onReset={resetTestPlay}
      />
    </div>
  );
};

// ─── Section divider ─────────────────────────────────────────────────────────

const SectionDivider: FC = () => (
  <div className="section-divider" aria-hidden="true" />
);

export default EditorPage;
