import { type FC } from 'react';
import type { SessionListEntry } from '@/types/play';

interface SessionItemProps {
  session: SessionListEntry;
  isActive: boolean;
  onClick: (sessionId: string) => void;
  onCopyId: (sessionId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 2) return '지금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return '어제';
  return `${diffDay}일 전`;
}

function getGroupLabel(timestamp: number): 'today' | 'yesterday' | 'earlier' {
  const now = new Date();
  const date = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  if (timestamp >= todayStart) return 'today';
  if (timestamp >= yesterdayStart) return 'yesterday';
  return 'earlier';
}

export { getGroupLabel };

export const SessionItem: FC<SessionItemProps> = ({
  session,
  isActive,
  onClick,
  onCopyId,
}) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyId(session.sessionId);
  };

  return (
    <div
      className={`session-item${isActive ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`세션: ${session.title}`}
      onClick={() => onClick(session.sessionId)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(session.sessionId)}
    >
      <div className="session-icon">📖</div>
      <div className="session-info">
        <div className="session-title">{session.title}</div>
        <div className="session-meta">
          <span className="session-preview">
            {session.sessionId.slice(0, 8)}...
          </span>
        </div>
      </div>
      <button
        className="session-copy-btn"
        title="세션 ID 복사"
        aria-label="세션 ID 복사"
        onClick={handleCopy}
      >
        🔗
      </button>
      <span className="session-time">
        {formatRelativeTime(session.lastPlayedAt)}
      </span>
    </div>
  );
};
