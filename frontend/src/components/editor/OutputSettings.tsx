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
    className="flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[9px] cursor-pointer transition-all hover:border-[var(--border-mid)] hover:bg-[var(--bg-surface)] gap-4 mb-2"
    onClick={() => onChange(!checked)}
    role="button"
    tabIndex={0}
    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
  >
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-text-primary">{label}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
    </div>
    <label className="relative w-10 h-[22px] flex-shrink-0" onClick={e => e.stopPropagation()}>
      <input
        id={id}
        type="checkbox"
        className="opacity-0 w-0 h-0 absolute"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
      />
      <span
        className={`absolute inset-0 rounded-full transition-colors duration-200 cursor-pointer ${checked ? 'bg-accent' : 'bg-[var(--border-mid)]'}`}
      >
        <span
          className={`absolute w-4 h-4 rounded-full bg-white top-[3px] transition-transform duration-200 shadow-sm ${checked ? 'translate-x-[21px]' : 'translate-x-[3px]'}`}
        />
      </span>
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
      <div className="mb-7">
        <h2 id="output-heading" className="font-serif text-[22px] font-bold text-text-primary tracking-tight mb-1">
          출력 설정
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">AI 응답의 분량과 형식을 조정하세요.</p>
      </div>

      {/* Narrative length stepper */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[9px] mb-2"
        role="group"
        aria-label="서술 분량 조절"
      >
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-text-primary">서술 분량</p>
          <p className="text-[11px] text-text-muted mt-0.5">AI가 한 번에 서술하는 문단 수</p>
        </div>
        <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-[7px] overflow-hidden flex-shrink-0">
          <button
            className="w-[30px] h-[30px] border-none bg-transparent text-text-secondary cursor-pointer flex items-center justify-center transition-all hover:bg-[var(--bg-card)] hover:text-text-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={decrement}
            disabled={narrativeLength <= MIN_LENGTH}
            aria-label="문단 수 줄이기"
          >
            −
          </button>
          <div
            className="min-w-[60px] text-center text-[13px] font-semibold text-text-primary border-x border-[var(--border)] h-[30px] flex items-center justify-center font-sans"
            aria-live="polite"
            aria-label={`현재 서술 분량: ${narrativeLength}문단`}
          >
            {narrativeLength}문단
          </div>
          <button
            className="w-[30px] h-[30px] border-none bg-transparent text-text-secondary cursor-pointer flex items-center justify-center transition-all hover:bg-[var(--bg-card)] hover:text-text-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
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
