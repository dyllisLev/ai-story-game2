# 요약 메모리 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 단일 텍스트 요약을 4개 카테고리(단기기억, 장기기억, 관계도, 목표) 구조화 메모리 시스템으로 교체

**Architecture:** Gemini API에 JSON 응답 모드로 4개 카테고리 메모리를 한 번에 생성. 별도 `session_memory` 테이블에 카테고리별 row로 저장. 탭 기반 모달 UI로 확인/편집.

**Tech Stack:** Vanilla JS, Gemini API (responseMimeType: application/json), Supabase PostgreSQL + RLS

**Spec:** `docs/superpowers/specs/2026-03-18-summary-memory-design.md`

---

## File Structure

| 파일 | 역할 | 변경 유형 |
|-----|------|----------|
| `supabase-schema.sql` | session_memory 테이블 + RLS + 트리거 | Modify |
| `public/js/memory-manager.js` | 메모리 생성/파싱/저장/로드 로직 (새 모듈) | Create |
| `public/js/prompt-builder.js` | `[메모리]` 섹션 조립 함수 추가 | Modify |
| `public/js/supabase-ops.js` | session_memory CRUD 함수 추가 | Modify |
| `public/js/app-play.js` | 기존 요약 → 새 메모리 시스템 교체, 모달 이벤트 | Modify |
| `public/play.html` | 요약 메모리 모달 HTML + CSS | Modify |

---

### Task 1: DB 스키마 — session_memory 테이블

**Files:**
- Modify: `supabase-schema.sql` (파일 끝에 추가)

- [ ] **Step 1: session_memory 테이블 SQL 작성**

`supabase-schema.sql` 파일 끝에 추가:

```sql
-- ============================================================
-- Session Memory (요약 메모리 시스템)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('short_term', 'characters', 'goals', 'long_term')),
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, type)
);

CREATE TRIGGER update_session_memory_updated_at
  BEFORE UPDATE ON session_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE session_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_memory_select" ON session_memory
  FOR SELECT USING (true);

CREATE POLICY "session_memory_insert" ON session_memory
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

CREATE POLICY "session_memory_update" ON session_memory
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );

CREATE POLICY "session_memory_delete" ON session_memory
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE owner_uid = auth.uid())
  );
```

- [ ] **Step 2: Supabase에 SQL 실행**

Supabase Dashboard > SQL Editor에서 위 SQL 실행. 또는:

```bash
# Supabase CLI 사용 시
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase-schema.sql
git commit -m "feat: add session_memory table for structured memory system"
```

---

### Task 2: Supabase CRUD — session_memory 데이터 조작

**Files:**
- Modify: `public/js/supabase-ops.js`

- [ ] **Step 1: session_memory CRUD 함수 추가**

`supabase-ops.js` 파일 끝에 추가:

```javascript
// --- Session Memory ---

/**
 * 세션 메모리 4개 카테고리를 한 번에 UPSERT
 * @param {string} sessionId
 * @param {object} memory - { shortTerm, characters, goals, longTerm }
 */
export async function upsertSessionMemory(sessionId, memory) {
  if (!supabase) return false;
  try {
    const rows = [
      { session_id: sessionId, type: 'short_term', content: memory.shortTerm || [] },
      { session_id: sessionId, type: 'characters', content: memory.characters || [] },
      { session_id: sessionId, type: 'goals', content: memory.goals || '' },
      { session_id: sessionId, type: 'long_term', content: memory.longTerm || [] },
    ];
    const { error } = await supabase
      .from('session_memory')
      .upsert(rows, { onConflict: 'session_id,type' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Session memory upsert failed:', e);
    return false;
  }
}

/**
 * 세션 메모리 로드
 * @param {string} sessionId
 * @returns {object|null} - { shortTerm, characters, goals, longTerm } or null
 */
export async function loadSessionMemory(sessionId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('session_memory')
      .select('type, content')
      .eq('session_id', sessionId);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const memory = { shortTerm: [], characters: [], goals: '', longTerm: [] };
    for (const row of data) {
      switch (row.type) {
        case 'short_term': memory.shortTerm = row.content; break;
        case 'characters': memory.characters = row.content; break;
        case 'goals': memory.goals = row.content; break;
        case 'long_term': memory.longTerm = row.content; break;
      }
    }
    return memory;
  } catch (e) {
    console.error('Session memory load failed:', e);
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/supabase-ops.js
git commit -m "feat: add session_memory CRUD functions"
```

---

### Task 3: memory-manager.js — 메모리 생성 핵심 모듈

**Files:**
- Create: `public/js/memory-manager.js`

- [ ] **Step 1: 모듈 생성**

```javascript
// memory-manager.js
// 메모리 생성, 파싱, 로컬 캐시 관리

import { generate } from './gemini-api.js';

const MEMORY_CACHE_PREFIX = 'ai-story-session-';
const MEMORY_CACHE_SUFFIX = '-memory';


/**
 * AI에게 메모리 생성 요청
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {Array} params.messages - 현재 윈도우 내 대화 메시지 (Gemini format)
 * @param {object|null} params.existingMemory - 기존 메모리 { shortTerm, characters, goals, longTerm }
 * @param {object} params.promptConfig - { memory_system_instruction, memory_request }
 * @returns {Promise<object>} - { shortTerm, characters, goals, longTerm }
 */
export async function generateMemory({ apiKey, model, messages, existingMemory, promptConfig }) {
  const memoryText = existingMemory
    ? JSON.stringify(existingMemory, null, 2)
    : '없음';

  const messagesText = messages
    .map(m => `[${m.role}] ${m.parts[0].text}`)
    .join('\n\n');

  const requestBody = promptConfig.memory_request
    .replace('{memory}', memoryText)
    .replace('{messages}', messagesText);

  const result = await generate({
    apiKey,
    model,
    body: {
      contents: [{ role: 'user', parts: [{ text: requestBody }] }],
      systemInstruction: { parts: [{ text: promptConfig.memory_system_instruction }] },
      generationConfig: { responseMimeType: 'application/json' },
      safetySettings: [
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    },
  });

  return parseMemoryResponse(result.text);
}

/**
 * AI 응답 JSON 파싱 (코드펜스 제거 fallback 포함)
 */
function parseMemoryResponse(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 코드펜스 제거 후 재시도
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    json = JSON.parse(cleaned); // 이것도 실패하면 예외 전파
  }

  return {
    shortTerm: Array.isArray(json.shortTerm) ? json.shortTerm : [],
    characters: Array.isArray(json.characters) ? json.characters : [],
    goals: typeof json.goals === 'string' ? json.goals : '',
    longTerm: Array.isArray(json.longTerm) ? json.longTerm : [],
  };
}

/**
 * localStorage 캐시 저장
 */
export function saveMemoryToLocal(sessionId, memory) {
  try {
    localStorage.setItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX, JSON.stringify(memory));
  } catch { /* 용량 초과 무시 */ }
}

/**
 * localStorage 캐시 로드
 */
export function loadMemoryFromLocal(sessionId) {
  try {
    const raw = localStorage.getItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * localStorage 캐시 삭제
 */
export function removeMemoryFromLocal(sessionId) {
  localStorage.removeItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX);
}

/**
 * 기존 sessions.summary를 장기기억으로 마이그레이션
 */
export function migrateOldSummary(summary) {
  if (!summary || typeof summary !== 'string') return null;
  return {
    shortTerm: [],
    characters: [],
    goals: '',
    longTerm: [{ title: '이전 요약', content: summary }],
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/memory-manager.js
git commit -m "feat: add memory-manager module for structured memory generation"
```

---

### Task 4: prompt-builder.js — 메모리 섹션 조립

**Files:**
- Modify: `public/js/prompt-builder.js`

- [ ] **Step 1: buildMemoryPrompt 함수 추가**

`prompt-builder.js` 파일 끝에 추가:

```javascript
/**
 * 메모리 데이터를 시스템 프롬프트용 텍스트로 변환
 * @param {object} memory - { shortTerm, characters, goals, longTerm }
 * @returns {string} - 시스템 프롬프트에 추가할 [메모리] 섹션
 */
export function buildMemoryPrompt(memory) {
  if (!memory) return '';

  const sections = [];

  if (memory.longTerm && memory.longTerm.length > 0) {
    const items = memory.longTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 장기기억\n${items}`);
  }

  if (memory.shortTerm && memory.shortTerm.length > 0) {
    const items = memory.shortTerm.map(e => `- ${e.title}: ${e.content}`).join('\n');
    sections.push(`## 단기기억\n${items}`);
  }

  if (memory.characters && memory.characters.length > 0) {
    const items = memory.characters.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n');
    sections.push(`## 등장인물 현황\n${items}`);
  }

  if (memory.goals && memory.goals.trim()) {
    sections.push(`## 현재 목표\n${memory.goals}`);
  }

  return sections.length > 0 ? `\n\n[메모리]\n${sections.join('\n\n')}` : '';
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/prompt-builder.js
git commit -m "feat: add buildMemoryPrompt to assemble memory section for system prompt"
```

---

### Task 5: app-play.js — 기존 요약 시스템을 메모리 시스템으로 교체

**Files:**
- Modify: `public/js/app-play.js`

이 태스크는 app-play.js의 여러 영역을 수정합니다. 아래 단계별로 진행하세요.

- [ ] **Step 1: import 추가**

파일 상단 import 영역에 추가:

```javascript
import { buildMemoryPrompt } from './prompt-builder.js';
import { generateMemory, saveMemoryToLocal, loadMemoryFromLocal, migrateOldSummary } from './memory-manager.js';
import { upsertSessionMemory, loadSessionMemory } from './supabase-ops.js';
```

- [ ] **Step 2: 상태 변수 교체**

기존 변수:
```javascript
let storySummary = '';
let summaryUpToIndex = 0;
```

교체:
```javascript
let sessionMemory = null; // { shortTerm: [], characters: [], goals: '', longTerm: [] }
let memoryUpToIndex = 0;
let isGeneratingMemory = false;
```

- [ ] **Step 3: generateSummary() → generateSessionMemory()로 교체**

기존 `generateSummary()` 함수 (라인 117-148) 전체를 삭제하고 다음으로 교체:

```javascript
async function generateSessionMemory() {
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey || !model) return;
  if (isGeneratingMemory) return;

  const interval = SLIDING_WINDOW_SIZE;
  if (conversationHistory.length <= interval) return;
  if ((conversationHistory.length - memoryUpToIndex) < interval) return;

  isGeneratingMemory = true;
  updateMemoryBadge('generating');

  try {
    const windowStart = Math.max(0, conversationHistory.length - SLIDING_WINDOW_SIZE);
    const recentMessages = conversationHistory.slice(windowStart);

    const result = await generateMemory({
      apiKey,
      model,
      messages: recentMessages,
      existingMemory: sessionMemory,
      promptConfig,
    });

    sessionMemory = result;
    memoryUpToIndex = conversationHistory.length;

    // DB 저장
    if (currentSessionId) {
      upsertSessionMemory(currentSessionId, sessionMemory);
      saveMemoryToLocal(currentSessionId, sessionMemory);
    }

    updateMemoryBadge('exists');
    markDirty();
  } catch (e) {
    console.error('Memory generation failed:', e);
    updateMemoryBadge('failed');
  } finally {
    isGeneratingMemory = false;
  }
}
```

- [ ] **Step 4: sendToGemini() 내 요약 관련 코드 수정**

`sendToGemini()` 함수 내에서 두 군데를 수정:

**4a.** 시스템 프롬프트 조립 부분 (기존 라인 480-483):

기존:
```javascript
let systemPrompt = getPrompt();
if (storySummary) {
  systemPrompt += `\n\n[이전 이야기 요약]\n${storySummary}`;
}
```

교체:
```javascript
let systemPrompt = getPrompt();
systemPrompt += buildMemoryPrompt(sessionMemory);
```

**4b.** 요약 생성 트리거 (기존 라인 512-514):

기존:
```javascript
if (conversationHistory.length > SLIDING_WINDOW_SIZE + gameplayConfig.summary_trigger_offset) {
  generateSummary();
}
```

교체:
```javascript
generateSessionMemory(); // 내부에서 조건 체크
```

- [ ] **Step 5: buildSessionDocument() 수정**

기존 (라인 167-168):
```javascript
summary: storySummary || '',
summary_up_to_index: summaryUpToIndex || 0,
```

유지하되, 하위 호환을 위해 메모리에서 장기기억 텍스트를 summary에도 저장:
```javascript
summary: sessionMemory?.longTerm?.map(e => `${e.title}: ${e.content}`).join('\n') || '',
summary_up_to_index: memoryUpToIndex || 0,
```

- [ ] **Step 6: 세션 로드 시 메모리 복원 수정**

기존 세션 로드 코드 (라인 1014-1016):
```javascript
storySummary = data.summary || '';
summaryUpToIndex = data.summaryUpToIndex || 0;
updateSummaryBadge();
```

교체:
```javascript
memoryUpToIndex = data.summaryUpToIndex || 0;

// 새 메모리 시스템 로드 시도
const loadedMemory = await loadSessionMemory(currentSessionId)
  || loadMemoryFromLocal(currentSessionId);

if (loadedMemory) {
  sessionMemory = loadedMemory;
} else if (data.summary) {
  // 기존 summary 마이그레이션
  sessionMemory = migrateOldSummary(data.summary);
}
updateMemoryBadge(sessionMemory ? 'exists' : 'empty');
```

참고: `loadSession()` 함수가 async인지 확인. 이미 async면 그대로, 아니면 async로 변경 필요.

- [ ] **Step 7: updateSummaryBadge() → updateMemoryBadge()로 교체**

기존 함수 (라인 674-680):
```javascript
function updateSummaryBadge() {
  const badge = $('badgeSummary');
  if (badge) {
    badge.textContent = storySummary ? '있음' : '없음';
    badge.className = `menu-badge ${storySummary ? 'set' : 'empty'}`;
  }
}
```

교체:
```javascript
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
```

`updateSummaryBadge()` 호출을 모두 `updateMemoryBadge(sessionMemory ? 'exists' : 'empty')`로 교체.

- [ ] **Step 8: menuSummary 클릭 핸들러 → 모달 열기로 교체**

기존 (라인 729-741):
```javascript
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
```

교체:
```javascript
$('menuSummary').addEventListener('click', () => {
  renderMemoryModal();
  openModal('modalMemory');
});
```

- [ ] **Step 9: 메모리 모달 렌더링 함수 추가**

app-play.js에 모달 렌더링/이벤트 함수들 추가:

```javascript
// --- Memory Modal ---
let activeMemoryTab = 'long_term';

function renderMemoryModal() {
  // 탭 활성화
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
    return;
  }

  switch (activeMemoryTab) {
    case 'long_term':
      renderLongTermTab(content, countEl, footer);
      break;
    case 'short_term':
      renderShortTermTab(content, countEl, footer);
      break;
    case 'characters':
      renderCharactersTab(content, countEl, footer);
      break;
    case 'goals':
      renderGoalsTab(content, countEl, footer);
      break;
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

  // 아코디언 토글
  content.querySelectorAll('.memory-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });

  // 편집 버튼
  $('btnMemoryEdit')?.addEventListener('click', () => {
    enableLongTermEdit(content, footer);
  });

  // 추가 버튼
  $('btnMemoryAdd')?.addEventListener('click', () => {
    if (!sessionMemory) sessionMemory = { shortTerm: [], characters: [], goals: '', longTerm: [] };
    sessionMemory.longTerm.push({ title: '새 기억', content: '' });
    renderMemoryModal();
    // 마지막 항목 열기
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
      saveMemoryToLocal(currentSessionId, sessionMemory);
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
        saveMemoryToLocal(currentSessionId, sessionMemory);
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

// 탭 클릭 이벤트 (모달이 DOM에 있을 때)
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.memory-tab');
  if (tab) {
    activeMemoryTab = tab.dataset.type;
    renderMemoryModal();
  }
});

// 재시도 버튼 (뱃지 영역)
$('menuSummaryRetry')?.addEventListener('click', (e) => {
  e.stopPropagation();
  generateSessionMemory();
});
```

- [ ] **Step 10: Commit**

```bash
git add public/js/app-play.js public/js/memory-manager.js public/js/prompt-builder.js public/js/supabase-ops.js
git commit -m "feat: integrate structured memory system into game play"
```

---

### Task 6: play.html — 모달 HTML + CSS 추가

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: 모달 HTML 추가**

`<!-- Modal: User Note -->` 앞에 (라인 866 앞) 삽입:

```html
  <!-- Modal: Memory -->
  <div class="modal-overlay" id="modalMemory">
    <div class="modal" style="width: 600px;">
      <div class="modal-header">
        <h3>요약 메모리</h3>
        <button class="modal-close" data-close="modalMemory">&times;</button>
      </div>
      <div class="modal-body" style="padding: 0;">
        <!-- Tabs -->
        <div class="memory-tabs">
          <button class="memory-tab active" data-type="long_term">장기 기억</button>
          <button class="memory-tab" data-type="short_term">단기 기억</button>
          <button class="memory-tab" data-type="characters">관계도</button>
          <button class="memory-tab" data-type="goals">목표</button>
        </div>
        <!-- Count + Sort -->
        <div class="memory-toolbar">
          <span class="memory-count" id="memoryCount">총 0개</span>
        </div>
        <!-- Content -->
        <div class="memory-content" id="memoryContent">
          <p class="memory-empty">메모리가 없습니다.</p>
        </div>
      </div>
      <div class="modal-footer" id="memoryFooter">
        <button class="btn btn-primary" data-close="modalMemory">확인</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: CSS 추가**

play.html의 `<style>` 섹션 (`.modal-close:hover` 뒤쯤)에 추가:

```css
    /* --- Memory Modal --- */
    .memory-tabs {
      display: flex;
      gap: 8px;
      padding: 16px 20px 0;
      border-bottom: 1px solid var(--border);
    }
    .memory-tab {
      padding: 8px 16px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    }
    .memory-tab.active {
      background: var(--text);
      color: var(--bg);
      border-color: var(--text);
    }
    .memory-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
    }
    .memory-count {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
    }
    .memory-content {
      padding: 0 20px 16px;
      max-height: 400px;
      overflow-y: auto;
    }
    .memory-empty {
      color: var(--text-muted);
      font-size: 13px;
      padding: 20px 0;
      text-align: center;
    }

    /* Accordion (장기 기억) */
    .memory-accordion {
      border-bottom: 1px solid var(--border);
      padding: 12px 0;
    }
    .memory-accordion-header {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .memory-accordion-arrow {
      font-size: 10px;
      transition: transform 0.2s;
      color: var(--text-muted);
    }
    .memory-accordion.open .memory-accordion-arrow {
      transform: rotate(90deg);
    }
    .memory-accordion-body {
      display: none;
      padding: 8px 0 0 18px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text);
    }
    .memory-accordion.open .memory-accordion-body {
      display: block;
    }

    /* Card (단기 기억, 관계도) */
    .memory-card {
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
    }
    .memory-card:last-child { border-bottom: none; }
    .memory-card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 8px;
    }
    .memory-card-content {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text);
      margin: 0;
    }

    /* Goals textarea */
    .memory-goals-textarea {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      line-height: 1.6;
      resize: vertical;
    }

    /* Edit mode */
    .memory-edit-item {
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .memory-edit-title {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .memory-edit-content {
      width: 100%;
      min-height: 80px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      resize: vertical;
      margin-bottom: 8px;
    }
    .btn-danger { background: #e94560; color: #fff; border: none; }
    .btn-danger:hover { background: #c73e54; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }

    /* Badge states */
    .menu-badge.generating { background: #f0ad4e; color: #000; }
    .menu-badge.failed { background: #e94560; color: #fff; cursor: pointer; }
```

- [ ] **Step 3: 사이드바 메뉴 아이템 수정**

기존 (라인 774-778):
```html
<div class="side-menu-item" id="menuSummary">
  <span class="menu-icon">&#128221;</span>
  <span class="menu-label">이야기 요약</span>
  <span class="menu-badge empty" id="badgeSummary">없음</span>
</div>
```

교체:
```html
<div class="side-menu-item" id="menuSummary">
  <span class="menu-icon">&#128221;</span>
  <span class="menu-label">요약 메모리</span>
  <span class="menu-badge empty" id="badgeSummary">없음</span>
  <button class="memory-retry-btn" id="menuSummaryRetry" style="display:none;" title="메모리 생성 재시도">&#8635;</button>
</div>
```

그리고 CSS에 추가:
```css
    .memory-retry-btn {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
      display: none;
    }
    .memory-retry-btn:hover { color: var(--text); }
```

- [ ] **Step 4: Commit**

```bash
git add public/play.html
git commit -m "feat: add memory modal UI with tabs, accordion, and card layouts"
```

---

### Task 7: config 업데이트 — prompt_config / gameplay_config

**Files:**
- Supabase config 테이블 (SQL 또는 admin 페이지)

- [ ] **Step 1: gameplay_config 업데이트**

Supabase SQL Editor에서:

```sql
UPDATE config SET value = jsonb_set(
  jsonb_set(value, '{memory_short_term_max}', '10'),
  '{summary_trigger_offset}', 'null'
)
WHERE key = 'gameplay_config';
```

또는 admin 페이지에서 `gameplay_config`에 `"memory_short_term_max": 10` 추가.

- [ ] **Step 2: prompt_config에 메모리 프롬프트 추가**

Supabase SQL Editor에서:

```sql
UPDATE config SET value = value || '{
  "memory_system_instruction": "너는 인터랙티브 소설의 메모리 관리자다.\n주어진 대화 내용과 기존 메모리를 분석하여 아래 JSON 형식으로 반환하라.\n반드시 JSON만 출력하라. 다른 텍스트를 포함하지 마라.\n\n{\n  \"shortTerm\": [\n    {\"title\": \"이벤트 제목\", \"content\": \"작중 시간 | 상세 내용 요약\"}\n  ],\n  \"characters\": [\n    {\"name\": \"인물명\", \"role\": \"역할/직함\", \"description\": \"주인공과의 관계, 현재 상태, 감정\"}\n  ],\n  \"goals\": \"현재 이야기 흐름상 주인공의 목표를 자연스러운 문장으로 서술\",\n  \"longTerm\": [\n    {\"title\": \"사건 제목\", \"content\": \"해당 사건의 전체 맥락 요약\"}\n  ]\n}\n\n규칙:\n- shortTerm: 최근 주요 이벤트를 시간순으로 최대 10개. 각 이벤트는 제목과 작중 시간 포함 상세 내용으로 구성. 10개 초과 시 오래된 이벤트는 longTerm으로 통합\n- characters: 등장하는 모든 인물의 이름, 역할/직함, 주인공과의 관계 및 현재 상태. 퇴장한 인물도 유지하되 상태에 반영\n- goals: 현재 진행 중인 목표를 자연스러운 문장으로 서술. 완료된 목표는 제거하고 새 목표 반영\n- longTerm: 기존 장기기억 + 단기에서 넘어온 이벤트를 통합. 각 항목은 제목과 전체 맥락 요약으로 구성. 시간순 정렬",
  "memory_request": "## 기존 메모리\n{memory}\n\n## 최근 대화\n{messages}"
}'::jsonb
WHERE key = 'prompt_config';
```

- [ ] **Step 3: 확인**

admin 페이지에서 `prompt_config`에 `memory_system_instruction`과 `memory_request`가 추가되었는지 확인.

---

### Task 8: 로컬 테스트

**Files:** 없음 (테스트만)

- [ ] **Step 1: 로컬 서버 시작**

```bash
npx wrangler dev
```

- [ ] **Step 2: 기본 동작 확인**

`agent-browser` 스킬로 http://localhost:8787 접속:

1. 스토리 선택 후 게임 시작
2. 메시지 20개 이상 진행
3. 사이드바 "요약 메모리" 뱃지가 "생성 중..." → "있음"으로 변경되는지 확인
4. "요약 메모리" 클릭 → 모달 열림
5. 4개 탭 전환 확인 (장기기억 아코디언, 단기기억 카드, 관계도, 목표 textarea)

- [ ] **Step 3: 편집 기능 확인**

1. 장기기억 탭 → "편집" 클릭 → 제목/내용 수정 → "저장"
2. 장기기억 탭 → "추가" 클릭 → 새 항목 생성
3. 목표 탭 → 텍스트 수정 → "확인"
4. 모달 닫고 다시 열어서 변경사항 유지 확인

- [ ] **Step 4: 세션 저장/복원 확인**

1. 메모리가 있는 상태에서 페이지 새로고침
2. 세션 로드 후 메모리가 복원되는지 확인
3. 사이드바 뱃지가 "있음"인지 확인

- [ ] **Step 5: 실패 처리 확인**

1. API 키를 잘못된 값으로 변경
2. 메시지 20개 도달 시 뱃지가 "실패"로 변경되는지 확인
3. API 키 복원 후 다음 메시지에서 재시도되는지 확인
