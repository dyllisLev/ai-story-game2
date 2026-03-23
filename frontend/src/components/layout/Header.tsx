import { type FC, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

// ─── Icons ───────────────────────────────────────────────────────────────────

const LogoIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const SearchIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const MoonIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const PlusIcon: FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const UserIcon: FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ─── Props ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  /** Controlled search value */
  searchValue?: string;
  /** Called on every search input change */
  onSearchChange?: (value: string) => void;
  /** Ref forwarded to the search input */
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Header: FC<HeaderProps> = ({ searchValue = '', onSearchChange, searchInputRef }) => {
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        avatarRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName ?? '')
      ) {
        e.preventDefault();
        searchInputRef?.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchInputRef]);

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    await logout();
    void navigate('/');
  }, [logout, navigate]);

  const avatarInitial = user?.nickname?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(244,243,250,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border)',
        transition: 'background var(--transition)',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          aria-label="스토리월드 홈"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogoIcon />
          </div>
          <span
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
            className="hidden sm:inline"
          >
            스토리월드
          </span>
        </Link>

        {/* Search */}
        <div role="search" style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            <SearchIcon />
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="스토리 제목, 태그, 작가 검색..."
            aria-label="스토리 검색"
            style={{
              width: '100%',
              height: 38,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0 38px 0 40px',
              fontFamily: 'inherit',
              fontSize: 14,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color var(--transition), box-shadow var(--transition)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1px 6px',
              pointerEvents: 'none',
            }}
          >
            /
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </button>

          {/* Auth: logged out */}
          {!user && (
            <>
              <Link
                to="/login"
                style={{
                  height: 36,
                  padding: '0 14px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                로그인
              </Link>
              <Link
                to="/signup"
                style={{
                  height: 36,
                  padding: '0 16px',
                  background: 'var(--accent)',
                  color: '#0a0a0f',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all var(--transition)',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                <UserIcon />
                <span>회원가입</span>
              </Link>
            </>
          )}

          {/* Auth: logged in */}
          {user && (
            <>
              <Link
                to="/editor"
                style={{
                  height: 36,
                  padding: '0 16px',
                  background: 'var(--accent)',
                  color: '#0a0a0f',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all var(--transition)',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                <PlusIcon />
                <span>만들기</span>
              </Link>

              {/* Avatar + dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  ref={avatarRef}
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-label="프로필 메뉴"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  title={user.nickname ?? user.email}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Noto Serif KR', serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer',
                    border: dropdownOpen ? '2px solid var(--accent)' : '2px solid var(--border)',
                    transition: 'border-color var(--transition)',
                  }}
                >
                  {avatarInitial}
                </button>

                {/* Dropdown */}
                <div
                  ref={dropdownRef}
                  role="menu"
                  aria-label="사용자 메뉴"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: 200,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                    zIndex: 200,
                    overflow: 'hidden',
                    opacity: dropdownOpen ? 1 : 0,
                    transform: dropdownOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                    pointerEvents: dropdownOpen ? 'auto' : 'none',
                    transition: 'opacity 180ms ease, transform 180ms ease',
                  }}
                >
                  {/* User info */}
                  <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {user.nickname ?? user.email}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>

                  {/* Menu items */}
                  <div style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <Link
                      to="/settings/apikey"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      style={dropdownItemStyle}
                    >
                      <span style={{ fontSize: 15 }}>🔑</span> API 키 설정
                    </Link>
                    <Link
                      to="/settings"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      style={dropdownItemStyle}
                    >
                      <span style={{ fontSize: 15 }}>⚙️</span> 계정 설정
                    </Link>
                    <Link
                      to="/?filter=mine"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      style={dropdownItemStyle}
                    >
                      <span style={{ fontSize: 15 }}>📚</span> 내 스토리 관리
                    </Link>
                  </div>
                  <div style={{ padding: '6px 0' }}>
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      style={{
                        ...dropdownItemStyle,
                        color: 'var(--rose)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 15 }}>🚪</span> 로그아웃
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

// ─── Shared Styles ───────────────────────────────────────────────────────────

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 16px',
  fontSize: 13,
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'background var(--transition), color var(--transition)',
  fontFamily: "'Noto Sans KR', sans-serif",
};
