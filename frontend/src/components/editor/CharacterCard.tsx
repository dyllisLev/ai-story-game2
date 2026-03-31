// components/editor/CharacterCard.tsx
// Single character form (name, role, personality, ability, relation, description)

import { type FC, useState } from 'react';
import type { Character } from '../../hooks/useStoryEditor';
import { useConfig } from '@/hooks/useConfig';

interface CharacterCardProps {
  character: Character;
  index: number;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onRemove: (id: string) => void;
}

export const CharacterCard: FC<CharacterCardProps> = ({ character, index, onUpdate, onRemove }) => {
  const [isOpen, setIsOpen] = useState(index === 0);
  const { data: config } = useConfig();

  const characterIcons = config?.gameplayConfig.character_icons ?? [];
  const charColors = [
    { bg: 'var(--purple-dim)', text: 'var(--purple)' },
    { bg: 'var(--accent-dim)', text: 'var(--accent)' },
    { bg: 'var(--rose-dim)', text: 'var(--rose)' },
    { bg: 'var(--green-dim)', text: 'var(--green)' },
  ];

  const color = charColors[index % charColors.length];
  const emoji = characterIcons[index % characterIcons.length];

  // Map relation value to data attribute for CSS color styling
  const relationDataVal =
    character.relation === '우호적' ? '우호적' :
    character.relation === '적대' ? '적대' :
    undefined;

  return (
    <article
      className={`char-card${isOpen ? ' open' : ''}`}
      aria-label={`캐릭터: ${character.name || '새 캐릭터'}`}
    >
      {/* Header */}
      <button
        className="char-card-header"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls={`char-body-${character.id}`}
      >
        <div
          className="char-avatar"
          style={{ background: color.bg, color: color.text }}
        >
          {emoji}
        </div>
        <span className="char-card-name">
          {character.name || '새 캐릭터'}
          {character.role && (
            <span className="char-card-role">— {character.role}</span>
          )}
        </span>
        <svg
          className="char-collapse-icon"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {isOpen && (
        <div id={`char-body-${character.id}`} className="char-card-body">
          <div className="char-grid">
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor={`char-name-${character.id}`}>이름</label>
              <input
                id={`char-name-${character.id}`}
                type="text"
                className="form-input"
                value={character.name}
                onChange={e => onUpdate(character.id, { name: e.target.value })}
                placeholder="이름"
              />
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label" htmlFor={`char-role-${character.id}`}>역할</label>
              <input
                id={`char-role-${character.id}`}
                type="text"
                className="form-input"
                value={character.role}
                onChange={e => onUpdate(character.id, { role: e.target.value })}
                placeholder="역할"
              />
            </div>

            {/* Personality */}
            <div className="form-group">
              <label className="form-label" htmlFor={`char-personality-${character.id}`}>성격</label>
              <input
                id={`char-personality-${character.id}`}
                type="text"
                className="form-input"
                value={character.personality}
                onChange={e => onUpdate(character.id, { personality: e.target.value })}
                placeholder="성격"
              />
            </div>

            {/* Ability */}
            <div className="form-group">
              <label className="form-label" htmlFor={`char-ability-${character.id}`}>특기/능력</label>
              <input
                id={`char-ability-${character.id}`}
                type="text"
                className="form-input"
                value={character.ability}
                onChange={e => onUpdate(character.id, { ability: e.target.value })}
                placeholder="특기"
              />
            </div>

            {/* Relation */}
            <div className="form-group">
              <label className="form-label" htmlFor={`char-relation-${character.id}`}>초기 관계</label>
              <select
                id={`char-relation-${character.id}`}
                className="relation-select"
                value={character.relation}
                data-val={relationDataVal}
                onChange={e => onUpdate(character.id, { relation: e.target.value as Character['relation'] })}
              >
                {(config?.gameplayConfig.character_relations ?? []).map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>

            {/* Description — full width */}
            <div className="form-group char-full">
              <label className="form-label" htmlFor={`char-desc-${character.id}`}>상세 설명</label>
              <textarea
                id={`char-desc-${character.id}`}
                className="form-textarea"
                style={{ minHeight: '90px' }}
                value={character.description}
                onChange={e => onUpdate(character.id, { description: e.target.value })}
                placeholder="캐릭터 설명..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="char-card-footer">
            <button
              className="action-bar-btn danger"
              onClick={() => onRemove(character.id)}
              aria-label={`${character.name || '캐릭터'} 삭제`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              삭제
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
