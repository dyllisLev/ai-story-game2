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
    <div className="status-preview-item">
      <p className="status-preview-name">{attr.name}</p>
      {showBar ? (
        <div className="status-preview-bar">
          <div
            className="status-preview-bar-fill"
            style={{ width: '60%' }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <p className="status-preview-val">—</p>
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
    <aside className="preview-panel" aria-label="미리보기 패널">
      {/* Header */}
      <div className="preview-header">
        <div className="preview-title-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          상태창 &amp; 캐릭터
        </div>
        <button
          style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={onClose}
          aria-label="패널 닫기"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="preview-scroll">
        {/* Status window preview */}
        {form.useStatusWindow && form.statusAttributes.length > 0 && (
          <div className="preview-block">
            <div className="preview-block-label">
              상태창 프롬프트
              <span className="token-count">약 {statusTokens.toLocaleString()} 토큰</span>
            </div>
            <div className="status-preview-grid">
              {form.statusAttributes.map(attr => (
                <StatusPreviewItem key={attr.id} attr={attr} />
              ))}
            </div>
          </div>
        )}

        {/* Characters preview */}
        {charSummary && (
          <div className="preview-block">
            <div className="preview-block-label">
              캐릭터 정보
              <span className="token-count">약 {charTokens.toLocaleString()} 토큰</span>
            </div>
            <div className="preview-block-body">
              {charSummary}
            </div>
          </div>
        )}

        {/* Total tokens */}
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', paddingBottom: '4px' }}>
          총 예상 토큰: <strong style={{ color: 'var(--accent)' }}>{promptData.totalTokens.toLocaleString()} 토큰</strong>
        </p>
      </div>
    </aside>
  );
};
