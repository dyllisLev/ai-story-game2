import type { StoryListItem } from '@story-game/shared';

// Constants for default values
const DEFAULTS = {
  ICON: '📖' as const,
  BANNER_GRADIENT: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  PLAY_COUNT: 0,
  LIKE_COUNT: 0,
  BADGE: null,
  IS_FEATURED: false,
  HAS_PASSWORD: false,
  OWNER_NAME: 'Unknown',
} as const;

// Current ai_story_game.stories schema columns
const STORIES_COLUMNS = [
  'id',
  'title',
  'description',
  'created_at',
  'updated_at',
  'author',
  'tags',
  'genre',
  'icon',
  'image',
] as const;

/**
 * Maps raw database row to StoryListItem.
 *
 * Temporary compatibility layer for ai_story_game.stories schema → StoryListItem.
 * Current DB lacks: banner_gradient, play_count, like_count, badge, is_featured, has_password.
 * TODO: Remove once stories_safe view migration is applied.
 */
export function mapToStoryListItem(raw: Record<string, unknown>): StoryListItem {
  return {
    id: String(raw.id),
    title: String(raw.title),
    description: String(raw.description ?? ''),
    tags: (raw.tags as string[]) ?? [],
    icon: (raw.icon as string) ?? DEFAULTS.ICON,
    banner_gradient: DEFAULTS.BANNER_GRADIENT,
    play_count: DEFAULTS.PLAY_COUNT,
    like_count: DEFAULTS.LIKE_COUNT,
    badge: DEFAULTS.BADGE,
    is_featured: DEFAULTS.IS_FEATURED,
    has_password: DEFAULTS.HAS_PASSWORD,
    owner_name: (raw.author as string) ?? DEFAULTS.OWNER_NAME,
    created_at: String(raw.created_at),
  };
}

export { STORIES_COLUMNS, DEFAULTS };
