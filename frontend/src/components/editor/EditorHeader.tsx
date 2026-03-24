// components/editor/EditorHeader.tsx
// Logo, breadcrumb, save status, preview toggle, theme

import { type FC } from 'react';
import type { SaveStatus } from '../../hooks/useStoryEditor';

interface EditorHeaderProps {
  title: string;
  saveStatus: SaveStatus;
  showPromptPreview: boolean;
  showPreviewPanel: boolean;
  onTogglePromptPreview: () => void;
  onTogglePreviewPanel: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

const SaveStatusBadge: FC<{ status: SaveStatus }> = ({ status }) => (
  <div
    className={`save-status ${status}`}
    aria-live="polite"
  >
    <span className="save-dot" />
    {status === 'saved' && '자동 저장됨'}
    {status === 'saving' && '저장 중...'}
    {status === 'unsaved' && '변경사항 있음'}
  </div>
);

export const EditorHeader: FC<EditorHeaderProps> = ({
  title,
  saveStatus,
  showPromptPreview,
  showPreviewPanel,
  onTogglePromptPreview,
  onTogglePreviewPanel,
  onToggleTheme,
  isDark,
}) => {
  return (
    <header className="header" role="banner">
      {/* Logo */}
      <a href="/" className="logo" aria-label="홈으로">
        <div className="logo-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="logo-text">스토리월드</span>
      </a>

      {/* Separator */}
      <div className="header-sep" aria-hidden="true" />

      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="경로">
        <a href="/" className="breadcrumb-item">내 스토리</a>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-item active" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || '새 스토리'}
        </span>
      </nav>

      {/* Right controls */}
      <div className="header-right">
        <SaveStatusBadge status={saveStatus} />

        <button
          className={['btn-sm', showPromptPreview ? 'purple' : ''].join(' ').trim()}
          onClick={onTogglePromptPreview}
          title="프롬프트 미리보기"
          aria-pressed={showPromptPreview}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          미리보기
        </button>

        <button
          className={['btn-icon', showPreviewPanel ? 'active' : ''].join(' ').trim()}
          onClick={onTogglePreviewPanel}
          aria-label="상태창 & 캐릭터 패널"
          aria-pressed={showPreviewPanel}
          title="상태창 & 캐릭터"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>

        <button
          className="btn-icon"
          onClick={onToggleTheme}
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {isDark ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};
