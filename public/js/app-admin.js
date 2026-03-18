import { supabase } from './supabase-config.js';
import { initTheme } from './theme.js';
import { escapeHtml } from './utils.js';

initTheme();

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(c => {
      c.style.display = 'none';
      c.classList.remove('active');
    });
    const target = tab === 'presets' ? $('tabPresets') : $('tabConfig');
    target.style.display = '';
    target.classList.add('active');
    if (tab === 'config') loadConfig();
  });
});

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

// --- Safety Thresholds ---
const SAFETY_THRESHOLDS = ['BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_HIGH_AND_ABOVE'];
const SAFETY_CATEGORY_MAP = {
  'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'cfgSafetySexual',
  'HARM_CATEGORY_HATE_SPEECH': 'cfgSafetyHate',
  'HARM_CATEGORY_HARASSMENT': 'cfgSafetyHarassment',
  'HARM_CATEGORY_DANGEROUS_CONTENT': 'cfgSafetyDangerous',
};

for (const elId of Object.values(SAFETY_CATEGORY_MAP)) {
  const sel = $(elId);
  for (const t of SAFETY_THRESHOLDS) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  }
}

// --- Config Load ---
let configLoaded = false;

async function loadConfig() {
  if (configLoaded) return;
  try {
    const { data: rows, error } = await supabase
      .from('config')
      .select('id, value')
      .in('id', ['prompt_config', 'gameplay_config']);
    if (error) throw error;

    let prompt = null, gameplay = null;
    for (const row of rows) {
      if (row.id === 'prompt_config') prompt = row.value;
      else if (row.id === 'gameplay_config') gameplay = row.value;
    }
    if (!prompt || !gameplay) throw new Error('Config rows not found');

    $('cfgSystemPreamble').value = prompt.system_preamble || '';
    $('cfgLatexRules').value = prompt.latex_rules || '';
    $('cfgNarrativeTemplate').value = prompt.narrative_length_template || '';
    $('cfgSummaryInstruction').value = prompt.summary_system_instruction || '';
    $('cfgSummaryNew').value = prompt.summary_request_new || '';
    $('cfgSummaryUpdate').value = prompt.summary_request_update || '';
    $('cfgGameStartMsg').value = prompt.game_start_message || '';
    $('cfgCacheTtl').value = prompt.cache_ttl || '';

    for (const setting of (prompt.safety_settings || [])) {
      const elId = SAFETY_CATEGORY_MAP[setting.category];
      if (elId) $(elId).value = setting.threshold;
    }

    $('cfgDefaultNarrLen').value = gameplay.default_narrative_length;
    $('cfgNarrMin').value = gameplay.narrative_length_min;
    $('cfgNarrMax').value = gameplay.narrative_length_max;
    $('cfgSlidingWindow').value = gameplay.sliding_window_size;
    $('cfgMaxHistory').value = gameplay.max_history;
    $('cfgMsgLimit').value = gameplay.message_limit;
    $('cfgMsgWarning').value = gameplay.message_warning_threshold;
    $('cfgSummaryOffset').value = gameplay.summary_trigger_offset;
    $('cfgSummaryMaxChars').value = gameplay.summary_max_chars;
    $('cfgAutoSaveMs').value = gameplay.auto_save_interval_ms;
    $('cfgMaxSessions').value = gameplay.max_session_list;

    configLoaded = true;
  } catch (e) {
    console.error('Config load failed:', e);
    showToast('설정을 불러오는 데 실패했습니다.', 'error');
  }
}

// --- Config Validation ---
function validateConfig(prompt, gameplay) {
  const promptFields = ['system_preamble', 'latex_rules', 'narrative_length_template',
    'summary_system_instruction', 'summary_request_new', 'summary_request_update', 'game_start_message'];
  for (const f of promptFields) {
    if (!prompt[f]?.trim()) return `프롬프트 필드 "${f}"는 비워둘 수 없습니다.`;
  }
  if (!/^\d+s$/.test(prompt.cache_ttl)) return '캐시 TTL은 "숫자s" 형식이어야 합니다 (예: 3600s).';

  for (const [key, val] of Object.entries(gameplay)) {
    if (typeof val !== 'number' || isNaN(val) || val <= 0) return `"${key}" 값은 0보다 커야 합니다.`;
  }
  if (gameplay.narrative_length_min < 1) return '서술 길이 최소값은 1 이상이어야 합니다.';
  if (gameplay.narrative_length_max <= gameplay.narrative_length_min) return '서술 길이 최대값은 최소값보다 커야 합니다.';
  if (gameplay.default_narrative_length < gameplay.narrative_length_min || gameplay.default_narrative_length > gameplay.narrative_length_max) {
    return '기본 서술 길이는 최소~최대 범위 내여야 합니다.';
  }
  if (gameplay.message_warning_threshold >= gameplay.message_limit) return '경고 임계값은 메시지 한도보다 작아야 합니다.';
  return null;
}

// --- Config Save ---
$('btnSaveConfig').addEventListener('click', async () => {
  const promptData = {
    system_preamble: $('cfgSystemPreamble').value,
    latex_rules: $('cfgLatexRules').value,
    narrative_length_template: $('cfgNarrativeTemplate').value,
    summary_system_instruction: $('cfgSummaryInstruction').value,
    summary_request_new: $('cfgSummaryNew').value,
    summary_request_update: $('cfgSummaryUpdate').value,
    game_start_message: $('cfgGameStartMsg').value,
    cache_ttl: $('cfgCacheTtl').value.trim(),
    safety_settings: Object.entries(SAFETY_CATEGORY_MAP).map(([category, elId]) => ({
      category,
      threshold: $(elId).value,
    })),
  };

  const gameplayData = {
    default_narrative_length: parseInt($('cfgDefaultNarrLen').value, 10),
    narrative_length_min: parseInt($('cfgNarrMin').value, 10),
    narrative_length_max: parseInt($('cfgNarrMax').value, 10),
    sliding_window_size: parseInt($('cfgSlidingWindow').value, 10),
    max_history: parseInt($('cfgMaxHistory').value, 10),
    message_limit: parseInt($('cfgMsgLimit').value, 10),
    message_warning_threshold: parseInt($('cfgMsgWarning').value, 10),
    summary_trigger_offset: parseInt($('cfgSummaryOffset').value, 10),
    summary_max_chars: parseInt($('cfgSummaryMaxChars').value, 10),
    auto_save_interval_ms: parseInt($('cfgAutoSaveMs').value, 10),
    max_session_list: parseInt($('cfgMaxSessions').value, 10),
  };

  const validationError = validateConfig(promptData, gameplayData);
  if (validationError) {
    showToast(validationError, 'error');
    return;
  }

  const btn = $('btnSaveConfig');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 저장 중...';

  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptConfig: promptData, gameplayConfig: gameplayData }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Save failed');
    configLoaded = false;
    showToast('설정이 저장되었습니다. 5분 이내에 반영됩니다.');
  } catch (e) {
    console.error('Config save failed:', e);
    showToast('설정 저장에 실패했습니다: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '설정 저장';
  }
});

// --- Init: Basic Auth로 이미 인증됨, 바로 프리셋 로드 ---
loadPresets();
