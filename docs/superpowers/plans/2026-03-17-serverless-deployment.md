# Serverless Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy AI Story Game online with Cloudflare Pages + Firebase Firestore, adding cloud session persistence with UUID-based access.

**Architecture:** Static files in `public/` served by Cloudflare Pages. Firebase Firestore (CDN SDK, no build tools) for session/preset cloud storage. 2-tier save: localStorage for instant cache, Firestore for cloud backup with event-based writes. No auth — UUID session IDs as access tokens.

**Tech Stack:** Vanilla HTML/CSS/JS (unchanged), Firebase Firestore JS SDK (CDN), Cloudflare Pages (static hosting)

**Spec:** `docs/superpowers/specs/2026-03-17-serverless-deployment-design.md`

---

## File Structure

```
public/                          # Deployment directory (Cloudflare Pages output)
├── index.html                   # Settings page (moved from root, minimal changes)
├── play.html                    # Game page (moved from root, major changes)
└── presets/
    └── basic-murim.json         # Preset file (moved from root)
firestore.rules                  # Firestore Security Rules (new)
```

**Key decisions:**
- HTML files move from root to `public/` — Cloudflare Pages serves only this directory
- `play.html` gets all Firebase/session logic — it's the game page where persistence matters
- `index.html` gets no Firebase changes this iteration (spec says deferred)
- No build tools, no npm — Firebase SDK loaded via CDN ES module imports
- Existing link `play.html` → `index.html` (and vice versa) works unchanged since both are in same directory

---

## Chunk 1: Project Restructure

### Task 1: Move files to `public/` directory

**Files:**
- Create: `public/` directory
- Move: `index.html` → `public/index.html`
- Move: `play.html` → `public/play.html`
- Move: `presets/basic-murim.json` → `public/presets/basic-murim.json`

- [ ] **Step 1: Create `public/` directory and move files**

```bash
mkdir -p public/presets
git mv index.html public/index.html
git mv play.html public/play.html
git mv presets/basic-murim.json public/presets/basic-murim.json
rm -rf presets  # may contain .DS_Store or other hidden files
```

- [ ] **Step 2: Verify files are in place**

```bash
ls -la public/
ls -la public/presets/
```

Expected: `index.html`, `play.html` in `public/`, `basic-murim.json` in `public/presets/`

- [ ] **Step 3: Open both pages in browser to verify they still work**

Open `public/index.html` and `public/play.html` in browser. Verify:
- Settings page loads, 3-panel layout renders
- Play page loads, top bar renders
- Navigation link between pages works (relative paths)

- [ ] **Step 4: Commit**

```bash
git add public/ && git rm -r --cached presets/ 2>/dev/null; git status
git commit -m "chore: move deployable files to public/ directory"
```

---

### Task 2: Create Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Write security rules file**

Create `firestore.rules` at project root (not in `public/` — this is a Firebase config file, not a deployed asset):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Note: Firestore enforces 1MB document size limit at platform level.
    // No byte-size check in rules — request.resource.size is not available for byte checks.
    match /sessions/{sessionId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['title', 'createdAt'])
                    && request.resource.data.createdAt == request.time;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['messages', 'updatedAt', 'lastPlayedAt', 'title', 'ttl', 'preset', 'model']);
      allow delete: if false;
    }

    match /presets/{presetId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['title', 'createdAt'])
                    && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules"
```

---

## Chunk 2: Firebase Integration in play.html

### Task 3: Add Firebase SDK and initialization

**Files:**
- Modify: `public/play.html`

This task adds Firebase Firestore SDK via CDN and initializes it. The Firebase config values will need to be filled in after the user creates a Firebase project.

- [ ] **Step 1: Add Firebase SDK imports**

In `public/play.html`, add Firebase SDK imports at the very top of the existing `<script>` block (line 643, before `// --- DOM References ---`). Since Firebase ES modules require `type="module"`, we need to restructure the script block.

Replace the opening `<script>` tag at line 643 with `<script type="module">`, and add Firebase imports at the top.

**Important:** `type="module"` scripts do not work with `file://` protocol. During development, serve via a local HTTP server (e.g., `npx serve public` or `python3 -m http.server -d public`). KaTeX and marked.js are loaded as classic scripts above — they set globals on `window`, which module scripts can still access.

```javascript
// --- Firebase ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db = null;
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase init failed:', e);
}
```

- [ ] **Step 2: Verify page still loads**

Open `public/play.html` in browser. Firebase will log a warning about empty config, but the page should render and existing functionality should work. Check browser console for any errors beyond the expected Firebase config warning.

- [ ] **Step 3: Commit**

```bash
git add public/play.html
git commit -m "feat: add Firebase Firestore SDK to play.html"
```

---

### Task 4: Implement session data layer (localStorage + Firestore)

**Files:**
- Modify: `public/play.html`

Add the session management module: UUID generation, localStorage session list, Firestore CRUD, dirty flag, and save status tracking.

- [ ] **Step 1: Add session constants and state variables**

Add after the Firebase initialization block:

```javascript
// --- Session Management ---
const SESSION_LIST_KEY = 'ai-story-game-sessions';
const SESSION_DATA_PREFIX = 'ai-story-session-';
const MAX_SESSION_LIST = 50;

let currentSessionId = null;
let isDirty = false;
let saveStatus = 'idle'; // 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'offline'
let autoSaveInterval = null;
```

- [ ] **Step 2: Add session list management functions (localStorage)**

```javascript
function getSessionList() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || '[]');
  } catch { return []; }
}

function saveSessionList(list) {
  // Cap at MAX_SESSION_LIST, remove oldest by lastPlayedAt
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
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.unshift(entry);
  }
  saveSessionList(list);
}

function removeFromSessionList(sessionId) {
  const list = getSessionList().filter(s => s.sessionId !== sessionId);
  saveSessionList(list);
}
```

- [ ] **Step 3: Add localStorage session data cache functions**

```javascript
function saveSessionToLocal(sessionId, data) {
  localStorage.setItem(SESSION_DATA_PREFIX + sessionId, JSON.stringify(data));
}

function loadSessionFromLocal(sessionId) {
  try {
    return JSON.parse(localStorage.getItem(SESSION_DATA_PREFIX + sessionId));
  } catch { return null; }
}

function removeSessionFromLocal(sessionId) {
  localStorage.removeItem(SESSION_DATA_PREFIX + sessionId);
}
```

- [ ] **Step 4: Add message format conversion helpers**

Convert between Gemini API format (`{role, parts: [{text}]}`) and storage format (`{role, content, timestamp}`):

```javascript
function messagesToStorage(conversationHistory) {
  return conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.parts[0].text,
    timestamp: Date.now()
  }));
}

function messagesFromStorage(stored) {
  return stored.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
}
```

- [ ] **Step 5: Add Firestore session CRUD functions**

```javascript
function buildSessionDocument() {
  return {
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
    },
    messages: messagesToStorage(conversationHistory),
    model: els.modelSelect.value || '',
    updatedAt: serverTimestamp(),
    lastPlayedAt: serverTimestamp(),
  };
}

async function createSessionInFirestore(sessionId) {
  if (!db) return false;
  try {
    const docData = {
      ...buildSessionDocument(),
      createdAt: serverTimestamp(),
      ttl: null,
    };
    await setDoc(doc(db, 'sessions', sessionId), docData);
    return true;
  } catch (e) {
    console.error('Firestore create failed:', e);
    return false;
  }
}

async function updateSessionInFirestore(sessionId) {
  if (!db || !sessionId) return false;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), buildSessionDocument());
    return true;
  } catch (e) {
    console.error('Firestore update failed:', e);
    return false;
  }
}

async function loadSessionFromFirestore(sessionId) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (e) {
    console.error('Firestore load failed:', e);
    return null;
  }
}
```

- [ ] **Step 6: Add the unified save function with status tracking**

```javascript
// Stub — replaced with full implementation in Task 6
function renderSaveStatus() {}

function updateSaveStatus(status) {
  saveStatus = status;
  renderSaveStatus();
}

async function saveToCloud() {
  if (!currentSessionId || !isDirty) return;
  if (!navigator.onLine) {
    updateSaveStatus('offline');
    return;
  }

  updateSaveStatus('saving');

  // Always save to localStorage first
  const localData = {
    ...buildSessionDocument(),
    updatedAt: Date.now(),
    lastPlayedAt: Date.now(),
  };
  saveSessionToLocal(currentSessionId, localData);
  addToSessionList(currentSessionId, localData.title);

  // Then try Firestore
  const ok = await updateSessionInFirestore(currentSessionId);
  if (ok) {
    isDirty = false;
    updateSaveStatus('saved');
  } else {
    updateSaveStatus('error');
    // isDirty stays true — will retry on next trigger
  }
}

function markDirty() {
  isDirty = true;
  updateSaveStatus('unsaved');

  // Save to localStorage immediately (free, instant)
  if (currentSessionId) {
    const localData = {
      ...buildSessionDocument(),
      updatedAt: Date.now(),
      lastPlayedAt: Date.now(),
    };
    saveSessionToLocal(currentSessionId, localData);
    addToSessionList(currentSessionId, localData.title);
  }
}
```

- [ ] **Step 7: Verify no syntax errors**

Open `public/play.html` in browser. Check console for errors. Existing functionality should still work.

- [ ] **Step 8: Commit**

```bash
git add public/play.html
git commit -m "feat: add session data layer with localStorage and Firestore CRUD"
```

---

### Task 5: Wire up save triggers (events, interval, pagehide)

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: Add event-based save triggers**

Add after the save functions:

```javascript
// --- Save Triggers ---

// visibilitychange: save when tab is hidden (Firestore SDK async — reliable)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && isDirty && currentSessionId) {
    saveToCloud();
  }
});

// pagehide: metadata-only via fetch+keepalive (64KB limit — no messages)
window.addEventListener('pagehide', () => {
  if (!isDirty || !currentSessionId || !db || !FIREBASE_CONFIG.projectId) return;
  const projectId = FIREBASE_CONFIG.projectId;
  const now = new Date().toISOString();
  const payload = {
    fields: {
      updatedAt: { timestampValue: now },
      lastPlayedAt: { timestampValue: now },
    }
  };
  fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sessions/${currentSessionId}?updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=lastPlayedAt`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }
  ).catch(() => {});
});

// 5-minute interval auto-save (safety net)
function startAutoSave() {
  stopAutoSave();
  autoSaveInterval = setInterval(() => {
    if (isDirty && currentSessionId) saveToCloud();
  }, 5 * 60 * 1000);
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

// Online/offline detection
window.addEventListener('online', () => {
  if (isDirty && currentSessionId) saveToCloud();
});

window.addEventListener('offline', () => {
  if (currentSessionId) updateSaveStatus('offline');
});
```

- [ ] **Step 2: Verify no errors**

Note: `markDirty()` will be hooked into `sendToGemini` in Task 8 Step 2 (together with `updateTurnCount`).

- [ ] **Step 3: Verify no errors**

Open `public/play.html`, check console. Triggers should be registered without errors.

- [ ] **Step 4: Commit**

```bash
git add public/play.html
git commit -m "feat: wire up save triggers (visibility, pagehide, interval, online)"
```

---

## Chunk 3: Session Management UI

### Task 6: Add save status indicator and manual save button to top bar

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: Add CSS for save status**

Add to the `<style>` section, before the closing `</style>` tag:

```css
.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  white-space: nowrap;
}

.save-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.save-dot.unsaved { background: var(--text-muted); }
.save-dot.saving { background: #d29922; animation: pulse 1s infinite; }
.save-dot.saved { background: #2ea043; }
.save-dot.error { background: var(--accent); }
.save-dot.offline { background: #d29922; }

.save-text { color: var(--text-muted); }

.btn-save-cloud {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}
.btn-save-cloud:hover { color: var(--text); border-color: var(--text-muted); }
.btn-save-cloud:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 2: Add save status HTML to top bar**

In the top bar HTML, find the `<div class="spacer"></div>` line. Insert before it:

```html
<div class="save-status" id="saveStatus" style="display:none;">
  <span class="save-dot unsaved" id="saveDot"></span>
  <span class="save-text" id="saveText">저장안됨</span>
</div>
<button class="btn-save-cloud" id="btnSaveCloud" style="display:none;" title="클라우드에 저장">저장</button>
```

- [ ] **Step 3: Add `renderSaveStatus` function and manual save handler**

Add in the JavaScript section:

```javascript
function renderSaveStatus() {
  const statusEl = $('saveStatus');
  const dotEl = $('saveDot');
  const textEl = $('saveText');
  const btnEl = $('btnSaveCloud');

  if (!currentSessionId) {
    statusEl.style.display = 'none';
    btnEl.style.display = 'none';
    return;
  }

  statusEl.style.display = 'flex';
  btnEl.style.display = 'inline-block';

  const states = {
    idle:    { dot: 'saved',   text: '저장됨' },
    unsaved: { dot: 'unsaved', text: '저장안됨' },
    saving:  { dot: 'saving',  text: '저장 중...' },
    saved:   { dot: 'saved',   text: '저장됨' },
    error:   { dot: 'error',   text: '저장 실패' },
    offline: { dot: 'offline', text: '오프라인' },
  };

  const state = states[saveStatus] || states.idle;
  dotEl.className = `save-dot ${state.dot}`;
  textEl.textContent = state.text;
  btnEl.disabled = saveStatus === 'saving';
}

$('btnSaveCloud').addEventListener('click', () => {
  if (currentSessionId) {
    isDirty = true; // Force save even if not dirty
    saveToCloud();
  }
});
```

- [ ] **Step 4: Verify save status appears in top bar**

Open page, start a game (or we'll test this after session flow is wired). For now, verify no JS errors.

- [ ] **Step 5: Commit**

```bash
git add public/play.html
git commit -m "feat: add save status indicator and manual save button"
```

---

### Task 7: Add session list panel and session ID input

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: Add CSS for session UI**

Add to `<style>`:

```css
.session-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  font-size: 12px;
  flex-wrap: wrap;
}

.session-bar select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 8px;
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  max-width: 250px;
}

.session-bar input[type="text"] {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 8px;
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  width: 320px;
}

.session-bar input:focus, .session-bar select:focus {
  outline: none;
  border-color: var(--accent);
}

.session-bar .label {
  color: var(--text-muted);
  white-space: nowrap;
}

.session-id-display {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  background: var(--bg-input);
  border-radius: 4px;
  border: 1px solid var(--border);
}
.session-id-display:hover { color: var(--text); border-color: var(--text-muted); }

.turn-count {
  font-size: 11px;
  color: var(--text-muted);
}
.turn-count.warning { color: #d29922; }
.turn-count.danger { color: var(--accent); }
```

- [ ] **Step 2: Add session bar HTML**

Add between the closing `</div>` of the top bar and the opening `<div class="main-content">`:

```html
<!-- Session Bar -->
<div class="session-bar" id="sessionBar">
  <span class="label">세션:</span>
  <select id="sessionSelect">
    <option value="">새 게임 또는 세션 선택...</option>
  </select>
  <input type="text" id="sessionIdInput" placeholder="세션 ID 입력 (다른 기기에서 이어하기)">
  <button class="btn-icon" id="btnLoadSession" title="세션 불러오기" style="font-size:12px;padding:5px 8px;">불러오기</button>
  <span class="session-id-display" id="sessionIdDisplay" style="display:none;" title="클릭하여 세션 ID 복사"></span>
  <span class="turn-count" id="turnCount"></span>
</div>
```

- [ ] **Step 3: Add session UI logic**

```javascript
// --- Session UI ---
function renderSessionList() {
  const select = $('sessionSelect');
  const list = getSessionList();
  select.innerHTML = '<option value="">새 게임 또는 세션 선택...</option>';
  for (const s of list) {
    const opt = document.createElement('option');
    opt.value = s.sessionId;
    const time = new Date(s.lastPlayedAt).toLocaleString('ko-KR');
    opt.textContent = `${s.title} (${time})`;
    if (s.sessionId === currentSessionId) opt.selected = true;
    select.appendChild(opt);
  }
}

function renderSessionId() {
  const display = $('sessionIdDisplay');
  if (currentSessionId) {
    display.style.display = 'inline-block';
    display.textContent = `ID: ${currentSessionId.slice(0, 8)}...`;
    display.title = `${currentSessionId} — 클릭하여 복사`;
  } else {
    display.style.display = 'none';
  }
}

function updateTurnCount() {
  const el = $('turnCount');
  const msgCount = conversationHistory.length;
  const exchanges = Math.floor(msgCount / 2);
  el.textContent = exchanges > 0 ? `${exchanges}턴 (${msgCount}메시지)` : '';
  el.className = 'turn-count' + (msgCount >= 500 ? ' danger' : msgCount >= 300 ? ' warning' : '');
}

// Copy session ID on click
$('sessionIdDisplay').addEventListener('click', () => {
  if (currentSessionId) {
    navigator.clipboard.writeText(currentSessionId).then(() => {
      const el = $('sessionIdDisplay');
      const orig = el.textContent;
      el.textContent = '복사됨!';
      setTimeout(() => { el.textContent = orig; }, 1500);
    });
  }
});

// Load session from dropdown
$('sessionSelect').addEventListener('change', async (e) => {
  const sessionId = e.target.value;
  if (!sessionId) return;
  await loadSession(sessionId);
});

// Load session by ID input
$('btnLoadSession').addEventListener('click', async () => {
  const sessionId = $('sessionIdInput').value.trim();
  if (!sessionId) { alert('세션 ID를 입력해주세요.'); return; }
  await loadSession(sessionId);
  $('sessionIdInput').value = '';
});
```

- [ ] **Step 4: Add the `loadSession` function**

```javascript
async function loadSession(sessionId) {
  // Try localStorage first (instant)
  let localData = loadSessionFromLocal(sessionId);

  // Try Firestore
  let firestoreData = await loadSessionFromFirestore(sessionId);

  if (!localData && !firestoreData) {
    alert('세션을 찾을 수 없습니다.');
    return;
  }

  // Last-write-wins: compare updatedAt
  let data;
  if (localData && firestoreData) {
    const localTime = localData.updatedAt || 0;
    const firestoreTime = firestoreData.updatedAt?.toMillis?.() || firestoreData.updatedAt?.seconds * 1000 || 0;
    data = localTime > firestoreTime ? localData : firestoreData;
  } else {
    data = firestoreData || localData;
  }

  // Restore session state
  currentSessionId = sessionId;

  // Restore settings
  if (data.preset) {
    Object.assign(settingsData, data.preset);
    // Restore checkbox state from saved preset
    if ('useLatex' in data.preset) els.useLatex.checked = !!data.preset.useLatex;
    if ('useCache' in data.preset) els.useCache.checked = !!data.preset.useCache;
    updateBadges();
  }
  if (data.model && els.modelSelect.querySelector(`option[value="${data.model}"]`)) {
    els.modelSelect.value = data.model;
  }
  if (data.title) {
    settingsData.title = data.title;
    els.settingsName.textContent = data.title;
  }

  // Restore conversation
  const messages = data.messages || [];
  if (messages.length > 0 && messages[0].content !== undefined) {
    // Storage format — convert back
    conversationHistory = messagesFromStorage(messages);
  } else if (messages.length > 0 && messages[0].parts !== undefined) {
    // Already in Gemini format (from localStorage)
    conversationHistory = messages;
  } else {
    conversationHistory = [];
  }

  // Re-render game output
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

  // Enable input
  els.gameInput.disabled = false;
  els.btnSend.disabled = false;

  // Update UI
  addToSessionList(sessionId, data.title || '제목 없음');
  renderSessionList();
  renderSessionId();
  updateTurnCount();
  isDirty = false;
  updateSaveStatus('saved');
  startAutoSave();

  // Cache to localStorage if loaded from Firestore
  if (firestoreData) {
    saveSessionToLocal(sessionId, {
      ...data,
      updatedAt: Date.now(),
      lastPlayedAt: Date.now(),
    });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add public/play.html
git commit -m "feat: add session list panel, ID input, and session loading"
```

---

### Task 8: Wire "게임 시작" to create a new session

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: Modify the `btnStart` click handler**

Replace the existing `els.btnStart.addEventListener('click', ...)` block with:

```javascript
els.btnStart.addEventListener('click', async () => {
  if (isGenerating) return;
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey) { alert('API Key를 입력해주세요.'); els.apiKey.focus(); return; }
  if (!model) { alert('모델을 선택해주세요.'); return; }

  // Stop previous session auto-save
  stopAutoSave();

  // Create new session
  currentSessionId = crypto.randomUUID();
  conversationHistory = [];
  els.gameOutput.innerHTML = '';
  resetTokens();
  els.gameInput.disabled = false;
  els.btnSend.disabled = false;

  // Create in Firestore
  await createSessionInFirestore(currentSessionId);

  // Update local session list
  const title = settingsData.title || '제목 없음';
  addToSessionList(currentSessionId, title);
  renderSessionList();
  renderSessionId();
  updateTurnCount();
  isDirty = false;
  updateSaveStatus('saved');
  startAutoSave();

  // Cache handling
  clearCache();
  if (els.useCache.checked) {
    const ok = await createCache(apiKey, model);
    if (!ok) alert('캐시 생성에 실패했습니다. 캐시 없이 진행합니다.');
  }

  sendToGemini('게임을 시작해줘');
});
```

- [ ] **Step 2: Update `sendToGemini` to call `markDirty` and `updateTurnCount`**

In the `sendToGemini` function, after the line:
```javascript
conversationHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
```
Add:
```javascript
markDirty();
updateTurnCount();
```

And after the user message push:
```javascript
conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
```
Add:
```javascript
markDirty();
updateTurnCount();
```

Also add a turn count check before sending:
```javascript
// conversationHistory.length counts individual messages (user + model).
// 500 messages ≈ 250 exchanges, which approaches the ~1MB Firestore limit.
if (conversationHistory.length >= 500) {
  alert('이 세션은 메시지 한도(500)에 도달했습니다. 새 게임을 시작해주세요.');
  return;
}
if (conversationHistory.length >= 300 && conversationHistory.length % 50 === 0) {
  console.warn(`경고: 메시지 ${conversationHistory.length}개 — 500개에서 저장 한계에 도달합니다.`);
}
```

- [ ] **Step 3: Initialize session UI on page load**

At the bottom of the script, in the init section (where `loadFromLocalStorage()` and `updateBadges()` are called), add:

```javascript
renderSessionList();
renderSaveStatus();
```

- [ ] **Step 4: Test the full flow**

1. Open `public/play.html`
2. Enter API key, select model
3. Click "게임 시작"
4. Verify: session ID appears, save status shows, session appears in dropdown
5. Send a message — save status changes to "저장안됨"
6. Click save button — status changes to "저장됨"
7. Refresh page — session appears in dropdown
8. Select session from dropdown — conversation restores

- [ ] **Step 5: Commit**

```bash
git add public/play.html
git commit -m "feat: wire game start to create sessions with full save flow"
```

---

## Chunk 4: Polish and Deploy

### Task 9: Handle edge cases and offline behavior

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: Add session deletion from list**

Add a delete button for each session in the dropdown, or a simple "clear history" option. For simplicity, add a right-click context or a small "×" next to the session display:

In the session bar HTML, add after the turn count span:

```html
<button class="btn-icon" id="btnDeleteSession" style="display:none;font-size:11px;padding:4px 8px;color:var(--accent);" title="현재 세션을 목록에서 제거">삭제</button>
```

Add the handler:

```javascript
$('btnDeleteSession').addEventListener('click', () => {
  if (!currentSessionId) return;
  if (!confirm('이 세션을 목록에서 제거할까요? (클라우드 데이터는 유지됩니다)')) return;
  removeFromSessionList(currentSessionId);
  removeSessionFromLocal(currentSessionId);
  stopAutoSave();
  currentSessionId = null;
  conversationHistory = [];
  els.gameOutput.innerHTML = '<p class="game-placeholder">게임을 시작하려면 API Key를 입력하고 "게임 시작" 버튼을 누르세요.</p>';
  els.gameInput.disabled = true;
  els.btnSend.disabled = true;
  renderSessionList();
  renderSessionId();
  renderSaveStatus();
  $('btnDeleteSession').style.display = 'none';
});
```

Update `renderSessionId` to also show/hide the delete button:

```javascript
function renderSessionId() {
  const display = $('sessionIdDisplay');
  const deleteBtn = $('btnDeleteSession');
  if (currentSessionId) {
    display.style.display = 'inline-block';
    display.textContent = `ID: ${currentSessionId.slice(0, 8)}...`;
    display.title = `${currentSessionId} — 클릭하여 복사`;
    deleteBtn.style.display = 'inline-block';
  } else {
    display.style.display = 'none';
    deleteBtn.style.display = 'none';
  }
}
```

- [ ] **Step 2: Ensure `updateBadges` compatibility with module scope**

Since we changed the script to `type="module"`, functions aren't global. The existing `applySettings` function references `typeof updateBadges === 'function'`. This will still work because `updateBadges` is defined in the same module scope. Verify this by loading settings — badges should update correctly.

- [ ] **Step 3: Commit**

```bash
git add public/play.html
git commit -m "feat: add session delete, edge case handling"
```

---

### Task 10: Create `.gitignore` additions and deployment prep

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Verify `.gitignore` excludes sensitive files from `public/`**

Check current `.gitignore` and ensure `story-game-settings.json` (at root) is excluded, and any future local config files won't be deployed. Add if needed:

```
# Local settings (not for deployment)
story-game-settings.json
test
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for deployment"
```

---

### Task 11: Firebase project setup documentation

**Files:**
- Modify: `public/play.html` (add placeholder comment)

This task is a human step — the user needs to create a Firebase project and fill in the config.

- [ ] **Step 1: Add clear instructions as HTML comment**

At the top of `public/play.html`, add:

```html
<!--
  Firebase Setup Required:
  1. Go to https://console.firebase.google.com/
  2. Create a new project (or use existing)
  3. Enable Firestore Database (production mode)
  4. Register a Web App → copy config values
  5. Find FIREBASE_CONFIG in the <script> section below and fill in the values
  6. Deploy firestore.rules from this repo to your Firestore instance
-->
```

- [ ] **Step 2: Commit**

```bash
git add public/play.html
git commit -m "docs: add Firebase setup instructions to play.html"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1-2 | Project restructure (`public/`), Firestore rules |
| 2 | 3-5 | Firebase SDK, session data layer, save triggers |
| 3 | 6-8 | Save status UI, session list, game start → session creation |
| 4 | 9-11 | Edge cases, deployment prep, Firebase setup docs |

After completing all tasks, the user needs to:
1. Create a Firebase project and fill in `FIREBASE_CONFIG` in `play.html`
2. Deploy `firestore.rules` to their Firestore instance
3. Connect the GitHub repo to Cloudflare Pages (output directory: `public/`)
4. Set up custom domain in Cloudflare DNS
