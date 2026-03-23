// components/editor/CharacterCard.tsx
// Single character form (name, role, personality, ability, relation, description)

import { type FC, useState } from 'react';
import type { Character } from '../../hooks/useStoryEditor';

const CHAR_EMOJIS = ['🧙', '⚔️', '🏹', '🛡️', '🗡️', '👁️', '🔥', '🌙'];
const CHAR_COLORS = [
  { bg: 'var(--purple-dim)', text: 'var(--purple)' },
  { bg: 'var(--accent-dim)', text: 'var(--accent)' },
  { bg: 'var(--rose-dim)', text: 'var(--rose)' },
  { bg: 'var(--green-dim)', text: 'var(--green)' },
];

interface CharacterCardProps {
  character: Character;
  index: number;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onRemove: (id: string) => void;
}

export const CharacterCard: FC<CharacterCardProps> = ({ character, index, onUpdate, onRemove }) => {
  const [isOpen, setIsOpen] = useState(index === 0);

  const color = CHAR_COLORS[index % CHAR_COLORS.length];
  const emoji = CHAR_EMOJIS[index % CHAR_EMOJIS.length];

  const relationClass =
    character.relation === '우호적'
      ? 'text-[var(--green)] border-[rgba(82,212,138,0.35)] bg-[var(--green-dim)]'
      : character.relation === '적대'
        ? 'text-[var(--rose)] border-[rgba(224,90,122,0.35)] bg-[var(--rose-dim)]'
        : '';

  return (
    <article
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden mb-2.5 transition-colors hover:border-[var(--border-mid)]"
      aria-label={`캐릭터: ${character.name || '새 캐릭터'}`}
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-[var(--bg-card)] cursor-pointer select-none text-left"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls={`char-body-${character.id}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
          style={{ background: color.bg, color: color.text }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-text-primary">
            {character.name || '새 캐릭터'}
            {character.role && (
              <span className="text-[11px] text-text-muted ml-1.5">— {character.role}</span>
            )}
          </span>
        </div>
        <svg
          className={`text-text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {isOpen && (
        <div id={`char-body-${character.id}`} className="px-4 pb-4 pt-4 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block" htmlFor={`char-name-${character.id}`}>이름</label>
              <input
                id={`char-name-${character.id}`}
                type="text"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted"
                value={character.name}
                onChange={e => onUpdate(character.id, { name: e.target.value })}
                placeholder="이름"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block" htmlFor={`char-role-${character.id}`}>역할</label>
              <input
                id={`char-role-${character.id}`}
                type="text"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted"
                value={character.role}
                onChange={e => onUpdate(character.id, { role: e.target.value })}
                placeholder="역할"
              />
            </div>

            {/* Personality */}
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block" htmlFor={`char-personality-${character.id}`}>성격</label>
              <input
                id={`char-personality-${character.id}`}
                type="text"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted"
                value={character.personality}
                onChange={e => onUpdate(character.id, { personality: e.target.value })}
                placeholder="성격"
              />
            </div>

            {/* Ability */}
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block" htmlFor={`char-ability-${character.id}`}>특기/능력</label>
              <input
                id={`char-ability-${character.id}`}
                type="text"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted"
                value={character.ability}
                onChange={e => onUpdate(character.id, { ability: e.target.value })}
                placeholder="특기"
              />
            </div>

            {/* Relation */}
            <div>
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block" htmlFor={`char-relation-${character.id}`}>초기 관계</label>
              <select
                id={`char-relation-${character.id}`}
                className={`w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-md px-2.5 py-[7px] text-[12px] text-text-primary font-sans outline-none appearance-none cursor-pointer transition-all focus:border-[var(--border-focus)] ${relationClass}`}
                value={character.relation}
                onChange={e => onUpdate(character.id, { relation: e.target.value as Character['relation'] })}
              >
                <option value="우호적">우호적</option>
                <option value="중립">중립</option>
                <option value="적대">적대</option>
              </select>
            </div>

            {/* Description — full width */}
            <div className="col-span-2">
              <label className="text-[13px] font-semibold text-text-primary mb-1.5 block" htmlFor={`char-desc-${character.id}`}>상세 설명</label>
              <textarea
                id={`char-desc-${character.id}`}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-3 font-serif text-sm leading-[1.85] text-text-primary outline-none resize-y min-h-[90px] transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted placeholder:font-sans placeholder:text-[13px]"
                value={character.description}
                onChange={e => onUpdate(character.id, { description: e.target.value })}
                placeholder="캐릭터 설명..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-3 pt-3 border-t border-[var(--border)]">
            <button
              className="h-8 px-3.5 rounded-[7px] border border-[var(--border)] bg-transparent text-[var(--rose)] text-[12px] font-medium cursor-pointer flex items-center gap-1.5 transition-all hover:bg-[var(--rose-dim)] hover:border-[rgba(224,90,122,0.3)]"
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
