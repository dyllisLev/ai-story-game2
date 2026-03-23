import { type FC } from 'react';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PaginationProps {
  page: number;
  totalPages: number;
  /** Called when user selects a new page */
  onPageChange: (page: number) => void;
  /** CSS class name variant: 'home' uses inline styles; 'admin' uses a-pagination classes */
  variant?: 'home' | 'admin';
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Pagination: FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  variant = 'home',
}) => {
  if (totalPages <= 1) return null;

  // Build page window: always show first, last, and ±2 around current
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  if (variant === 'admin') {
    return (
      <div className="a-pagination">
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="a-page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`a-page-btn${page === p ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
              type="button"
            >
              {p}
            </button>
          ),
        )}
      </div>
    );
  }

  return (
    <nav
      aria-label="페이지 네비게이션"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 40,
      }}
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="이전 페이지"
        style={pageButtonStyle(false, page === 1)}
      >
        ‹
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden="true"
            style={{ padding: '0 4px', fontSize: 13, color: 'var(--text-muted)' }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`${p}페이지`}
            aria-current={page === p ? 'page' : undefined}
            style={pageButtonStyle(page === p, false)}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="다음 페이지"
        style={pageButtonStyle(false, page === totalPages)}
      >
        ›
      </button>
    </nav>
  );
};

// ─── Button style helper ──────────────────────────────────────────────────────

function pageButtonStyle(isActive: boolean, isDisabled: boolean): React.CSSProperties {
  return {
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid',
    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    color: isActive ? 'var(--accent)' : isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: 13,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.4 : 1,
  };
}
