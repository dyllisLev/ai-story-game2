// components/editor/PromptPreview.tsx
// Real-time prompt preview (50/50 split right pane)

import { type FC } from 'react';
import type { PromptPreviewData } from '../../hooks/usePromptPreview';
import { formatNumber } from '../../lib/format';

interface PromptPreviewProps {
  data: PromptPreviewData;
}

export const PromptPreview: FC<PromptPreviewProps> = ({ data }) => {
  return (
    <aside className="prompt-live" aria-label="프롬프트 미리보기">
      <div className="prompt-live-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>프롬프트 미리보기</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 500, color: 'var(--accent)' }}>
          약 {formatNumber(data.totalTokens)} 토큰
        </span>
      </div>

      <div className="prompt-live-body">
        {data.sections.length === 0 ? (
          <p>스토리 내용을 입력하면 여기에 조합된 프롬프트가 실시간으로 표시됩니다.</p>
        ) : (
          data.sections.map((section) => (
            <div key={section.label} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '6px' }}>
                [{section.label}] <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>~{formatNumber(section.tokens)} 토큰</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {section.content}
              </div>
            </div>
          ))
        )}

        {data.sections.length > 0 && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            총 예상 토큰:{' '}
            <strong style={{ color: 'var(--accent)' }}>
              약 {formatNumber(data.totalTokens)} 토큰
            </strong>
          </p>
        )}
      </div>
    </aside>
  );
};
