// --- Supabase ---
import { supabase, currentUser, promptConfig, gameplayConfig } from './supabase-config.js';
import { buildPrompt } from './prompt-builder.js';
import { renderMarkdown } from './markdown-renderer.js';
import { fetchModels as _fetchModels, createCache as _createCache, clearCache as _clearCache, streamGenerate, generate } from './gemini-api.js';
import { updateTokenDisplay, resetTokens } from './token-tracker.js';

if (!promptConfig || !gameplayConfig) {
  document.body.innerHTML = '<div style="padding:40px;color:#e94560;font-size:16px;">앱 설정을 불러올 수 없습니다. 관리자에게 문의하세요.</div>';
  throw new Error('앱 설정을 불러올 수 없습니다.');
}

// --- DOM References ---
const $ = id => document.getElementById(id);

const els = {
  apiKey: $('apiKey'),
  modelSelect: $('modelSelect'),
  gameOutput: $('gameOutput'),
  gameInput: $('gameInput'),
  btnStart: $('btnStart'),
  btnSend: $('btnSend'),
  btnRegenerate: $('btnRegenerate'),
  btnLoadSettings: $('btnLoadSettings'),
  fileInput: $('fileInput'),
  useLatex: $('useLatex'),
  useCache: $('useCache'),
  cacheStatus: $('cacheStatus'),
  tokenInfo: $('tokenInfo'),
  costInfo: $('costInfo'),
  settingsName: $('settingsName'),
  sidePanel: $('sidePanel'),
  badgeCharacter: $('badgeCharacter'),
  badgeUserNote: $('badgeUserNote'),
  fontSizeDisplay: $('fontSizeDisplay'),
  narrativeLengthDisplay: $('narrativeLengthDisplay'),
};

// --- Narrative Length (declared early for use in applySettings/buildPrompt) ---
let narrativeLength = gameplayConfig.default_narrative_length;
function updateNarrativeDisplay() {
  els.narrativeLengthDisplay.textContent = narrativeLength + '문단';
}

// --- Session Management ---
const SESSION_LIST_KEY = 'ai-story-game-sessions';
const SESSION_DATA_PREFIX = 'ai-story-session-';
const MAX_SESSION_LIST = gameplayConfig.max_session_list;

let currentSessionId = null;
let currentStoryId = null;
let storySummary = '';
let summaryUpToIndex = 0;
const SLIDING_WINDOW_SIZE = gameplayConfig.sliding_window_size;
let isDirty = false;
let saveStatus = 'idle';
let autoSaveInterval = null;

// Stub — replaced with full implementation later in this file
let renderSaveStatus = () => {};

function getSessionList() {
  try { return JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || '[]'); }
  catch { return []; }
}

function saveSessionList(list) {
  if (list.length > MAX_SESSION_LIST) {
    list.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    list = list.slice(0, MAX_SESSION_LIST);
  }
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(list));
}

function addToSessionList(sessionId, title) {
  const list = getSessionList();
  const existing = list.findIndex(s => s.sessionId === sessionId);
  const entry = { sessionId, title: title || '제목 없음', lastPlayedAt: Date.now() };
  if (existing >= 0) list[existing] = entry;
  else list.unshift(entry);
  saveSessionList(list);
}

function removeFromSessionList(sessionId) {
  saveSessionList(getSessionList().filter(s => s.sessionId !== sessionId));
}

function saveSessionToLocal(sessionId, data) {
  localStorage.setItem(SESSION_DATA_PREFIX + sessionId, JSON.stringify(data));
}

function loadSessionFromLocal(sessionId) {
  try { return JSON.parse(localStorage.getItem(SESSION_DATA_PREFIX + sessionId)); }
  catch { return null; }
}

function removeSessionFromLocal(sessionId) {
  localStorage.removeItem(SESSION_DATA_PREFIX + sessionId);
}

function messagesToStorage(history) {
  return history.map(msg => ({
    role: msg.role,
    content: msg.parts[0].text,
    timestamp: msg._timestamp || Date.now()
  }));
}

function messagesFromStorage(stored) {
  return stored.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
    _timestamp: msg.timestamp
  }));
}

async function generateSummary() {
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey || !model) return;

  const windowStart = Math.max(0, conversationHistory.length - SLIDING_WINDOW_SIZE);
  if (windowStart <= summaryUpToIndex) return;

  const toSummarize = conversationHistory.slice(summaryUpToIndex, windowStart);
  if (toSummarize.length === 0) return;

  const summaryPrompt = storySummary
    ? promptConfig.summary_request_update.replace('{summary}', storySummary)
    : promptConfig.summary_request_new;

  const messages = toSummarize.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.parts[0].text}`).join('\n\n');

  try {
    const result = await generate({
      apiKey, model,
      body: {
        contents: [{ role: 'user', parts: [{ text: `${summaryPrompt}\n\n---\n${messages}` }] }],
        systemInstruction: { parts: [{ text: promptConfig.summary_system_instruction.replace('{max_chars}', String(gameplayConfig.summary_max_chars)) }] },
      },
    });
    storySummary = result.text || storySummary;
    summaryUpToIndex = windowStart;
    updateSummaryBadge();
    markDirty();
  } catch (e) {
    console.error('Summary generation failed:', e);
  }
}

function buildSessionDocument() {
  return {
    story_id: currentStoryId || null,
    title: settingsData.title || '제목 없음',
    preset: {
      worldSetting: settingsData.worldSetting || '',
      story: settingsData.story || '',
      characterName: settingsData.characterName || '',
      characterSetting: settingsData.characterSetting || '',
      characters: settingsData.characters || '',
      useLatex: els.useLatex.checked,
      useCache: els.useCache.checked,
      narrativeLength: narrativeLength,
    },
    messages: messagesToStorage(conversationHistory),
    model: els.modelSelect.value || '',
    summary: storySummary || '',
    summary_up_to_index: summaryUpToIndex || 0,
  };
}

async function createSession(sessionId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('sessions').insert({
      id: sessionId,
      ...buildSessionDocument(),
      owner_uid: currentUser?.id || null,
    });
    if (error) throw error;
    return true;
  } catch (e) { console.error('Session create failed:', e); return false; }
}

async function updateSession(sessionId) {
  if (!supabase || !sessionId) return false;
  try {
    const { error } = await supabase.from('sessions').update(buildSessionDocument()).eq('id', sessionId);
    if (error) throw error;
    return true;
  } catch (e) { console.error('Session update failed:', e); return false; }
}

async function loadSessionFromSupabase(sessionId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    if (error) throw error;
    return data ? {
      storyId: data.story_id,
      title: data.title,
      preset: data.preset,
      messages: data.messages,
      model: data.model,
      summary: data.summary,
      summaryUpToIndex: data.summary_up_to_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastPlayedAt: data.last_played_at,
      ownerUid: data.owner_uid,
    } : null;
  } catch (e) { console.error('Session load failed:', e); return null; }
}

function updateSaveStatus(status) {
  saveStatus = status;
  renderSaveStatus();
}

async function saveToCloud() {
  if (!currentSessionId || !isDirty) return;
  if (!navigator.onLine) { updateSaveStatus('offline'); return; }
  updateSaveStatus('saving');
  const localData = { ...buildSessionDocument(), updatedAt: Date.now(), lastPlayedAt: Date.now() };
  saveSessionToLocal(currentSessionId, localData);
  addToSessionList(currentSessionId, localData.title);
  const ok = await updateSession(currentSessionId);
  if (ok) { isDirty = false; updateSaveStatus('saved'); }
  else { updateSaveStatus('error'); }
}

function markDirty() {
  isDirty = true;
  updateSaveStatus('unsaved');
  if (currentSessionId) {
    const localData = { ...buildSessionDocument(), updatedAt: Date.now(), lastPlayedAt: Date.now() };
    saveSessionToLocal(currentSessionId, localData);
    addToSessionList(currentSessionId, localData.title);
  }
}

// --- Save Triggers ---
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && isDirty && currentSessionId) saveToCloud();
});

// pagehide: rely on visibilitychange and auto-save interval instead
// (raw fetch without auth token would be rejected by Supabase RLS)
window.addEventListener('pagehide', () => {
  if (!isDirty || !currentSessionId) return;
  // Save to localStorage as last resort
  const localData = { ...buildSessionDocument(), updatedAt: Date.now(), lastPlayedAt: Date.now() };
  saveSessionToLocal(currentSessionId, localData);
  addToSessionList(currentSessionId, localData.title);
});

function startAutoSave() {
  stopAutoSave();
  autoSaveInterval = setInterval(() => {
    if (isDirty && currentSessionId) saveToCloud();
  }, gameplayConfig.auto_save_interval_ms);
}

function stopAutoSave() {
  if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
}

window.addEventListener('online', () => { if (isDirty && currentSessionId) saveToCloud(); });
window.addEventListener('offline', () => { if (currentSessionId) updateSaveStatus('offline'); });

// --- Settings Data (loaded from file or localStorage) ---
let settingsData = {
  title: '',
  worldSetting: '',
  story: '',
  characterName: '',
  characterSetting: '',
  characters: '',
  userNote: '',
  systemRules: '',
};

// --- Prompt Builder (uses shared module) ---
function getPrompt() {
  return buildPrompt(settingsData, {
    useLatex: els.useLatex.checked,
    narrativeLength,
  }, promptConfig);
}

// --- Settings Load ---
const STORAGE_KEY = 'ai-story-game-settings';

function applySettings(data, source) {
  if (data.apiKey) {
    els.apiKey.value = data.apiKey;
    sessionStorage.setItem('gemini-api-key', data.apiKey);
  }
  if ('useLatex' in data) els.useLatex.checked = !!data.useLatex;
  if ('useCache' in data) els.useCache.checked = !!data.useCache;

  settingsData.title = data.title || '';
  settingsData.worldSetting = data.worldSetting || '';
  settingsData.story = data.story || '';
  settingsData.characterName = data.characterName || '';
  settingsData.characterSetting = data.characterSetting || '';
  settingsData.characters = data.characters || '';
  settingsData.userNote = data.userNote || '';
  settingsData.systemRules = data.systemRules || '';

  if ('narrativeLength' in data) {
    narrativeLength = Math.max(gameplayConfig.narrative_length_min, Math.min(gameplayConfig.narrative_length_max, data.narrativeLength));
    updateNarrativeDisplay();
  }

  // Update displayed preset name
  if (source === 'file') {
    // file name is set by the caller
  } else if (settingsData.title) {
    els.settingsName.textContent = settingsData.title;
  }

  // Restore model after models are fetched
  if (data.model) settingsData._pendingModel = data.model;

  // Update badges if already initialized
  if (typeof updateBadges === 'function') updateBadges();
}

function loadFromLocalStorage() {
  // SEC-006: API 키는 sessionStorage에서 복원
  const sessionApiKey = sessionStorage.getItem('gemini-api-key');
  if (sessionApiKey) els.apiKey.value = sessionApiKey;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // localStorage에 남아있는 레거시 apiKey 마이그레이션
      if (!sessionApiKey && data.apiKey) {
        els.apiKey.value = data.apiKey;
        sessionStorage.setItem('gemini-api-key', data.apiKey);
        delete data.apiKey;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      applySettings(data, 'localStorage');
    } catch (e) {}
  }
}

// --- Gemini API (shared module) ---
async function fetchModels(apiKey) {
  await _fetchModels(apiKey, els.modelSelect, { savedModel: settingsData._pendingModel || '' });
}

let apiKeyTimer = null;
els.apiKey.addEventListener('input', () => {
  clearTimeout(apiKeyTimer);
  apiKeyTimer = setTimeout(() => {
    const key = els.apiKey.value.trim();
    if (key) sessionStorage.setItem('gemini-api-key', key);
    fetchModels(key);
  }, 800);
});

// --- Load Settings File ---
els.btnLoadSettings.addEventListener('click', async () => {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'], 'text/plain': ['.json'] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      applySettings(data, 'file');
      els.settingsName.textContent = data.title || file.name;
      if (data.apiKey) fetchModels(data.apiKey);
      else if (els.apiKey.value.trim()) fetchModels(els.apiKey.value.trim());
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  els.fileInput.click();
});

els.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      applySettings(data, 'file');
      els.settingsName.textContent = data.title || file.name;
      if (data.apiKey) fetchModels(data.apiKey);
      else if (els.apiKey.value.trim()) fetchModels(els.apiKey.value.trim());
    } catch (err) {
      alert('잘못된 JSON 파일입니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

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

// --- Game State ---
let conversationHistory = [];
let isGenerating = false;

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

  if (conversationHistory.length >= gameplayConfig.message_limit) {
    alert(`이 세션은 메시지 한도(${gameplayConfig.message_limit})에 도달했습니다. 새 게임을 시작해주세요.`);
    return;
  }

  isGenerating = true;
  els.gameInput.disabled = true;
  els.btnSend.disabled = true;
  els.btnRegenerate.disabled = true;
  els.btnStart.disabled = true;

  conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
  markDirty();
  updateTurnCount();

  const responseDiv = appendToGame('', 'narrator');
  responseDiv.classList.add('loading');

  try {
    // 슬라이딩 윈도우: 최근 N개만 전송, 나머지는 요약으로 대체
    const windowStart = Math.max(0, conversationHistory.length - SLIDING_WINDOW_SIZE);
    const recentMessages = conversationHistory.slice(windowStart);

    let systemPrompt = getPrompt();
    if (storySummary) {
      systemPrompt += `\n\n[이전 이야기 요약]\n${storySummary}`;
    }

    const body = cachedContentName
      ? { cachedContent: cachedContentName, contents: recentMessages, safetySettings: promptConfig.safety_settings }
      : { system_instruction: { parts: [{ text: systemPrompt }] }, contents: recentMessages, safetySettings: promptConfig.safety_settings };

    let renderTimer = null;
    const { text: fullResponse, usageMetadata } = await streamGenerate({
      apiKey, model, body,
      onChunk(textSoFar) {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
          responseDiv.innerHTML = renderMarkdown(textSoFar);
          responseDiv.classList.add('markdown-rendered');
          els.gameOutput.scrollTop = els.gameOutput.scrollHeight;
        }, 80);
      },
    });

    clearTimeout(renderTimer);
    responseDiv.innerHTML = renderMarkdown(fullResponse);
    responseDiv.classList.add('markdown-rendered');
    els.gameOutput.scrollTop = els.gameOutput.scrollHeight;

    if (usageMetadata) updateTokenDisplay(usageMetadata, els.modelSelect.value, els.tokenInfo, els.costInfo);

    conversationHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
    markDirty();
    updateTurnCount();
    if (conversationHistory.length > SLIDING_WINDOW_SIZE + gameplayConfig.summary_trigger_offset) {
      generateSummary();
    }
  } catch (err) {
    console.error('Gemini API error:', err);
    responseDiv.textContent = '[오류] API 요청에 실패했습니다. API 키와 모델을 확인해주세요.';
    responseDiv.style.color = 'var(--accent)';
    conversationHistory.pop();
  } finally {
    responseDiv.classList.remove('loading');
    isGenerating = false;
    els.gameInput.disabled = false;
    els.btnSend.disabled = false;
    els.btnRegenerate.disabled = conversationHistory.length < 2;
    els.btnStart.disabled = false;
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

  stopAutoSave();
  currentSessionId = crypto.randomUUID();
  conversationHistory = [];
  els.gameOutput.innerHTML = '';
  resetTokens(els.tokenInfo, els.costInfo);
  els.gameInput.disabled = false;
  els.btnSend.disabled = false;

  await createSession(currentSessionId);
  addToSessionList(currentSessionId, settingsData.title || '제목 없음');
  renderSessionList();
  renderSessionId();
  updateTurnCount();
  isDirty = false;
  updateSaveStatus('saved');
  startAutoSave();

  clearCache();
  if (els.useCache.checked) {
    const ok = await createCache(apiKey, model);
    if (!ok) alert('캐시 생성에 실패했습니다. 캐시 없이 진행합니다.');
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
  // 마지막 model 응답 제거
  const lastModel = conversationHistory[conversationHistory.length - 1];
  if (lastModel.role !== 'model') return;
  conversationHistory.pop();
  // 마지막 user 메시지 제거 (재전송 위해 텍스트 보관)
  const lastUser = conversationHistory.pop();
  const lastUserText = lastUser.parts[0].text;
  // DOM에서 마지막 narrator(AI 응답) 제거
  const narrators = els.gameOutput.querySelectorAll('.game-text.narrator');
  if (narrators.length) narrators[narrators.length - 1].remove();
  // 다시 API 요청
  sendToGemini(lastUserText);
});

els.gameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.btnSend.click();
  }
});

// --- Side Panel Toggle ---
$('btnTogglePanel').addEventListener('click', () => {
  els.sidePanel.classList.toggle('collapsed');
});
$('btnClosePanel').addEventListener('click', () => {
  els.sidePanel.classList.add('collapsed');
});

// --- Focus Mode ---
$('btnFocusMode').addEventListener('click', () => document.body.classList.add('focus-mode'));
$('btnExitFocus').addEventListener('click', () => document.body.classList.remove('focus-mode'));

// --- Badge Updates ---
function updateBadges() {
  const hasChar = settingsData.characterName || settingsData.characterSetting;
  els.badgeCharacter.textContent = hasChar ? '설정됨' : '미설정';
  els.badgeCharacter.className = `menu-badge ${hasChar ? 'set' : 'empty'}`;

  const hasNote = settingsData.userNote;
  els.badgeUserNote.textContent = hasNote ? '설정됨' : '미설정';
  els.badgeUserNote.className = `menu-badge ${hasNote ? 'set' : 'empty'}`;
}

function updateSummaryBadge() {
  const badge = $('badgeSummary');
  if (badge) {
    badge.textContent = storySummary ? '있음' : '없음';
    badge.className = `menu-badge ${storySummary ? 'set' : 'empty'}`;
  }
}

// --- Modal Logic ---
function openModal(id) {
  $(id).classList.add('open');
}
function closeModal(id) {
  $(id).classList.remove('open');
}

// Close buttons
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Character Profile Modal
$('menuCharacter').addEventListener('click', () => {
  $('modalCharName').value = settingsData.characterName || '';
  $('modalCharSetting').value = settingsData.characterSetting || '';
  openModal('modalCharacter');
});

$('btnSaveCharacter').addEventListener('click', () => {
  settingsData.characterName = $('modalCharName').value.trim();
  settingsData.characterSetting = $('modalCharSetting').value.trim();
  updateBadges();
  closeModal('modalCharacter');
});

// User Note Modal
$('menuUserNote').addEventListener('click', () => {
  $('modalUserNote_text').value = settingsData.userNote || '';
  openModal('modalUserNote');
});

$('btnSaveUserNote').addEventListener('click', () => {
  settingsData.userNote = $('modalUserNote_text').value.trim();
  updateBadges();
  closeModal('modalUserNote');
});

// Summary Menu
$('menuSummary').addEventListener('click', async () => {
  if (!storySummary && conversationHistory.length > 4) {
    if (confirm('아직 요약이 없습니다. 지금 생성할까요?')) {
      summaryUpToIndex = 0;
      await generateSummary();
    }
  }
  if (storySummary) {
    alert(`[이야기 요약]\n\n${storySummary}`);
  } else {
    alert('요약이 없습니다. 게임을 진행한 후 다시 시도해주세요.');
  }
});

// --- Font Size ---
let gameFontSize = 14;

$('btnFontDec').addEventListener('click', () => {
  if (gameFontSize > 10) {
    gameFontSize--;
    els.fontSizeDisplay.textContent = gameFontSize;
    els.gameOutput.style.fontSize = gameFontSize + 'px';
  }
});

$('btnFontInc').addEventListener('click', () => {
  if (gameFontSize < 24) {
    gameFontSize++;
    els.fontSizeDisplay.textContent = gameFontSize;
    els.gameOutput.style.fontSize = gameFontSize + 'px';
  }
});

// --- Narrative Length Buttons ---
$('btnNarrDec').addEventListener('click', () => {
  if (narrativeLength > gameplayConfig.narrative_length_min) {
    narrativeLength--;
    updateNarrativeDisplay();
    markDirty();
  }
});

$('btnNarrInc').addEventListener('click', () => {
  if (narrativeLength < gameplayConfig.narrative_length_max) {
    narrativeLength++;
    updateNarrativeDisplay();
    markDirty();
  }
});

// --- Theme ---
const THEME_KEY = 'ai-story-game-theme';

function applyTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.body.classList.remove('light-theme');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else if (theme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.body.classList.add('light-theme');
    }
  }
  // Update active button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (localStorage.getItem(THEME_KEY) === 'system') applyTheme('system');
});

// Init theme
applyTheme(localStorage.getItem(THEME_KEY) || 'system');

// --- Save Status UI (replaces stub) ---
renderSaveStatus = function() {
  const statusEl = $('saveStatus'), dotEl = $('saveDot'), textEl = $('saveText'), btnEl = $('btnSaveCloud');
  if (!currentSessionId) { statusEl.style.display = 'none'; btnEl.style.display = 'none'; return; }
  statusEl.style.display = 'flex'; btnEl.style.display = 'inline-block';
  const states = {
    idle: { dot: 'saved', text: '저장됨' }, unsaved: { dot: 'unsaved', text: '저장안됨' },
    saving: { dot: 'saving', text: '저장 중...' }, saved: { dot: 'saved', text: '저장됨' },
    error: { dot: 'error', text: '저장 실패' }, offline: { dot: 'offline', text: '오프라인' },
  };
  const state = states[saveStatus] || states.idle;
  dotEl.className = `save-dot ${state.dot}`;
  textEl.textContent = state.text;
  btnEl.disabled = saveStatus === 'saving';
};

$('btnSaveCloud').addEventListener('click', () => {
  if (currentSessionId) { isDirty = true; saveToCloud(); }
});

// --- Story List UI ---
async function loadStoryList() {
  if (!supabase) return;
  const select = $('storySelect');
  try {
    // SEC-012: stories_safe VIEW 사용 (password_hash 노출 방지)
    const { data: rows, error } = await supabase
      .from('stories_safe')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    for (const s of (rows || [])) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.title || '제목 없음'} (${s.id.slice(0, 8)}...)`;
      select.appendChild(opt);
    }
    if (rows?.length > 0) console.log(`Loaded ${rows.length} stories`);
  } catch (e) {
    console.error('Story list load failed:', e);
  }
}

async function loadStory(storyId) {
  if (!supabase) return null;
  try {
    // SEC-012: stories_safe VIEW 사용 (password_hash 노출 방지)
    const { data, error } = await supabase.from('stories_safe').select('*').eq('id', storyId).single();
    if (error) throw error;
    return data ? {
      title: data.title,
      worldSetting: data.world_setting,
      story: data.story,
      characterName: data.character_name,
      characterSetting: data.character_setting,
      characters: data.characters,
      userNote: data.user_note,
      systemRules: data.system_rules,
      useLatex: data.use_latex,
      isPublic: data.is_public,
      hasPassword: data.has_password,
    } : null;
  } catch (e) {
    console.error('Story load failed:', e);
    return null;
  }
}

$('storySelect').addEventListener('change', async (e) => {
  const storyId = e.target.value;
  if (!storyId) return;

  const data = await loadStory(storyId);
  if (!data) { alert('스토리를 찾을 수 없습니다.'); return; }

  // 스토리 설정 적용
  settingsData.title = data.title || '';
  settingsData.worldSetting = data.worldSetting || '';
  settingsData.story = data.story || '';
  settingsData.characterName = data.characterName || '';
  settingsData.characterSetting = data.characterSetting || '';
  settingsData.characters = data.characters || '';
  settingsData.userNote = data.userNote || '';
  settingsData.systemRules = data.systemRules || '';
  if ('useLatex' in data) els.useLatex.checked = !!data.useLatex;
  if ('useCache' in data) els.useCache.checked = !!data.useCache;

  currentStoryId = storyId;
  els.settingsName.textContent = `${data.title || '제목 없음'} (${storyId.slice(0, 8)}...)`;
  updateBadges();
  // 편집 링크에 storyId 반영
  $('btnEditStory').href = `editor.html?storyId=${storyId}`;
});

// URL 파라미터로 스토리 로드 시에도 편집 링크 업데이트
function updateEditLink() {
  if (currentStoryId) {
    $('btnEditStory').href = `editor.html?storyId=${currentStoryId}`;
  }
}

// --- Session List UI ---
function renderSessionList() {
  const select = $('sessionSelect');
  const list = getSessionList();
  select.innerHTML = '<option value="">새 게임 또는 세션 선택...</option>';
  for (const s of list) {
    const opt = document.createElement('option');
    opt.value = s.sessionId;
    opt.textContent = `${s.title} (${new Date(s.lastPlayedAt).toLocaleString('ko-KR')})`;
    if (s.sessionId === currentSessionId) opt.selected = true;
    select.appendChild(opt);
  }
}

function renderSessionId() {
  const bar = $('sessionInfoBar');
  const display = $('sessionIdDisplay');
  const deleteBtn = $('btnDeleteSession');
  if (currentSessionId) {
    bar.style.display = 'flex';
    display.textContent = `ID: ${currentSessionId.slice(0, 8)}...`;
    display.title = `${currentSessionId} — 클릭하여 복사`;
  } else {
    bar.style.display = 'none';
  }
}

function updateTurnCount() {
  const el = $('turnCount');
  const msgCount = conversationHistory.length;
  const exchanges = Math.floor(msgCount / 2);
  el.textContent = exchanges > 0 ? `${exchanges}턴 (${msgCount}메시지)` : '';
  el.className = 'turn-count' + (msgCount >= gameplayConfig.message_limit ? ' danger' : msgCount >= gameplayConfig.message_warning_threshold ? ' warning' : '');
}

$('sessionIdDisplay').addEventListener('click', () => {
  if (!currentSessionId) return;
  navigator.clipboard.writeText(currentSessionId).then(() => {
    const el = $('sessionIdDisplay'), orig = el.textContent;
    el.textContent = '복사됨!';
    setTimeout(() => { el.textContent = orig; }, 1500);
  });
});

$('sessionSelect').addEventListener('change', (e) => { if (e.target.value) loadSession(e.target.value); });

$('btnLoadSession').addEventListener('click', () => {
  const id = $('sessionIdInput').value.trim();
  if (!id) { alert('세션 ID를 입력해주세요.'); return; }
  loadSession(id);
  $('sessionIdInput').value = '';
});

$('btnDeleteSession').addEventListener('click', () => {
  if (!currentSessionId || !confirm('이 세션을 목록에서 제거할까요?')) return;
  removeFromSessionList(currentSessionId);
  removeSessionFromLocal(currentSessionId);
  stopAutoSave();
  currentSessionId = null; conversationHistory = [];
  els.gameOutput.innerHTML = '<p class="game-placeholder">게임을 시작하려면 ☰ 메뉴에서 API Key를 설정하고 "게임 시작" 버튼을 누르세요.</p>';
  els.gameInput.disabled = true; els.btnSend.disabled = true; els.btnRegenerate.disabled = true;
  renderSessionList(); renderSessionId(); renderSaveStatus();
});

async function loadSession(sessionId) {
  let localData = loadSessionFromLocal(sessionId);
  let remoteData = await loadSessionFromSupabase(sessionId);

  if (!localData && !remoteData) { alert('세션을 찾을 수 없습니다.'); return; }

  let data;
  if (localData && remoteData) {
    const localTime = localData.updatedAt || 0;
    const fsTime = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
    data = localTime > fsTime ? localData : remoteData;
  } else {
    data = remoteData || localData;
  }

  currentSessionId = sessionId;

  if (data.preset) {
    Object.assign(settingsData, data.preset);
    if ('useLatex' in data.preset) els.useLatex.checked = !!data.preset.useLatex;
    if ('useCache' in data.preset) els.useCache.checked = !!data.preset.useCache;
    if ('narrativeLength' in data.preset) {
      narrativeLength = Math.max(gameplayConfig.narrative_length_min, Math.min(gameplayConfig.narrative_length_max, data.preset.narrativeLength));
      updateNarrativeDisplay();
    }
    updateBadges();
  }
  if (data.model && els.modelSelect.querySelector(`option[value="${data.model}"]`)) {
    els.modelSelect.value = data.model;
  }
  if (data.title) { settingsData.title = data.title; els.settingsName.textContent = data.title; }

  const messages = data.messages || [];
  if (messages.length > 0 && messages[0].content !== undefined) {
    conversationHistory = messagesFromStorage(messages);
  } else {
    conversationHistory = messages;
  }
  storySummary = data.summary || '';
  summaryUpToIndex = data.summaryUpToIndex || 0;
  updateSummaryBadge();

  els.gameOutput.innerHTML = '';
  for (const msg of conversationHistory) {
    const text = msg.parts[0].text;
    if (msg.role === 'user') {
      appendToGame(`▸ ${text}`, 'user-action');
    } else {
      const div = appendToGame('', 'narrator');
      div.innerHTML = renderMarkdown(text);
      div.classList.add('markdown-rendered');
    }
  }

  els.gameInput.disabled = false; els.btnSend.disabled = false; els.btnRegenerate.disabled = conversationHistory.length < 2;
  addToSessionList(sessionId, data.title || '제목 없음');
  renderSessionList(); renderSessionId(); updateTurnCount();
  isDirty = false; updateSaveStatus('saved'); startAutoSave();

  if (remoteData) saveSessionToLocal(sessionId, { ...data, updatedAt: Date.now(), lastPlayedAt: Date.now() });
}

// --- Init ---
loadFromLocalStorage();
updateBadges();
if (els.apiKey.value.trim()) fetchModels(els.apiKey.value.trim());
renderSessionList();
renderSaveStatus();
loadStoryList();

// --- URL Parameter Auto-Load ---
(async () => {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('storyId');
  const sessionId = params.get('sessionId');

  if (sessionId) {
    // 세션 이어하기
    await loadSession(sessionId);
  } else if (storyId) {
    // 스토리 선택 → 설정 적용
    const data = await loadStory(storyId);
    if (data) {
      settingsData.title = data.title || '';
      settingsData.worldSetting = data.worldSetting || '';
      settingsData.story = data.story || '';
      settingsData.characterName = data.characterName || '';
      settingsData.characterSetting = data.characterSetting || '';
      settingsData.characters = data.characters || '';
      settingsData.userNote = data.userNote || '';
      settingsData.systemRules = data.systemRules || '';
      if ('useLatex' in data) els.useLatex.checked = !!data.useLatex;
      if ('useCache' in data) els.useCache.checked = !!data.useCache;
      currentStoryId = storyId;
      els.settingsName.textContent = data.title || '제목 없음';
      updateBadges();
      updateEditLink();
      // 스토리 드롭다운에서 선택
      const select = $('storySelect');
      if (select.querySelector(`option[value="${storyId}"]`)) {
        select.value = storyId;
      }
    }
  }

  // Remove sensitive IDs from URL bar
  if (storyId || sessionId) {
    history.replaceState(null, '', window.location.pathname);
  }
})();
