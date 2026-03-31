import { type FC, useState, useMemo } from 'react';
import type { SessionMemory } from '@/types/play';
import { useConfig } from '@/hooks/useConfig';

interface MemoryTabProps {
  memory: SessionMemory | null;
  onUpdateMemory?: (updated: SessionMemory) => void;
}

type MemoryCategory = 'shortTerm' | 'longTerm' | 'characters' | 'goals';

interface CategorySectionProps {
  category: MemoryCategory;
  items: string[];
  defaultOpen?: boolean;
  categoryConfig: Record<MemoryCategory, { label: string; dotClass: string; icon: string }>;
}

const CategorySection: FC<CategorySectionProps> = ({ category, items, defaultOpen = true, categoryConfig }) => {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = categoryConfig[category];

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
  const { data: config } = useConfig();

  // Build category config from gameplayConfig.memory_categories (memoized)
  const categoryConfig: Record<MemoryCategory, { label: string; dotClass: string; icon: string }> | null = useMemo(() => {
    if (!config) return null;
    const memoryCategories = config.gameplayConfig.memory_categories;
    const map = new Map(memoryCategories.map(c => [c.dbKey, c]));

    const get = (key: MemoryCategory) => {
      const entry = map.get(key);
      if (!entry) throw new Error(`Missing memory_categories config for "${key}"`);
      return entry;
    };
    return {
      shortTerm:  { label: get('shortTerm').label,  dotClass: 'short-term',  icon: get('shortTerm').icon },
      longTerm:   { label: get('longTerm').label,   dotClass: 'long-term',   icon: get('longTerm').icon },
      characters: { label: get('characters').label, dotClass: 'characters',  icon: get('characters').icon },
      goals:      { label: get('goals').label,      dotClass: 'goals',       icon: get('goals').icon },
    };
  }, [config]);

  if (!memory || !categoryConfig) {
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
        <CategorySection category="shortTerm" items={shortTermItems} categoryConfig={categoryConfig} />
        <CategorySection category="longTerm"  items={longTermItems} categoryConfig={categoryConfig} />
        <CategorySection category="characters" items={characterItems} defaultOpen={false} categoryConfig={categoryConfig} />
        <CategorySection category="goals"      items={goalItems}     defaultOpen={false} categoryConfig={categoryConfig} />
      </div>
    </div>
  );
};
