import { type FC, useState, useEffect } from 'react';
import { type GameplayConfig } from '../../hooks/useAdminConfig';

interface GameParamsProps {
  config: GameplayConfig;
  onChange: (config: GameplayConfig) => void;
}

/* ── Tooltip ── */
const Tooltip: FC<{ text: string }> = ({ text }) => (
  <div className="a-tooltip-wrap">
    <span className="a-tooltip-icon">ⓘ</span>
    <div className="a-tooltip-box">{text}</div>
  </div>
);

/* ── Number Stepper ── */
interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

const NumStepper: FC<StepperProps> = ({ value, min = 0, max = 9999, onChange }) => (
  <div className="a-num-stepper">
    <button
      type="button"
      className="a-step-btn"
      onClick={() => onChange(Math.max(min, value - 1))}
    >
      −
    </button>
    <input
      className="a-step-input"
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
    />
    <button
      type="button"
      className="a-step-btn"
      onClick={() => onChange(Math.min(max, value + 1))}
    >
      +
    </button>
  </div>
);

export const GameParams: FC<GameParamsProps> = ({ config, onChange }) => {
  const [local, setLocal] = useState<GameplayConfig>(config);

  useEffect(() => {
    setLocal(config);
  }, [config]);

  const update = <K extends keyof GameplayConfig>(key: K, value: GameplayConfig[K]) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">게임 파라미터</div>
        <div className="a-section-subtitle">게임플레이 동작을 제어하는 수치 설정</div>
      </div>

      {/* Narration Settings */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">서술 설정</span>
        </div>
        <div className="a-card-body">

          <div className="a-form-group">
            <div className="a-form-label-row">
              <label className="a-form-label">기본 서술 문단 수</label>
              <Tooltip text="AI가 매 응답에서 생성하는 기본 서술 문단 수입니다. 서술 길이 템플릿의 {nl}에 삽입됩니다." />
            </div>
            <NumStepper
              value={local.default_narrative_length}
              min={1}
              max={10}
              onChange={v => update('default_narrative_length', v)}
            />
          </div>

          <div className="a-form-row">
            <div className="a-form-group" style={{ marginBottom: 0 }}>
              <div className="a-form-label-row">
                <label className="a-form-label">서술 문단 수 최솟값</label>
                <Tooltip text="사용자가 슬라이더로 조절 가능한 서술 문단 수의 하한선입니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.narrative_length_min}
                min={1}
                onChange={e => update('narrative_length_min', Number(e.target.value))}
              />
            </div>
            <div className="a-form-group" style={{ marginBottom: 0 }}>
              <div className="a-form-label-row">
                <label className="a-form-label">서술 문단 수 최댓값</label>
                <Tooltip text="사용자가 슬라이더로 조절 가능한 서술 문단 수의 상한선입니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.narrative_length_max}
                max={20}
                onChange={e => update('narrative_length_max', Number(e.target.value))}
              />
            </div>
          </div>

        </div>
      </div>

      {/* History & Memory */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">히스토리 및 메모리</span>
        </div>
        <div className="a-card-body">
          <div className="a-form-row">

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">슬라이딩 윈도우 크기</label>
                <Tooltip text="Gemini API에 전송되는 최근 대화 메시지의 최대 수입니다. 클수록 문맥 유지가 좋지만 토큰 비용이 증가합니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.sliding_window_size}
                onChange={e => update('sliding_window_size', Number(e.target.value))}
              />
            </div>

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">최대 히스토리 수</label>
                <Tooltip text="로컬/DB에 보관되는 전체 대화 기록의 최대 수입니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.max_history}
                onChange={e => update('max_history', Number(e.target.value))}
              />
            </div>

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">단기 기억 최대 항목 수</label>
                <Tooltip text="단기 메모리에 보관되는 최대 항목 수입니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.memory_short_term_max}
                onChange={e => update('memory_short_term_max', Number(e.target.value))}
              />
            </div>

          </div>
        </div>
      </div>

      {/* Session & Message Limits */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">세션 및 메시지 제한</span>
        </div>
        <div className="a-card-body">
          <div className="a-form-row">

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">메시지 한도</label>
                <Tooltip text="세션당 최대 메시지 수입니다. 초과 시 게임이 종료됩니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.message_limit}
                onChange={e => update('message_limit', Number(e.target.value))}
              />
            </div>

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">메시지 경고 임계값</label>
                <Tooltip text="이 수치에 도달하면 사용자에게 메시지 한도 경고를 표시합니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.message_warning_threshold}
                onChange={e => update('message_warning_threshold', Number(e.target.value))}
              />
            </div>

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">자동저장 주기 (ms)</label>
                <Tooltip text="게임 상태를 자동으로 저장하는 주기(밀리초)입니다. 300000 = 5분." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.auto_save_interval_ms}
                onChange={e => update('auto_save_interval_ms', Number(e.target.value))}
              />
            </div>

            <div className="a-form-group">
              <div className="a-form-label-row">
                <label className="a-form-label">최대 세션 목록 수</label>
                <Tooltip text="사용자가 목록에서 볼 수 있는 최대 세션 수입니다." />
              </div>
              <input
                className="a-form-control"
                type="number"
                value={local.max_session_list}
                onChange={e => update('max_session_list', Number(e.target.value))}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
