import { type FC, useState, useCallback, useRef } from 'react';
import '../styles/admin.css';

import { AuthGate } from '../components/admin/AuthGate';
import { AdminNav, type AdminSection } from '../components/admin/AdminNav';
import { Dashboard } from '../components/admin/Dashboard';
import { ServiceLogs } from '../components/admin/ServiceLogs';
import { ApiLogs } from '../components/admin/ApiLogs';
import { PromptSettings } from '../components/admin/PromptSettings';
import { GameParams } from '../components/admin/GameParams';
import { StoryPresets } from '../components/admin/StoryPresets';
import { StoryManagement } from '../components/admin/StoryManagement';
import { StatusPresets } from '../components/admin/StatusPresets';
import { SystemSection } from '../components/admin/SystemSection';
import { useAdminConfig, type AdminConfig, type PromptConfig, type GameplayConfig } from '../hooks/useAdminConfig';

/* ── Theme toggle ── */
type AdminTheme = 'dark' | 'light';

/* ── Inner content — rendered after auth ── */
const AdminContent: FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [theme, setTheme] = useState<AdminTheme>('dark');

  const {
    config, save, saveStatus, lastSaved,
  } = useAdminConfig();

  // Local draft state — accumulates changes before explicit save
  const draftRef = useRef<AdminConfig>(config);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  /* Sections that show the bottom action bar (config save) */
  const showActionBar = activeSection === 'prompt' || activeSection === 'game-params';

  const handlePromptChange = useCallback((pc: PromptConfig) => {
    draftRef.current = { ...draftRef.current, prompt_config: pc };
  }, []);

  const handleGameChange = useCallback((gc: GameplayConfig) => {
    draftRef.current = { ...draftRef.current, gameplay_config: gc };
  }, []);

  const handleSave = useCallback(() => {
    save(draftRef.current);
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
          {activeSection === 'service-logs'  && <ServiceLogs />}
          {activeSection === 'api-logs'      && <ApiLogs />}
          {activeSection === 'prompt'        && (
            <PromptSettings
              config={config.prompt_config}
              onChange={handlePromptChange}
            />
          )}
          {activeSection === 'game-params'   && (
            <GameParams
              config={config.gameplay_config}
              onChange={handleGameChange}
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
  const [authenticated, setAuthenticated] = useState(false);

  // Check if previously authenticated
  const storedCreds = typeof window !== 'undefined'
    ? localStorage.getItem('admin_credentials')
    : null;

  if (!authenticated && !storedCreds) {
    return (
      <div
        className="admin-root"
        style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <AuthGate onAuthenticated={() => setAuthenticated(true)} />
      </div>
    );
  }

  return <AdminContent />;
};

export default Admin;
