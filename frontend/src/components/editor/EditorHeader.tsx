// components/editor/EditorHeader.tsx
// Logo, breadcrumb, save status, preview toggle, theme

import { type FC } from 'react';
import type { SaveStatus } from '../../hooks/useStoryEditor';

interface EditorHeaderProps {
  title: string;
  saveStatus: SaveStatus;
  showPromptPreview: boolean;
  onTogglePromptPreview: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

const SaveDot: FC<{ status: SaveStatus }> = ({ status }) => (
  <span
    className={[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all',
      status === 'saved' ? 'text-[var(--green)] bg-[var(--green-dim)]' : '',
      status === 'saving' ? 'text-accent bg-[var(--accent-dim)]' : '',
      status === 'unsaved' ? 'text-text-muted' : '',
    ].join(' ')}
    aria-live="polite"
  >
    <span
      className={[
        'w-1.5 h-1.5 rounded-full bg-current flex-shrink-0',
        status === 'saving' ? 'animate-pulse' : '',
      ].join(' ')}
    />
    {status === 'saved' && '자동 저장됨'}
    {status === 'saving' && '저장 중...'}
    {status === 'unsaved' && '변경사항 있음'}
  </span>
);

export const EditorHeader: FC<EditorHeaderProps> = ({
  title,
  saveStatus,
  showPromptPreview,
  onTogglePromptPreview,
  onToggleTheme,
  isDark,
}) => {
  return (
    <header
      className="h-[52px] bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center px-5 gap-3 flex-shrink-0 z-50"
      role="banner"
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 flex-shrink-0 no-underline" aria-label="홈으로">
        <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-accent to-purple flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="font-serif text-sm font-bold text-text-primary">스토리월드</span>
      </a>

      {/* Separator */}
      <div className="w-px h-5 bg-[var(--border)] flex-shrink-0" aria-hidden="true" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]" aria-label="경로">
        <a href="/" className="text-text-muted hover:text-text-secondary transition-colors">내 스토리</a>
        <span className="text-text-muted" aria-hidden="true">/</span>
        <span className="text-text-primary font-medium truncate max-w-[240px]">
          {title || '새 스토리'}
        </span>
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-2 ml-auto">
        <SaveDot status={saveStatus} />

        <button
          className={[
            'h-8 px-3.5 rounded-[7px] border text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-all',
            showPromptPreview
              ? 'bg-[var(--purple-dim)] border-[rgba(124,109,240,0.3)] text-purple'
              : 'bg-transparent border-[var(--border)] text-text-secondary hover:bg-[var(--bg-card)] hover:text-text-primary hover:border-[var(--border-mid)]',
          ].join(' ')}
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
          className="w-8 h-8 rounded-[7px] border border-[var(--border)] bg-transparent text-text-secondary flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-card)] hover:text-text-primary hover:border-[var(--border-mid)]"
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
