import { type FC, useState } from 'react';
import type { SettingsData } from '@/types/play';

interface InfoTabProps {
  settingsData: SettingsData;
  onOpenCharModal: () => void;
}

interface PanelSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const PanelSection: FC<PanelSectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`panel-section${open ? '' : ' collapsed'}`}>
      <div className="panel-section-header" onClick={() => setOpen(!open)}>
        <span className="panel-section-title">
          {icon} {title}
        </span>
        <span className="section-collapse-icon">▾</span>
      </div>
      <div className="panel-section-body">{children}</div>
    </div>
  );
};

export const InfoTab: FC<InfoTabProps> = ({ settingsData, onOpenCharModal }) => {
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

          <button
            className="char-detail-btn"
            onClick={onOpenCharModal}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            등장인물 상세 보기
          </button>
        </PanelSection>

        {/* NPC summary */}
        <PanelSection title="등장인물 요약" icon="👥" defaultOpen={false}>
          <p className="char-summary-text" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
            게임이 진행되면 등장인물 정보가 표시됩니다.
          </p>
        </PanelSection>

        {/* Quest */}
        <PanelSection title="목표 / 퀘스트" icon="📜" defaultOpen={false}>
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
