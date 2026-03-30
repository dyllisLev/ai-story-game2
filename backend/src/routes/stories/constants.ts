// backend/src/routes/stories/constants.ts
// Shared column list for story queries — import where needed instead of duplicating.
export const STORY_FIELDS =
  'id, title, description, tags, icon, banner_gradient, play_count, like_count, ' +
  'badge, is_featured, owner_name, world_setting, story, character_name, ' +
  'character_setting, characters, user_note, system_rules, use_latex, is_public, ' +
  'preset, owner_uid, created_at, updated_at';
