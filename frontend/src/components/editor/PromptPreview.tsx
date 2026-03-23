// components/editor/PromptPreview.tsx
// Real-time prompt preview with token count (center-right pane, 50/50 split)

import { type FC } from 'react';
import type { PromptPreviewData } from '../../hooks/usePromptPreview';

interface PromptPreviewProps {
  data: PromptPreviewData;
}

export const PromptPreview: FC<PromptPreviewProps> = ({ data }) => {
  return (
    <div
      className="flex-1 min-w-0 overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-surface)] px-5 py-6"
      style={{ paddingBottom: 'calc(56px + 16px)' }}
      aria-label="전체 프롬프트 미리보기"
    >
      {/* Title row */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted mb-4">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        전체 프롬프트 미리보기
        <span className="ml-auto text-accent text-[10px] font-medium normal-case tracking-normal">
          약 {data.totalTokens.toLocaleString()} 토큰
        </span>
      </div>

      {/* Prompt body */}
      <div className="text-[13px] text-text-secondary leading-[1.8] font-serif bg-[var(--bg-card)] border border-[var(--border)] rounded-[9px] p-5 whitespace-pre-wrap break-words">
        {data.fullPrompt || (
          <span className="text-text-muted font-sans text-[12px]">
            스토리 내용을 입력하면 여기에 조합된 프롬프트가 실시간으로 표시됩니다.
          </span>
        )}
      </div>
    </div>
  );
};
