// components/editor/TestPlayHeader.tsx
import { type FC, useState } from 'react';
import type { GeminiModel } from '@/lib/sse';

interface TestPlayHeaderProps {
  title: string;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  models: GeminiModel[];
  isLoadingModels: boolean;
  hasStoredApiKey: boolean;
  rightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const TestPlayHeader: FC<TestPlayHeaderProps> = ({
  title,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
  models,
  isLoadingModels,
  hasStoredApiKey,
  rightPanelOpen,
  onToggleRightPanel,
  onReset,
  onClose,
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <header className="test-play-header">
      <div className="test-play-header-left">
        <span className="test-play-badge">테스트</span>
        <span className="test-play-title">{title || '제목 없음'}</span>
      </div>

      <div className="test-play-header-center">
        {!hasStoredApiKey && (
          <div className="test-play-field">
            <input
              type={showKey ? 'text' : 'password'}
              className="test-play-input"
              placeholder="Gemini API Key"
              value={apiKey}
              onChange={e => onApiKeyChange(e.target.value)}
            />
            <button
              className="test-play-icon-btn"
              onClick={() => setShowKey(v => !v)}
              title={showKey ? '숨기기' : '보기'}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
        )}

        <select
          className="test-play-select"
          value={model}
          onChange={e => onModelChange(e.target.value)}
          disabled={isLoadingModels || models.length === 0}
        >
          {isLoadingModels && <option value="">모델 로딩 중...</option>}
          {!isLoadingModels && models.length === 0 && <option value="">모델 선택</option>}
          {!isLoadingModels && models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="test-play-header-right">
        <button
          className="test-play-icon-btn"
          onClick={onToggleRightPanel}
          title={rightPanelOpen ? '패널 닫기' : '패널 열기'}
        >
          📋
        </button>
        <button className="test-play-icon-btn" onClick={onReset} title="새 테스트">
          🔄
        </button>
        <button className="test-play-icon-btn close" onClick={onClose} title="닫기">
          ✕
        </button>
      </div>
    </header>
  );
};
