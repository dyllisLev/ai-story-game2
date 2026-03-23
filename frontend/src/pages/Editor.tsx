// pages/Editor.tsx
// 3-panel layout: sidebar + form + preview (prompt live / preview panel)

import { type FC, type RefObject, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';

import { useStoryEditor } from '../hooks/useStoryEditor';
import { usePresets } from '../hooks/usePresets';
import { usePromptPreview } from '../hooks/usePromptPreview';

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
      alert('먼저 스토리를 저장해주세요.');
      return;
    }
    const url = `${window.location.origin}/play/${storyId}`;
    navigator.clipboard.writeText(url).then(() => alert('링크가 복사되었습니다.'));
  }, [storyId]);

  // Start game
  const handleStartGame = useCallback(async () => {
    await save();
    if (storyId) {
      navigate(`/play/${storyId}`);
    }
  }, [save, storyId, navigate]);

  // Toggle preview panel vs prompt preview
  const handleTogglePromptPreview = useCallback(() => {
    setShowPromptPreview(prev => !prev);
    setShowPreviewPanel(false);
  }, []);

  const handleOpenPreviewPanel = useCallback(() => {
    setShowPreviewPanel(true);
    setShowPromptPreview(false);
  }, []);

  const handleClosePreviewPanel = useCallback(() => {
    setShowPreviewPanel(false);
    setShowPromptPreview(true);
  }, []);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-[var(--bg)] text-text-primary font-sans"
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* Header */}
      <EditorHeader
        title={form.title}
        saveStatus={saveStatus}
        showPromptPreview={showPromptPreview}
        onTogglePromptPreview={handleTogglePromptPreview}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />

      {/* Editor layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <EditorSidebar
          activeSection={activeSection}
          completeness={completeness}
          onNavigate={handleNavigate}
        />

        {/* Main content area: form + prompt preview */}
        <main className="flex flex-1 min-w-0 overflow-hidden">
          {/* Form scroll area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            style={{ paddingBottom: '0' }}
          >
            {/* Section: Basic settings */}
            <div className="px-6 pt-7">
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
            </div>

            <SectionDivider />

            {/* Section: System rules */}
            <div className="px-6">
              <SystemRules
                value={form.systemRules}
                onChange={v => setField('systemRules', v)}
              />
            </div>

            <SectionDivider />

            {/* Section: World setting */}
            <div className="px-6">
              <WorldSetting
                value={form.worldSetting}
                onChange={v => setField('worldSetting', v)}
              />
            </div>

            <SectionDivider />

            {/* Section: Story */}
            <div className="px-6">
              <StorySection
                value={form.story}
                onChange={v => setField('story', v)}
              />
            </div>

            <SectionDivider />

            {/* Section: Characters */}
            <div className="px-6">
              <CharacterSection
                characters={form.characters}
                onAdd={addCharacter}
                onUpdate={updateCharacter}
                onRemove={removeCharacter}
              />
            </div>

            <SectionDivider />

            {/* Section: Status settings */}
            <div className="px-6">
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
            </div>

            <SectionDivider />

            {/* Section: Output settings */}
            <div className="px-6">
              <OutputSettings
                narrativeLength={form.narrativeLength}
                useLatex={form.useLatex}
                useCache={form.useCache}
                onNarrativeLengthChange={v => setField('narrativeLength', v)}
                onLatexChange={v => setField('useLatex', v)}
                onCacheChange={v => setField('useCache', v)}
              />
            </div>

            <SectionDivider />

            {/* Section: Publish settings */}
            <div className="px-6">
              <PublishSettings
                isPublic={form.isPublic}
                password={form.password}
                onPublicChange={v => setField('isPublic', v)}
                onPasswordChange={v => setField('password', v)}
              />
            </div>

            {/* Bottom spacer for action bar */}
            <div style={{ height: '72px' }} />
          </div>

          {/* Prompt preview (right 50% pane) */}
          {showPromptPreview && !showPreviewPanel && (
            <PromptPreview data={promptData} />
          )}

          {/* Preview panel (status window + character summary) */}
          {showPreviewPanel && (
            <PreviewPanel
              form={form}
              promptData={promptData}
              onClose={handleClosePreviewPanel}
            />
          )}
        </main>
      </div>

      {/* Action bar */}
      <ActionBar
        lastSaved={lastSaved}
        isSaving={saveStatus === 'saving'}
        onStartGame={handleStartGame}
        onSave={save}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onShare={handleShare}
      />
    </div>
  );
};

// ─── Section divider ─────────────────────────────────────────────────────────

const SectionDivider: FC = () => (
  <div className="h-px bg-[var(--border)] my-8 mx-6" aria-hidden="true" />
);

export default EditorPage;
