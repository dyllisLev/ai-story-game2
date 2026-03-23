import { type FC } from 'react';
import { Link } from 'react-router';
import { useSessions } from '@/hooks/useSessions';
import type { SessionListItem } from '@story-game/shared';

// ─── Icons ───────────────────────────────────────────────────────────────────

const PlayIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2.5" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// ─── SessionCard ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: SessionListItem;
}

const SessionCard: FC<SessionCardProps> = ({ session }) => {
  const progress = Math.min(100, Math.max(0, session.progress_pct ?? 0));
  const lastTag = session.story_tags?.[0];

  return (
    <Link
      to={`/play/${session.story_id ?? session.id}`}
      aria-label={`${session.title} 이어서 플레이`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        textDecoration: 'none',
        color: 'inherit',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border-hover)';
        el.style.background = 'var(--bg-card-hover)';
        el.style.transform = 'translateY(-1px)';
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border)';
        el.style.background = 'var(--bg-card)';
        el.style.transform = 'none';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          flexShrink: 0,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      >
        {session.story_icon ?? '📖'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {session.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          {session.turn_count ?? 0}턴
          {session.chapter_label ? ` · ${session.chapter_label}` : ''}
          {lastTag ? ` · ${lastTag}` : ''}
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`진행도 ${progress}%`}
            style={{
              flex: 1,
              height: 3,
              background: 'var(--border)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--purple))',
                borderRadius: 2,
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Resume button */}
      <div style={{ flexShrink: 0 }}>
        <span
          aria-hidden="true"
          style={{
            height: 34,
            padding: '0 16px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            borderRadius: 8,
            color: 'var(--accent)',
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all var(--transition)',
            whiteSpace: 'nowrap',
          }}
        >
          ▶ 계속하기
        </span>
      </div>
    </Link>
  );
};

// ─── ContinueSection ─────────────────────────────────────────────────────────

export const ContinueSection: FC = () => {
  const { data: sessions, isLoading } = useSessions(5);

  if (isLoading || !sessions || sessions.length === 0) return null;

  return (
    <section
      aria-labelledby="continueTitle"
      style={{ marginBottom: 56 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h2
          id="continueTitle"
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <PlayIcon />
          이어서 플레이
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
            {sessions.length}개
          </span>
        </h2>
        <Link
          to="/sessions"
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'color var(--transition)',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          전체 보기 →
        </Link>
      </div>

      <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map((session) => (
          <div key={session.id} role="listitem">
            <SessionCard session={session} />
          </div>
        ))}
      </div>
    </section>
  );
};
