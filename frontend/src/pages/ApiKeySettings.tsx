import { type FC, type FormEvent, useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface ApiKeyStatus {
  hasApiKey: boolean;
  maskedKey?: string;
}

const ApiKeySettings: FC = () => {
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<ApiKeyStatus>('/me/apikey')
      .then(setStatus)
      .catch(() => setStatus({ hasApiKey: false }));
  }, [user]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put<ApiKeyStatus>('/me/apikey', { apiKey: inputKey.trim() });
      setStatus(res);
      // Play 페이지에서 사용할 수 있도록 sessionStorage에도 저장
      sessionStorage.setItem('gemini-api-key', inputKey.trim());
      setInputKey('');
      setMessage({ type: 'success', text: 'API 키가 저장되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('API 키를 삭제하시겠습니까?')) return;
    setDeleting(true);
    setMessage(null);
    try {
      await api.delete('/me/apikey');
      setStatus({ hasApiKey: false });
      setMessage({ type: 'success', text: 'API 키가 삭제되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '삭제에 실패했습니다.' });
    } finally {
      setDeleting(false);
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

        <h1 style={styles.title}>API 키 설정</h1>
        <p style={styles.subtitle}>Google Gemini API 키를 등록하여 AI 스토리를 플레이하세요</p>

        {message && (
          <div style={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        )}

        {status?.hasApiKey && (
          <div style={styles.currentKey}>
            <div style={styles.currentKeyLabel}>등록된 API 키</div>
            <div style={styles.currentKeyRow}>
              <code style={styles.maskedKey}>{status.maskedKey ?? '••••••••••••••••••••'}</code>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={styles.deleteBtn}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="apikey" style={styles.label}>
              {status?.hasApiKey ? '새 API 키로 변경' : 'API 키 입력'}
            </label>
            <input
              id="apikey"
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
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

          <button type="submit" disabled={saving || !inputKey.trim()} style={styles.submitBtn}>
            {saving ? '저장 중...' : status?.hasApiKey ? '변경' : '저장'}
          </button>
        </form>

        <div style={styles.nav}>
          <Link to="/settings" style={styles.link}>← 계정 설정으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;

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
  currentKey: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
    marginBottom: 24,
  },
  currentKeyLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  currentKeyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  maskedKey: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    color: 'var(--rose)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background var(--transition)',
    flexShrink: 0,
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
  nav: {
    textAlign: 'center',
    marginTop: 24,
  },
  link: {
    fontSize: 13,
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
