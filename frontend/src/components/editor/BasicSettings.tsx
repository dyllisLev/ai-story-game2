// components/editor/BasicSettings.tsx
// Preset select, genre chips, icon grid, model select, title

import { type FC } from 'react';
import type { Preset } from '@story-game/shared';
import { GENRES } from '../../lib/constants';
const ICONS = ['🏛️', '⚔️', '🧙', '🏙️', '💀', '🚀', '👻', '💕', '🐉', '🌙', '🔥', '🗡️'];
const AI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

interface BasicSettingsProps {
  title: string;
  presetId: string;
  genre: string;
  icon: string;
  aiModel: string;
  presets: Preset[];
  onTitleChange: (v: string) => void;
  onPresetChange: (v: string) => void;
  onGenreChange: (v: string) => void;
  onIconChange: (v: string) => void;
  onAiModelChange: (v: string) => void;
}

export const BasicSettings: FC<BasicSettingsProps> = ({
  title,
  presetId,
  genre,
  icon,
  aiModel,
  presets,
  onTitleChange,
  onPresetChange,
  onGenreChange,
  onIconChange,
  onAiModelChange,
}) => {
  return (
    <section id="section-basic" aria-labelledby="basic-heading">
      <div className="mb-7">
        <h2 id="basic-heading" className="font-serif text-[22px] font-bold text-text-primary tracking-tight mb-1">
          기본 설정
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">스토리의 기본 정보와 프리셋을 선택하세요.</p>
      </div>

      {/* Preset select */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5" htmlFor="presetSelect">
          프리셋 선택
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--border)] text-text-muted">선택</span>
        </label>
        <select
          id="presetSelect"
          className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] appearance-none cursor-pointer"
          value={presetId}
          onChange={e => onPresetChange(e.target.value)}
        >
          <option value="">— 프리셋 없이 시작 —</option>
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
          ))}
        </select>
        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
          프리셋은 세계관·스토리·캐릭터 등 기본값을 자동으로 채워줍니다. 이후 자유롭게 수정 가능합니다.
        </p>
      </div>

      {/* Genre chips */}
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5">
          장르 태그
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--border)] text-text-muted">선택</span>
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="장르 선택">
          {GENRES.map(g => (
            <button
              key={g}
              className={[
                'px-3 py-1 rounded-full border text-[12px] font-medium cursor-pointer transition-all',
                genre === g
                  ? 'bg-accent border-accent text-[#0a0a0f] font-bold'
                  : 'bg-transparent border-[var(--border-mid)] text-text-secondary hover:border-accent hover:text-accent hover:bg-[var(--accent-dim)]',
              ].join(' ')}
              onClick={() => onGenreChange(genre === g ? '' : g)}
              aria-pressed={genre === g}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Icon grid */}
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5">
          스토리 아이콘
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--border)] text-text-muted">선택</span>
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="아이콘 선택">
          {ICONS.map(ic => (
            <button
              key={ic}
              className={[
                'w-[38px] h-[38px] rounded-lg border text-lg cursor-pointer flex items-center justify-center transition-all',
                icon === ic
                  ? 'border-accent bg-[var(--accent-dim)] shadow-[0_0_0_2px_var(--accent-glow)]'
                  : 'border-[var(--border-mid)] bg-[var(--bg-input)] hover:border-accent hover:bg-[var(--accent-dim)]',
              ].join(' ')}
              onClick={() => onIconChange(ic)}
              aria-pressed={icon === ic}
              aria-label={`아이콘 ${ic}`}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* AI model */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5" htmlFor="aiModelSelect">
          AI 모델
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--border)] text-text-muted">선택</span>
        </label>
        <select
          id="aiModelSelect"
          className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] appearance-none cursor-pointer"
          value={aiModel}
          onChange={e => onAiModelChange(e.target.value)}
        >
          {AI_MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
          Flash는 빠른 응답, Pro는 더 정교한 서술에 적합합니다.
        </p>
      </div>

      {/* Title */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5" htmlFor="storyTitle">
          스토리 제목
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--rose-dim)] text-[var(--rose)]">필수</span>
        </label>
        <input
          id="storyTitle"
          type="text"
          className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="스토리 제목을 입력하세요"
          required
          aria-required="true"
        />
      </div>
    </section>
  );
};
