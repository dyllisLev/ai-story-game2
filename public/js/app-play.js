// --- Supabase ---
import { supabase, currentUser, promptConfig, gameplayConfig } from './supabase-config.js';
import { upsertSessionMemory, loadSessionMemory } from './supabase-ops.js';
import { renderMarkdown } from './markdown-renderer.js';
import { fetchModels as _fetchModels } from './gemini-api.js';
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
let sessionMemory = null;
let memoryUpToIndex = 0;
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
      userNote: settingsData.userNote || '',
      systemRules: settingsData.systemRules || '',
      useLatex: els.useLatex.checked,
      useCache: els.useCache.checked,
      narrativeLength: narrativeLength,
    },
    messages: messagesToStorage(conversationHistory),
    model: els.modelSelect.value || '',
    summary: sessionMemory?.longTerm?.map(e => `${e.title}: ${e.content}`).join('\n') || '',
    summary_up_to_index: memoryUpToIndex || 0,
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

async function sendToAI(userMessage) {
  const apiKey = els.apiKey.value.trim();
  if (!apiKey) { alert('API Key를 입력해주세요.'); return; }
  if (!currentSessionId) { alert('게임을 먼저 시작해주세요.'); return; }

  isGenerating = true;
  els.gameInput.disabled = true;
  els.btnSend.disabled = true;
  els.btnRegenerate.disabled = true;
  els.btnStart.disabled = true;

  conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
  markDirty();
  updateTurnCount();

  appendToGame(`▸ ${userMessage}`, 'user-action');
  const responseDiv = appendToGame('', 'narrator');
  responseDiv.classList.add('loading');

  try {
    const res = await fetch('/api/game/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, sessionId: currentSessionId, userMessage }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    await handleSSEStream(res, responseDiv);
  } catch (err) {
    console.error('API error:', err);
    responseDiv.textContent = `[오류] ${err.message}`;
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

async function handleSSEStream(res, responseDiv) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';
  let renderTimer = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const data = JSON.parse(jsonStr);

        if (data.type === 'chunk') {
          fullResponse += data.text;
          clearTimeout(renderTimer);
          renderTimer = setTimeout(() => {
            responseDiv.innerHTML = renderMarkdown(fullResponse);
            responseDiv.classList.add('markdown-rendered');
            els.gameOutput.scrollTop = els.gameOutput.scrollHeight;
          }, 80);
        } else if (data.type === 'done') {
          clearTimeout(renderTimer);
          responseDiv.innerHTML = renderMarkdown(fullResponse);
          responseDiv.classList.add('markdown-rendered');
          els.gameOutput.scrollTop = els.gameOutput.scrollHeight;

          if (data.sessionId && !currentSessionId) {
            currentSessionId = data.sessionId;
            addToSessionList(currentSessionId, settingsData.title || '제목 없음');
            renderSessionList();
          }

          if (data.usage) {
            updateTokenDisplay(data.usage, els.modelSelect.value, els.tokenInfo, els.costInfo);
          }

          conversationHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
          markDirty();
          updateTurnCount();

          if (data.memoryStatus === 'pending') {
            updateMemoryBadge('exists');
          }
          if (data.cacheStatus === 'active') {
            els.cacheStatus.textContent = '캐시 활성';
            els.cacheStatus.className = 'cache-status active';
          }
        } else if (data.type === 'error') {
          throw new Error(data.message);
        }
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }
}

// --- Game Controls ---
els.btnStart.addEventListener('click', async () => {
  if (isGenerating) return;
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey) { alert('API Key를 입력해주세요.'); return; }
  if (!model) { alert('모델을 선택해주세요.'); return; }
  if (!currentStoryId) { alert('스토리를 선택해주세요.'); return; }

  isGenerating = true;
  els.btnStart.disabled = true;
  stopAutoSave();
  conversationHistory = [];
  els.gameOutput.innerHTML = '';
  resetTokens(els.tokenInfo, els.costInfo);

  const responseDiv = appendToGame('', 'narrator');
  responseDiv.classList.add('loading');

  try {
    const res = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey, storyId: currentStoryId, model,
        options: {
          characterName: settingsData.characterName,
          characterSetting: settingsData.characterSetting,
          useLatex: els.useLatex.checked,
          useCache: els.useCache.checked,
          narrativeLength,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    currentSessionId = null; // will be set by handleSSEStream from done event
    await handleSSEStream(res, responseDiv);

    els.gameInput.disabled = false;
    els.btnSend.disabled = false;
    renderSessionId();
    updateTurnCount();
    startAutoSave();
  } catch (err) {
    console.error('Game start error:', err);
    responseDiv.textContent = `[오류] ${err.message}`;
    responseDiv.style.color = 'var(--accent)';
  } finally {
    responseDiv.classList.remove('loading');
    isGenerating = false;
    els.btnStart.disabled = false;
  }
});

els.btnSend.addEventListener('click', () => {
  if (isGenerating) return;
  const text = els.gameInput.value.trim();
  if (!text) return;
  els.gameInput.value = '';
  sendToAI(text);
});

els.btnRegenerate.addEventListener('click', async () => {
  if (isGenerating || conversationHistory.length < 2) return;

  const apiKey = els.apiKey.value.trim();
  if (!apiKey || !currentSessionId) return;

  // DOM에서 마지막 응답 제거
  const narrators = els.gameOutput.querySelectorAll('.game-text.narrator');
  if (narrators.length) narrators[narrators.length - 1].remove();
  const userActions = els.gameOutput.querySelectorAll('.game-text.user-action');
  if (userActions.length) userActions[userActions.length - 1].remove();

  conversationHistory.splice(-2);
  updateTurnCount();

  const responseDiv = appendToGame('', 'narrator');
  responseDiv.classList.add('loading');
  isGenerating = true;
  els.btnRegenerate.disabled = true;

  try {
    const res = await fetch('/api/game/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, sessionId: currentSessionId, regenerate: true }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    await handleSSEStream(res, responseDiv);
  } catch (err) {
    responseDiv.textContent = `[오류] ${err.message}`;
    responseDiv.style.color = 'var(--accent)';
  } finally {
    responseDiv.classList.remove('loading');
    isGenerating = false;
    els.gameInput.disabled = false;
    els.btnSend.disabled = false;
    els.btnRegenerate.disabled = conversationHistory.length < 2;
    els.btnStart.disabled = false;
  }
});

els.gameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.altKey)) {
    e.preventDefault();
    els.btnSend.click();
  }
});

// --- Resize Handle for Input Area ---
{
  const handle = document.getElementById('resizeHandle');
  const textarea = els.gameInput;
  const minHeight = 63; // 3 rows: ~14px * 1.5 line-height * 3
  let startY, startHeight, maxHeight;

  function applyResize(clientY) {
    const delta = startY - clientY;
    const h = Math.min(Math.max(startHeight + delta, minHeight), maxHeight);
    textarea.style.height = h + 'px';
  }

  function initDrag(clientY) {
    startY = clientY;
    startHeight = textarea.offsetHeight;
    maxHeight = window.innerHeight * 0.6;
  }

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    initDrag(e.clientY);
    document.addEventListener('mousemove', onMouseDrag);
    document.addEventListener('mouseup', onStop);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
  });

  handle.addEventListener('touchstart', (e) => {
    initDrag(e.touches[0].clientY);
    document.addEventListener('touchmove', onTouchDrag, { passive: false });
    document.addEventListener('touchend', onStop);
  }, { passive: true });

  function onMouseDrag(e) {
    applyResize(e.clientY);
  }

  function onTouchDrag(e) {
    e.preventDefault();
    applyResize(e.touches[0].clientY);
  }

  function onStop() {
    document.removeEventListener('mousemove', onMouseDrag);
    document.removeEventListener('mouseup', onStop);
    document.removeEventListener('touchmove', onTouchDrag);
    document.removeEventListener('touchend', onStop);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
}

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

function updateMemoryBadge(state) {
  const badge = $('badgeSummary');
  const retryBtn = $('menuSummaryRetry');
  if (!badge) return;
  if (retryBtn) retryBtn.style.display = state === 'failed' ? 'inline' : 'none';
  switch (state) {
    case 'exists':
      badge.textContent = '있음';
      badge.className = 'menu-badge set';
      break;
    case 'generating':
      badge.textContent = '생성 중...';
      badge.className = 'menu-badge generating';
      break;
    case 'failed':
      badge.textContent = '실패';
      badge.className = 'menu-badge failed';
      break;
    default:
      badge.textContent = '없음';
      badge.className = 'menu-badge empty';
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
$('menuSummary').addEventListener('click', () => {
  renderMemoryModal();
  openModal('modalMemory');
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

async function loadSessionMemoryFromAPI(sessionId) {
  try {
    const res = await fetch(`/api/session/${sessionId}/memory`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

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
  currentStoryId = data.story_id || data.storyId || null;

  // 원본 스토리에서 프롬프트를 다시 로드 (스토리 수정이 즉시 반영되도록)
  if (currentStoryId) {
    const storyData = await loadStory(currentStoryId);
    if (storyData) {
      settingsData.title = storyData.title || '';
      settingsData.worldSetting = storyData.worldSetting || '';
      settingsData.story = storyData.story || '';
      settingsData.characterName = storyData.characterName || '';
      settingsData.characterSetting = storyData.characterSetting || '';
      settingsData.characters = storyData.characters || '';
      settingsData.userNote = storyData.userNote || '';
      settingsData.systemRules = storyData.systemRules || '';
      if ('useLatex' in storyData) els.useLatex.checked = !!storyData.useLatex;
    }
    updateEditLink();
    // 스토리 드롭다운에서 선택
    const storySelect = $('storySelect');
    if (storySelect.querySelector(`option[value="${currentStoryId}"]`)) {
      storySelect.value = currentStoryId;
    }
  } else if (data.preset) {
    // story_id가 없는 레거시 세션은 preset에서 복원
    Object.assign(settingsData, data.preset);
  }

  if (data.preset) {
    // preset에서 UI 설정만 복원 (useLatex, narrativeLength 등)
    if ('useLatex' in data.preset) els.useLatex.checked = !!data.preset.useLatex;
    if ('useCache' in data.preset) els.useCache.checked = !!data.preset.useCache;
    if ('narrativeLength' in data.preset) {
      narrativeLength = Math.max(gameplayConfig.narrative_length_min, Math.min(gameplayConfig.narrative_length_max, data.preset.narrativeLength));
      updateNarrativeDisplay();
    }
    // preset에 주인공 설정이 있으면 복원 (세션별로 다를 수 있음)
    if (data.preset.characterName) settingsData.characterName = data.preset.characterName;
    if (data.preset.characterSetting) settingsData.characterSetting = data.preset.characterSetting;
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
  memoryUpToIndex = data.summaryUpToIndex || 0;
  const loadedMemory = await loadSessionMemoryFromAPI(currentSessionId)
    || await loadSessionMemory(currentSessionId);
  if (loadedMemory) {
    sessionMemory = loadedMemory;
  } else {
    sessionMemory = null;
  }
  updateMemoryBadge(sessionMemory ? 'exists' : 'empty');

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

// --- Memory Modal ---
let activeMemoryTab = 'long_term';

function renderMemoryModal() {
  document.querySelectorAll('.memory-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === activeMemoryTab);
  });

  const content = $('memoryContent');
  const countEl = $('memoryCount');
  const footer = $('memoryFooter');

  if (!sessionMemory) {
    content.innerHTML = '<p class="memory-empty">메모리가 없습니다. 게임을 진행하면 자동으로 생성됩니다.</p>';
    countEl.textContent = '총 0개';
    footer.innerHTML = '<button class="btn btn-primary" data-close="modalMemory">확인</button>';
    footer.querySelector('[data-close]')?.addEventListener('click', () => closeModal('modalMemory'));
    return;
  }

  switch (activeMemoryTab) {
    case 'long_term': renderLongTermTab(content, countEl, footer); break;
    case 'short_term': renderShortTermTab(content, countEl, footer); break;
    case 'characters': renderCharactersTab(content, countEl, footer); break;
    case 'goals': renderGoalsTab(content, countEl, footer); break;
  }
}

function renderLongTermTab(content, countEl, footer) {
  const items = sessionMemory?.longTerm || [];
  countEl.textContent = `총 ${items.length}개`;

  if (items.length === 0) {
    content.innerHTML = '<p class="memory-empty">장기 기억이 없습니다.</p>';
  } else {
    content.innerHTML = items.map((item, i) => `
      <div class="memory-accordion" data-index="${i}">
        <div class="memory-accordion-header">
          <span class="memory-accordion-arrow">&#9658;</span>
          <span class="memory-accordion-title">${escapeHtml(item.title)}</span>
        </div>
        <div class="memory-accordion-body">${escapeHtml(item.content)}</div>
      </div>
    `).join('');
  }

  footer.innerHTML = `
    <button class="btn btn-secondary" id="btnMemoryEdit">편집</button>
    <button class="btn btn-primary" id="btnMemoryAdd">추가</button>
  `;

  content.querySelectorAll('.memory-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('open');
    });
  });

  $('btnMemoryEdit')?.addEventListener('click', () => enableLongTermEdit(content, footer));
  $('btnMemoryAdd')?.addEventListener('click', () => {
    if (!sessionMemory) sessionMemory = { shortTerm: [], characters: [], goals: '', longTerm: [] };
    sessionMemory.longTerm.push({ title: '새 기억', content: '' });
    renderMemoryModal();
    const accs = content.querySelectorAll('.memory-accordion');
    accs[accs.length - 1]?.classList.add('open');
  });
}

function enableLongTermEdit(content, footer) {
  const items = sessionMemory?.longTerm || [];
  content.innerHTML = items.map((item, i) => `
    <div class="memory-edit-item" data-index="${i}">
      <input type="text" class="memory-edit-title" value="${escapeHtml(item.title)}" placeholder="제목">
      <textarea class="memory-edit-content" placeholder="내용">${escapeHtml(item.content)}</textarea>
      <button class="btn btn-danger btn-sm memory-delete-btn" data-index="${i}">삭제</button>
    </div>
  `).join('');

  footer.innerHTML = `
    <button class="btn btn-secondary" id="btnMemoryEditCancel">취소</button>
    <button class="btn btn-primary" id="btnMemoryEditSave">저장</button>
  `;

  $('btnMemoryEditCancel')?.addEventListener('click', () => renderMemoryModal());
  $('btnMemoryEditSave')?.addEventListener('click', () => {
    const editItems = content.querySelectorAll('.memory-edit-item');
    sessionMemory.longTerm = Array.from(editItems).map(el => ({
      title: el.querySelector('.memory-edit-title').value.trim(),
      content: el.querySelector('.memory-edit-content').value.trim(),
    })).filter(item => item.title || item.content);

    if (currentSessionId) {
      upsertSessionMemory(currentSessionId, sessionMemory);
    }
    markDirty();
    renderMemoryModal();
  });

  content.querySelectorAll('.memory-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      sessionMemory.longTerm.splice(idx, 1);
      enableLongTermEdit(content, footer);
    });
  });
}

function renderShortTermTab(content, countEl, footer) {
  const items = sessionMemory?.shortTerm || [];
  countEl.textContent = `총 ${items.length}개`;

  if (items.length === 0) {
    content.innerHTML = '<p class="memory-empty">단기 기억이 없습니다.</p>';
  } else {
    content.innerHTML = items.map(item => `
      <div class="memory-card">
        <h4 class="memory-card-title">${escapeHtml(item.title)}</h4>
        <p class="memory-card-content">${escapeHtml(item.content)}</p>
      </div>
    `).join('');
  }

  footer.innerHTML = '<button class="btn btn-primary" data-close="modalMemory">확인</button>';
  footer.querySelector('[data-close]')?.addEventListener('click', () => closeModal('modalMemory'));
}

function renderCharactersTab(content, countEl, footer) {
  const items = sessionMemory?.characters || [];
  countEl.textContent = `총 ${items.length}개`;

  if (items.length === 0) {
    content.innerHTML = '<p class="memory-empty">등장인물 정보가 없습니다.</p>';
  } else {
    content.innerHTML = items.map(c => `
      <div class="memory-card">
        <h4 class="memory-card-title">${escapeHtml(c.name)} (${escapeHtml(c.role)})</h4>
        <p class="memory-card-content">${escapeHtml(c.description)}</p>
      </div>
    `).join('');
  }

  footer.innerHTML = '<button class="btn btn-primary" data-close="modalMemory">확인</button>';
  footer.querySelector('[data-close]')?.addEventListener('click', () => closeModal('modalMemory'));
}

function renderGoalsTab(content, countEl, footer) {
  const goals = sessionMemory?.goals || '';
  countEl.textContent = '';

  content.innerHTML = `
    <textarea id="memoryGoalsText" class="memory-goals-textarea" placeholder="현재 목표...">${escapeHtml(goals)}</textarea>
  `;

  footer.innerHTML = '<button class="btn btn-primary" id="btnMemoryGoalsSave">확인</button>';
  $('btnMemoryGoalsSave')?.addEventListener('click', () => {
    if (sessionMemory) {
      sessionMemory.goals = $('memoryGoalsText').value.trim();
      if (currentSessionId) {
        upsertSessionMemory(currentSessionId, sessionMemory);
      }
      markDirty();
    }
    closeModal('modalMemory');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.memory-tab');
  if (tab) {
    activeMemoryTab = tab.dataset.type;
    renderMemoryModal();
  }
});

// --- Init ---
loadFromLocalStorage();
updateBadges();
if (els.apiKey.value.trim()) fetchModels(els.apiKey.value.trim());
renderSessionList();
renderSaveStatus();
// --- URL Parameter Auto-Load ---
(async () => {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('storyId');
  const sessionId = params.get('sessionId');

  // 스토리 목록을 먼저 로드한 후 자동 선택 (race condition 방지)
  await loadStoryList();

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
