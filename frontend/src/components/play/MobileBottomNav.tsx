// ============================================================
// Mobile Bottom Navigation — Play Page (640px and below)
// ============================================================
import type { FC } from 'react';

interface MobileBottomNavProps {
  activeTab: 'session' | 'info' | 'notes';
  onTabChange: (tab: 'session' | 'info' | 'notes') => void;
}

export const MobileBottomNav: FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="mobile-bottom-nav" role="tablist">
      <button
        role="tab"
        aria-selected={activeTab === 'session'}
        aria-label="세션 목록"
        className={`nav-tab ${activeTab === 'session' ? 'active' : ''}`}
        onClick={() => onTabChange('session')}
      >
        <span className="nav-icon">📋</span>
        <span className="nav-label">세션</span>
      </button>

      <button
        role="tab"
        aria-selected={activeTab === 'info'}
        aria-label="정보 및 설정"
        className={`nav-tab ${activeTab === 'info' ? 'active' : ''}`}
        onClick={() => onTabChange('info')}
      >
        <span className="nav-icon">ℹ️</span>
        <span className="nav-label">정보</span>
      </button>

      <button
        role="tab"
        aria-selected={activeTab === 'notes'}
        aria-label="메모 및 노트"
        className={`nav-tab ${activeTab === 'notes' ? 'active' : ''}`}
        onClick={() => onTabChange('notes')}
      >
        <span className="nav-icon">📝</span>
        <span className="nav-label">노트</span>
      </button>
    </nav>
  );
};
