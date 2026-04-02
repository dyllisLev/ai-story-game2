import { type FC, useState, useCallback, useRef, useEffect } from 'react';
import { Navigate } from 'react-router';
import '../styles/admin.css';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { STORAGE_KEYS, DEV_HEADER_VALUES } from '@/lib/constants';
import type { VerifyAdminResponse } from '@story-game/shared';
import { AdminNav, type AdminSection } from '../components/admin/AdminNav';
import { Dashboard } from '../components/admin/Dashboard';
import { ServiceLogs } from '../components/admin/ServiceLogs';
import { ApiLogs } from '../components/admin/ApiLogs';
import { PromptSettings } from '../components/admin/PromptSettings';
import { GameParams } from '../components/admin/GameParams';
import { GenreSettings } from '../components/admin/GenreSettings';
import { StoryPresets } from '../components/admin/StoryPresets';
import { StoryManagement } from '../components/admin/StoryManagement';
import { StatusPresets } from '../components/admin/StatusPresets';
import { SystemSection } from '../components/admin/SystemSection';
import { UserManagement } from '../components/admin/UserManagement';
import { useAdminConfig, type AdminConfig, type PromptConfig, type GameplayConfig, type GenreConfig } from '../hooks/useAdminConfig';

/* ── DEV-only Skip Button Component ── */
const DevSkipButton: FC<{ onClick: () => void }> = ({ onClick }) => {
  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      className="a-btn a-btn-dev"
      onClick={onClick}
    >
      건너뛰기 (Dev)
    </button>
  );
};

/* ── Theme toggle ── */
type AdminTheme = 'dark' | 'light';

/* ── Inner content — rendered after auth ── */
const AdminContent: FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [theme, setTheme] = useState<AdminTheme>('dark');

  const {
    config, isLoading: configLoading, save, saveStatus, lastSaved,
  } = useAdminConfig();

  // Local draft state — accumulates changes before explicit save
  const draftRef = useRef<AdminConfig | undefined>(config);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  /* Sections that show the bottom action bar (config save) */
  const showActionBar = activeSection === 'prompt' || activeSection === 'game-params' || activeSection === 'genre';

  // Sync draftRef when config loads
  useEffect(() => {
    if (config) draftRef.current = config;
  }, [config]);

  const handlePromptChange = useCallback((pc: PromptConfig) => {
    if (draftRef.current) draftRef.current = { ...draftRef.current, prompt_config: pc };
  }, []);

  const handleGameChange = useCallback((gc: GameplayConfig) => {
    if (draftRef.current) draftRef.current = { ...draftRef.current, gameplay_config: gc };
  }, []);

  const handleGenreChange = useCallback((gc: GenreConfig) => {
    if (draftRef.current) draftRef.current = { ...draftRef.current, genre_config: gc };
  }, []);

  const handleSave = useCallback(() => {
    if (draftRef.current) save(draftRef.current);
  }, [save]);

  const saveLabel = (() => {
    switch (saveStatus) {
      case 'saving': return '저장 중...';
      case 'saved':  return '저장됨 ✓';
      case 'error':  return '저장 실패';
      default:       return '변경사항 저장';
    }
  })();

  const formatSavedAt = () => {
    if (!lastSaved) return '';
    return lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="admin-root"
      data-theme={theme}
      style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Topbar */}
      <div className="a-topbar">
        <a href="/" className="a-topbar-logo">Ink &amp; Atmosphere</a>
        <div className="a-topbar-sep" />
        <span className="a-topbar-title">관리자 패널</span>
        <span className="a-topbar-badge">Admin</span>
        <div className="a-topbar-actions">
          <button className="a-btn" onClick={toggleTheme} type="button">
            {theme === 'dark' ? '☀ 라이트' : '☽ 다크'}
          </button>
          <a href="/" className="a-btn">← 사이트로</a>
        </div>
      </div>

      {/* Shell */}
      <div className="a-shell">
        {/* Left nav */}
        <AdminNav active={activeSection} onChange={setActiveSection} />

        {/* Main content */}
        <main className="a-main">
          {activeSection === 'dashboard'     && <Dashboard />}
          {activeSection === 'users'         && <UserManagement />}
          {activeSection === 'service-logs'  && <ServiceLogs />}
          {activeSection === 'api-logs'      && <ApiLogs />}
          {activeSection === 'prompt'        && config && (
            <PromptSettings
              config={config.prompt_config}
              onChange={handlePromptChange}
            />
          )}
          {activeSection === 'game-params'   && config && (
            <GameParams
              config={config.gameplay_config}
              onChange={handleGameChange}
            />
          )}
          {activeSection === 'genre'         && config && (
            <GenreSettings
              config={config.genre_config}
              onChange={handleGenreChange}
            />
          )}
          {activeSection === 'story-presets'  && <StoryPresets />}
          {activeSection === 'stories'         && <StoryManagement />}
          {activeSection === 'status-presets'  && <StatusPresets />}
          {activeSection === 'system'          && <SystemSection />}
        </main>
      </div>

      {/* Bottom action bar — only for config sections */}
      {showActionBar && (
        <div className="a-action-bar">
          <button
            className="a-btn-save"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            type="button"
          >
            {saveLabel}
          </button>
          {lastSaved && (
            <span className="a-save-timestamp">
              마지막 저장: {formatSavedAt()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Page entry ── */
const Admin: FC = () => {
  const { user, isLoading, setMockAdminUser } = useAuth();
  const [serverVerified, setServerVerified] = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleDevSkip = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
    } catch (error) {
      // localStorage may be disabled in some environments (e.g., private browsing)
      console.debug('localStorage unavailable, dev skip state not persisted:', error);
    }
    setMockAdminUser();
  }, [setMockAdminUser]);

  // Track if admin verification has been performed to prevent infinite loop
  const hasVerifiedRef = useRef<boolean>(false);

  // DEV-only: Auto-restore skip state if localStorage flag is set
  useEffect(() => {
    if (import.meta.env.DEV && !isLoading && !user) {
      try {
        if (localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP) === DEV_HEADER_VALUES.SKIP) {
          setMockAdminUser();
        }
      } catch (error) {
        // localStorage may be disabled in some environments (e.g., private browsing)
        console.debug('localStorage unavailable, dev skip state not persisted:', error);
      }
    }
  }, [isLoading, user, setMockAdminUser]);

  // Server-side admin verification on mount
  useEffect(() => {
    if (!user) return;

    // Skip if already verified for this user session
    if (hasVerifiedRef.current) return;

    const verifyAdmin = async () => {
      // DEV-only: Skip server verification for mock admin user
      if (import.meta.env.DEV && user.id === 'dev-admin-user') {
        setServerVerified(true);
        setVerifyError(null);
        hasVerifiedRef.current = true;
        return;
      }

      // Real user: verify with server
      try {
        const response = await api.get<VerifyAdminResponse>('/admin/verify');
        setServerVerified(response.isAdmin);
        if (!response.isAdmin) {
          setVerifyError('서버에서 관리자 권한이 확인되지 않았습니다');
        }
        hasVerifiedRef.current = true;
      } catch (err) {
        console.error('Admin verification failed:', err);
        setVerifyError('관리자 권한 확인에 실패했습니다');
        setServerVerified(false);
      }
    };

    verifyAdmin();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="admin-root" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>로딩 중...</span>
      </div>
    );
  }

  // 비로그인 → 로그인 페이지로 (with DEV skip button)
  if (!user) {
    if (import.meta.env.DEV) {
      return (
        <div className="admin-root" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            로그인이 필요합니다
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/login" className="a-btn">로그인</a>
            <DevSkipButton onClick={handleDevSkip} />
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  // Server verification in progress
  if (serverVerified === null) {
    return (
      <div className="admin-root" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>관리자 권한 확인 중...</span>
      </div>
    );
  }

  // Server verification failed or not admin
  if (serverVerified === false || verifyError) {
    return (
      <div className="admin-root" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {verifyError || '관리자 권한이 필요합니다'}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/" className="a-btn">홈으로</a>
          <DevSkipButton onClick={handleDevSkip} />
        </div>
      </div>
    );
  }

  return <AdminContent />;
};

export default Admin;
