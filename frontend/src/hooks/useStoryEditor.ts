// hooks/useStoryEditor.ts
// Story CRUD, auto-save (60s interval + 1.2s debounce), completeness calculation

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Story, StoryCreateInput, StoryUpdateInput } from '@story-game/shared';
import { api } from '@/lib/api';
import { useConfig } from './useConfig';
import { generateId } from '@/lib/format';

export interface Character {
  id: string;
  name: string;
  role: string;
  personality: string;
  ability: string;
  relation: '우호적' | '중립' | '적대';
  description: string;
}

export interface StatusAttribute {
  id: string;
  name: string;
  type: 'bar' | 'percent' | 'number' | 'text' | 'list';
  max: string;
}

export interface EditorFormState {
  title: string;
  presetId: string;
  genre: string;
  icon: string;
  aiModel: string;
  systemRules: string;
  worldSetting: string;
  story: string;
  characterName: string;
  characterSetting: string;
  characters: Character[];
  useStatusWindow: boolean;
  statusAttributes: StatusAttribute[];
  narrativeLength: number;
  useLatex: boolean;
  useCache: boolean;
  isPublic: boolean;
  password: string;
  userNote: string;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

function getDefaultForm(config: any): EditorFormState {
  const editorDefaults = config?.gameplayConfig?.editor_defaults;
  return {
    title: '',
    presetId: '',
    genre: '',
    icon: editorDefaults?.icon ?? '',
    aiModel: editorDefaults?.aiModel ?? '',
    systemRules: '',
    worldSetting: '',
    story: '',
    characterName: '',
    characterSetting: '',
    characters: [],
    useStatusWindow: true,
    statusAttributes: [],
    narrativeLength: editorDefaults?.narrativeLength ?? 3,
    useLatex: editorDefaults?.useLatex ?? false,
    useCache: editorDefaults?.useCache ?? true,
    isPublic: editorDefaults?.isPublic ?? false,
    password: '',
    userNote: '',
  };
}

function calcCompleteness(form: EditorFormState): number {
  const checks = [
    form.title.trim().length > 0,
    form.systemRules.trim().length > 0,
    form.worldSetting.trim().length > 0,
    form.story.trim().length > 0,
    form.characters.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function formToUpdateInput(form: EditorFormState): StoryUpdateInput & { preset?: unknown } {
  return {
    title: form.title,
    system_rules: form.systemRules,
    world_setting: form.worldSetting,
    story: form.story,
    character_name: form.characterName,
    character_setting: form.characterSetting,
    characters: JSON.stringify(form.characters),
    user_note: form.userNote,
    use_latex: form.useLatex,
    is_public: form.isPublic,
    icon: form.icon,
    tags: form.genre ? [form.genre] : [],
    // 상태창 + 출력 설정을 preset JSONB에 저장
    preset: {
      useStatusWindow: form.useStatusWindow,
      statusAttributes: form.statusAttributes,
      narrativeLength: form.narrativeLength,
      useCache: form.useCache,
    },
  };
}

function storyToForm(story: Story, config: any): EditorFormState {
  let parsedChars: Character[] = [];
  try {
    const raw = JSON.parse(story.characters || '[]');
    if (Array.isArray(raw)) {
      parsedChars = raw.map((c: unknown) => {
        const char = c as Record<string, unknown>;
        return {
          id: typeof char.id === 'string' ? char.id : generateId(),
          name: typeof char.name === 'string' ? char.name : '',
          role: typeof char.role === 'string' ? char.role : '',
          personality: typeof char.personality === 'string' ? char.personality : '',
          ability: typeof char.ability === 'string' ? char.ability : '',
          relation: (char.relation === '우호적' || char.relation === '적대') ? char.relation : '중립',
          description: typeof char.description === 'string' ? char.description : '',
        };
      });
    }
  } catch {
    parsedChars = [];
  }

  // preset JSONB에서 상태창 + 출력 설정 복원
  const preset = (story as unknown as { preset?: Record<string, unknown> }).preset || {};
  let statusAttrs: StatusAttribute[] = [];
  if (Array.isArray(preset.statusAttributes)) {
    statusAttrs = (preset.statusAttributes as StatusAttribute[]).map(a => ({
      ...a,
      id: a.id || generateId(),
    }));
  }

  const defaults = getDefaultForm(config);
  return {
    ...defaults,
    title: story.title,
    systemRules: story.system_rules || '',
    worldSetting: story.world_setting || '',
    story: story.story || '',
    characterName: story.character_name || '',
    characterSetting: story.character_setting || '',
    characters: parsedChars,
    userNote: story.user_note || '',
    useLatex: story.use_latex,
    isPublic: story.is_public,
    icon: story.icon || '📖',
    genre: story.tags?.[0] || '',
    useStatusWindow: preset.useStatusWindow !== false,
    statusAttributes: statusAttrs,
    narrativeLength: typeof preset.narrativeLength === 'number' ? preset.narrativeLength : 3,
    useCache: preset.useCache !== false,
  };
}

interface UseStoryEditorOptions {
  storyId?: string;
}

interface UseStoryEditorReturn {
  form: EditorFormState;
  storyId: string | null;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  completeness: number;
  isLoading: boolean;
  error: string | null;
  setField: <K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => void;
  addCharacter: () => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  addStatusAttribute: () => void;
  updateStatusAttribute: (id: string, updates: Partial<StatusAttribute>) => void;
  removeStatusAttribute: (id: string) => void;
  reorderStatusAttributes: (fromIndex: number, toIndex: number) => void;
  save: () => Promise<void>;
  load: (id: string) => Promise<void>;
  deleteStory: () => Promise<void>;
  applyPreset: (preset: Partial<EditorFormState>) => void;
}

export function useStoryEditor({ storyId: initialId }: UseStoryEditorOptions = {}): UseStoryEditorReturn {
  const { data: config } = useConfig();

  const [form, setForm] = useState<EditorFormState>(() => getDefaultForm(config));
  const [storyId, setStoryId] = useState<string | null>(initialId ?? null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const completeness = calcCompleteness(form);

  // ── Save ─────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const payload = formToUpdateInput(formRef.current);
      if (storyId) {
        await api.put(`/stories/${storyId}`, payload);
      } else {
        const created = await api.post<{ id: string }>('/stories', payload as StoryCreateInput);
        setStoryId(created.id);
      }
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (e) {
      setSaveStatus('unsaved');
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }, [storyId]);

  // ── Load ─────────────────────────────────────────────────────
  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const story = await api.get<Story>(`/stories/${id}`);
      setForm(storyToForm(story, config));
      setStoryId(id);
      setSaveStatus('saved');
      setLastSaved(new Date(story.updated_at));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Delete ───────────────────────────────────────────────────
  const deleteStory = useCallback(async () => {
    if (!storyId) return;
    await api.delete(`/stories/${storyId}`);
    setStoryId(null);
    setForm(getDefaultForm(config));
    setSaveStatus('saved');
  }, [storyId, config]);

  // ── Load on mount ────────────────────────────────────────────
  useEffect(() => {
    if (initialId) {
      load(initialId);
    }
  }, [initialId, load]);

  // ── Auto-save: 60s interval ──────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (saveStatus === 'unsaved') {
        save();
      }
    }, 300_000); // gameplay_config.auto_save_interval_ms와 동일
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [save, saveStatus]);

  // ── setField with 1.2s debounce ──────────────────────────────
  const setField = useCallback(<K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaveStatus('unsaved');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      save();
    }, 1_200);
  }, [save]);

  // ── Character helpers ─────────────────────────────────────────
  const addCharacter = useCallback(() => {
    const char: Character = {
      id: generateId(),
      name: '',
      role: '',
      personality: '',
      ability: '',
      relation: '중립',
      description: '',
    };
    setField('characters', [...formRef.current.characters, char]);
  }, [setField]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    setField(
      'characters',
      formRef.current.characters.map(c => c.id === id ? { ...c, ...updates } : c),
    );
  }, [setField]);

  const removeCharacter = useCallback((id: string) => {
    setField('characters', formRef.current.characters.filter(c => c.id !== id));
  }, [setField]);

  // ── Status attribute helpers ──────────────────────────────────
  const addStatusAttribute = useCallback(() => {
    const attr: StatusAttribute = {
      id: generateId(),
      name: '',
      type: 'text',
      max: '',
    };
    setField('statusAttributes', [...formRef.current.statusAttributes, attr]);
  }, [setField]);

  const updateStatusAttribute = useCallback((id: string, updates: Partial<StatusAttribute>) => {
    setField(
      'statusAttributes',
      formRef.current.statusAttributes.map(a => a.id === id ? { ...a, ...updates } : a),
    );
  }, [setField]);

  const removeStatusAttribute = useCallback((id: string) => {
    setField('statusAttributes', formRef.current.statusAttributes.filter(a => a.id !== id));
  }, [setField]);

  const reorderStatusAttributes = useCallback((fromIndex: number, toIndex: number) => {
    const attrs = [...formRef.current.statusAttributes];
    const [moved] = attrs.splice(fromIndex, 1);
    attrs.splice(toIndex, 0, moved);
    setField('statusAttributes', attrs);
  }, [setField]);

  // ── Apply preset ──────────────────────────────────────────────
  const applyPreset = useCallback((preset: Partial<EditorFormState>) => {
    setForm(prev => ({ ...prev, ...preset }));
    setSaveStatus('unsaved');
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    form,
    storyId,
    saveStatus,
    lastSaved,
    completeness,
    isLoading,
    error,
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
  };
}
