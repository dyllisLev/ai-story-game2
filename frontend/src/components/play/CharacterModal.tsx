import { type FC, useState } from 'react';
import type { SettingsData } from '@/types/play';

interface Character {
  name: string;
  role: string;
  emoji?: string;
  color?: string;
  description?: string;
  relations?: { name: string; type: 'friendly' | 'neutral' | 'hostile' }[];
}

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingsData: SettingsData;
  onSave?: (name: string, setting: string) => void;
}

function parseCharacters(raw: string): Character[] {
  if (!raw) return [];
  // Try to parse as JSON array of { name, role, description } objects
  try {
    const parsed = JSON.parse(raw) as Character[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall back to line-based parsing
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split(':');
        return { name: name.trim(), role: rest.join(':').trim() };
      });
  }
  return [];
}

const CharacterCard: FC<{ char: Character }> = ({ char }) => {
  const [expanded, setExpanded] = useState(false);

  const avatarStyle = char.color
    ? { background: char.color }
    : { background: 'linear-gradient(135deg, var(--prim-violet-700), var(--prim-violet-900))' };

  return (
    <div className={`char-modal-card${expanded ? ' expanded' : ''}`}>
      <div
        className="char-modal-card-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="char-modal-avatar" style={avatarStyle}>
          {char.emoji ?? '👤'}
        </div>
        <div className="char-modal-info">
          <div className="char-modal-name">{char.name}</div>
          {char.role && <div className="char-modal-role">{char.role}</div>}
        </div>
        <span className="char-modal-chevron">▾</span>
      </div>

      {expanded && (
        <div className="char-modal-card-body" style={{ display: 'flex' }}>
          {char.description && (
            <p style={{ lineHeight: 1.6 }}>{char.description}</p>
          )}
          {char.relations && char.relations.length > 0 && (
            <>
              <div className="char-modal-section-title">관계</div>
              <div className="char-modal-relations">
                {char.relations.map((rel, i) => (
                  <div key={i} className="char-modal-relation-item">
                    <span>{rel.name}</span>
                    <span className={`relation-tag ${rel.type}`}>
                      {rel.type === 'friendly' ? '우호' : rel.type === 'hostile' ? '적대' : '중립'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const CharacterModal: FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  settingsData,
  onSave,
}) => {
  const [editName, setEditName] = useState(settingsData.characterName);
  const [editSetting, setEditSetting] = useState(settingsData.characterSetting);

  const characters = parseCharacters(settingsData.characters);

  const handleSave = () => {
    onSave?.(editName, editSetting);
    onClose();
  };

  return (
    <div
      className={`char-modal-overlay${isOpen ? ' open' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label="등장인물"
    >
      <div className="char-modal">
        <div className="char-modal-header">
          <h3>등장인물</h3>
          <button
            className="char-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="char-modal-body">

          {/* Player character */}
          <div className="char-modal-card expanded">
            <div
              className="char-modal-card-header"
              style={{ cursor: 'default' }}
            >
              <div
                className="char-modal-avatar"
                style={{ background: 'linear-gradient(135deg, var(--prim-rose-500), var(--prim-amber-400))' }}
              >
                ⚔️
              </div>
              <div className="char-modal-info">
                <div className="char-modal-name">
                  {settingsData.characterName || '(플레이어)'}
                </div>
                <div className="char-modal-role">플레이어 캐릭터</div>
              </div>
            </div>
            <div className="char-modal-card-body" style={{ display: 'flex' }}>
              <div>
                <label className="notes-label" style={{ display: 'block', marginBottom: '4px' }}>이름</label>
                <input
                  className="notes-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="캐릭터 이름"
                  style={{ marginBottom: '8px' }}
                />
              </div>
              <div>
                <label className="notes-label" style={{ display: 'block', marginBottom: '4px' }}>설정</label>
                <textarea
                  className="notes-area"
                  rows={3}
                  value={editSetting}
                  onChange={(e) => setEditSetting(e.target.value)}
                  placeholder="캐릭터 설정"
                />
              </div>
              <button
                className="session-load-btn"
                style={{ marginTop: '8px' }}
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </div>

          {/* NPC cards */}
          {characters.map((char, i) => (
            <CharacterCard key={i} char={char} />
          ))}

          {characters.length === 0 && (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)', padding: 'var(--space-4) 0', textAlign: 'center' }}>
              등장인물 정보가 없습니다.
              <br />
              스토리 에디터에서 등장인물을 설정하세요.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
