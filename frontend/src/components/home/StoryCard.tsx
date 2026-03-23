import { type FC } from 'react';
import { Link } from 'react-router';
import type { StoryListItem } from '@story-game/shared';

// ─── Tag color map ────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  무협:   { bg: 'rgba(197,168,74,0.12)',   color: '#e0c870' },
  판타지: { bg: 'rgba(124,109,240,0.15)', color: '#a99eff' },
  현대:   { bg: 'rgba(74,184,168,0.12)',   color: '#7ae0d4' },
  로맨스: { bg: 'rgba(224,90,122,0.12)',   color: '#f0a0b8' },
  공포:   { bg: 'rgba(180,60,60,0.15)',    color: '#f07070' },
  SF:     { bg: 'rgba(74,184,168,0.12)',   color: '#7ae0d4' },
  미스터리:{ bg: 'rgba(160,140,200,0.15)', color: '#c0aee8' },
  역사:   { bg: 'rgba(197,168,74,0.12)',   color: '#e0c870' },
  심리:   { bg: 'rgba(224,90,122,0.12)',   color: '#f0a0b8' },
};

function tagStyle(tag: string): React.CSSProperties {
  const c = TAG_COLORS[tag] ?? { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
  return {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    background: c.bg,
    color: c.color,
  };
}

// ─── Stat icon helpers ────────────────────────────────────────────────────────

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ─── StoryCard (grid view) ────────────────────────────────────────────────────

export interface StoryCardProps {
  story: StoryListItem;
  animationDelay?: number;
}

export const StoryCard: FC<StoryCardProps> = ({ story, animationDelay = 0 }) => {
  return (
    <Link
      to={`/play/${story.id}`}
      aria-label={`${story.title} 스토리 플레이`}
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
        animation: 'card-in 0.35s ease-out both',
        animationDelay: `${animationDelay}s`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border-hover)';
        el.style.background = 'var(--bg-card-hover)';
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)';
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
          height: 130,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 12,
          background: story.banner_gradient,
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 20%, rgba(22,22,31,0.85) 100%)',
          }}
        />
        {/* Icon */}
        <span style={{ position: 'relative', zIndex: 1, fontSize: 36 }}>
          {story.icon}
        </span>

        {/* Badge */}
        {story.badge && (
          <span
            aria-label={story.badge === 'new' ? '새 스토리' : '인기 스토리'}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 1,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
              ...(story.badge === 'new'
                ? {
                    background: 'rgba(124,109,240,0.3)',
                    color: '#b5aaff',
                    border: '1px solid rgba(124,109,240,0.4)',
                  }
                : {
                    background: 'rgba(224,90,122,0.25)',
                    color: '#f0a0b8',
                    border: '1px solid rgba(224,90,122,0.4)',
                  }),
            }}
          >
            {story.badge === 'new' ? 'NEW' : 'HOT'}
          </span>
        )}

        {/* Lock badge */}
        {story.has_password && (
          <span
            aria-label="비밀번호 보호"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
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
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flex: 1,
        }}
      >
        {/* Tags */}
        {story.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {story.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={tagStyle(tag)}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
          }}
        >
          {story.title}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
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
            플레이
          </span>
        </div>
      </div>
    </Link>
  );
};
