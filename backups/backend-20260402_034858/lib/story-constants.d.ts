/**
 * Story field selection constants
 * Centralized to maintain consistency across routes and ensure type safety
 */
export declare const STORY_LIST_ITEM_FIELDS: readonly ["id", "title", "description", "tags", "icon", "banner_gradient", "play_count", "like_count", "badge", "is_featured", "owner_name", "created_at"];
export declare const STORIES_SAFE_VIEW_FIELDS: readonly ["id", "title", "description", "tags", "icon", "banner_gradient", "play_count", "like_count", "badge", "is_featured", "owner_name", "created_at", "has_password"];
export declare const STORIES_TABLE_FIELDS: readonly ["id", "title", "description", "tags", "icon", "banner_gradient", "play_count", "like_count", "badge", "is_featured", "owner_name", "created_at", "(password_hash IS NOT NULL) AS has_password"];
export declare const STORY_LIST_ITEM_FIELDS_STR: string;
export declare const STORIES_SAFE_VIEW_FIELDS_STR: string;
export declare const STORIES_TABLE_FIELDS_STR: string;
