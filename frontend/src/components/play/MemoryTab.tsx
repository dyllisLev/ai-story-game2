import { type FC, useState } from 'react';
import type { SessionMemory } from '@/types/play';

interface MemoryTabProps {
  memory: SessionMemory | null;
  onUpdateMemory?: (updated: SessionMemory) => void;
}

type MemoryCategory = 'shortTerm' | 'longTerm' | 'characters' | 'goals';

const CATEGORY_CONFIG: Record<MemoryCategory, { label: string; dotClass: string; icon: string }> = {
  shortTerm:  { label: '단기 기억', dotClass: 'short-term',  icon: '⚡' },
  longTerm:   { label: '장기 기억', dotClass: 'long-term',   icon: '🧠' },
  characters: { label: '등장인물', dotClass: 'characters',  icon: '👤' },
  goals:      { label: '목표',     dotClass: 'goals',       icon: '🎯' },
};

interface CategorySectionProps {
  category: MemoryCategory;
  items: string[];
  defaultOpen?: boolean;
}

const CategorySection: FC<CategorySectionProps> = ({ category, items, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = CATEGORY_CONFIG[category];

  return (
    <div className="memory-category-section">
      <div className="memory-category-header" onClick={() => setOpen(!open)}>
        <span className="memory-category-name">
          {cfg.icon} {cfg.label}
        </span>
        <span className="memory-category-count">
          <span>{items.length}개</span>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
            {open ? '▾' : '▸'}
          </span>
        </span>
      </div>

      {open && (
        <div className="memory-list">
          {items.length === 0 ? (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', padding: 'var(--space-2) 0' }}>
              없음
            </div>
          ) : (
            items.map((text, i) => (
              <div key={i} className="memory-item">
                <div className={`memory-dot ${cfg.dotClass}`} />
                <div className="memory-text">{text}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const MemoryTab: FC<MemoryTabProps> = ({ memory }) => {
  if (!memory) {
    return (
      <div className="tab-panel active" id="tab-memory" role="tabpanel">
        <div className="panel-content">
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)', textAlign: 'center', padding: 'var(--space-6) 0' }}>
            메모리가 없습니다.
            <br />
            게임을 진행하면 자동으로 생성됩니다.
          </div>
        </div>
      </div>
    );
  }

  const shortTermItems = memory.shortTerm.map((m) => `${m.title}: ${m.content}`);
  const longTermItems = memory.longTerm.map((m) => `${m.title}: ${m.content}`);
  const characterItems = memory.characters.map(
    (c) => `${c.name} (${c.role}): ${c.description}`
  );
  const goalItems = memory.goals ? [memory.goals] : [];

  return (
    <div className="tab-panel active" id="tab-memory" role="tabpanel">
      <div className="panel-content">
        <CategorySection category="shortTerm" items={shortTermItems} />
        <CategorySection category="longTerm"  items={longTermItems} />
        <CategorySection category="characters" items={characterItems} defaultOpen={false} />
        <CategorySection category="goals"      items={goalItems}     defaultOpen={false} />
      </div>
    </div>
  );
};
