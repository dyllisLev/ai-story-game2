import { type FC, useState, useEffect } from 'react';
import type { SettingsData } from '@/types/play';

interface NotesTabProps {
  settingsData: SettingsData;
  onUpdateSettings: (patch: Partial<SettingsData>) => void;
}

export const NotesTab: FC<NotesTabProps> = ({ settingsData, onUpdateSettings }) => {
  const [charName, setCharName] = useState(settingsData.characterName);
  const [charSetting, setCharSetting] = useState(settingsData.characterSetting);
  const [memo, setMemo] = useState(settingsData.userNote);

  // sync from outside
  useEffect(() => { setCharName(settingsData.characterName); }, [settingsData.characterName]);
  useEffect(() => { setCharSetting(settingsData.characterSetting); }, [settingsData.characterSetting]);
  useEffect(() => { setMemo(settingsData.userNote); }, [settingsData.userNote]);

  const handleSaveCharName = () => onUpdateSettings({ characterName: charName });
  const handleSaveCharSetting = () => onUpdateSettings({ characterSetting: charSetting });
  const handleSaveMemo = () => onUpdateSettings({ userNote: memo });

  return (
    <div className="tab-panel active" id="tab-notes" role="tabpanel">
      <div className="panel-content">

        {/* Character name */}
        <div>
          <label className="notes-label" htmlFor="notes-char-name">캐릭터 이름</label>
          <input
            id="notes-char-name"
            className="notes-input"
            type="text"
            placeholder="캐릭터 이름 입력..."
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            onBlur={handleSaveCharName}
          />
        </div>

        {/* Character setting */}
        <div>
          <label className="notes-label" htmlFor="notes-char-setting">캐릭터 설정</label>
          <textarea
            id="notes-char-setting"
            className="notes-area"
            rows={4}
            placeholder="캐릭터 설정 입력..."
            value={charSetting}
            onChange={(e) => setCharSetting(e.target.value)}
            onBlur={handleSaveCharSetting}
          />
        </div>

        {/* User memo */}
        <div>
          <label className="notes-label" htmlFor="notes-memo">메모</label>
          <textarea
            id="notes-memo"
            className="notes-area"
            rows={6}
            placeholder="자유 메모..."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={handleSaveMemo}
          />
        </div>

      </div>
    </div>
  );
};
