import { type FC } from 'react';
import { Link } from 'react-router';
import type { StoryListItem } from '@story-game/shared';

// ─── Tag color map (same as StoryCard) ───────────────────────────────────────

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

// ─── StoryListRow ─────────────────────────────────────────────────────────────

interface StoryListRowProps {
  story: StoryListItem;
  animationDelay?: number;
}

export const StoryListRow: FC<StoryListRowProps> = ({ story, animationDelay = 0 }) => {
  return (
    <Link
      to={`/play/${story.id}`}
      aria-label={`${story.title} 스토리 플레이`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        animation: 'card-in 0.3s ease-out both',
        animationDelay: `${animationDelay}s`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border-hover)';
        el.style.background = 'var(--bg-card-hover)';
        el.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border)';
        el.style.background = 'var(--bg-card)';
        el.style.transform = 'none';
      }}
    >
      {/* Icon */}
      <div
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
          background: story.banner_gradient,
        }}
      >
        {story.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {story.title}
          {story.has_password && <span aria-label="비밀번호 보호" style={{ marginLeft: 6, fontSize: 12 }}>🔒</span>}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {story.description}
        </div>
        {/* Tags */}
        {story.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {story.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={tagStyle(tag)}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 12,
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
        aria-label={`플레이 ${story.play_count}회, 좋아요 ${story.like_count}개, 작성자 ${story.owner_name}`}
      >
        <span>▶ {formatCount(story.play_count)}</span>
        <span>♡ {formatCount(story.like_count)}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{story.owner_name}</span>
      </div>
    </Link>
  );
};

// ─── StoryList (list view wrapper) ───────────────────────────────────────────

interface StoryListProps {
  stories: StoryListItem[];
}

export const StoryList: FC<StoryListProps> = ({ stories }) => (
  <div role="list" aria-label="스토리 목록" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {stories.map((story, i) => (
      <div key={story.id} role="listitem">
        <StoryListRow story={story} animationDelay={i * 0.04} />
      </div>
    ))}
  </div>
);
