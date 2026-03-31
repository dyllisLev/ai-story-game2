import { type FC } from 'react';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'service-logs'
  | 'api-logs'
  | 'prompt'
  | 'game-params'
  | 'story-presets'
  | 'stories'
  | 'status-presets'
  | 'system';

interface AdminNavProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  errorLogCount?: number;
}

interface NavItem {
  id: AdminSection;
  label: string;
  icon: string;
  badge?: number;
  danger?: boolean;
}

const MONITORING_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: '대시보드',  icon: '◈' },
  { id: 'users',         label: '회원 관리', icon: '👤' },
  { id: 'service-logs',  label: '서비스 로그', icon: '≡' },
  { id: 'api-logs',      label: 'API 로그',  icon: '⟁' },
];

const SETTINGS_ITEMS: NavItem[] = [
  { id: 'prompt',         label: '프롬프트 설정', icon: '✦' },
  { id: 'game-params',    label: '게임 파라미터', icon: '⚙' },
  { id: 'story-presets',  label: '스토리 프리셋', icon: '📋' },
  { id: 'stories',        label: '스토리 관리',  icon: '📚' },
  { id: 'status-presets', label: '상태창 프리셋', icon: '⊞' },
];

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'system', label: '시스템', icon: '⚠', danger: true },
];

export const AdminNav: FC<AdminNavProps> = ({ active, onChange, errorLogCount }) => {
  const monitoringItems = MONITORING_ITEMS.map(item =>
    item.id === 'service-logs' && errorLogCount
      ? { ...item, badge: errorLogCount }
      : item,
  );

  const renderItems = (items: NavItem[]) =>
    items.map(item => (
      <button
        key={item.id}
        className={`a-nav-item${active === item.id ? ' active' : ''}${item.danger ? ' danger' : ''}`}
        onClick={() => onChange(item.id)}
        type="button"
      >
        <span className="a-nav-icon">{item.icon}</span>
        {item.label}
        {item.badge != null && item.badge > 0 && (
          <span className="a-nav-badge">{item.badge}</span>
        )}
      </button>
    ));

  return (
    <nav className="a-nav">
      <div className="a-nav-section">
        <div className="a-nav-label">모니터링</div>
        {renderItems(monitoringItems)}
      </div>
      <div className="a-nav-section">
        <div className="a-nav-label">설정</div>
        {renderItems(SETTINGS_ITEMS)}
      </div>
      <div className="a-nav-section">
        <div className="a-nav-label">시스템</div>
        {renderItems(SYSTEM_ITEMS)}
      </div>
    </nav>
  );
};
