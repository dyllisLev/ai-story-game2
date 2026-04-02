/**
 * Story field selection constants
 * Centralized to maintain consistency across routes and ensure type safety
 */
// Fields for StoryListItem interface (list/card view)
export const STORY_LIST_ITEM_FIELDS = [
    'id',
    'title',
    'description',
    'tags',
    'icon',
    'banner_gradient',
    'play_count',
    'like_count',
    'badge',
    'is_featured',
    'owner_name',
    'created_at',
];
// For stories_safe view which includes computed has_password field
export const STORIES_SAFE_VIEW_FIELDS = [
    ...STORY_LIST_ITEM_FIELDS,
    'has_password',
];
// For direct stories table queries (need to compute has_password)
export const STORIES_TABLE_FIELDS = [
    ...STORY_LIST_ITEM_FIELDS,
    '(password_hash IS NOT NULL) AS has_password',
];
// Convert string arrays to comma-separated strings for Supabase queries
export const STORY_LIST_ITEM_FIELDS_STR = STORY_LIST_ITEM_FIELDS.join(', ');
export const STORIES_SAFE_VIEW_FIELDS_STR = STORIES_SAFE_VIEW_FIELDS.join(', ');
export const STORIES_TABLE_FIELDS_STR = STORIES_TABLE_FIELDS.join(', ');
//# sourceMappingURL=story-constants.js.map