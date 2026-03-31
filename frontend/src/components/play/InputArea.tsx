import { type FC, useState, useRef, useCallback, useEffect } from 'react';
import type { InputMode, TokenUsage } from '@/types/play';
import { useConfig } from '@/hooks/useConfig';
import { formatTokens } from '@/lib/format';

interface InputAreaProps {
  onSend: (text: string, mode: InputMode) => void;
  onStart: () => void;
  disabled: boolean;
  isGenerating: boolean;
  hasSession: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
  tokenUsage: TokenUsage | null;
  selectedModel?: string;
}

function tokenPercent(usage: TokenUsage | null, maxTokens: number): number {
  if (!usage?.totalTokenCount || !maxTokens) return 0;
  return Math.min((usage.totalTokenCount / maxTokens) * 100, 100);
}

export const InputArea: FC<InputAreaProps> = ({
  onSend,
  onStart,
  disabled,
  isGenerating,
  hasSession,
  canRegenerate,
  onRegenerate,
  tokenUsage,
  selectedModel,
}) => {
  const { data: config } = useConfig();
  const inputModes = config?.gameplayConfig.input_modes ?? [];
  const models = config?.gameplayConfig.available_models ?? [];

  // Find the selected model's context window
  const maxTokens = models.find(m => m.id === selectedModel)?.context_window ?? 0;

  const [inputMode, setInputMode] = useState<InputMode>('action');
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [value]);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || disabled || isGenerating) return;
    setValue('');
    onSend(text, inputMode);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, isGenerating, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalTokens = tokenUsage?.totalTokenCount ?? 0;
  const pct = tokenPercent(tokenUsage, maxTokens);

  return (
    <div className="input-area">
      <div className="input-area-inner">
        {/* Mode toolbar */}
        <div className="input-toolbar">
          {inputModes.map(({ id, label, emoji }) => (
            <button
              key={id}
              className={`input-toolbar-btn${inputMode === id ? ' active' : ''}`}
              onClick={() => setInputMode(id as InputMode)}
            >
              {emoji} {label}
            </button>
          ))}
          {canRegenerate && (
            <button
              className="input-toolbar-btn"
              onClick={onRegenerate}
              disabled={isGenerating}
              style={{ marginLeft: 'auto' }}
            >
              ↺ 재생성
            </button>
          )}
          {!hasSession && (
            <button
              className="input-toolbar-btn active"
              onClick={onStart}
              disabled={isGenerating}
              style={{ marginLeft: 'auto' }}
            >
              ▶ 게임 시작
            </button>
          )}
        </div>

        {/* Input box */}
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder="무엇을 하시겠습니까? 행동, 대화, 생각을 자유롭게 입력하세요..."
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasSession || isGenerating}
            aria-label="입력창"
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!hasSession || isGenerating || !value.trim()}
            aria-label="전송"
          >
            ▶
          </button>
        </div>

        {/* Hint bar */}
        <div className="input-hint">
          <span>Enter로 전송 · Shift+Enter 줄바꿈</span>
          <div className="token-counter">
            <span>컨텍스트</span>
            <div className="token-bar">
              <div className="token-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span>
              {formatTokens(totalTokens)} 토큰
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
