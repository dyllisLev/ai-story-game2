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
      <div className="mb-7">
        <h2 id="chars-heading" className="font-serif text-[22px] font-bold text-text-primary tracking-tight mb-1">
          등장인물
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">이야기에 등장하는 NPC와 주요 인물을 정의하세요.</p>
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
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[var(--border-mid)] rounded-[9px] bg-transparent text-text-muted text-[13px] font-sans cursor-pointer transition-all hover:border-accent hover:text-accent hover:bg-[var(--accent-dim)] mt-1"
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
