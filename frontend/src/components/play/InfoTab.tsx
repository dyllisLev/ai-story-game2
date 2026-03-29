import { type FC, useState } from 'react';
import type { SettingsData, StatusAttribute } from '@/types/play';
import { parseBarValue } from '@/lib/status-parser';

interface InfoTabProps {
  settingsData: SettingsData;
  onOpenCharModal: () => void;
  statusAttributes: StatusAttribute[];
  statusValues: Record<string, string>;
}

interface PanelSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  noCollapse?: boolean;
  headerAction?: React.ReactNode;
}

const PanelSection: FC<PanelSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  noCollapse = false,
  headerAction,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const collapsed = !noCollapse && !open;
  return (
    <div className={`panel-section${collapsed ? ' collapsed' : ''}`}>
      <div
        className={`panel-section-header${noCollapse ? ' no-collapse' : ''}`}
        onClick={noCollapse ? undefined : () => setOpen((v) => !v)}
      >
        <span className="panel-section-title">
          {icon} {title}
        </span>
        {headerAction ?? (!noCollapse && <span className="section-collapse-icon">▾</span>)}
      </div>
      <div className="panel-section-body">{children}</div>
    </div>
  );
};

// ---- Status attribute renderers ----

const StatBar: FC<{ attr: StatusAttribute; value: string }> = ({ attr, value }) => {
  const parsed = parseBarValue(value);
  if (!parsed) return <StatText attr={attr} value={value} />;
  const max = parsed.max || Number(attr.max) || 100;
  const pct = Math.min(100, Math.max(0, (parsed.current / max) * 100));
  return (
    <div className="stat-row">
      <span className="stat-name">{attr.name}</span>
      <div className="stat-bar">
        <div className="stat-bar-fill default" style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-val">{parsed.current}/{max}</span>
    </div>
  );
};

const StatText: FC<{ attr: StatusAttribute; value: string }> = ({ attr, value }) => (
  <div className="stat-text-row">
    <span className="stat-name">{attr.name}</span>
    <span className="stat-text-val">{value || '-'}</span>
  </div>
);

const StatList: FC<{ attr: StatusAttribute; value: string }> = ({ attr, value }) => {
  const items = value ? value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
  return (
    <div className="stat-list-row">
      <span className="stat-name" style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: 'var(--space-1)' }}>
        {attr.name}
      </span>
      <div className="stat-list-items">
        {items.length > 0
          ? items.map((item, i) => <span key={i} className="stat-list-item">{item}</span>)
          : <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>-</span>
        }
      </div>
    </div>
  );
};

const StatusRow: FC<{ attr: StatusAttribute; value: string }> = ({ attr, value }) => {
  switch (attr.type) {
    case 'bar':
    case 'percent':
    case 'number':
      return <StatBar attr={attr} value={value} />;
    case 'list':
      return <StatList attr={attr} value={value} />;
    default:
      return <StatText attr={attr} value={value} />;
  }
};

export const InfoTab: FC<InfoTabProps> = ({ settingsData, onOpenCharModal, statusAttributes, statusValues }) => {
  const hasStatus = (statusAttributes ?? []).length > 0;
  const hasValues = Object.keys(statusValues ?? {}).length > 0;

  return (
    <div className="tab-panel active" id="tab-info" role="tabpanel">
      <div className="panel-content">

        {/* My character */}
        <PanelSection title="내 캐릭터" icon="⚔">
          <div className="char-card">
            <div className="char-card-avatar">🧑‍🦱</div>
            <div className="char-card-info">
              <div className="char-card-name" id="charNameDisplay">
                {settingsData.characterName || '캐릭터 미설정'}
              </div>
              <div className="char-card-role">
                {settingsData.characterSetting
                  ? settingsData.characterSetting.slice(0, 40) + (settingsData.characterSetting.length > 40 ? '...' : '')
                  : '설정 없음'}
              </div>
            </div>
          </div>

          {/* Status window */}
          {hasStatus && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              {hasValues
                ? statusAttributes.map((attr) => (
                    <StatusRow key={attr.id} attr={attr} value={statusValues[attr.name] ?? ''} />
                  ))
                : <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
                    게임을 시작하면 상태가 표시됩니다.
                  </p>
              }
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="등장인물"
          icon="👥"
          noCollapse
          headerAction={
            <button className="char-detail-btn" onClick={onOpenCharModal}>
              상세보기 ▶
            </button>
          }
        >
          <p className="char-summary-text" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
            게임이 진행되면 등장인물 정보가 표시됩니다.
          </p>
        </PanelSection>

        {/* Quest */}
        <PanelSection title="임무" icon="📜" defaultOpen={false}>
          <div className="quest-current-goal">
            <span className="quest-goal-label">현재 목표</span>
            <span className="quest-goal-text">
              {settingsData.userNote || '게임을 시작하면 목표가 설정됩니다.'}
            </span>
          </div>
        </PanelSection>

      </div>
    </div>
  );
};
