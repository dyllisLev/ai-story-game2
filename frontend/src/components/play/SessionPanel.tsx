import { type FC, useState, useRef } from 'react';
import type { SessionListEntry } from '@/types/play';
import { SessionItem, getGroupLabel } from './SessionItem';
import { useToast } from '@/components/ui/Toast';

interface SessionPanelProps {
  sessions: SessionListEntry[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onLoadById: (sessionId: string) => void;
  onClose: () => void;
}

export const SessionPanel: FC<SessionPanelProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onLoadById,
  onClose,
}) => {
  const [loadIdValue, setLoadIdValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleLoadById = () => {
    const id = loadIdValue.trim();
    if (!id) return;
    onLoadById(id);
    setLoadIdValue('');
  };

  const handleCopyId = async (sessionId: string) => {
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.show('세션 ID가 복사됐습니다.', 'success');
    } catch {
      toast.show('복사에 실패했습니다.', 'error');
    }
  };

  // Group sessions by date
  const groups: { label: string; items: SessionListEntry[] }[] = [];
  const todayItems = sessions.filter((s) => getGroupLabel(s.lastPlayedAt) === 'today');
  const yesterdayItems = sessions.filter((s) => getGroupLabel(s.lastPlayedAt) === 'yesterday');
  const earlierItems = sessions.filter((s) => getGroupLabel(s.lastPlayedAt) === 'earlier');

  if (todayItems.length > 0) groups.push({ label: '오늘', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: '어제', items: yesterdayItems });
  if (earlierItems.length > 0) groups.push({ label: '이전', items: earlierItems });

  return (
    <aside className="panel-left" aria-label="세션 목록">
      <div className="panel-header">
        <span className="panel-header-title">세션 기록</span>
        <button
          className="btn-icon"
          onClick={onClose}
          title="접기"
          aria-label="사이드바 접기"
          style={{ fontSize: '10px' }}
        >
          ◀
        </button>
      </div>

      <button className="new-session-btn" onClick={onNewSession} aria-label="새 세션 시작">
        <span>＋</span> 새 세션 시작
      </button>

      <div className="session-list">
        {groups.length === 0 && (
          <div style={{ padding: '1rem', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            세션 기록이 없습니다
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="session-group-label">{group.label}</div>
            {group.items.map((session) => (
              <SessionItem
                key={session.sessionId}
                session={session}
                isActive={session.sessionId === currentSessionId}
                onClick={onSelectSession}
                onCopyId={handleCopyId}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Load by ID footer */}
      <div className="session-load-footer">
        <div className="session-load-label">세션 ID로 불러오기</div>
        <div className="session-load-row">
          <input
            ref={inputRef}
            className="session-load-input"
            type="text"
            placeholder="세션 ID 붙여넣기"
            value={loadIdValue}
            onChange={(e) => setLoadIdValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadById()}
            aria-label="세션 ID 입력"
          />
          <button className="session-load-btn" onClick={handleLoadById}>
            불러오기
          </button>
        </div>
      </div>
    </aside>
  );
};
