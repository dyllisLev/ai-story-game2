import { supabase } from './supabase-config.js';
import { initTheme } from './theme.js';
import { escapeHtml } from './utils.js';

initTheme();

// --- Toast ---
let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// --- DOM refs ---
const $ = id => document.getElementById(id);

// --- Preset List ---
let presets = [];

async function loadPresets() {
  const listEl = $('presetList');
  listEl.innerHTML = '<div class="preset-empty">불러오는 중... <span class="spinner"></span></div>';

  try {
    const { data: rows, error } = await supabase.from('presets').select('*');
    if (error) throw error;
    presets = (rows || []).map(row => ({
      id: row.id,
      title: row.title,
      systemRules: row.system_rules,
      worldSetting: row.world_setting,
      story: row.story,
      characters: row.characters,
      characterName: row.character_name,
      characterSetting: row.character_setting,
      userNote: row.user_note,
      useLatex: row.use_latex,
      isDefault: row.is_default,
    }));
    presets.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
    renderPresetList();
  } catch (e) {
    console.error('Preset load failed:', e);
    listEl.innerHTML = `<div class="preset-empty" style="color:var(--accent)">프리셋을 불러오는 데 실패했습니다.</div>`;
  }
}

function renderPresetList() {
  const listEl = $('presetList');
  const activeId = $('editingPresetId').value;

  if (presets.length === 0) {
    listEl.innerHTML = '<div class="preset-empty">프리셋이 없습니다. 새 프리셋을 추가하세요.</div>';
    return;
  }

  listEl.innerHTML = '';
  for (const p of presets) {
    const item = document.createElement('div');
    item.className = `preset-item${p.id === activeId ? ' active' : ''}`;
    item.innerHTML = `
      <div class="preset-item-left">
        <span class="preset-item-title">${escapeHtml(p.title || '(제목 없음)')}</span>
        ${p.isDefault ? '<span class="badge-default">기본</span>' : ''}
      </div>
      <div class="preset-item-actions">
        <button class="btn-icon" data-id="${p.id}" data-action="edit">편집</button>
        <button class="btn-icon danger" data-id="${p.id}" data-action="delete">삭제</button>
      </div>
    `;
    listEl.appendChild(item);
  }
}

// Delegated event listener — attached once, handles all preset list clicks
$('presetList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === 'edit') {
    const preset = presets.find(p => p.id === id);
    if (preset) loadIntoForm(preset);
  } else if (action === 'delete') {
    confirmDelete(id);
  }
});

// --- Form ---
function showForm(mode) {
  $('formSection').style.display = '';
  const badge = $('formModeBadge');
  if (mode === 'new') {
    $('formTitle').textContent = '새 프리셋';
    badge.textContent = '추가';
    badge.className = 'form-mode-badge new';
    $('btnDeletePreset').style.display = 'none';
  } else {
    $('formTitle').textContent = '프리셋 편집';
    badge.textContent = '편집';
    badge.className = 'form-mode-badge edit';
    $('btnDeletePreset').style.display = '';
  }
  $('formSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  $('formSection').style.display = 'none';
  $('editingPresetId').value = '';
  clearForm();
  renderPresetList();
}

function clearForm() {
  $('fieldTitle').value = '';
  $('fieldSystemRules').value = '';
  $('fieldWorldSetting').value = '';
  $('fieldStory').value = '';
  $('fieldCharacters').value = '';
  $('fieldCharacterName').value = '';
  $('fieldCharacterSetting').value = '';
  $('fieldUserNote').value = '';
  $('fieldUseLatex').checked = true;
  $('fieldIsDefault').checked = false;
}

function loadIntoForm(preset) {
  $('editingPresetId').value = preset.id;
  $('fieldTitle').value = preset.title || '';
  $('fieldSystemRules').value = preset.systemRules || '';
  $('fieldWorldSetting').value = preset.worldSetting || '';
  $('fieldStory').value = preset.story || '';
  $('fieldCharacters').value = preset.characters || '';
  $('fieldCharacterName').value = preset.characterName || '';
  $('fieldCharacterSetting').value = preset.characterSetting || '';
  $('fieldUserNote').value = preset.userNote || '';
  $('fieldUseLatex').checked = preset.useLatex !== false;
  $('fieldIsDefault').checked = !!preset.isDefault;
  showForm('edit');
  renderPresetList();
}

function getFormData() {
  return {
    title: $('fieldTitle').value.trim(),
    systemRules: $('fieldSystemRules').value.trim(),
    worldSetting: $('fieldWorldSetting').value.trim(),
    story: $('fieldStory').value.trim(),
    characters: $('fieldCharacters').value.trim(),
    characterName: $('fieldCharacterName').value.trim(),
    characterSetting: $('fieldCharacterSetting').value.trim(),
    userNote: $('fieldUserNote').value.trim(),
    useLatex: $('fieldUseLatex').checked,
    isDefault: $('fieldIsDefault').checked,
  };
}

$('btnNewPreset').addEventListener('click', () => {
  clearForm();
  $('editingPresetId').value = '';
  showForm('new');
  renderPresetList();
  $('fieldTitle').focus();
});

$('btnCancelForm').addEventListener('click', () => {
  hideForm();
});

// --- Save ---
$('btnSavePreset').addEventListener('click', async () => {
  const data = getFormData();
  if (!data.title) {
    showToast('제목을 입력하세요.', 'error');
    $('fieldTitle').focus();
    return;
  }

  const presetId = $('editingPresetId').value;
  const btn = $('btnSavePreset');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 저장 중...';

  try {
    const dbData = {
      title: data.title,
      system_rules: data.systemRules,
      world_setting: data.worldSetting,
      story: data.story,
      characters: data.characters,
      character_name: data.characterName,
      character_setting: data.characterSetting,
      user_note: data.userNote,
      use_latex: data.useLatex,
      is_default: data.isDefault,
    };

    if (presetId) {
      // Update existing
      const { error } = await supabase.from('presets').update(dbData).eq('id', presetId);
      if (error) throw error;
      const idx = presets.findIndex(p => p.id === presetId);
      if (idx !== -1) presets[idx] = { id: presetId, ...data };
      showToast('프리셋이 저장되었습니다.');
    } else {
      // Create new
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('presets').insert({ id: newId, ...dbData });
      if (error) throw error;
      presets.push({ id: newId, ...data });
      presets.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
      $('editingPresetId').value = newId;
      showForm('edit');
      showToast('프리셋이 추가되었습니다.');
    }
    renderPresetList();
  } catch (e) {
    console.error('Preset save failed:', e);
    showToast('저장에 실패했습니다.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '저장';
  }
});

// --- Delete ---
async function confirmDelete(id) {
  const preset = presets.find(p => p.id === id);
  const title = preset?.title || id;
  if (!confirm(`"${title}" 프리셋을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  try {
    const { error } = await supabase.from('presets').delete().eq('id', id);
    if (error) throw error;
    presets = presets.filter(p => p.id !== id);
    if ($('editingPresetId').value === id) hideForm();
    renderPresetList();
    showToast('프리셋이 삭제되었습니다.');
  } catch (e) {
    console.error('Preset delete failed:', e);
    showToast('삭제에 실패했습니다.', 'error');
  }
}

$('btnDeletePreset').addEventListener('click', () => {
  const id = $('editingPresetId').value;
  if (id) confirmDelete(id);
});

// --- Init: Basic Auth로 이미 인증됨, 바로 프리셋 로드 ---
loadPresets();
