import { type FC } from 'react';
import { Link } from 'react-router';
import type { StoryListItem } from '@story-game/shared';
import { useConfig } from '@/hooks/useConfig';
import { tagStyle } from '@/lib/genre';
import { formatCount } from '@/lib/format';

// ─── StoryListRow ─────────────────────────────────────────────────────────────

interface StoryListRowProps {
  story: StoryListItem;
  animationDelay?: number;
}

export const StoryListRow: FC<StoryListRowProps> = ({ story, animationDelay = 0 }) => {
  const { data: config } = useConfig();
  const genreConfig = config?.genreConfig ?? { genres: [] };

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
              <span key={tag} style={tagStyle(tag, genreConfig)}>{tag}</span>
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
