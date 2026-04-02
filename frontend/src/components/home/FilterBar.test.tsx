// components/home/FilterBar.test.tsx — Unit tests for FilterBar component
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import type { StoryFilterParams } from '@story-game/shared';

/* ── Mocks ── */

// Mock useConfig hook
vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    data: {
      genreConfig: {
        genres: [
          { id: 'fantasy', name: '판타지', color: '#8b5cf6' },
          { id: 'murim', name: '무협', color: '#f59e0b' },
          { id: 'horror', name: '공포', color: '#ef4444' },
          { id: 'romance', name: '로맨스', color: '#ec4899' },
        ],
      },
    },
  }),
}));

/* ── Tests ── */

describe('FilterBar', () => {
  const defaultFilters: StoryFilterParams = {
    sort: 'latest',
    page: 1,
    limit: 20,
  };

  const mockHandlers = {
    onFilterChange: vi.fn(),
    onViewModeChange: vi.fn(),
    onClearSearch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('genre chips aria-pressed attribute', () => {
    it('should render "전체" chip with aria-pressed="true" when no genre is selected', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const allChip = within(genreGroup).getByRole('button', { name: '전체' });

      expect(allChip).toHaveAttribute('aria-pressed', 'true');
    });

    it('should render genre chips with aria-pressed="false" when not selected', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const fantasyChip = within(genreGroup).getByRole('button', { name: '판타지' });
      const murimChip = within(genreGroup).getByRole('button', { name: '무협' });

      expect(fantasyChip).toHaveAttribute('aria-pressed', 'false');
      expect(murimChip).toHaveAttribute('aria-pressed', 'false');
    });

    it('should update aria-pressed to "true" when genre chip is clicked', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const fantasyChip = within(genreGroup).getByRole('button', { name: '판타지' });

      fireEvent.click(fantasyChip);

      expect(mockHandlers.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ genre: '판타지', page: 1 })
      );
    });

    it('should set "전체" chip aria-pressed to "false" when specific genre is selected', () => {
      const filtersWithGenre: StoryFilterParams = {
        ...defaultFilters,
        genre: '판타지',
      };

      render(<FilterBar filters={filtersWithGenre} viewMode="grid" {...mockHandlers} />);

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const allChip = within(genreGroup).getByRole('button', { name: '전체' });
      const fantasyChip = within(genreGroup).getByRole('button', { name: '판타지' });

      expect(allChip).toHaveAttribute('aria-pressed', 'false');
      expect(fantasyChip).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('"전체" chip behavior', () => {
    it('should set aria-pressed="true" for "전체" when clicked', () => {
      const filtersWithGenre: StoryFilterParams = {
        ...defaultFilters,
        genre: '판타지',
      };

      render(<FilterBar filters={filtersWithGenre} viewMode="grid" {...mockHandlers} />);

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const allChip = within(genreGroup).getByRole('button', { name: '전체' });

      fireEvent.click(allChip);

      expect(mockHandlers.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ genre: undefined, page: 1 })
      );
    });

    it('should deactivate other genre chips when "전체" is clicked', () => {
      const filtersWithGenre: StoryFilterParams = {
        ...defaultFilters,
        genre: '판타지',
      };

      const { rerender } = render(
        <FilterBar filters={filtersWithGenre} viewMode="grid" {...mockHandlers} />
      );

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const allChip = within(genreGroup).getByRole('button', { name: '전체' });

      // Before clicking "전체", 판타지 should be active
      const fantasyChip = within(genreGroup).getByRole('button', { name: '판타지' });
      expect(fantasyChip).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(allChip);

      // Simulate state update by rerendering with undefined genre
      rerender(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      // After clicking "전체", all chips except "전체" should be inactive
      expect(allChip).toHaveAttribute('aria-pressed', 'true');
      expect(fantasyChip).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('continuous chip clicks', () => {
    it('should deactivate previous chip when new genre is selected', () => {
      const { rerender } = render(
        <FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />
      );

      const genreGroup = screen.getByRole('group', { name: '장르 필터' });
      const murimChip = within(genreGroup).getByRole('button', { name: '무협' });

      // Click 무협
      fireEvent.click(murimChip);

      // Simulate state update
      const murimFilters: StoryFilterParams = { ...defaultFilters, genre: '무협' };
      rerender(<FilterBar filters={murimFilters} viewMode="grid" {...mockHandlers} />);

      expect(murimChip).toHaveAttribute('aria-pressed', 'true');

      // Click 공포
      const horrorChip = within(genreGroup).getByRole('button', { name: '공포' });
      fireEvent.click(horrorChip);

      // Simulate state update
      const horrorFilters: StoryFilterParams = { ...defaultFilters, genre: '공포' };
      rerender(<FilterBar filters={horrorFilters} viewMode="grid" {...mockHandlers} />);

      expect(horrorChip).toHaveAttribute('aria-pressed', 'true');
      expect(murimChip).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('view mode toggle aria-pressed', () => {
    it('should set grid view button aria-pressed to "true" in grid mode', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const gridViewBtn = screen.getByRole('button', { name: '그리드 보기' });
      const listViewBtn = screen.getByRole('button', { name: '리스트 보기' });

      expect(gridViewBtn).toHaveAttribute('aria-pressed', 'true');
      expect(listViewBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('should set list view button aria-pressed to "true" in list mode', () => {
      render(<FilterBar filters={defaultFilters} viewMode="list" {...mockHandlers} />);

      const gridViewBtn = screen.getByRole('button', { name: '그리드 보기' });
      const listViewBtn = screen.getByRole('button', { name: '리스트 보기' });

      expect(gridViewBtn).toHaveAttribute('aria-pressed', 'false');
      expect(listViewBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('should call onViewModeChange when grid button is clicked', () => {
      render(<FilterBar filters={defaultFilters} viewMode="list" {...mockHandlers} />);

      const gridViewBtn = screen.getByRole('button', { name: '그리드 보기' });
      fireEvent.click(gridViewBtn);

      expect(mockHandlers.onViewModeChange).toHaveBeenCalledWith('grid');
    });

    it('should call onViewModeChange when list button is clicked', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const listViewBtn = screen.getByRole('button', { name: '리스트 보기' });
      fireEvent.click(listViewBtn);

      expect(mockHandlers.onViewModeChange).toHaveBeenCalledWith('list');
    });
  });

  describe('sort select', () => {
    it('should render with correct initial value', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const sortSelect = screen.getByLabelText('정렬 기준');
      expect(sortSelect).toHaveValue('latest');
    });

    it('should call onFilterChange when sort is changed', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const sortSelect = screen.getByLabelText('정렬 기준');
      fireEvent.change(sortSelect, { target: { value: 'popular' } });

      expect(mockHandlers.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'popular', page: 1 })
      );
    });
  });

  describe('search chip', () => {
    it('should not render search chip when search is empty', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const searchChip = screen.queryByLabelText('검색어 초기화');
      expect(searchChip).not.toBeInTheDocument();
    });

    it('should render search chip when search has value', () => {
      const filtersWithSearch: StoryFilterParams = {
        ...defaultFilters,
        search: 'test',
      };

      render(<FilterBar filters={filtersWithSearch} viewMode="grid" {...mockHandlers} />);

      const searchChip = screen.getByLabelText('검색어 초기화');
      expect(searchChip).toBeInTheDocument();
      expect(searchChip).toHaveTextContent('test');
    });

    it('should call onClearSearch when search chip is clicked', () => {
      const filtersWithSearch: StoryFilterParams = {
        ...defaultFilters,
        search: 'test',
      };

      render(<FilterBar filters={filtersWithSearch} viewMode="grid" {...mockHandlers} />);

      const searchChip = screen.getByLabelText('검색어 초기화');
      fireEvent.click(searchChip);

      expect(mockHandlers.onClearSearch).toHaveBeenCalled();
    });
  });

  describe('story count', () => {
    it('should display total count when provided', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" totalCount={150} {...mockHandlers} />);

      const countDisplay = screenByText(/150개/);
      expect(countDisplay).toBeInTheDocument();
    });

    it('should not display count when not provided', () => {
      render(<FilterBar filters={defaultFilters} viewMode="grid" {...mockHandlers} />);

      const countDisplay = screen.queryByText(/\d+개/);
      expect(countDisplay).not.toBeInTheDocument();
    });
  });
});

// Helper function to find text content
function screenByText(text: RegExp | string) {
  return screen.getByText(text, { exact: false });
}
