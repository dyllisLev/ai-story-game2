# AI Story Game Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file AI interactive fiction game using Gemini API with 3-panel layout (settings / prompt preview / game).

**Architecture:** Single `index.html` with inline CSS (`<style>`) and JS (`<script>`). No build tools, no dependencies. Gemini API called directly from browser via fetch. All state in JS variables + localStorage.

**Tech Stack:** Vanilla HTML5, CSS3 (flexbox, CSS variables), ES2020+ JavaScript, Gemini REST API

**Spec:** `docs/superpowers/specs/2026-03-17-ai-story-game-design.md`

---

## File Structure

- `index.html` — The entire application (HTML structure, CSS styles, JavaScript logic)

Since this is a single-file prototype with no build system or test framework, verification is done by opening the file in browser and checking behavior at each step.

---

## Chunk 1: Core UI

### Task 1: HTML Structure + CSS Dark Theme

**Files:**
- Create: `index.html`

Build the complete HTML shell with 3-panel flexbox layout and dark theme CSS.

- [ ] **Step 1: Create `index.html` with HTML structure**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Story Game</title>
</head>
<body>
  <div class="container">
    <!-- Panel 1: Settings -->
    <div class="panel panel-settings" id="panelSettings">
      <h2 class="panel-title">① 설정</h2>
      <div class="form-group">
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" placeholder="Gemini API Key 입력">
      </div>
      <div class="form-group">
        <label for="modelSelect">모델 선택</label>
        <select id="modelSelect" disabled>
          <option value="">API Key를 입력하세요</option>
        </select>
      </div>
      <div class="form-group">
        <label for="worldSetting">세계관</label>
        <textarea id="worldSetting" rows="4" placeholder="게임의 세계관을 설명하세요..."></textarea>
      </div>
      <div class="form-group">
        <label for="story">스토리</label>
        <textarea id="story" rows="4" placeholder="메인 스토리/줄거리..."></textarea>
      </div>
      <div class="form-group">
        <label for="characterName">주인공 이름</label>
        <input type="text" id="characterName" placeholder="캐릭터 이름">
      </div>
      <div class="form-group">
        <label for="characterSetting">주인공 설정</label>
        <textarea id="characterSetting" rows="3" placeholder="캐릭터 배경/성격/능력..."></textarea>
      </div>
      <div class="form-group">
        <label for="userNote">유저노트</label>
        <textarea id="userNote" rows="3" placeholder="AI에 대한 추가 지시사항..."></textarea>
      </div>
      <button id="btnStart" class="btn btn-primary">게임 시작</button>
      <div class="btn-row">
        <button id="btnSave" class="btn btn-secondary">저장</button>
        <button id="btnLoad" class="btn btn-secondary">불러오기</button>
        <input type="file" id="fileInput" accept=".json" hidden>
      </div>
    </div>

    <!-- Panel 2: Prompt Preview -->
    <div class="panel panel-prompt" id="panelPrompt">
      <h2 class="panel-title">② 프롬프트 미리보기</h2>
      <div class="prompt-preview" id="promptPreview"></div>
    </div>

    <!-- Panel 3: Game -->
    <div class="panel panel-game" id="panelGame">
      <h2 class="panel-title">③ 게임</h2>
      <div class="game-output" id="gameOutput">
        <p class="game-placeholder">게임을 시작하려면 설정을 입력하고 "게임 시작" 버튼을 누르세요.</p>
      </div>
      <div class="game-input-area">
        <input type="text" id="gameInput" placeholder="행동을 입력하세요..." disabled>
        <button id="btnSend" class="btn btn-primary" disabled>전송</button>
      </div>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Add CSS dark theme styles**

Add `<style>` block inside `<head>`, after `<title>`:

```css
<style>
  :root {
    --bg-dark: #0d1117;
    --bg-panel: #161b22;
    --bg-input: #1c2128;
    --border: #30363d;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --accent: #e94560;
    --accent-hover: #ff6b81;
    --cyan: #53d8fb;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-dark);
    color: var(--text);
    height: 100vh;
    overflow: hidden;
  }

  .container {
    display: flex;
    height: 100vh;
    gap: 1px;
    background: var(--border);
  }

  .panel {
    background: var(--bg-panel);
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .panel-settings { flex: 1; min-width: 280px; }
  .panel-prompt { flex: 1; min-width: 280px; }
  .panel-game { flex: 1.2; min-width: 320px; }

  .panel-title {
    color: var(--accent);
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  input[type="text"],
  input[type="password"],
  textarea,
  select {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--accent);
  }

  select { cursor: pointer; }
  select:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn {
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
    width: 100%;
    margin-top: 8px;
  }

  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-secondary {
    background: var(--bg-input);
    color: var(--text-muted);
    border: 1px solid var(--border);
    flex: 1;
  }

  .btn-secondary:hover { color: var(--text); border-color: var(--text-muted); }

  .btn-row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  /* Panel 2: Prompt Preview */
  .prompt-preview {
    flex: 1;
    background: var(--bg-input);
    border-radius: 6px;
    padding: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.8;
    color: var(--text-muted);
    white-space: pre-wrap;
    overflow-y: auto;
  }

  .prompt-section { color: var(--cyan); }
  .prompt-system { color: var(--accent); }

  /* Panel 3: Game */
  .game-output {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    font-size: 14px;
    line-height: 1.8;
  }

  .game-placeholder {
    color: var(--text-muted);
    text-align: center;
    margin-top: 40%;
  }

  .game-text {
    margin-bottom: 16px;
    white-space: pre-wrap;
  }

  .game-text.narrator { color: var(--text); }
  .game-text.user-action {
    color: var(--cyan);
    padding-left: 12px;
    border-left: 2px solid var(--cyan);
  }

  .game-input-area {
    display: flex;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    margin-top: 12px;
  }

  .game-input-area input {
    flex: 1;
  }

  .game-input-area .btn {
    width: auto;
    margin-top: 0;
  }
</style>
```

- [ ] **Step 3: Verify in browser**

Open `index.html` in browser. Confirm:
- 3 panels visible side by side
- Dark theme applied
- All form fields in Panel 1 rendered
- Panel 2 shows empty prompt preview area
- Panel 3 shows placeholder text and disabled input

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add HTML structure and dark theme CSS for 3-panel layout"
```

---

### Task 2: Prompt Preview (Real-time)

**Files:**
- Modify: `index.html`

Wire up Panel 1 inputs to Panel 2 prompt preview with real-time updates.

- [ ] **Step 1: Add `<script>` with prompt builder function**

Add before `</body>`:

```html
<script>
// --- DOM References ---
const $ = id => document.getElementById(id);

const els = {
  apiKey: $('apiKey'),
  modelSelect: $('modelSelect'),
  worldSetting: $('worldSetting'),
  story: $('story'),
  characterName: $('characterName'),
  characterSetting: $('characterSetting'),
  userNote: $('userNote'),
  promptPreview: $('promptPreview'),
  gameOutput: $('gameOutput'),
  gameInput: $('gameInput'),
  btnStart: $('btnStart'),
  btnSend: $('btnSend'),
  btnSave: $('btnSave'),
  btnLoad: $('btnLoad'),
  fileInput: $('fileInput'),
};

// --- Prompt Builder ---
function buildPrompt() {
  const w = els.worldSetting.value.trim();
  const s = els.story.value.trim();
  const cn = els.characterName.value.trim();
  const cs = els.characterSetting.value.trim();
  const un = els.userNote.value.trim();

  let prompt = `당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.
아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.

사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.
각 응답은 소설체로 작성하고, 마지막에 "▸ 당신의 행동은?" 으로 끝내세요.`;

  if (w) prompt += `\n\n[세계관]\n${w}`;
  if (s) prompt += `\n\n[스토리]\n${s}`;
  if (cn || cs) {
    prompt += `\n\n[주인공]`;
    if (cn) prompt += `\n이름: ${cn}`;
    if (cs) prompt += `\n설정: ${cs}`;
  }
  if (un) prompt += `\n\n[유저노트]\n${un}`;

  return prompt;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updatePromptPreview() {
  const prompt = buildPrompt();
  const escaped = escapeHtml(prompt);
  // Split at the first section bracket to color the preamble separately
  const firstSectionIdx = escaped.indexOf('[세계관]');
  let html;
  if (firstSectionIdx > 0) {
    const preamble = escaped.substring(0, firstSectionIdx);
    const rest = escaped.substring(firstSectionIdx);
    html = `<span class="prompt-system">${preamble.trim()}</span>\n\n` +
      rest.replace(/\[(세계관|스토리|주인공|유저노트)\]/g, '<span class="prompt-section">[$1]</span>');
  } else {
    html = `<span class="prompt-system">${escaped}</span>`;
  }
  els.promptPreview.innerHTML = html;
}

// --- Event Listeners for real-time preview ---
const inputFields = ['worldSetting', 'story', 'characterName', 'characterSetting', 'userNote'];
inputFields.forEach(id => {
  els[id].addEventListener('input', updatePromptPreview);
});

// Initial render
updatePromptPreview();
</script>
```

- [ ] **Step 2: Verify in browser**

Type text in 세계관, 스토리, 주인공 이름/설정, 유저노트. Confirm Panel 2 updates in real-time with color-coded sections.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add real-time prompt preview with color-coded sections"
```

---

### Task 3: localStorage Auto-Save/Restore + JSON Export/Import

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add save/load functions to `<script>`**

Add after the event listeners block:

```javascript
// --- localStorage ---
const STORAGE_KEY = 'ai-story-game-settings';

function getSettingsData() {
  return {
    apiKey: els.apiKey.value,
    model: els.modelSelect.value,
    worldSetting: els.worldSetting.value,
    story: els.story.value,
    characterName: els.characterName.value,
    characterSetting: els.characterSetting.value,
    userNote: els.userNote.value,
  };
}

function applySettingsData(data) {
  if (data.apiKey) els.apiKey.value = data.apiKey;
  if (data.model) els.modelSelect.value = data.model;
  if (data.worldSetting) els.worldSetting.value = data.worldSetting;
  if (data.story) els.story.value = data.story;
  if (data.characterName) els.characterName.value = data.characterName;
  if (data.characterSetting) els.characterSetting.value = data.characterSetting;
  if (data.userNote) els.userNote.value = data.userNote;
  updatePromptPreview();
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettingsData()));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { applySettingsData(JSON.parse(saved)); } catch (e) {}
  }
}

// Auto-save on any input change
[...inputFields, 'apiKey'].forEach(id => {
  els[id].addEventListener('input', saveToLocalStorage);
});
els.modelSelect.addEventListener('change', saveToLocalStorage);

// --- JSON Export/Import ---
els.btnSave.addEventListener('click', () => {
  const data = getSettingsData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'story-game-settings.json';
  a.click();
  URL.revokeObjectURL(url);
});

els.btnLoad.addEventListener('click', () => els.fileInput.click());

els.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      applySettingsData(data);
      saveToLocalStorage();
      // If API key present, trigger model fetch
      if (data.apiKey) fetchModels(data.apiKey);
    } catch (err) {
      alert('잘못된 JSON 파일입니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Load saved settings on page load
loadFromLocalStorage();
```

- [ ] **Step 2: Verify in browser**

1. Fill in fields → close tab → reopen → confirm fields restored
2. Click "저장" → JSON file downloads
3. Clear fields → Click "불러오기" → select JSON → fields restored

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add localStorage auto-save and JSON export/import"
```

---

## Chunk 2: Gemini API Integration

### Task 4: Model List Fetch

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add model fetch function to `<script>`**

Add before the localStorage section:

```javascript
// --- Gemini API ---
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function fetchModels(apiKey) {
  if (!apiKey) return;
  els.modelSelect.disabled = true;
  els.modelSelect.innerHTML = '<option value="">모델 목록 조회 중...</option>';

  try {
    const res = await fetch(`${GEMINI_BASE}/models?key=${apiKey}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    const models = (data.models || [])
      .filter(m => m.name.startsWith('models/gemini-') && m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name.replace('models/', '') }));

    els.modelSelect.innerHTML = models.length
      ? models.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
      : '<option value="">사용 가능한 모델이 없습니다</option>';
    els.modelSelect.disabled = models.length === 0;

    // Restore saved model selection
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { model } = JSON.parse(saved);
      if (model && models.some(m => m.id === model)) {
        els.modelSelect.value = model;
      }
    }
  } catch (err) {
    els.modelSelect.innerHTML = `<option value="">오류: ${err.message}</option>`;
    els.modelSelect.disabled = true;
  }
}

// Debounced API key input → fetch models
let apiKeyTimer = null;
els.apiKey.addEventListener('input', () => {
  clearTimeout(apiKeyTimer);
  apiKeyTimer = setTimeout(() => fetchModels(els.apiKey.value.trim()), 800);
});
```

- [ ] **Step 2: Trigger model fetch on page load if API key exists**

Add at the end of the `loadFromLocalStorage` function, after `applySettingsData`:

```javascript
// Inside loadFromLocalStorage, after applySettingsData:
if (els.apiKey.value.trim()) fetchModels(els.apiKey.value.trim());
```

- [ ] **Step 3: Verify in browser**

Enter a valid Gemini API key → confirm model dropdown populates after ~1s. Select a model → refresh page → confirm selection restored.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Gemini model list fetch with debounced API key input"
```

---

### Task 5: Game Start + Streaming Response

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add game state and streaming logic**

Add after the `fetchModels` function:

```javascript
// --- Game State ---
let conversationHistory = [];
let isGenerating = false;

function appendToGame(text, className) {
  // Remove placeholder if present
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
  els.gameInput.disabled = true;
  els.btnSend.disabled = true;
  els.btnStart.disabled = true;

  conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  const responseDiv = appendToGame('', 'narrator');

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildPrompt() }] },
          contents: conversationHistory,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API Error ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullResponse += text;
            responseDiv.textContent = fullResponse;
            els.gameOutput.scrollTop = els.gameOutput.scrollHeight;
          }
        } catch (e) { /* skip malformed JSON */ }
      }
    }

    conversationHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
  } catch (err) {
    responseDiv.textContent = `[오류] ${err.message}`;
    responseDiv.style.color = 'var(--accent)';
    // Remove failed exchange from history
    conversationHistory.pop();
  } finally {
    isGenerating = false;
    els.gameInput.disabled = false;
    els.btnSend.disabled = false;
    els.btnStart.disabled = false;
    els.gameInput.focus();
  }
}
```

- [ ] **Step 2: Wire up game start and send buttons**

Add after the streaming logic:

```javascript
// --- Game Controls ---
els.btnStart.addEventListener('click', () => {
  if (isGenerating) return;
  // Reset game
  conversationHistory = [];
  els.gameOutput.innerHTML = '';
  els.gameInput.disabled = false;
  els.btnSend.disabled = false;
  sendToGemini('게임을 시작해줘');
});

els.btnSend.addEventListener('click', () => {
  if (isGenerating) return;
  const text = els.gameInput.value.trim();
  if (!text) return;
  appendToGame(`▸ ${text}`, 'user-action');
  els.gameInput.value = '';
  sendToGemini(text);
});

els.gameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.btnSend.click();
  }
});
```

- [ ] **Step 3: Verify in browser**

1. Enter API key → select model → fill in settings → click "게임 시작"
2. Confirm streaming text appears in Panel 3
3. Type action → press Enter → confirm story continues
4. Test error: remove API key → click start → confirm error alert

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Gemini streaming game engine with conversation history"
```

---

### Task 6: Final Polish

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add loading indicator CSS**

Add to the `<style>` block:

```css
.loading::after {
  content: '⏳ 생성 중...';
  display: block;
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 8px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

- [ ] **Step 2: Add loading class toggle in sendToGemini**

In the `sendToGemini` function:
- After `const responseDiv = appendToGame('', 'narrator');` add: `responseDiv.classList.add('loading');`
- In the `finally` block, before `isGenerating = false;` add: `responseDiv.classList.remove('loading');`

- [ ] **Step 3: Add validation to game start**

Replace the `btnStart` click handler with:

```javascript
els.btnStart.addEventListener('click', () => {
  if (isGenerating) return;
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey) { alert('API Key를 입력해주세요.'); els.apiKey.focus(); return; }
  if (!model) { alert('모델을 선택해주세요.'); return; }
  // Reset game
  conversationHistory = [];
  els.gameOutput.innerHTML = '';
  els.gameInput.disabled = false;
  els.btnSend.disabled = false;
  sendToGemini('게임을 시작해줘');
});
```

- [ ] **Step 4: Verify in browser**

1. Start game → confirm loading indicator appears during generation
2. Try starting without API key → confirm validation alert
3. Full flow: settings → start → play → save → reload → restore

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add loading indicator and input validation"
```

---

## Summary

| Task | Description | Dependencies |
|------|------------|-------------|
| 1 | HTML structure + CSS dark theme | None |
| 2 | Prompt preview (real-time) | Task 1 |
| 3 | localStorage + JSON export/import | Task 2 |
| 4 | Gemini model list fetch | Task 3 |
| 5 | Game start + streaming response | Task 4 |
| 6 | Loading indicator + validation | Task 5 |

All tasks are sequential (single file, each builds on previous). Estimated 6 commits.
