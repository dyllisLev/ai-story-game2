import { type FC, useState, useEffect } from 'react';
import { GENRES } from '../../lib/constants';

export interface StoryPreset {
  id?: string;
  title: string;
  genre: string;
  icon: string;
  system_rules: string;
  world_setting: string;
  story: string;
  characters: string;
  use_latex: boolean;
  status_preset_id?: string | null;
}

interface PresetEditModalProps {
  preset: StoryPreset | null;  // null = new preset
  statusPresets: Array<{ id: string; title: string }>;
  onSave: (preset: StoryPreset) => void;
  onClose: () => void;
}

const BLANK_PRESET: StoryPreset = {
  title: '',
  genre: '',
  icon: '📖',
  system_rules: '',
  world_setting: '',
  story: '',
  characters: '',
  use_latex: false,
  status_preset_id: null,
};

const GENRE_OPTIONS = [...GENRES, '기타'] as const;

export const PresetEditModal: FC<PresetEditModalProps> = ({
  preset, statusPresets, onSave, onClose,
}) => {
  const [form, setForm] = useState<StoryPreset>(preset ?? BLANK_PRESET);

  useEffect(() => {
    setForm(preset ?? BLANK_PRESET);
  }, [preset]);

  const update = <K extends keyof StoryPreset>(key: K, value: StoryPreset[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave(form);
  };

  const isNew = !preset?.id;

  return (
    <div className="a-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="a-modal">
        <div className="a-modal-header">
          <span className="a-modal-title">
            {isNew ? '새 스토리 프리셋' : `프리셋 편집 — ${preset?.title ?? ''}`}
          </span>
          <button className="a-modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="a-modal-body">

          <div className="a-form-row">
            <div className="a-form-group">
              <label className="a-form-label">제목</label>
              <input
                className="a-form-control"
                type="text"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="프리셋 제목"
              />
            </div>
            <div className="a-form-group">
              <label className="a-form-label">장르</label>
              <select
                className="a-form-control"
                value={form.genre}
                onChange={e => update('genre', e.target.value)}
              >
                <option value="">장르 선택...</option>
                {GENRE_OPTIONS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="a-form-row">
            <div className="a-form-group">
              <label className="a-form-label">아이콘 (이모지)</label>
              <input
                className="a-form-control"
                type="text"
                value={form.icon}
                onChange={e => update('icon', e.target.value)}
                placeholder="📖"
                style={{ maxWidth: '80px' }}
              />
            </div>
            <div className="a-form-group">
              <label className="a-form-label">상태창 프리셋 연결</label>
              <select
                className="a-form-control"
                value={form.status_preset_id ?? ''}
                onChange={e => update('status_preset_id', e.target.value || null)}
              >
                <option value="">없음</option>
                {statusPresets.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="a-form-group">
            <label className="a-form-label">시스템 규칙</label>
            <textarea
              className="a-form-control"
              rows={3}
              value={form.system_rules}
              onChange={e => update('system_rules', e.target.value)}
              placeholder="AI의 서술 방식 및 규칙..."
            />
          </div>

          <div className="a-form-group">
            <label className="a-form-label">세계관</label>
            <textarea
              className="a-form-control"
              rows={3}
              value={form.world_setting}
              onChange={e => update('world_setting', e.target.value)}
              placeholder="배경 세계관 설명..."
            />
          </div>

          <div className="a-form-group">
            <label className="a-form-label">스토리</label>
            <textarea
              className="a-form-control"
              rows={3}
              value={form.story}
              onChange={e => update('story', e.target.value)}
              placeholder="기본 스토리 설정..."
            />
          </div>

          <div className="a-form-group">
            <label className="a-form-label">등장인물</label>
            <textarea
              className="a-form-control"
              rows={2}
              value={form.characters}
              onChange={e => update('characters', e.target.value)}
              placeholder="인물명 — 설명 / 인물명 — 설명..."
            />
          </div>

          <div className="a-toggle-row">
            <span className="a-toggle-label">LaTeX 활성화</span>
            <label className="a-toggle">
              <input
                type="checkbox"
                checked={form.use_latex}
                onChange={e => update('use_latex', e.target.checked)}
              />
              <span className="a-toggle-slider" />
            </label>
          </div>

        </div>

        <div className="a-modal-footer">
          <button className="a-btn" onClick={onClose} type="button">취소</button>
          <button
            className="a-btn-save"
            onClick={handleSubmit}
            disabled={!form.title.trim()}
            type="button"
          >
            {isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};
