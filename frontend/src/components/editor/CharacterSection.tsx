// components/editor/CharacterSection.tsx
// Accordion cards (add/edit/remove characters as structured data)

import { type FC } from 'react';
import type { Character } from '../../hooks/useStoryEditor';
import { CharacterCard } from './CharacterCard';

interface CharacterSectionProps {
  characters: Character[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onRemove: (id: string) => void;
}

export const CharacterSection: FC<CharacterSectionProps> = ({
  characters,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <section id="section-chars" aria-labelledby="chars-heading">
      <div className="section-header">
        <h2 id="chars-heading" className="section-title">등장인물</h2>
        <p className="section-desc">이야기에 등장하는 NPC와 주요 인물을 정의하세요.</p>
      </div>

      {/* Character list */}
      <div role="list" aria-label="등장인물 목록">
        {characters.map((char, i) => (
          <div key={char.id} role="listitem">
            <CharacterCard
              character={char}
              index={i}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        className="btn-dashed"
        onClick={onAdd}
        aria-label="캐릭터 추가"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        캐릭터 추가
      </button>
    </section>
  );
};
