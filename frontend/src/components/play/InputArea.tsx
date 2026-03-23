import { type FC, useState, useRef, useCallback, useEffect } from 'react';
import type { InputMode, TokenUsage } from '@/types/play';

interface InputAreaProps {
  onSend: (text: string) => void;
  onStart: () => void;
  disabled: boolean;
  isGenerating: boolean;
  hasSession: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
  tokenUsage: TokenUsage | null;
}

const INPUT_MODES: { mode: InputMode; label: string }[] = [
  { mode: 'action', label: '⚔ 행동' },
  { mode: 'thought', label: '💭 생각' },
  { mode: 'dialogue', label: '💬 대사' },
  { mode: 'scene', label: '🎬 장면 지시' },
];

function formatTokens(n: number | undefined): string {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function tokenPercent(usage: TokenUsage | null): number {
  if (!usage?.totalTokenCount || !usage?.promptTokenCount) return 0;
  // Use promptTokenCount as context fill indicator (approximate)
  const max = 128_000; // Gemini 2.0 Flash context
  return Math.min((usage.totalTokenCount / max) * 100, 100);
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
}) => {
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
    onSend(text);
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
  const pct = tokenPercent(tokenUsage);

  return (
    <div className="input-area">
      <div className="input-area-inner">
        {/* Mode toolbar */}
        <div className="input-toolbar">
          {INPUT_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              className={`input-toolbar-btn${inputMode === mode ? ' active' : ''}`}
              onClick={() => setInputMode(mode)}
            >
              {label}
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
