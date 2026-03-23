import { type FC, useState, useEffect } from 'react';
import { type PromptConfig } from '../../hooks/useAdminConfig';

type SafetyThreshold = 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH_AND_ABOVE';

interface PromptSettingsProps {
  config: PromptConfig;
  onChange: (config: PromptConfig) => void;
}

/* ── Tooltip helper ── */
const Tooltip: FC<{ text: string }> = ({ text }) => (
  <div className="a-tooltip-wrap">
    <span className="a-tooltip-icon">ⓘ</span>
    <div className="a-tooltip-box">{text}</div>
  </div>
);

const SAFETY_OPTIONS: SafetyThreshold[] = [
  'BLOCK_NONE',
  'BLOCK_LOW_AND_ABOVE',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_HIGH_AND_ABOVE',
];

const SAFETY_CATEGORY_LABELS: Array<{ category: string; label: string }> = [
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', label: '성적 콘텐츠 (SEXUALLY_EXPLICIT)' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       label: '혐오 발언 (HATE_SPEECH)' },
  { category: 'HARM_CATEGORY_HARASSMENT',        label: '괴롭힘 (HARASSMENT)' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', label: '위험 콘텐츠 (DANGEROUS_CONTENT)' },
];

export const PromptSettings: FC<PromptSettingsProps> = ({ config, onChange }) => {
  const [local, setLocal] = useState<PromptConfig>(config);

  useEffect(() => {
    setLocal(config);
  }, [config]);

  const update = <K extends keyof PromptConfig>(key: K, value: PromptConfig[K]) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  };

  const updateSafety = (category: string, threshold: SafetyThreshold) => {
    const next: PromptConfig = {
      ...local,
      safety_settings: local.safety_settings.map(s =>
        s.category === category ? { ...s, threshold } : s,
      ),
    };
    // Add entry if not present
    if (!next.safety_settings.find(s => s.category === category)) {
      next.safety_settings = [...next.safety_settings, { category, threshold }];
    }
    setLocal(next);
    onChange(next);
  };

  const getSafetyThreshold = (category: string): SafetyThreshold => {
    const setting = local.safety_settings.find(s => s.category === category);
    return (setting?.threshold as SafetyThreshold | undefined) ?? 'BLOCK_NONE';
  };

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">프롬프트 설정</div>
        <div className="a-section-subtitle">AI 스토리텔러 동작을 제어하는 프롬프트 및 안전 설정</div>
      </div>

      {/* Basic Prompts */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">기본 프롬프트</span>
        </div>
        <div className="a-card-body">

          <div className="a-form-group">
            <div className="a-form-label-row">
              <label className="a-form-label">시스템 프리앰블</label>
              <Tooltip text="모든 게임 세션에 공통으로 적용되는 AI의 기본 역할 지시문입니다. 스토리 설정 전에 삽입됩니다." />
            </div>
            <textarea
              className="a-form-control"
              rows={5}
              value={local.system_preamble}
              onChange={e => update('system_preamble', e.target.value)}
            />
          </div>

          <div className="a-form-group">
            <div className="a-form-label-row">
              <label className="a-form-label">LaTeX 규칙</label>
              <Tooltip text="수식 및 특수 서식 렌더링을 위한 LaTeX 형식 사용 규칙입니다. 상태창, 수치 표현 방식을 정의합니다." />
            </div>
            <textarea
              className="a-form-control"
              rows={5}
              value={local.latex_rules}
              onChange={e => update('latex_rules', e.target.value)}
            />
          </div>

          <div className="a-form-group">
            <div className="a-form-label-row">
              <label className="a-form-label">서술 길이 템플릿</label>
              <Tooltip text="{nl} 변수가 게임 파라미터의 '기본 서술 문단 수'로 치환됩니다. 매 응답마다 강제 적용됩니다." />
            </div>
            <textarea
              className="a-form-control"
              rows={4}
              value={local.narrative_length_template}
              onChange={e => update('narrative_length_template', e.target.value)}
            />
          </div>

          <div className="a-form-group" style={{ marginBottom: 0 }}>
            <div className="a-form-label-row">
              <label className="a-form-label">게임 시작 메시지</label>
              <Tooltip text="게임 세션 최초 시작 시 AI에게 전송되는 첫 번째 사용자 메시지입니다." />
            </div>
            <input
              className="a-form-control"
              type="text"
              value={local.game_start_message}
              onChange={e => update('game_start_message', e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* Memory System */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">메모리 시스템</span>
        </div>
        <div className="a-card-body">

          <div className="a-form-group">
            <div className="a-form-label-row">
              <label className="a-form-label">메모리 시스템 인스트럭션</label>
              <Tooltip text="메모리 요약 생성 시 사용되는 별도 AI 호출의 시스템 프롬프트입니다. 요약의 형식과 분량을 제어합니다." />
            </div>
            <textarea
              className="a-form-control"
              rows={4}
              value={local.memory_system_instruction}
              onChange={e => update('memory_system_instruction', e.target.value)}
            />
          </div>

          <div className="a-form-group" style={{ marginBottom: 0 }}>
            <div className="a-form-label-row">
              <label className="a-form-label">메모리 요청 프롬프트</label>
              <Tooltip text="메모리 요약 API 호출 시 실제로 전송되는 사용자 메시지 템플릿입니다. {history}가 대화 내용으로 치환됩니다." />
            </div>
            <textarea
              className="a-form-control"
              rows={4}
              value={local.memory_request}
              onChange={e => update('memory_request', e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* Safety Settings */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">안전 설정</span>
        </div>
        <div className="a-card-body">
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--a-font-ui)', fontSize: '10px', color: 'var(--a-ink-faint)' }}>
              Gemini Safety Settings — 각 카테고리별 차단 임계값
            </span>
            <Tooltip text="BLOCK_NONE: 차단 없음 / BLOCK_LOW: 낮은 확률도 차단 / BLOCK_MEDIUM: 중간 이상 차단 / BLOCK_HIGH: 높은 확률만 차단" />
          </div>
          <div className="a-safety-grid">
            {SAFETY_CATEGORY_LABELS.map(cat => (
              <div key={cat.category}>
                <div className="a-safety-label">{cat.label}</div>
                <select
                  className="a-safety-select"
                  value={getSafetyThreshold(cat.category)}
                  onChange={e => updateSafety(cat.category, e.target.value as SafetyThreshold)}
                >
                  {SAFETY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cache Settings */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">캐시 설정</span>
        </div>
        <div className="a-card-body">
          <div className="a-form-group" style={{ marginBottom: 0 }}>
            <div className="a-form-label-row">
              <label className="a-form-label">캐시 TTL</label>
              <Tooltip text="시스템 프롬프트 캐싱 유효 시간입니다. 캐시를 활용하면 반복 호출 비용을 절감할 수 있습니다. (예: 3600s = 1시간)" />
            </div>
            <input
              className="a-form-control"
              type="text"
              value={local.cache_ttl}
              onChange={e => update('cache_ttl', e.target.value)}
              style={{ maxWidth: '160px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
