import { type FC } from 'react';
import type { SaveStatus } from '@/types/play';

interface OutputTabProps {
  narrativeLength: number;
  onNarrativeLengthChange: (n: number) => void;
  narrativeLengthMin: number;
  narrativeLengthMax: number;
  useLatex: boolean;
  onUseLatexChange: (v: boolean) => void;
  useCache: boolean;
  onUseCacheChange: (v: boolean) => void;
  saveStatus: SaveStatus;
  onSaveNow: () => void;
  hasSession: boolean;
}

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  idle:    '저장됨',
  unsaved: '저장안됨',
  saving:  '저장 중...',
  saved:   '저장됨',
  error:   '저장 실패',
  offline: '오프라인',
};

export const OutputTab: FC<OutputTabProps> = ({
  narrativeLength,
  onNarrativeLengthChange,
  narrativeLengthMin,
  narrativeLengthMax,
  useLatex,
  onUseLatexChange,
  useCache,
  onUseCacheChange,
  saveStatus,
  onSaveNow,
  hasSession,
}) => {
  return (
    <div className="tab-panel active" id="tab-output" role="tabpanel">
      <div className="panel-content">

        {/* Narrative length */}
        <div>
          <div className="output-control-row">
            <span className="output-label">서사 길이</span>
            <div className="stepper">
              <button
                className="stepper-btn"
                onClick={() => onNarrativeLengthChange(Math.max(narrativeLengthMin, narrativeLength - 1))}
                aria-label="서사 길이 줄이기"
              >
                −
              </button>
              <span className="stepper-val">{narrativeLength}</span>
              <button
                className="stepper-btn"
                onClick={() => onNarrativeLengthChange(Math.min(narrativeLengthMax, narrativeLength + 1))}
                aria-label="서사 길이 늘리기"
              >
                ＋
              </button>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {narrativeLength}문단 분량으로 AI가 응답합니다
          </div>
        </div>

        {/* LaTeX toggle */}
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-info-title">수식 렌더링 (LaTeX)</div>
            <div className="toggle-info-desc">KaTeX를 사용해 수식을 표시합니다</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={useLatex}
              onChange={(e) => onUseLatexChange(e.target.checked)}
            />
            <span className="toggle-track" />
          </label>
        </div>

        {/* Cache toggle */}
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-info-title">프롬프트 캐시</div>
            <div className="toggle-info-desc">시스템 프롬프트를 캐시해 비용을 절감합니다</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => onUseCacheChange(e.target.checked)}
            />
            <span className="toggle-track" />
          </label>
        </div>

        {/* Save status */}
        {hasSession && (
          <div>
            <div className="autosave-status">
              <span>💾</span>
              <span>{SAVE_STATUS_LABELS[saveStatus]}</span>
            </div>
            <button
              className="session-load-btn"
              style={{ marginTop: 'var(--space-2)', width: '100%' }}
              onClick={onSaveNow}
              disabled={saveStatus === 'saving'}
            >
              지금 저장
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
