import { type FC } from 'react';
import { Link } from 'react-router';
import { useFeaturedStories } from '@/hooks/useStories';
import type { StoryListItem } from '@story-game/shared';

// ─── Tag color map ────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  무협:    { bg: 'rgba(197,168,74,0.12)',  color: '#e0c870' },
  판타지:  { bg: 'rgba(124,109,240,0.15)', color: '#a99eff' },
  현대:    { bg: 'rgba(74,184,168,0.12)',  color: '#7ae0d4' },
  로맨스:  { bg: 'rgba(224,90,122,0.12)',  color: '#f0a0b8' },
  공포:    { bg: 'rgba(180,60,60,0.15)',   color: '#f07070' },
  SF:      { bg: 'rgba(74,184,168,0.12)',  color: '#7ae0d4' },
  미스터리:{ bg: 'rgba(160,140,200,0.15)', color: '#c0aee8' },
  역사:    { bg: 'rgba(197,168,74,0.12)',  color: '#e0c870' },
  심리:    { bg: 'rgba(224,90,122,0.12)',  color: '#f0a0b8' },
};

function tagStyle(tag: string): React.CSSProperties {
  const c = TAG_COLORS[tag] ?? { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
  return { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: c.bg, color: c.color };
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ─── Star icon ────────────────────────────────────────────────────────────────

const StarIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="none" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// ─── FeaturedCard ─────────────────────────────────────────────────────────────

interface FeaturedCardProps {
  story: StoryListItem;
}

const FeaturedCard: FC<FeaturedCardProps> = ({ story }) => (
  <Link
    to={`/play/${story.id}`}
    aria-label={`추천 스토리: ${story.title}`}
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all var(--transition)',
      display: 'flex',
      flexDirection: 'column',
      textDecoration: 'none',
      color: 'inherit',
      position: 'relative',
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget;
      el.style.borderColor = 'var(--border-hover)';
      el.style.background = 'var(--bg-card-hover)';
      el.style.transform = 'translateY(-3px)';
      el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)';
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget;
      el.style.borderColor = 'var(--border)';
      el.style.background = 'var(--bg-card)';
      el.style.transform = 'none';
      el.style.boxShadow = 'none';
    }}
  >
    {/* Banner */}
    <div
      aria-hidden="true"
      style={{
        height: 180,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 16,
        background: story.banner_gradient,
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: story.banner_gradient,
          filter: 'blur(20px)',
          opacity: 0.4,
        }}
      />
      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(22,22,31,0.9) 100%)',
        }}
      />
      {/* Icon */}
      <span style={{ position: 'relative', zIndex: 1, fontSize: 52 }}>{story.icon}</span>

      {/* FEATURED badge */}
      <span
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          background: 'rgba(197,168,74,0.25)',
          color: 'var(--accent)',
          border: '1px solid rgba(197,168,74,0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        FEATURED
      </span>

      {/* Lock badge */}
      {story.has_password && (
        <span
          aria-label="비밀번호 보호"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'rgba(10,10,15,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border)',
            fontSize: 12,
          }}
        >
          🔒
        </span>
      )}
    </div>

    {/* Body */}
    <div
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
      }}
    >
      {/* Tags */}
      {story.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {story.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={tagStyle(tag)}>{tag}</span>
          ))}
        </div>
      )}

      {/* Title */}
      <div
        style={{
          fontFamily: "'Noto Serif KR', serif",
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
        }}
      >
        {story.title}
      </div>

      {/* Description */}
      {story.description && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.description}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span aria-label={`플레이 ${story.play_count}회`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            ▶ {formatCount(story.play_count)}
          </span>
          <span aria-label={`좋아요 ${story.like_count}개`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            ♡ {formatCount(story.like_count)}
          </span>
          {story.owner_name && (
            <span style={{ color: 'var(--text-secondary)' }}>{story.owner_name}</span>
          )}
        </div>
        <span
          aria-hidden="true"
          style={{
            height: 30,
            padding: '0 14px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            borderRadius: 6,
            color: 'var(--accent)',
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          ▶ 플레이
        </span>
      </div>
    </div>
  </Link>
);

// ─── FeaturedSection ──────────────────────────────────────────────────────────

export const FeaturedSection: FC = () => {
  const { data, isLoading } = useFeaturedStories(4);
  const stories = data?.data ?? [];

  if (!isLoading && stories.length === 0) return null;

  return (
    <section aria-labelledby="featuredTitle" style={{ marginBottom: 56 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h2
          id="featuredTitle"
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <StarIcon />
          추천 스토리
          <span
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--purple-dim)',
              color: 'var(--purple)',
            }}
          >
            FEATURED
          </span>
        </h2>
      </div>

      {isLoading ? (
        <div
          role="list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              role="listitem"
              aria-busy="true"
              aria-label="로딩 중"
              style={{
                height: 350,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                animation: 'pulse 1.5s ease-in-out infinite',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : (
        <div
          role="list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          {stories.map((story) => (
            <div key={story.id} role="listitem">
              <FeaturedCard story={story} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
