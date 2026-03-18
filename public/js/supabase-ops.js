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
    // SEC-012: stories_safe VIEW 사용 (password_hash 노출 방지, 공개 스토리만)
    const { data, error } = await supabase
      .from('stories_safe')
      .select('*')
      .eq('id', storyId)
      .maybeSingle();
    if (error) throw error;
    if (data) return toCamelCase(data);

    // 비공개 스토리는 VIEW에 없으므로 stories 테이블에서 직접 조회 (소유자만 RLS 통과)
    const [storyRes, salt] = await Promise.all([
      supabase.from('stories')
        .select('id, title, world_setting, story, character_name, character_setting, characters, user_note, system_rules, use_latex, is_public, owner_uid, created_at, updated_at')
        .eq('id', storyId)
        .maybeSingle(),
      getStorySalt(storyId),
    ]);
    if (storyRes.error) throw storyRes.error;
    if (!storyRes.data) return null;
    const result = toCamelCase(storyRes.data);
    result.hasPassword = !!salt;
    return result;
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

// SEC-012: 서버측 암호 검증 (password_hash 노출 없이)
export async function getStorySalt(storyId) {
  try {
    const { data, error } = await supabase.rpc('get_story_salt', { p_story_id: storyId });
    if (error) throw error;
    return data; // salt hex string or null
  } catch (e) {
    console.error('Get story salt failed:', e);
    return null;
  }
}

export async function verifyStoryPassword(storyId, computedHash) {
  try {
    const { data, error } = await supabase.rpc('verify_story_password', {
      p_story_id: storyId,
      p_input_hash: computedHash,
    });
    if (error) throw error;
    return !!data;
  } catch (e) {
    console.error('Verify story password failed:', e);
    return false;
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
    hasPassword: row.has_password ?? false,
    ownerUid: row.owner_uid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
