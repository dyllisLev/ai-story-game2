import { type FC, type FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { AuthUser } from '@story-game/shared';

const Settings: FC = () => {
  const { user, isLoading } = useAuth();
  const [nickname, setNickname] = useState(() => user?.nickname ?? '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put<AuthUser>('/me', { nickname: nickname.trim() || null });
      setMessage({ type: 'success', text: '저장되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link to="/" style={styles.logoLink}>
          <div style={styles.logoBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={styles.logoText}>스토리월드</span>
        </Link>

        <h1 style={styles.title}>계정 설정</h1>
        <p style={styles.subtitle}>프로필 정보를 관리하세요</p>

        {message && (
          <div style={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>이메일</label>
            <input
              id="email"
              type="email"
              value={user.email}
              readOnly
              style={{ ...styles.input, ...styles.inputReadonly }}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="nickname" style={styles.label}>닉네임</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={30}
              style={styles.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button type="submit" disabled={saving} style={styles.submitBtn}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>

        <div style={styles.divider} />

        <Link to="/settings/apikey" style={styles.apiKeyLink}>
          API 키 설정
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>

        <div style={styles.footer}>
          <Link to="/" style={styles.backLink}>← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default Settings;

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    padding: '40px 36px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 32,
    height: 32,
    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'center',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-muted)',
    textAlign: 'center',
    margin: '0 0 28px',
  },
  success: {
    background: 'rgba(52, 211, 153, 0.1)',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--accent)',
    marginBottom: 20,
  },
  error: {
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--rose)',
    marginBottom: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    height: 42,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0 14px',
    fontFamily: 'inherit',
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  },
  inputReadonly: {
    color: 'var(--text-muted)',
    cursor: 'default',
  },
  submitBtn: {
    height: 44,
    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
    color: '#0a0a0f',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity var(--transition)',
    marginTop: 4,
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '24px 0',
  },
  apiKeyLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontWeight: 600,
    transition: 'border-color var(--transition)',
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
  },
  backLink: {
    fontSize: 13,
    color: 'var(--text-muted)',
    textDecoration: 'none',
  },
};
