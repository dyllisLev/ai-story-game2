import { type FC } from 'react';
import type { StoryListItem } from '@story-game/shared';
import { StoryCard } from './StoryCard';

interface StoryGridProps {
  stories: StoryListItem[];
}

export const StoryGrid: FC<StoryGridProps> = ({ stories }) => (
  <div
    role="list"
    aria-label="스토리 목록 그리드"
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 14,
    }}
  >
    {stories.map((story, i) => (
      <div key={story.id} role="listitem">
        <StoryCard story={story} animationDelay={i * 0.04} />
      </div>
    ))}
  </div>
);
