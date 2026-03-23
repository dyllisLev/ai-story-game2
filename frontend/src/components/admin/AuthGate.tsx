import { type FC, useState, type FormEvent } from 'react';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export const AuthGate: FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      // Basic Auth: encode credentials and try GET /api/config
      const credentials = btoa(`${username}:${password}`);
      const res = await fetch('/api/config', {
        headers: { Authorization: `Basic ${credentials}` },
      });

      if (res.ok) {
        // Store credentials for subsequent requests
        localStorage.setItem('admin_credentials', credentials);
        onAuthenticated();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Demo mode — skip auth
    onAuthenticated();
  };

  return (
    <div className="a-auth-gate">
      <div className="a-auth-card">
        <div className="a-auth-logo">Ink &amp; Atmosphere</div>
        <div className="a-auth-subtitle">관리자 인증</div>

        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="a-form-group">
            <div className="a-form-label">아이디</div>
            <input
              className="a-form-control"
              type="text"
              placeholder="관리자 아이디"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="a-form-group">
            <div className="a-form-label">비밀번호</div>
            <input
              className="a-form-control"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="a-btn-save"
            style={{ width: '100%', padding: '10px' }}
            disabled={loading}
          >
            {loading ? '인증 중...' : '로그인'}
          </button>
        </form>

        {error && (
          <div className="a-auth-error">
            아이디 또는 비밀번호가 올바르지 않습니다.
          </div>
        )}

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--a-border-faint)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#6dbf87',
              flexShrink: 0,
            }}
          />
          <span className="a-font-ui" style={{ fontSize: '9px', color: 'var(--a-ink-muted)' }}>
            데모 모드 — 로그인됨으로 표시됩니다
          </span>
          <button
            onClick={handleSkip}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--a-font-ui)',
              fontSize: '9px',
              color: 'var(--a-ink-accent)',
              cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            건너뛰기 →
          </button>
        </div>
      </div>
    </div>
  );
};
