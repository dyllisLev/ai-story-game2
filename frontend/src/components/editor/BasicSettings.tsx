// components/editor/BasicSettings.tsx
// Preset select, genre chips, icon grid, model select, title

import { type FC } from 'react';
import type { Preset } from '@story-game/shared';
import { useConfig } from '@/hooks/useConfig';

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
  const { data: config, isLoading: configLoading } = useConfig();
  const genres = config?.genreConfig.genres.map(g => g.name) ?? [];
  const icons = config?.gameplayConfig.story_icons ?? [];
  const aiModels = config?.gameplayConfig.available_models ?? [];

  return (
    <section id="section-basic" aria-labelledby="basic-heading" data-config-loading={configLoading}>
      <div className="section-header">
        <h2 id="basic-heading" className="section-title">기본 설정</h2>
        <p className="section-desc">스토리의 기본 정보와 프리셋을 선택하세요.</p>
      </div>

      {/* Preset select */}
      <div className="form-group">
        <label className="form-label" htmlFor="presetSelect">
          프리셋 선택
          <span className="label-badge optional">선택</span>
        </label>
        <select
          id="presetSelect"
          className="form-select"
          value={presetId}
          onChange={e => onPresetChange(e.target.value)}
        >
          <option value="">— 프리셋 없이 시작 —</option>
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
          ))}
        </select>
        <p className="form-hint">
          프리셋은 세계관·스토리·캐릭터 등 기본값을 자동으로 채워줍니다. 이후 자유롭게 수정 가능합니다.
        </p>
      </div>

      {/* Genre chips */}
      {!configLoading && (
        <div className="form-group">
          <p className="form-label">
            장르 태그
            <span className="label-badge optional">선택</span>
          </p>
          <div className="genre-chips" role="group" aria-label="장르 선택">
            {genres.map(g => (
              <button
                key={g}
                className={`genre-chip${genre === g ? ' selected' : ''}`}
                onClick={() => onGenreChange(genre === g ? '' : g)}
                aria-pressed={genre === g}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icon grid */}
      {!configLoading && (
        <div className="form-group">
          <p className="form-label">
            스토리 아이콘
            <span className="label-badge optional">선택</span>
          </p>
          <div className="icon-grid" role="group" aria-label="아이콘 선택">
            {icons.map(ic => (
              <button
                key={ic}
                className={`icon-btn${icon === ic ? ' selected' : ''}`}
                onClick={() => onIconChange(ic)}
                aria-pressed={icon === ic}
                aria-label={`아이콘 ${ic}`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI model */}
      {!configLoading && (
        <div className="form-group">
          <label className="form-label" htmlFor="aiModelSelect">
            AI 모델
            <span className="label-badge optional">선택</span>
          </label>
          <select
            id="aiModelSelect"
            className="form-select"
            value={aiModel}
            onChange={e => onAiModelChange(e.target.value)}
          >
            {aiModels.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <p className="form-hint">Flash는 빠른 응답, Pro는 더 정교한 서술에 적합합니다.</p>
        </div>
      )}

      {/* Title */}
      <div className="form-group">
        <label className="form-label" htmlFor="storyTitle">
          스토리 제목
          <span className="label-badge required">필수</span>
        </label>
        <input
          id="storyTitle"
          type="text"
          className="form-input"
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
