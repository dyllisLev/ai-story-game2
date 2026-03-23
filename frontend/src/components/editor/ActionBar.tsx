// components/editor/ActionBar.tsx
// Game start, save, load, delete, share, timestamp

import { type FC } from 'react';

interface ActionBarProps {
  lastSaved: Date | null;
  isSaving: boolean;
  onStartGame: () => void;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onShare: () => void;
}

function formatLastSaved(date: Date | null): string {
  if (!date) return '—';
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return '방금 전';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`;
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export const ActionBar: FC<ActionBarProps> = ({
  lastSaved,
  isSaving,
  onStartGame,
  onSave,
  onLoad,
  onDelete,
  onShare,
}) => {
  return (
    <div
      className="sticky bottom-0 h-[56px] bg-[var(--bg-panel)] border-t border-[var(--border)] flex items-center px-5 gap-2 z-40 backdrop-blur-[10px]"
      role="toolbar"
      aria-label="편집기 액션"
    >
      {/* Primary: Game start */}
      <button
        className="h-[38px] px-5 rounded-lg border-none bg-accent text-[#0a0a0f] text-[13px] font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[#d4b85a] hover:shadow-[0_0_20px_var(--accent-glow)]"
        onClick={onStartGame}
        aria-label="게임 시작"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        게임 시작
      </button>

      <div className="w-px h-5 bg-[var(--border)] mx-1" aria-hidden="true" />

      {/* Save */}
      <button
        className="h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-transparent text-text-secondary text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[var(--bg-card)] hover:text-text-primary hover:border-[var(--border-mid)] disabled:opacity-50"
        onClick={onSave}
        disabled={isSaving}
        aria-label="저장"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        저장
      </button>

      {/* Load */}
      <button
        className="h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-transparent text-text-secondary text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[var(--bg-card)] hover:text-text-primary hover:border-[var(--border-mid)]"
        onClick={onLoad}
        aria-label="불러오기"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        불러오기
      </button>

      {/* Delete */}
      <button
        className="h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-transparent text-text-secondary text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[var(--rose-dim)] hover:text-[var(--rose)] hover:border-[rgba(224,90,122,0.3)]"
        onClick={onDelete}
        aria-label="삭제"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        삭제
      </button>

      {/* Share */}
      <button
        className="h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-transparent text-text-secondary text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[var(--bg-card)] hover:text-text-primary hover:border-[var(--border-mid)]"
        onClick={onShare}
        aria-label="공유"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        공유
      </button>

      {/* Timestamp — right aligned */}
      <div className="ml-auto text-[11px] text-text-muted">
        마지막 저장: <span aria-live="polite">{formatLastSaved(lastSaved)}</span>
      </div>
    </div>
  );
};
