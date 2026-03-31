import { type FC } from 'react';
import { useAdminStories } from '../../hooks/useAdminStories';
import { Pagination } from '../ui/Pagination';
import { genreStyle } from '../../lib/genre';
import { GENRES } from '../../lib/constants';
import { AdminTablePlaceholder } from './AdminTablePlaceholder';

/* ── Main component ── */

export const StoryManagement: FC = () => {
  const {
    stories, totalPages, isLoading,
    filters, updateFilters,
    toggleFeatured, isTogglingFeatured,
  } = useAdminStories();

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">스토리 관리</div>
        <div className="a-section-subtitle">배포된 스토리 목록 · 공개 여부 및 추천 관리</div>
      </div>

      <div className="a-card">
        {/* Filter bar */}
        <div className="a-filter-bar">
          <select
            className="a-filter-select"
            value={filters.genre ?? ''}
            onChange={e => updateFilters({ genre: e.target.value })}
          >
            <option value="">모든 장르</option>
            {GENRES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            className="a-filter-select"
            value={filters.visibility ?? ''}
            onChange={e => updateFilters({ visibility: e.target.value as typeof filters.visibility })}
          >
            <option value="">공개 여부</option>
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>

          <input
            className="a-filter-input"
            placeholder="제목 검색..."
            style={{ width: '160px' }}
            value={filters.search ?? ''}
            onChange={e => updateFilters({ search: e.target.value })}
          />

          <button
            className={`a-filter-btn${filters.featured_only ? ' active' : ''}`}
            onClick={() => updateFilters({ featured_only: !filters.featured_only })}
            style={{ marginLeft: 'auto' }}
            type="button"
          >
            추천만 보기
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>장르</th>
                <th>플레이 수</th>
                <th>공개</th>
                <th>추천</th>
                <th>등록일</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(isLoading || stories.length === 0) ? (
                <AdminTablePlaceholder
                  colSpan={8}
                  isLoading={isLoading}
                  emptyMessage="스토리 없음"
                />
              ) : (
                stories.map(story => {
                  const genreTag = story.tags?.[0] ?? '';
                  return (
                    <tr key={story.id}>
                      <td style={{ color: 'var(--a-ink-primary)', fontWeight: 500 }}>
                        {story.icon} {story.title}
                      </td>
                      <td className="mono">{story.owner_name}</td>
                      <td>
                        {genreTag && (
                          <span
                            className="a-genre-tag"
                            style={{ ...genreStyle(genreTag), fontSize: '8px' }}
                          >
                            {genreTag}
                          </span>
                        )}
                      </td>
                      <td className="mono">{story.play_count.toLocaleString('ko-KR')}</td>
                      <td>
                        <span className={`a-badge ${story.is_public ? 'a-badge-ok' : 'a-badge-info'}`}>
                          {story.is_public ? '공개' : '비공개'}
                        </span>
                      </td>
                      <td>
                        <label className="a-toggle" style={{ display: 'inline-flex' }}>
                          <input
                            type="checkbox"
                            checked={story.is_featured}
                            disabled={isTogglingFeatured}
                            onChange={e => toggleFeatured(story.id, e.target.checked)}
                          />
                          <span className="a-toggle-slider" />
                        </label>
                      </td>
                      <td className="mono" style={{ fontSize: '10px' }}>
                        {story.created_at.slice(0, 10)}
                      </td>
                      <td>
                        <button
                          className="a-filter-btn"
                          style={{ padding: '3px 8px', fontSize: '9px' }}
                          type="button"
                          onClick={() => { window.location.href = `/editor/${story.id}`; }}
                        >
                          편집
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={filters.page}
          totalPages={totalPages}
          onPageChange={page => updateFilters({ page })}
          variant="admin"
        />
      </div>
    </div>
  );
};
