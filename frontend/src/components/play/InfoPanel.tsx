import { type FC, useState } from 'react';
import type { RightPanelTab, SessionMemory, SettingsData, SaveStatus, StatusAttribute } from '@/types/play';
import { InfoTab } from './InfoTab';
import { MemoryTab } from './MemoryTab';
import { NotesTab } from './NotesTab';
import { OutputTab } from './OutputTab';

interface InfoPanelProps {
  memory: SessionMemory | null;
  settingsData: SettingsData;
  onUpdateSettings: (patch: Partial<SettingsData>) => void;
  onUpdateMemory: (updated: SessionMemory) => void;
  narrativeLength: number;
  onNarrativeLengthChange: (n: number) => void;
  useLatex: boolean;
  onUseLatexChange: (v: boolean) => void;
  useCache: boolean;
  onUseCacheChange: (v: boolean) => void;
  saveStatus: SaveStatus;
  onSaveNow: () => void;
  hasSession: boolean;
  onOpenCharModal: () => void;
  statusAttributes: StatusAttribute[];
  statusValues: Record<string, string>;
}

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'info',   label: '📋 정보' },
  { id: 'memory', label: '🧠 기억' },
  { id: 'notes',  label: '✏ 노트' },
  { id: 'output', label: '⚙ 출력' },
];

export const InfoPanel: FC<InfoPanelProps> = ({
  memory,
  settingsData,
  onUpdateSettings,
  onUpdateMemory,
  narrativeLength,
  onNarrativeLengthChange,
  useLatex,
  onUseLatexChange,
  useCache,
  onUseCacheChange,
  saveStatus,
  onSaveNow,
  hasSession,
  onOpenCharModal,
  statusAttributes,
  statusValues,
}) => {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('info');

  return (
    <aside className="panel-right" aria-label="정보 패널">
      {/* Tab bar */}
      <div className="panel-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`panel-tab${activeTab === t.id ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === t.id}
            data-tab={t.id}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'info' && (
        <InfoTab settingsData={settingsData} onOpenCharModal={onOpenCharModal} statusAttributes={statusAttributes} statusValues={statusValues} />
      )}
      {activeTab === 'memory' && (
        <MemoryTab memory={memory} onUpdateMemory={onUpdateMemory} />
      )}
      {activeTab === 'notes' && (
        <NotesTab settingsData={settingsData} onUpdateSettings={onUpdateSettings} />
      )}
      {activeTab === 'output' && (
        <OutputTab
          narrativeLength={narrativeLength}
          onNarrativeLengthChange={onNarrativeLengthChange}
          narrativeLengthMin={1}
          narrativeLengthMax={10}
          useLatex={useLatex}
          onUseLatexChange={onUseLatexChange}
          useCache={useCache}
          onUseCacheChange={onUseCacheChange}
          saveStatus={saveStatus}
          onSaveNow={onSaveNow}
          hasSession={hasSession}
        />
      )}
    </aside>
  );
};
