import { type FC } from 'react';
import type { StoryFilterParams } from '@story-game/shared';
import { GENRES_WITH_ALL } from '../../lib/constants';

// ─── Props ───────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: StoryFilterParams;
  viewMode: 'grid' | 'list';
  totalCount?: number;
  onFilterChange: (filters: Partial<StoryFilterParams>) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onClearSearch: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const FilterBar: FC<FilterBarProps> = ({
  filters,
  viewMode,
  totalCount,
  onFilterChange,
  onViewModeChange,
  onClearSearch,
}) => {
  const activeGenre = filters.genre ?? 'all';

  return (
    <div
      role="toolbar"
      aria-label="스토리 필터 및 정렬"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 16,
        marginBottom: 20,
        scrollbarWidth: 'none',
      }}
    >
      {/* Genre chips */}
      <div role="group" aria-label="장르 필터" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {GENRES_WITH_ALL.map((genre) => {
          const value = genre === '전체' ? '' : genre;
          const isActive = genre === '전체' ? !activeGenre || activeGenre === 'all' : activeGenre === genre;

          return (
            <button
              key={genre}
              aria-pressed={isActive}
              onClick={() => onFilterChange({ genre: value || undefined, page: 1 })}
              style={{
                height: 32,
                padding: '0 14px',
                borderRadius: 999,
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all var(--transition)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div aria-hidden="true" style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

      {/* Active search chip */}
      {filters.search && (
        <button
          aria-label="검색어 초기화"
          onClick={onClearSearch}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 28,
            padding: '0 10px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            borderRadius: 999,
            fontSize: 12,
            color: 'var(--accent)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            flexShrink: 0,
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#0a0a0f';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-dim)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          {filters.search}
          <span aria-hidden="true" style={{ fontSize: 14, opacity: 0.7 }}>×</span>
        </button>
      )}

      {/* Right controls */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Title + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            모든 스토리
          </span>
          {totalCount !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {totalCount.toLocaleString('ko-KR')}개
            </span>
          )}
        </div>

        <div aria-hidden="true" style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Sort select */}
        <label htmlFor="sortSelect" className="sr-only">정렬</label>
        <select
          id="sortSelect"
          value={filters.sort ?? 'latest'}
          onChange={(e) =>
            onFilterChange({ sort: e.target.value as StoryFilterParams['sort'], page: 1 })
          }
          aria-label="정렬 기준"
          style={{
            height: 32,
            padding: '0 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: 13,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
          <option value="name">이름순</option>
        </select>

        {/* View toggle */}
        <div
          role="group"
          aria-label="보기 방식"
          style={{
            display: 'flex',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <button
            aria-label="그리드 보기"
            aria-pressed={viewMode === 'grid'}
            onClick={() => onViewModeChange('grid')}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            aria-label="리스트 보기"
            aria-pressed={viewMode === 'list'}
            onClick={() => onViewModeChange('list')}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
              color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
