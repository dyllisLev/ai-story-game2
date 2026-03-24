// components/editor/OutputSettings.tsx
// Narrative length stepper, LaTeX toggle, cache toggle

import { type FC } from 'react';

interface OutputSettingsProps {
  narrativeLength: number;
  useLatex: boolean;
  useCache: boolean;
  onNarrativeLengthChange: (v: number) => void;
  onLatexChange: (v: boolean) => void;
  onCacheChange: (v: boolean) => void;
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow: FC<ToggleRowProps> = ({ id, label, description, checked, onChange }) => (
  <div
    className="toggle-row"
    style={{ marginBottom: '8px' }}
    onClick={() => onChange(!checked)}
    role="button"
    tabIndex={0}
    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
  >
    <div className="toggle-row-info">
      <p className="toggle-label">{label}</p>
      <p className="toggle-desc">{description}</p>
    </div>
    <label className="toggle-switch" onClick={e => e.stopPropagation()}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="toggle-slider" />
    </label>
  </div>
);

const MIN_LENGTH = 1;
const MAX_LENGTH = 8;

export const OutputSettings: FC<OutputSettingsProps> = ({
  narrativeLength,
  useLatex,
  useCache,
  onNarrativeLengthChange,
  onLatexChange,
  onCacheChange,
}) => {
  const decrement = () => {
    if (narrativeLength > MIN_LENGTH) onNarrativeLengthChange(narrativeLength - 1);
  };
  const increment = () => {
    if (narrativeLength < MAX_LENGTH) onNarrativeLengthChange(narrativeLength + 1);
  };

  return (
    <section id="section-output" aria-labelledby="output-heading">
      <div className="section-header">
        <h2 id="output-heading" className="section-title">출력 설정</h2>
        <p className="section-desc">AI 응답의 분량과 형식을 조정하세요.</p>
      </div>

      {/* Narrative length stepper */}
      <div className="stepper-row" role="group" aria-label="서술 분량 조절">
        <div className="stepper-info">
          <p className="stepper-label">서술 분량</p>
          <p className="stepper-desc">AI가 한 번에 서술하는 문단 수</p>
        </div>
        <div className="stepper-ctrl">
          <button
            className="stepper-btn"
            onClick={decrement}
            disabled={narrativeLength <= MIN_LENGTH}
            aria-label="문단 수 줄이기"
          >
            −
          </button>
          <div
            className="stepper-val"
            aria-live="polite"
            aria-label={`현재 서술 분량: ${narrativeLength}문단`}
          >
            {narrativeLength}문단
          </div>
          <button
            className="stepper-btn"
            onClick={increment}
            disabled={narrativeLength >= MAX_LENGTH}
            aria-label="문단 수 늘리기"
          >
            +
          </button>
        </div>
      </div>

      {/* LaTeX toggle */}
      <ToggleRow
        id="latexToggle"
        label="LaTeX 연출"
        description="수식이나 특수 기호를 LaTeX로 렌더링합니다"
        checked={useLatex}
        onChange={onLatexChange}
      />

      {/* Cache toggle */}
      <ToggleRow
        id="cacheToggle"
        label="프롬프트 캐시"
        description="시스템 프롬프트를 캐시하여 응답 속도를 높이고 비용을 줄입니다"
        checked={useCache}
        onChange={onCacheChange}
      />
    </section>
  );
};
