import { type FC } from 'react';
import { useAuth } from '@/lib/auth';

export const PendingApproval: FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 style={styles.title}>승인 대기 중</h1>
        <p style={styles.message}>
          <strong>{user?.nickname || user?.email}</strong>님의 계정이 아직 관리자 승인을 기다리고 있습니다.
        </p>
        <p style={styles.sub}>
          승인이 완료되면 모든 기능을 이용하실 수 있습니다.
        </p>
        <button
          onClick={() => { void logout(); }}
          style={styles.logoutBtn}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'var(--bg-primary)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '48px 36px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    textAlign: 'center' as const,
  },
  iconWrap: {
    marginBottom: 20,
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 12px',
  },
  message: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: '0 0 8px',
    lineHeight: 1.6,
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    margin: '0 0 28px',
  },
  logoutBtn: {
    height: 40,
    padding: '0 24px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontFamily: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all var(--transition)',
  },
};
