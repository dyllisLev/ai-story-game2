// components/editor/PreviewPanel.tsx
// Status window preview, character summary, total tokens

import { type FC } from 'react';
import type { EditorFormState, StatusAttribute } from '../../hooks/useStoryEditor';
import type { PromptPreviewData } from '../../hooks/usePromptPreview';

interface PreviewPanelProps {
  form: EditorFormState;
  promptData: PromptPreviewData;
  onClose: () => void;
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  const koreanChars = (text.match(/[\u3130-\u318F\uAC00-\uD7AF]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars * 0.7 + otherChars / 4);
}

const StatusPreviewItem: FC<{ attr: StatusAttribute }> = ({ attr }) => {
  const showBar = attr.type === 'bar' || attr.type === 'percent';
  return (
    <div className="bg-[var(--bg-input)] rounded-md p-2 px-2.5">
      <p className="text-[10px] text-text-muted mb-1">{attr.name}</p>
      {showBar ? (
        <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-purple rounded-full"
            style={{ width: '60%' }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-text-primary">—</p>
      )}
    </div>
  );
};

export const PreviewPanel: FC<PreviewPanelProps> = ({ form, promptData, onClose }) => {
  const charSummary = form.characters
    .filter(c => c.name)
    .map(c => {
      const parts = [c.name];
      if (c.role) parts.push(c.role);
      if (c.personality) parts.push(c.personality);
      return parts.join(' — ');
    })
    .join('\n');

  const statusTokens = form.useStatusWindow && form.statusAttributes.length > 0
    ? estimateTokens(promptData.sections.find(s => s.label === '상태창 규칙')?.content ?? '')
    : 0;

  const charTokens = estimateTokens(charSummary);

  return (
    <aside
      className="w-[340px] flex-shrink-0 bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col overflow-hidden"
      aria-label="미리보기 패널"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          상태창 &amp; 캐릭터
        </div>
        <button
          className="w-6 h-6 border-none bg-transparent text-text-muted flex items-center justify-center cursor-pointer transition-colors hover:text-text-primary"
          onClick={onClose}
          aria-label="패널 닫기"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Status window preview */}
        {form.useStatusWindow && form.statusAttributes.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[9px] overflow-hidden mb-3">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between">
              <span>상태창 프롬프트</span>
              <span className="text-accent text-[10px] font-medium normal-case tracking-normal">
                약 {statusTokens.toLocaleString()} 토큰
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-3">
              {form.statusAttributes.map(attr => (
                <StatusPreviewItem key={attr.id} attr={attr} />
              ))}
            </div>
          </div>
        )}

        {/* Characters preview */}
        {charSummary && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[9px] overflow-hidden mb-3">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between">
              <span>캐릭터 정보</span>
              <span className="text-accent text-[10px] font-medium normal-case tracking-normal">
                약 {charTokens.toLocaleString()} 토큰
              </span>
            </div>
            <div className="p-3 text-[12px] text-text-secondary leading-[1.7] font-serif whitespace-pre-wrap">
              {charSummary}
            </div>
          </div>
        )}

        {/* Total tokens */}
        <p className="text-[11px] text-text-muted pb-1">
          총 예상 토큰: <strong className="text-accent">{promptData.totalTokens.toLocaleString()} 토큰</strong>
        </p>
      </div>
    </aside>
  );
};
