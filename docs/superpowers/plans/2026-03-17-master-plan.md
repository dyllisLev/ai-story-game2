# AI Story Game — Master Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI Story Game에 Firebase Firestore 기반 클라우드 저장, 스토리/세션 분리, 요약 메모리, 모바일 지원 등 전체 기능을 구현한 뒤 Cloudflare Pages로 배포.

**Architecture:** 순수 HTML/CSS/JS + Firebase Firestore (CDN SDK). 서버 코드 없음. 개발 중 로컬 HTTP 서버 사용 (`npx serve .` 등). 최종 배포 시 `public/`으로 이동 후 Cloudflare Pages.

**Tech Stack:** Vanilla HTML/CSS/JS, Firebase Firestore JS SDK (CDN), Web Crypto API (SHA-256), Cloudflare Pages

**Specs:**
- `docs/superpowers/specs/2026-03-17-serverless-deployment-design.md`
- `docs/TODO.md`

---

## Phase Overview

| Phase | 내용 | 산출물 |
|-------|------|--------|
| 1 | Firebase 환경 셋업 + SDK 연동 | Firestore 연결된 play.html |
| 2 | 세션 저장/이어하기 | 2계층 저장, 세션 UI |
| 3 | 스토리/세션 분리 (#4) | `stories` 컬렉션, 스토리 공유 |
| 4 | 스토리 암호 (#3) | SHA-256 해싱, 수정 보호 |
| 5 | 요약 메모리 + 슬라이딩 윈도우 (#1, #2) | 토큰 비용 절감 |
| 6 | 기본셋 자동 불러오기 (#6) | 운영자 프리셋 |
| 7 | 모바일 + UI 개선 (#7, #5) | 반응형, 집중 모드 |
| 8 | 배포 | `public/`, Cloudflare Pages, 자동 배포 |

---

## Phase 1: Firebase 환경 셋업

### Task 1: Firestore Security Rules 파일 생성

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Write security rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 세션: 누구나 읽기/생성, 업데이트는 허용 필드만
    match /sessions/{sessionId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['title', 'createdAt'])
                    && request.resource.data.createdAt == request.time;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['messages', 'updatedAt', 'lastPlayedAt', 'title', 'ttl', 'summary', 'playerPreset', 'model']);
      allow delete: if false;
    }

    // 스토리: 누구나 읽기/생성, 수정은 암호 해시 일치 시만
    match /stories/{storyId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['title', 'createdAt'])
                    && request.resource.data.createdAt == request.time;
      allow update: if request.resource.data.passwordHash == resource.data.passwordHash;
      allow delete: if false;
    }

    // 프리셋 (기본셋): 읽기만 허용 (운영자가 콘솔에서 관리)
    match /presets/{presetId} {
      allow read: if true;
      allow create, update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules with stories, sessions, presets"
```

---

### Task 2: Firebase SDK를 play.html에 추가

**Files:**
- Modify: `play.html`

**Important:** `type="module"` 스크립트는 `file://`에서 작동하지 않음. 개발 시 로컬 서버 필요:
```bash
npx serve .   # 또는 python3 -m http.server
```

- [ ] **Step 1: 기존 `<script>` 태그를 `<script type="module">`로 변경하고 Firebase imports 추가**

line 643의 `<script>` → `<script type="module">` 변경 후, 최상단에 추가:

```javascript
// --- Firebase ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const FIREBASE_CONFIG = {
  // TODO: Firebase 콘솔에서 프로젝트 생성 후 값 채우기
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db = null;
try {
  if (FIREBASE_CONFIG.apiKey) {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase init failed:', e);
}
```

- [ ] **Step 2: 로컬 서버로 페이지 동작 확인**

```bash
npx serve . &
# http://localhost:3000/play.html 접속
```

KaTeX, marked.js 동작 확인. Firebase는 config 비어있으므로 경고만 출력. 기존 기능 정상 작동 확인.

- [ ] **Step 3: Commit**

```bash
git add play.html
git commit -m "feat: add Firebase Firestore SDK to play.html"
```

---

### Task 3: Firebase 프로젝트 생성 (수동 — 사용자 작업)

이 태스크는 코드 작업이 아닌 사용자 수동 작업.

- [ ] **Step 1: Firebase 프로젝트 생성**

1. https://console.firebase.google.com/ 접속
2. "프로젝트 추가" → 이름 입력 → 생성
3. Firestore Database → "데이터베이스 만들기" → 프로덕션 모드
4. "웹 앱 추가" (</>) → 앱 이름 입력 → config 복사

- [ ] **Step 2: play.html에 config 값 채우기**

`FIREBASE_CONFIG` 객체에 Firebase 콘솔에서 복사한 값 붙여넣기.

- [ ] **Step 3: Firestore Rules 배포**

```bash
# Firebase CLI 설치 (아직 없다면)
npm install -g firebase-tools
firebase login
firebase init firestore  # firestore.rules 파일 연결
firebase deploy --only firestore:rules
```

- [ ] **Step 4: 연결 확인**

브라우저 콘솔에서 Firebase 관련 에러 없이 초기화 되는지 확인.

- [ ] **Step 5: Commit**

```bash
git add play.html
git commit -m "feat: configure Firebase project connection"
```

---

## Phase 2: 세션 저장/이어하기

### Task 4: 세션 데이터 레이어 구현

**Files:**
- Modify: `play.html`

- [ ] **Step 1: 세션 상수 및 상태 변수 추가**

Firebase 초기화 블록 아래에 추가:

```javascript
// --- Session Management ---
const SESSION_LIST_KEY = 'ai-story-game-sessions';
const SESSION_DATA_PREFIX = 'ai-story-session-';
const MAX_SESSION_LIST = 50;

let currentSessionId = null;
let isDirty = false;
let saveStatus = 'idle'; // 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'offline'
let autoSaveInterval = null;

// Stub — replaced with full implementation in Task 7
function renderSaveStatus() {}
```

- [ ] **Step 2: localStorage 세션 목록 관리 함수 추가**

```javascript
function getSessionList() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || '[]');
  } catch { return []; }
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
```

- [ ] **Step 3: localStorage 세션 데이터 캐시 함수 추가**

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

- [ ] **Step 4: 메시지 포맷 변환 헬퍼 추가**

Gemini API 포맷 (`{role, parts}`) ↔ 저장 포맷 (`{role, content, timestamp}`):

```javascript
function messagesToStorage(history) {
  return history.map((msg, i) => ({
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
```

- [ ] **Step 5: Firestore 세션 CRUD 함수 추가**

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
    await setDoc(doc(db, 'sessions', sessionId), {
      ...buildSessionDocument(),
      createdAt: serverTimestamp(),
      ttl: null,
    });
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
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('Firestore load failed:', e);
    return null;
  }
}
```

- [ ] **Step 6: 통합 저장 함수 + 더티 플래그 추가**

```javascript
function updateSaveStatus(status) {
  saveStatus = status;
  renderSaveStatus();
}

async function saveToCloud() {
  if (!currentSessionId || !isDirty) return;
  if (!navigator.onLine) { updateSaveStatus('offline'); return; }

  updateSaveStatus('saving');

  // localStorage 즉시 저장
  const localData = { ...buildSessionDocument(), updatedAt: Date.now(), lastPlayedAt: Date.now() };
  saveSessionToLocal(currentSessionId, localData);
  addToSessionList(currentSessionId, localData.title);

  // Firestore 저장 시도
  const ok = await updateSessionInFirestore(currentSessionId);
  if (ok) {
    isDirty = false;
    updateSaveStatus('saved');
  } else {
    updateSaveStatus('error');
  }
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
```

- [ ] **Step 7: 동작 확인 — 콘솔 에러 없음**

- [ ] **Step 8: Commit**

```bash
git add play.html
git commit -m "feat: add session data layer with localStorage and Firestore CRUD"
```

---

### Task 5: 저장 트리거 연결 (이벤트, 주기, pagehide)

**Files:**
- Modify: `play.html`

- [ ] **Step 1: 이벤트 기반 저장 트리거 추가**

```javascript
// --- Save Triggers ---
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && isDirty && currentSessionId) saveToCloud();
});

// pagehide: 메타데이터만 (keepalive 64KB 제한)
window.addEventListener('pagehide', () => {
  if (!isDirty || !currentSessionId || !FIREBASE_CONFIG.projectId) return;
  const now = new Date().toISOString();
  fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/sessions/${currentSessionId}?updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=lastPlayedAt`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        updatedAt: { timestampValue: now },
        lastPlayedAt: { timestampValue: now },
      }}),
      keepalive: true,
    }
  ).catch(() => {});
});

// 5분 주기 자동 저장
function startAutoSave() {
  stopAutoSave();
  autoSaveInterval = setInterval(() => {
    if (isDirty && currentSessionId) saveToCloud();
  }, 5 * 60 * 1000);
}

function stopAutoSave() {
  if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
}

// 온라인/오프라인 감지
window.addEventListener('online', () => { if (isDirty && currentSessionId) saveToCloud(); });
window.addEventListener('offline', () => { if (currentSessionId) updateSaveStatus('offline'); });
```

- [ ] **Step 2: `sendToGemini`에 `markDirty()` + `updateTurnCount()` 연결**

`sendToGemini` 함수에서:

(a) user 메시지 push 직후 (`conversationHistory.push({ role: 'user', ... })` 다음):
```javascript
markDirty();
updateTurnCount();
```

(b) model 응답 push 직후 (`conversationHistory.push({ role: 'model', ... })` 다음):
```javascript
markDirty();
updateTurnCount();
```

(c) 함수 시작부에 턴 제한 체크 추가 (apiKey/model 검증 바로 뒤):
```javascript
if (conversationHistory.length >= 500) {
  alert('이 세션은 메시지 한도(500)에 도달했습니다. 새 게임을 시작해주세요.');
  return;
}
```

- [ ] **Step 3: Commit**

```bash
git add play.html
git commit -m "feat: wire save triggers (visibility, pagehide, interval, online/offline)"
```

---

### Task 6: 게임 시작 → 세션 생성 연결

**Files:**
- Modify: `play.html`

- [ ] **Step 1: `btnStart` 클릭 핸들러 교체**

기존 `els.btnStart.addEventListener('click', ...)` 전체를 교체:

```javascript
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
  resetTokens();
  els.gameInput.disabled = false;
  els.btnSend.disabled = false;

  await createSessionInFirestore(currentSessionId);
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

  sendToGemini('게임을 시작해줘');
});
```

- [ ] **Step 2: Commit**

```bash
git add play.html
git commit -m "feat: wire game start to session creation"
```

---

### Task 7: 저장 상태 UI + 세션 목록 UI

**Files:**
- Modify: `play.html`

- [ ] **Step 1: CSS 추가** (`</style>` 바로 위에)

```css
/* --- Save Status --- */
.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  white-space: nowrap;
}
.save-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.save-dot.unsaved { background: var(--text-muted); }
.save-dot.saving { background: #d29922; animation: pulse 1s infinite; }
.save-dot.saved { background: #2ea043; }
.save-dot.error { background: var(--accent); }
.save-dot.offline { background: #d29922; }
.save-text { color: var(--text-muted); }

.btn-save-cloud {
  background: none; border: 1px solid var(--border); color: var(--text-muted);
  padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; white-space: nowrap;
}
.btn-save-cloud:hover { color: var(--text); border-color: var(--text-muted); }
.btn-save-cloud:disabled { opacity: 0.5; cursor: not-allowed; }

/* --- Session Bar --- */
.session-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  background: var(--bg-panel); border-bottom: 1px solid var(--border);
  flex-shrink: 0; font-size: 12px; flex-wrap: wrap;
}
.session-bar select, .session-bar input[type="text"] {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px;
  padding: 5px 8px; color: var(--text); font-size: 12px; font-family: inherit;
}
.session-bar select { max-width: 250px; }
.session-bar input[type="text"] { width: 320px; }
.session-bar input:focus, .session-bar select:focus { outline: none; border-color: var(--accent); }
.session-bar .label { color: var(--text-muted); white-space: nowrap; }

.session-id-display {
  font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: var(--text-muted);
  cursor: pointer; padding: 4px 8px; background: var(--bg-input); border-radius: 4px;
  border: 1px solid var(--border);
}
.session-id-display:hover { color: var(--text); border-color: var(--text-muted); }

.turn-count { font-size: 11px; color: var(--text-muted); }
.turn-count.warning { color: #d29922; }
.turn-count.danger { color: var(--accent); }
```

- [ ] **Step 2: 저장 상태 HTML 추가** (top bar의 `<div class="spacer"></div>` 앞에)

```html
<div class="save-status" id="saveStatus" style="display:none;">
  <span class="save-dot unsaved" id="saveDot"></span>
  <span class="save-text" id="saveText">저장안됨</span>
</div>
<button class="btn-save-cloud" id="btnSaveCloud" style="display:none;" title="클라우드에 저장">저장</button>
```

- [ ] **Step 3: 세션 바 HTML 추가** (top bar `</div>` 와 `<div class="main-content">` 사이)

```html
<div class="session-bar" id="sessionBar">
  <span class="label">세션:</span>
  <select id="sessionSelect"><option value="">새 게임 또는 세션 선택...</option></select>
  <input type="text" id="sessionIdInput" placeholder="세션 ID 입력 (다른 기기에서 이어하기)">
  <button class="btn-icon" id="btnLoadSession" style="font-size:12px;padding:5px 8px;">불러오기</button>
  <span class="session-id-display" id="sessionIdDisplay" style="display:none;"></span>
  <span class="turn-count" id="turnCount"></span>
  <button class="btn-icon" id="btnDeleteSession" style="display:none;font-size:11px;padding:4px 8px;color:var(--accent);" title="세션 삭제">삭제</button>
</div>
```

- [ ] **Step 4: 세션 UI JavaScript 추가**

```javascript
// --- Save Status UI ---
function renderSaveStatus() {
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
}

$('btnSaveCloud').addEventListener('click', () => {
  if (currentSessionId) { isDirty = true; saveToCloud(); }
});

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
  const display = $('sessionIdDisplay'), deleteBtn = $('btnDeleteSession');
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

function updateTurnCount() {
  const el = $('turnCount');
  const msgCount = conversationHistory.length;
  const exchanges = Math.floor(msgCount / 2);
  el.textContent = exchanges > 0 ? `${exchanges}턴 (${msgCount}메시지)` : '';
  el.className = 'turn-count' + (msgCount >= 500 ? ' danger' : msgCount >= 300 ? ' warning' : '');
}

// Session ID 복사
$('sessionIdDisplay').addEventListener('click', () => {
  if (!currentSessionId) return;
  navigator.clipboard.writeText(currentSessionId).then(() => {
    const el = $('sessionIdDisplay'), orig = el.textContent;
    el.textContent = '복사됨!';
    setTimeout(() => { el.textContent = orig; }, 1500);
  });
});

// 세션 선택
$('sessionSelect').addEventListener('change', (e) => { if (e.target.value) loadSession(e.target.value); });

// 세션 ID 입력으로 불러오기
$('btnLoadSession').addEventListener('click', () => {
  const id = $('sessionIdInput').value.trim();
  if (!id) { alert('세션 ID를 입력해주세요.'); return; }
  loadSession(id);
  $('sessionIdInput').value = '';
});

// 세션 삭제 (목록에서만)
$('btnDeleteSession').addEventListener('click', () => {
  if (!currentSessionId || !confirm('이 세션을 목록에서 제거할까요?')) return;
  removeFromSessionList(currentSessionId);
  removeSessionFromLocal(currentSessionId);
  stopAutoSave();
  currentSessionId = null; conversationHistory = [];
  els.gameOutput.innerHTML = '<p class="game-placeholder">게임을 시작하려면 API Key를 입력하고 "게임 시작" 버튼을 누르세요.</p>';
  els.gameInput.disabled = true; els.btnSend.disabled = true;
  renderSessionList(); renderSessionId(); renderSaveStatus();
});
```

- [ ] **Step 5: `loadSession` 함수 추가**

```javascript
async function loadSession(sessionId) {
  let localData = loadSessionFromLocal(sessionId);
  let firestoreData = await loadSessionFromFirestore(sessionId);

  if (!localData && !firestoreData) { alert('세션을 찾을 수 없습니다.'); return; }

  // Last-write-wins
  let data;
  if (localData && firestoreData) {
    const localTime = localData.updatedAt || 0;
    const fsTime = firestoreData.updatedAt?.toMillis?.() || firestoreData.updatedAt?.seconds * 1000 || 0;
    data = localTime > fsTime ? localData : firestoreData;
  } else {
    data = firestoreData || localData;
  }

  currentSessionId = sessionId;

  // 설정 복원
  if (data.preset) {
    Object.assign(settingsData, data.preset);
    if ('useLatex' in data.preset) els.useLatex.checked = !!data.preset.useLatex;
    if ('useCache' in data.preset) els.useCache.checked = !!data.preset.useCache;
    updateBadges();
  }
  if (data.model && els.modelSelect.querySelector(`option[value="${data.model}"]`)) {
    els.modelSelect.value = data.model;
  }
  if (data.title) { settingsData.title = data.title; els.settingsName.textContent = data.title; }

  // 대화 복원
  const messages = data.messages || [];
  if (messages.length > 0 && messages[0].content !== undefined) {
    conversationHistory = messagesFromStorage(messages);
  } else {
    conversationHistory = messages;
  }

  // 게임 출력 재렌더링
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

  els.gameInput.disabled = false; els.btnSend.disabled = false;
  addToSessionList(sessionId, data.title || '제목 없음');
  renderSessionList(); renderSessionId(); updateTurnCount();
  isDirty = false; updateSaveStatus('saved'); startAutoSave();

  if (firestoreData) saveSessionToLocal(sessionId, { ...data, updatedAt: Date.now(), lastPlayedAt: Date.now() });
}
```

- [ ] **Step 6: 초기화 코드에 세션 UI 렌더링 추가** (기존 init 섹션 하단)

```javascript
renderSessionList();
renderSaveStatus();
```

- [ ] **Step 7: 전체 플로우 테스트**

1. 게임 시작 → 세션 ID 생성 확인
2. 메시지 전송 → "저장안됨" 표시
3. 수동 저장 → "저장됨"
4. 새로고침 → 세션 목록에서 선택 → 대화 복원
5. 세션 ID 복사 → 다른 탭에서 ID 입력 → 불러오기

- [ ] **Step 8: Commit**

```bash
git add play.html
git commit -m "feat: add session UI (save status, session list, load/delete)"
```

---

## Phase 3: 스토리/세션 분리 (TODO #4)

### Task 8: 스토리 데이터 모델 및 CRUD

**Files:**
- Modify: `play.html`
- Modify: `index.html`

스토리(세계관/캐릭터 설정 묶음) = 공유 가능한 템플릿.
세션 = 개인의 플레이 기록 (storyId 참조).

- [ ] **Step 1: index.html에 Firebase SDK 추가**

`index.html`에도 동일한 Firebase SDK import + config 추가. `<script>` → `<script type="module">`.

- [ ] **Step 2: index.html에 스토리 저장/공유 함수 추가**

```javascript
// --- Story Management ---
async function saveStoryToFirestore(storyData, passwordHash) {
  if (!db) return null;
  const storyId = crypto.randomUUID();
  try {
    await setDoc(doc(db, 'stories', storyId), {
      ...storyData,
      passwordHash: passwordHash || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPublic: true,
    });
    return storyId;
  } catch (e) {
    console.error('Story save failed:', e);
    return null;
  }
}

async function loadStoryFromFirestore(storyId) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'stories', storyId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('Story load failed:', e);
    return null;
  }
}

async function updateStoryInFirestore(storyId, storyData, passwordHash) {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      ...storyData,
      passwordHash,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('Story update failed:', e);
    return false;
  }
}
```

- [ ] **Step 3: index.html UI에 "스토리 공유" 버튼 추가**

기존 `btn-row` (저장/불러오기 버튼 옆)에 추가:

```html
<button id="btnShareStory" class="btn btn-secondary">온라인 공유</button>
<button id="btnLoadStory" class="btn btn-secondary">스토리 ID로 불러오기</button>
```

- [ ] **Step 4: 스토리 공유 핸들러 구현**

```javascript
$('btnShareStory').addEventListener('click', async () => {
  const data = getSettingsData();
  delete data.apiKey; // API 키는 공유하지 않음
  delete data.model;

  // 암호 설정 (Phase 4에서 구현, 여기선 null)
  const storyId = await saveStoryToFirestore(data, null);
  if (storyId) {
    prompt('스토리가 공유되었습니다. 아래 ID를 공유하세요:', storyId);
  } else {
    alert('스토리 공유에 실패했습니다.');
  }
});

$('btnLoadStory').addEventListener('click', async () => {
  const storyId = prompt('스토리 ID를 입력하세요:');
  if (!storyId) return;
  const data = await loadStoryFromFirestore(storyId);
  if (data) {
    applySettingsData(data);
    saveToLocalStorage();
    alert('스토리를 불러왔습니다.');
  } else {
    alert('스토리를 찾을 수 없습니다.');
  }
});
```

- [ ] **Step 5: play.html의 세션에 storyId 참조 추가**

`buildSessionDocument()`에 `storyId` 필드 추가:

```javascript
function buildSessionDocument() {
  return {
    storyId: currentStoryId || null,  // 새 변수 추가 필요
    title: settingsData.title || '제목 없음',
    // ... 기존 필드들
  };
}
```

상단에 변수 추가:
```javascript
let currentStoryId = null;
```

- [ ] **Step 6: Commit**

```bash
git add play.html index.html
git commit -m "feat: add story/session separation with Firestore CRUD"
```

---

## Phase 4: 스토리 암호 (TODO #3)

### Task 9: 클라이언트 해싱 + 암호 UI

**Files:**
- Modify: `index.html`

- [ ] **Step 1: SHA-256 해싱 유틸 추가**

```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2: "온라인 공유" 핸들러에 암호 입력 추가**

`btnShareStory` 핸들러를 수정:

```javascript
$('btnShareStory').addEventListener('click', async () => {
  const data = getSettingsData();
  delete data.apiKey;
  delete data.model;

  const password = prompt('스토리 수정 암호를 설정하세요 (빈칸이면 암호 없음):');
  const passwordHash = password ? await hashPassword(password) : null;

  const storyId = await saveStoryToFirestore(data, passwordHash);
  if (storyId) {
    const msg = `스토리 ID: ${storyId}` + (password ? '\n암호가 설정되었습니다. 수정 시 암호가 필요합니다.' : '');
    prompt(msg, storyId);
  } else {
    alert('스토리 공유에 실패했습니다.');
  }
});
```

- [ ] **Step 3: "스토리 수정" 버튼 + 암호 검증 추가**

```html
<button id="btnUpdateStory" class="btn btn-secondary">스토리 수정</button>
```

```javascript
$('btnUpdateStory').addEventListener('click', async () => {
  const storyId = prompt('수정할 스토리 ID:');
  if (!storyId) return;

  const existing = await loadStoryFromFirestore(storyId);
  if (!existing) { alert('스토리를 찾을 수 없습니다.'); return; }

  let passwordHash = existing.passwordHash;
  if (passwordHash) {
    const password = prompt('스토리 수정 암호를 입력하세요:');
    if (!password) return;
    const inputHash = await hashPassword(password);
    if (inputHash !== passwordHash) { alert('암호가 일치하지 않습니다.'); return; }
  }

  const data = getSettingsData();
  delete data.apiKey;
  delete data.model;

  const ok = await updateStoryInFirestore(storyId, data, passwordHash);
  alert(ok ? '스토리가 수정되었습니다.' : '수정에 실패했습니다.');
});
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add story password protection with SHA-256 hashing"
```

---

## Phase 5: 요약 메모리 + 슬라이딩 윈도우 (TODO #1, #2)

### Task 10: 요약 메모리 시스템

**Files:**
- Modify: `play.html`

- [ ] **Step 1: 요약 관련 상태 변수 추가**

```javascript
let storySummary = '';  // 현재까지의 이야기 요약
let summaryUpToIndex = 0;  // 요약이 반영된 마지막 메시지 인덱스
const SLIDING_WINDOW_SIZE = 20;  // 최근 N개 메시지만 API에 전송
```

- [ ] **Step 2: 요약 생성 함수 추가**

```javascript
async function generateSummary() {
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey || !model) return;

  // 요약할 메시지 범위: 이전 요약 이후 ~ 슬라이딩 윈도우 시작점
  const windowStart = Math.max(0, conversationHistory.length - SLIDING_WINDOW_SIZE);
  if (windowStart <= summaryUpToIndex) return; // 요약할 새 내용 없음

  const toSummarize = conversationHistory.slice(summaryUpToIndex, windowStart);
  if (toSummarize.length === 0) return;

  const summaryPrompt = storySummary
    ? `기존 요약:\n${storySummary}\n\n아래 새로운 대화를 기존 요약에 통합하여 업데이트해주세요.`
    : '아래 대화 내용을 핵심 줄거리, 중요 사건, 캐릭터 상태 변화 중심으로 요약해주세요.';

  const messages = toSummarize.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.parts[0].text}`).join('\n\n');

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${summaryPrompt}\n\n---\n${messages}` }] }],
          systemInstruction: { parts: [{ text: '당신은 이야기 요약 전문가입니다. 핵심 줄거리, 캐릭터 상태, 중요 사건을 간결하게 요약하세요. 500자 이내.' }] },
        }),
      }
    );
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    storySummary = data.candidates?.[0]?.content?.parts?.[0]?.text || storySummary;
    summaryUpToIndex = windowStart;
    markDirty();
  } catch (e) {
    console.error('Summary generation failed:', e);
  }
}
```

- [ ] **Step 3: `sendToGemini`에서 슬라이딩 윈도우 적용**

`sendToGemini` 함수에서 Gemini API 호출 부분을 수정. 기존에 `contents: conversationHistory`를 보내던 부분을:

```javascript
// 슬라이딩 윈도우: 최근 N개만 전송, 나머지는 요약으로 대체
const windowStart = Math.max(0, conversationHistory.length - SLIDING_WINDOW_SIZE);
const recentMessages = conversationHistory.slice(windowStart);

// 시스템 프롬프트에 요약 추가
let systemPrompt = buildPrompt();
if (storySummary) {
  systemPrompt += `\n\n[이전 이야기 요약]\n${storySummary}`;
}

const body = cachedContentName
  ? { cachedContent: cachedContentName, contents: recentMessages, safetySettings }
  : { system_instruction: { parts: [{ text: systemPrompt }] }, contents: recentMessages, safetySettings };
```

- [ ] **Step 4: 자동 요약 트리거 추가**

model 응답 push 후에 (markDirty 호출 근처):

```javascript
// 슬라이딩 윈도우보다 대화가 길어지면 자동 요약
if (conversationHistory.length > SLIDING_WINDOW_SIZE + 10) {
  generateSummary(); // 비동기, 백그라운드 실행
}
```

- [ ] **Step 5: 세션 저장/로드에 요약 포함**

`buildSessionDocument()`에 추가:

```javascript
summary: storySummary || '',
summaryUpToIndex: summaryUpToIndex || 0,
```

`loadSession()`에서 복원:

```javascript
storySummary = data.summary || '';
summaryUpToIndex = data.summaryUpToIndex || 0;
```

Firestore Rules의 sessions update 허용 필드에 `summary`, `summaryUpToIndex` 추가 (Task 1에서 이미 포함).

- [ ] **Step 6: 사이드 패널에 요약 보기/수동 요약 버튼 추가**

```html
<div class="side-menu-item" id="menuSummary">
  <span class="menu-icon">📝</span>
  <span class="menu-label">이야기 요약</span>
  <span class="menu-badge empty" id="badgeSummary">없음</span>
</div>
```

```javascript
$('menuSummary').addEventListener('click', async () => {
  if (!storySummary && conversationHistory.length > 4) {
    if (confirm('아직 요약이 없습니다. 지금 생성할까요?')) {
      summaryUpToIndex = 0; // 전체 요약
      await generateSummary();
    }
  }
  if (storySummary) {
    alert(`[이야기 요약]\n\n${storySummary}`);
    // TODO: Phase 7에서 모달로 개선
  }
});
```

- [ ] **Step 7: Commit**

```bash
git add play.html
git commit -m "feat: add story summary memory with sliding window"
```

---

## Phase 6: 기본셋 자동 불러오기 (TODO #6)

### Task 11: 운영자 프리셋 시스템

**Files:**
- Modify: `index.html`
- Create: `presets/default.json`

- [ ] **Step 1: 기본 프리셋 JSON 파일 생성**

```json
{
  "title": "기본 세계관",
  "worldSetting": "",
  "story": "",
  "characterName": "",
  "characterSetting": "",
  "characters": "",
  "userNote": "",
  "systemRules": "각 응답은 소설체로 작성하세요.\n마지막에 '▸ 당신의 행동은?' 으로 끝내세요.",
  "useLatex": true,
  "useCache": false
}
```

- [ ] **Step 2: Firestore에서 공개 프리셋 목록 로드 기능 추가** (index.html)

```javascript
async function loadPublicPresets() {
  if (!db) return [];
  try {
    const q = query(collection(db, 'presets'), where('isDefault', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Preset load failed:', e);
    return [];
  }
}
```

- [ ] **Step 3: 프리셋 선택 드롭다운 추가** (index.html 설정 패널 상단)

```html
<div class="form-group">
  <label>기본 프리셋</label>
  <select id="presetSelect">
    <option value="">직접 작성...</option>
  </select>
</div>
```

```javascript
async function initPresets() {
  // 로컬 기본 프리셋 로드
  try {
    const res = await fetch('presets/default.json');
    if (res.ok) {
      const data = await res.json();
      const opt = document.createElement('option');
      opt.value = '__default__';
      opt.textContent = data.title || '기본 세계관';
      opt.dataset.preset = JSON.stringify(data);
      $('presetSelect').appendChild(opt);
    }
  } catch {}

  // Firestore 공개 프리셋
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
```

- [ ] **Step 4: Commit**

```bash
git add index.html presets/default.json
git commit -m "feat: add default preset auto-loading system"
```

---

## Phase 7: 모바일 + UI 개선 (TODO #7, #5)

### Task 12: 반응형 레이아웃 + 모바일 최적화

**Files:**
- Modify: `play.html`
- Modify: `index.html`

- [ ] **Step 1: play.html에 반응형 CSS 추가**

```css
@media (max-width: 768px) {
  .top-bar { flex-wrap: wrap; padding: 8px; gap: 6px; }
  .top-bar input[type="password"] { width: 100%; order: 10; }
  .top-bar select { width: 100%; order: 11; }
  .token-bar { order: 12; width: 100%; justify-content: center; }

  .session-bar { flex-direction: column; align-items: stretch; }
  .session-bar select, .session-bar input[type="text"] { width: 100%; max-width: none; }

  .side-panel { position: fixed; right: 0; top: 0; bottom: 0; z-index: 50; width: 280px; }
  .side-panel.collapsed { transform: translateX(100%); margin-right: 0; }

  .game-input-area input { font-size: 16px; } /* iOS 줌 방지 */
}
```

- [ ] **Step 2: index.html에 반응형 CSS 추가**

```css
@media (max-width: 768px) {
  .container { flex-direction: column; height: auto; min-height: 100vh; }
  .panel { min-width: auto; max-height: none; }
  .panel-prompt { display: none; } /* 모바일에서 프롬프트 프리뷰 숨김 */
}
```

- [ ] **Step 3: 터치 타겟 최적화**

```css
@media (max-width: 768px) {
  .btn { min-height: 44px; padding: 12px 16px; }
  .btn-icon { min-width: 44px; min-height: 44px; }
  .side-menu-item { padding: 14px 12px; }
  .modal { max-width: 95vw; max-height: 90vh; }
}
```

- [ ] **Step 4: Commit**

```bash
git add play.html index.html
git commit -m "feat: add responsive layout and mobile optimization"
```

---

### Task 13: 플레이 집중 모드 UI 개선

**Files:**
- Modify: `play.html`

- [ ] **Step 1: 집중 모드 토글 추가**

top bar에 버튼 추가:

```html
<button id="btnFocusMode" class="btn-icon" title="집중 모드">👁</button>
```

```css
body.focus-mode .top-bar { display: none; }
body.focus-mode .session-bar { display: none; }
body.focus-mode .game-area { padding: 24px 15vw; }
body.focus-mode .side-panel { display: none; }

/* 집중 모드 해제 버튼 */
.focus-exit {
  display: none;
  position: fixed; top: 12px; right: 12px; z-index: 100;
}
body.focus-mode .focus-exit { display: block; }

@media (max-width: 768px) {
  body.focus-mode .game-area { padding: 16px; }
}
```

```html
<button class="btn-icon focus-exit" id="btnExitFocus" title="집중 모드 해제">✕</button>
```

```javascript
$('btnFocusMode').addEventListener('click', () => document.body.classList.add('focus-mode'));
$('btnExitFocus').addEventListener('click', () => document.body.classList.remove('focus-mode'));
```

- [ ] **Step 2: Commit**

```bash
git add play.html
git commit -m "feat: add focus mode for distraction-free play"
```

---

## Phase 8: 배포

### Task 14: public/ 디렉토리 구조 정리

**Files:**
- Move: `index.html` → `public/index.html`
- Move: `play.html` → `public/play.html`
- Move: `presets/` → `public/presets/`

- [ ] **Step 1: 파일 이동**

```bash
mkdir -p public/presets
git mv index.html public/index.html
git mv play.html public/play.html
git mv presets/ public/presets/ 2>/dev/null || mv presets/* public/presets/ && rm -rf presets
```

- [ ] **Step 2: .gitignore 업데이트**

```
story-game-settings.json
test
.DS_Store
```

- [ ] **Step 3: 로컬 서버로 public/ 에서 동작 확인**

```bash
npx serve public
```

모든 기능 정상 작동 확인.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: move all deployable files to public/ directory"
```

---

### Task 15: Cloudflare Pages 연결 + 자동 배포

사용자 수동 작업.

- [ ] **Step 1: GitHub에 리포 push**

```bash
git remote add origin <github-repo-url>  # 아직 없다면
git push -u origin main
```

- [ ] **Step 2: Cloudflare Pages 설정**

1. Cloudflare Dashboard → Pages → "Create a project"
2. GitHub 연결 → 리포 선택
3. Build settings:
   - Framework preset: None
   - Build command: (비워두기)
   - Build output directory: `public`
4. "Save and Deploy"

- [ ] **Step 3: 커스텀 도메인 연결**

Cloudflare Dashboard → Pages → 해당 프로젝트 → Custom domains → 도메인 추가

- [ ] **Step 4: 자동 배포 확인**

```bash
# 아무 파일 수정 후 push
git push origin main
# Cloudflare Pages에서 자동 빌드/배포 확인
```

- [ ] **Step 5: HTTPS + 도메인으로 전체 기능 최종 확인**

---

## Summary

| Phase | Tasks | 핵심 산출물 |
|-------|-------|-----------|
| 1 | 1-3 | Firebase 환경 셋업, SDK 연동 |
| 2 | 4-7 | 세션 저장/이어하기, 2계층 저장, 세션 UI |
| 3 | 8 | 스토리/세션 분리, 스토리 공유 |
| 4 | 9 | 스토리 암호 (SHA-256) |
| 5 | 10 | 요약 메모리 + 슬라이딩 윈도우 |
| 6 | 11 | 기본셋 자동 불러오기 |
| 7 | 12-13 | 모바일 반응형 + 집중 모드 |
| 8 | 14-15 | public/ 이동, Cloudflare Pages, 자동 배포 |
