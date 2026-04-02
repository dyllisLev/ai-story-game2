import type { StoryListItem } from '@story-game/shared';
declare const DEFAULTS: {
    readonly ICON: "📖";
    readonly BANNER_GRADIENT: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    readonly PLAY_COUNT: 0;
    readonly LIKE_COUNT: 0;
    readonly BADGE: null;
    readonly IS_FEATURED: false;
    readonly HAS_PASSWORD: false;
    readonly OWNER_NAME: "Unknown";
};
declare const STORIES_COLUMNS: readonly ["id", "title", "description", "created_at", "updated_at", "author", "tags", "genre", "icon", "image"];
/**
 * Maps raw database row to StoryListItem.
 *
 * Temporary compatibility layer for ai_story_game.stories schema → StoryListItem.
 * Current DB lacks: banner_gradient, play_count, like_count, badge, is_featured, has_password.
 * TODO: Remove once stories_safe view migration is applied.
 */
export declare function mapToStoryListItem(raw: Record<string, unknown>): StoryListItem;
export { STORIES_COLUMNS, DEFAULTS };
