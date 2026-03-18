import { supabase, promptConfig, gameplayConfig } from './supabase-config.js';
import { hashPassword, computeHashWithSalt } from './crypto.js';
import { saveStory, loadStory, updateStory, deleteStory, loadPublicPresets, getStorySalt, verifyStoryPassword } from './supabase-ops.js';
import { renderMarkdown } from './markdown-renderer.js';
import { updateTokenDisplay, resetTokens } from './token-tracker.js';
import { escapeHtml } from './utils.js';
import { initTheme } from './theme.js';
import { buildPrompt } from './prompt-builder.js';
import { fetchModels as _fetchModels, createCache as _createCache, clearCache as _clearCache, streamGenerate } from './gemini-api.js';

if (!promptConfig || !gameplayConfig) {
  document.body.innerHTML = '<div style="padding:40px;color:#e94560;font-size:16px;">앱 설정을 불러올 수 없습니다. 관리자에게 문의하세요.</div>';
  throw new Error('앱 설정을 불러올 수 없습니다.');
}

// --- DOM References ---
const $ = id => document.getElementById(id);

const els = {
  presetTitle: $('presetTitle'),
  apiKey: $('apiKey'),
  modelSelect: $('modelSelect'),
  worldSetting: $('worldSetting'),
  story: $('story'),
  characterName: $('characterName'),
  characterSetting: $('characterSetting'),
  characters: $('characters'),
  userNote: $('userNote'),
  systemRules: $('systemRules'),
  promptPreview: $('promptPreview'),
  gameOutput: $('gameOutput'),
  gameInput: $('gameInput'),
  btnStart: $('btnStart'),
  btnSend: $('btnSend'),
  btnRegenerate: $('btnRegenerate'),
  btnSave: $('btnSave'),
  btnLoad: $('btnLoad'),
  isPublic: $('isPublic'),
  useLatex: $('useLatex'),
  useCache: $('useCache'),
  cacheStatus: $('cacheStatus'),
  tokenInfo: $('tokenInfo'),
  costInfo: $('costInfo'),
  narrativeLengthDisplay: $('narrativeLengthDisplay'),
};

// --- Narrative Length ---
let narrativeLength = gameplayConfig.default_narrative_length;
function updateNarrativeDisplay() {
  els.narrativeLengthDisplay.textContent = narrativeLength + '문단';
}
$('btnNarrDec').addEventListener('click', () => {
  if (narrativeLength > gameplayConfig.narrative_length_min) { narrativeLength--; updateNarrativeDisplay(); }
});
$('btnNarrInc').addEventListener('click', () => {
  if (narrativeLength < gameplayConfig.narrative_length_max) { narrativeLength++; updateNarrativeDisplay(); }
});

// --- Prompt Builder (uses shared module) ---
function getPrompt() {
  return buildPrompt({
    worldSetting: els.worldSetting.value,
    story: els.story.value,
    characterName: els.characterName.value,
    characterSetting: els.characterSetting.value,
    characters: els.characters.value,
    userNote: els.userNote.value,
    systemRules: els.systemRules.value,
  }, { useLatex: els.useLatex.checked, narrativeLength }, promptConfig);
}

function updatePromptPreview() {
  const prompt = getPrompt();
  const escaped = escapeHtml(prompt);
  const sectionMatch = escaped.match(/\[(시스템 규칙|세계관|스토리|주인공|유저노트|LaTeX 연출 규칙)\]/);
  const firstSectionIdx = sectionMatch ? sectionMatch.index : -1;
  let html;
  if (firstSectionIdx > 0) {
    const preamble = escaped.substring(0, firstSectionIdx);
    const rest = escaped.substring(firstSectionIdx);
    html = `<span class="prompt-system">${preamble.trim()}</span>\n\n` +
      rest.replace(/\[(시스템 규칙)\]/g, '<span class="prompt-system">[$1]</span>')
           .replace(/\[(세계관|스토리|등장인물|주인공|유저노트|LaTeX 연출 규칙)\]/g, '<span class="prompt-section">[$1]</span>');
  } else {
    html = `<span class="prompt-system">${escaped}</span>`;
  }
  els.promptPreview.innerHTML = html;
}

const inputFields = ['presetTitle', 'systemRules', 'worldSetting', 'story', 'characters', 'characterName', 'characterSetting', 'userNote'];

// Task #1: Debounce preview + localStorage
let previewTimer = null;
let saveTimer = null;
function debouncedPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePromptPreview, 300);
}
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToLocalStorage, 500);
}

inputFields.forEach(id => {
  els[id].addEventListener('input', debouncedPreview);
});

updatePromptPreview();

// --- localStorage ---
const STORAGE_KEY = 'ai-story-game-settings';

function getSettingsData() {
  return {
    title: els.presetTitle.value,
    model: els.modelSelect.value,
    worldSetting: els.worldSetting.value,
    story: els.story.value,
    characterName: els.characterName.value,
    characterSetting: els.characterSetting.value,
    characters: els.characters.value,
    userNote: els.userNote.value,
    systemRules: els.systemRules.value,
    useLatex: els.useLatex.checked,
    useCache: els.useCache.checked,
    isPublic: els.isPublic.checked,
  };
}

function applySettingsData(data) {
  if ('title' in data) els.presetTitle.value = data.title || '';
  if ('model' in data) els.modelSelect.value = data.model || '';
  if ('characters' in data) els.characters.value = data.characters || '';
  if ('systemRules' in data) els.systemRules.value = data.systemRules || '';
  if ('useLatex' in data) els.useLatex.checked = !!data.useLatex;
  if ('useCache' in data) els.useCache.checked = !!data.useCache;
  if ('isPublic' in data) els.isPublic.checked = data.isPublic !== false;
  if ('worldSetting' in data) els.worldSetting.value = data.worldSetting || '';
  if ('story' in data) els.story.value = data.story || '';
  if ('characterName' in data) els.characterName.value = data.characterName || '';
  if ('characterSetting' in data) els.characterSetting.value = data.characterSetting || '';
  if ('userNote' in data) els.userNote.value = data.userNote || '';
  updatePromptPreview();
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettingsData()));
  // SEC-006: API 키는 sessionStorage에만 저장 (탭 종료 시 삭제)
  if (els.apiKey.value) sessionStorage.setItem('gemini-api-key', els.apiKey.value);
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { applySettingsData(JSON.parse(saved)); } catch (e) {}
  }
}

// Auto-save on any input change (debounced)
[...inputFields, 'apiKey'].forEach(id => {
  els[id].addEventListener('input', debouncedSave);
});
els.modelSelect.addEventListener('change', saveToLocalStorage);

// --- Story Save/Load (Supabase) ---
let currentStoryId = null;
let currentPasswordHash = null;

els.btnSave.addEventListener('click', async () => {
  if (!supabase) { alert('Supabase가 설정되지 않았습니다.'); return; }

  // 첫 저장 시 암호 설정
  if (!currentPasswordHash) {
    const password = prompt('스토리 수정 암호를 설정하세요 (필수):');
    if (!password) { alert('암호는 필수입니다.'); return; }
    currentPasswordHash = await hashPassword(password);
  }

  const data = getSettingsData();
  delete data.apiKey;
  delete data.model;

  if (currentStoryId) {
    // 기존 스토리 업데이트
    const ok = await updateStory(currentStoryId, data, currentPasswordHash);
    alert(ok ? '스토리가 저장되었습니다.' : '저장에 실패했습니다.');
  } else {
    // 새 스토리 생성
    const storyId = await saveStory(data, currentPasswordHash);
    if (storyId) {
      currentStoryId = storyId;
      updateSaveButtonText();
      if (!els.isPublic.checked) {
        alert(`스토리가 저장되었습니다.\n비공개 스토리입니다. 공유하려면 ID를 복사하세요.\nID: ${storyId}`);
      } else {
        alert('스토리가 저장되었습니다.');
      }
    } else {
      alert('저장에 실패했습니다.');
    }
  }
});

els.btnLoad.addEventListener('click', async () => {
  if (!supabase) { alert('Supabase가 설정되지 않았습니다.'); return; }
  const storyId = prompt('스토리 ID를 입력하세요:');
  if (!storyId) return;

  const existing = await loadStory(storyId);
  if (!existing) { alert('스토리를 찾을 수 없습니다.'); return; }

  if (!existing.hasPassword) { alert('이 스토리는 암호가 설정되지 않아 편집할 수 없습니다.'); return; }
  const password = prompt('암호를 입력하세요:');
  if (!password) return;

  // SEC-012: 서버측 암호 검증
  const salt = await getStorySalt(storyId);
  if (!salt) { alert('암호 검증에 실패했습니다.'); return; }
  const computedHash = await computeHashWithSalt(password, salt);
  if (!(await verifyStoryPassword(storyId, computedHash))) {
    alert('암호가 일치하지 않습니다.');
    return;
  }

  loadAndApplyStory(existing);
  currentStoryId = storyId;
  currentPasswordHash = computedHash;
  updateSaveButtonText();
  alert('스토리를 불러왔습니다.');
});

// Task #5: CSS class instead of inline styles
function updateSaveButtonText() {
  if (currentStoryId) {
    els.btnSave.textContent = `저장 (${currentStoryId.slice(0, 8)}...)`;
    els.btnSave.classList.add('btn-saved');
  }
}

// Task #3: Unified button state toggle
function setGameControlsEnabled(enabled) {
  els.gameInput.disabled = !enabled;
  els.btnSend.disabled = !enabled;
  els.btnRegenerate.disabled = !enabled || conversationHistory.length < 2;
  els.btnStart.disabled = !enabled;
}

// Task #4: Unified story apply helper
function loadAndApplyStory(data) {
  applySettingsData(data);
  saveToLocalStorage();
}

// --- Gemini API (shared module) ---
function getSavedModel() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved).model || '';
  } catch (e) {}
  return '';
}

async function fetchModels(apiKey) {
  await _fetchModels(apiKey, els.modelSelect, { savedModel: getSavedModel() });
}

// Debounced API key input → fetch models
let apiKeyTimer = null;
els.apiKey.addEventListener('input', () => {
  clearTimeout(apiKeyTimer);
  apiKeyTimer = setTimeout(() => {
    const key = els.apiKey.value.trim();
    if (key) sessionStorage.setItem('gemini-api-key', key);
    fetchModels(key);
  }, 800);
});

// Load only API key on fresh page (story fields start empty)
// Full restore happens only via URL param (?storyId=...)
// API 키는 sessionStorage에서 복원, 모델은 localStorage에서 복원
const sessionApiKey = sessionStorage.getItem('gemini-api-key');
if (sessionApiKey) els.apiKey.value = sessionApiKey;
const savedRaw = localStorage.getItem(STORAGE_KEY);
if (savedRaw) {
  try {
    const saved = JSON.parse(savedRaw);
    // localStorage에 남아있는 레거시 apiKey 마이그레이션
    if (!sessionApiKey && saved.apiKey) {
      els.apiKey.value = saved.apiKey;
      sessionStorage.setItem('gemini-api-key', saved.apiKey);
      delete saved.apiKey;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
    if (saved.model) els.modelSelect.value = saved.model;
  } catch (e) {}
}
if (els.apiKey.value.trim()) fetchModels(els.apiKey.value.trim());

// --- Cache ---
let cachedContentName = null;

async function createCache(apiKey, model) {
  const result = await _createCache(apiKey, model, getPrompt(), els.cacheStatus, promptConfig.cache_ttl);
  if (result) {
    cachedContentName = result.name;
    return true;
  }
  cachedContentName = null;
  return false;
}

function clearCache() {
  cachedContentName = _clearCache(els.cacheStatus);
}

els.useLatex.addEventListener('change', () => {
  saveToLocalStorage();
  updatePromptPreview();
});

els.useCache.addEventListener('change', () => {
  if (!els.useCache.checked) clearCache();
  saveToLocalStorage();
});

// --- Game State ---
const MAX_HISTORY = gameplayConfig.max_history;
let conversationHistory = [];
let isGenerating = false;

// Task #2: Unified render helper
function renderResponse(div, text) {
  div.innerHTML = renderMarkdown(text);
  div.classList.add('markdown-rendered');
  els.gameOutput.scrollTop = els.gameOutput.scrollHeight;
}

function appendToGame(text, className) {
  const placeholder = els.gameOutput.querySelector('.game-placeholder');
  if (placeholder) placeholder.remove();

  const div = document.createElement('div');
  div.className = `game-text ${className}`;
  div.textContent = text;
  els.gameOutput.appendChild(div);
  els.gameOutput.scrollTop = els.gameOutput.scrollHeight;
  return div;
}

async function sendToGemini(userMessage) {
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;

  if (!apiKey || !model) {
    alert('API Key와 모델을 선택해주세요.');
    return;
  }

  isGenerating = true;
  setGameControlsEnabled(false);

  conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  const responseDiv = appendToGame('', 'narrator');
  responseDiv.classList.add('loading');

  try {
    const body = cachedContentName
      ? { cachedContent: cachedContentName, contents: conversationHistory, safetySettings: promptConfig.safety_settings }
      : { system_instruction: { parts: [{ text: getPrompt() }] }, contents: conversationHistory, safetySettings: promptConfig.safety_settings };

    let renderTimer = null;
    const { text: fullResponse, usageMetadata } = await streamGenerate({
      apiKey, model, body,
      onChunk(textSoFar) {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => renderResponse(responseDiv, textSoFar), 80);
      },
    });

    // Final render with complete markdown
    clearTimeout(renderTimer);
    renderResponse(responseDiv, fullResponse);

    // Update token & cost display
    if (usageMetadata) updateTokenDisplay(usageMetadata, model, els.tokenInfo, els.costInfo);

    conversationHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
    // Task #6: Limit history to MAX_HISTORY messages
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }
  } catch (err) {
    console.error('Gemini API error:', err);
    responseDiv.textContent = '[오류] API 요청에 실패했습니다. API 키와 모델을 확인해주세요.';
    responseDiv.style.color = 'var(--accent)';
    conversationHistory.pop();
  } finally {
    responseDiv.classList.remove('loading');
    isGenerating = false;
    setGameControlsEnabled(true);
    els.gameInput.focus();
  }
}

// --- Game Controls ---
els.btnStart.addEventListener('click', async () => {
  if (isGenerating) return;
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey) { alert('API Key를 입력해주세요.'); els.apiKey.focus(); return; }
  if (!model) { alert('모델을 선택해주세요.'); return; }
  conversationHistory = [];
  els.gameOutput.innerHTML = '';
  resetTokens(els.tokenInfo, els.costInfo);
  setGameControlsEnabled(true);

  // 캐시 설정
  clearCache();
  if (els.useCache.checked) {
    const ok = await createCache(apiKey, model);
    if (!ok) {
      alert('캐시 생성에 실패했습니다. 캐시 없이 진행합니다.');
    }
  }

  sendToGemini(promptConfig.game_start_message);
});

els.btnSend.addEventListener('click', () => {
  if (isGenerating) return;
  const text = els.gameInput.value.trim();
  if (!text) return;
  appendToGame(`▸ ${text}`, 'user-action');
  els.gameInput.value = '';
  sendToGemini(text);
});

els.btnRegenerate.addEventListener('click', () => {
  if (isGenerating || conversationHistory.length < 2) return;
  const lastModel = conversationHistory[conversationHistory.length - 1];
  if (lastModel.role !== 'model') return;
  conversationHistory.pop();
  const lastUser = conversationHistory.pop();
  const lastUserText = lastUser.parts[0].text;
  const narrators = els.gameOutput.querySelectorAll('.game-text.narrator');
  if (narrators.length) narrators[narrators.length - 1].remove();
  sendToGemini(lastUserText);
});

els.gameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.btnSend.click();
  }
});

// --- Story Share (Copy ID) ---
$('btnShareStory').addEventListener('click', async () => {
  if (!currentStoryId) { alert('먼저 저장해주세요.'); return; }
  try {
    await navigator.clipboard.writeText(currentStoryId);
    alert(`스토리 ID가 복사되었습니다.\n${currentStoryId}`);
  } catch (e) {
    prompt('스토리 ID를 복사하세요:', currentStoryId);
  }
});

// --- Story Delete ---
$('btnDelete').addEventListener('click', async () => {
  if (!supabase) { alert('Supabase가 설정되지 않았습니다.'); return; }
  if (!currentStoryId) { alert('먼저 저장하거나 불러오세요.'); return; }

  const password = prompt('삭제하려면 암호를 입력하세요:');
  if (!password) return;

  // SEC-012: 서버측 암호 검증
  const delSalt = await getStorySalt(currentStoryId);
  if (!delSalt) { alert('암호 검증에 실패했습니다.'); return; }
  const delHash = await computeHashWithSalt(password, delSalt);
  if (!(await verifyStoryPassword(currentStoryId, delHash))) {
    alert('암호가 일치하지 않습니다.');
    return;
  }

  if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

  const ok = await deleteStory(currentStoryId);
  if (ok) {
    alert('스토리가 삭제되었습니다.');
    currentStoryId = null;
    currentPasswordHash = null;
    els.btnSave.textContent = '저장';
    els.btnSave.classList.remove('btn-saved');
  } else {
    alert('삭제에 실패했습니다.');
  }
});

// --- Preset System ---
async function initPresets() {
  const presets = await loadPublicPresets();
  for (const p of presets) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title || p.id;
    opt.dataset.preset = JSON.stringify(p);
    $('presetSelect').appendChild(opt);
  }
}

$('presetSelect').addEventListener('change', (e) => {
  const opt = e.target.selectedOptions[0];
  if (!opt?.dataset?.preset) return;
  const data = JSON.parse(opt.dataset.preset);
  applySettingsData(data);
  saveToLocalStorage();
});

initPresets();

// --- Auto-load story from URL param ---
(async () => {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('storyId');
  if (!storyId || !supabase) return;

  const data = await loadStory(storyId);
  if (!data) { alert('스토리를 찾을 수 없습니다.'); return; }

  if (!data.hasPassword) {
    loadAndApplyStory(data);
    alert('암호가 없는 스토리입니다. 읽기 전용으로 로드되었습니다.');
    return;
  }

  const password = prompt('이 스토리는 암호로 보호되어 있습니다.\n수정하려면 암호를 입력하세요:');
  if (!password) {
    loadAndApplyStory(data);
    return;
  }

  // SEC-012: 서버측 암호 검증
  const salt = await getStorySalt(storyId);
  if (!salt) {
    alert('암호 검증에 실패했습니다. 읽기 전용으로 로드됩니다.');
    loadAndApplyStory(data);
    return;
  }
  const computedHash = await computeHashWithSalt(password, salt);
  if (!(await verifyStoryPassword(storyId, computedHash))) {
    alert('암호가 일치하지 않습니다. 읽기 전용으로 로드됩니다.');
    loadAndApplyStory(data);
    return;
  }

  loadAndApplyStory(data);
  currentStoryId = storyId;
  currentPasswordHash = computedHash;
  updateSaveButtonText();
})();

// --- Theme ---
initTheme();
