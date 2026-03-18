import { supabase, currentUser } from './supabase-config.js';

export async function saveStory(storyData, passwordHash) {
  const storyId = crypto.randomUUID();
  try {
    const isPublic = storyData.isPublic !== undefined ? storyData.isPublic : true;
    const { error } = await supabase.from('stories').insert({
      id: storyId,
      title: storyData.title || '',
      world_setting: storyData.worldSetting || '',
      story: storyData.story || '',
      character_name: storyData.characterName || '',
      character_setting: storyData.characterSetting || '',
      characters: storyData.characters || '',
      user_note: storyData.userNote || '',
      system_rules: storyData.systemRules || '',
      use_latex: storyData.useLatex || false,
      is_public: isPublic,
      password_hash: passwordHash || null,
      owner_uid: currentUser?.id || null,
    });
    if (error) throw error;
    return storyId;
  } catch (e) {
    console.error('Story save failed:', e);
    return null;
  }
}

export async function loadStory(storyId) {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single();
    if (error) throw error;
    return data ? toCamelCase(data) : null;
  } catch (e) {
    console.error('Story load failed:', e);
    return null;
  }
}

export async function updateStory(storyId, storyData, passwordHash) {
  try {
    const { error } = await supabase.from('stories').update({
      title: storyData.title || '',
      world_setting: storyData.worldSetting || '',
      story: storyData.story || '',
      character_name: storyData.characterName || '',
      character_setting: storyData.characterSetting || '',
      characters: storyData.characters || '',
      user_note: storyData.userNote || '',
      system_rules: storyData.systemRules || '',
      use_latex: storyData.useLatex || false,
      is_public: storyData.isPublic !== undefined ? storyData.isPublic : true,
      password_hash: passwordHash,
    }).eq('id', storyId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Story update failed:', e);
    return false;
  }
}

export async function deleteStory(storyId) {
  try {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Story delete failed:', e);
    return false;
  }
}

export async function loadPublicPresets() {
  try {
    const { data, error } = await supabase
      .from('presets')
      .select('*')
      .eq('is_default', true);
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      ...toCamelCase(row),
    }));
  } catch (e) {
    console.error('Preset load failed:', e);
    return [];
  }
}

// snake_case DB 컬럼 → camelCase 프론트엔드 포맷 변환
function toCamelCase(row) {
  return {
    title: row.title,
    worldSetting: row.world_setting,
    story: row.story,
    characterName: row.character_name,
    characterSetting: row.character_setting,
    characters: row.characters,
    userNote: row.user_note,
    systemRules: row.system_rules,
    useLatex: row.use_latex,
    isPublic: row.is_public,
    passwordHash: row.password_hash,
    ownerUid: row.owner_uid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
