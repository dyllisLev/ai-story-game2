import { type FC, useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { ContinueSection } from '@/components/home/ContinueSection';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { FilterBar } from '@/components/home/FilterBar';
import { StoryGrid } from '@/components/home/StoryGrid';
import { StoryList } from '@/components/home/StoryList';
import { Pagination } from '@/components/ui/Pagination';
import { useStories } from '@/hooks/useStories';
import type { StoryFilterParams } from '@story-game/shared';

// ─── Home Page ────────────────────────────────────────────────────────────────

const Home: FC = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [filters, setFilters] = useState<StoryFilterParams>({
    sort: 'latest',
    page: 1,
    limit: 20,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search is debounced to avoid excessive API calls
  const [searchInput, setSearchInput] = useState('');

  // Fetch stories
  const { data, isLoading } = useStories(filters);

  const stories = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  // Handlers
  const handleFilterChange = useCallback((partial: Partial<StoryFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      // Cancel previous debounce and schedule a new one
      if (searchDebounceRef.current !== null) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        searchDebounceRef.current = null;
        handleFilterChange({ search: value || undefined, page: 1 });
      }, 300);
    },
    [handleFilterChange],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current !== null) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    handleFilterChange({ search: undefined, page: 1 });
    searchInputRef.current?.focus();
  }, [handleFilterChange]);

  const handlePageChange = useCallback(
    (page: number) => {
      handleFilterChange({ page });
      // Scroll to stories section
      document.getElementById('storiesSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [handleFilterChange],
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sticky header with integrated search */}
      <Header
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
      />

      <main id="main">
        {/* Hero */}
        <HeroSection />

        {/* Content area */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px 80px' }}>
          {/* Continue playing (only visible when logged in + has sessions) */}
          <ContinueSection />

          {/* Featured stories */}
          <FeaturedSection />

          {/* Stories section */}
          <section id="storiesSection" aria-labelledby="storiesTitle">
            <FilterBar
              filters={filters}
              viewMode={viewMode}
              totalCount={total}
              onFilterChange={handleFilterChange}
              onViewModeChange={setViewMode}
              onClearSearch={handleClearSearch}
            />

            {/* Loading state */}
            {isLoading && (
              <div
                aria-busy="true"
                aria-label="스토리 목록 로딩 중"
                style={{
                  display: 'grid',
                  gridTemplateColumns: viewMode === 'grid'
                    ? 'repeat(auto-fill, minmax(280px, 1fr))'
                    : '1fr',
                  gap: 14,
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: viewMode === 'grid' ? 280 : 80,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && stories.length === 0 && (
              <div
                aria-live="polite"
                style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden="true">📭</div>
                <div
                  style={{
                    fontFamily: "'Noto Serif KR', serif",
                    fontSize: 18,
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                  }}
                >
                  {filters.search ? '검색 결과가 없습니다' : '스토리가 없습니다'}
                </div>
                <div style={{ fontSize: 14 }}>
                  {filters.search
                    ? '다른 키워드나 장르로 다시 검색해보세요'
                    : '첫 번째 스토리를 만들어보세요'}
                </div>
              </div>
            )}

            {/* Grid or list */}
            {!isLoading && stories.length > 0 && (
              viewMode === 'grid'
                ? <StoryGrid stories={stories} />
                : <StoryList stories={stories} />
            )}

            {/* Pagination */}
            {!isLoading && stories.length > 0 && (
              <Pagination
                page={filters.page ?? 1}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '28px 24px',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--accent)',
              opacity: 0.6,
            }}
          >
            스토리월드
          </span>
          <span style={{ fontSize: 12 }}>AI-Powered Interactive Fiction Platform</span>
          <nav
            aria-label="사이트 링크"
            style={{ display: 'flex', gap: 20, marginLeft: 'auto', flexWrap: 'wrap' }}
          >
            {[
              { label: '관리자', to: '/admin' },
              { label: '에디터', to: '/editor' },
              { label: '도움말', to: '/help' },
              { label: '이용약관', to: '/terms' },
              { label: '개인정보처리방침', to: '/privacy' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  transition: 'color var(--transition)',
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Home;
