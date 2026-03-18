# Admin Config System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded prompt/gameplay settings with admin-manageable config stored in Supabase, served via Worker `/api/config`.

**Architecture:** Existing `config` table gets a `value JSONB` column. Worker fetches config rows on `GET /api/config` and returns them alongside Supabase creds. Admin page gets a new "앱 설정" tab that saves config via `PUT /api/config` (Worker-proxied with Basic Auth). Client JS modules import config from `supabase-config.js` instead of hardcoded constants.

**Tech Stack:** Supabase (Postgres), Cloudflare Workers, vanilla JS (ES modules)

**Spec:** `docs/superpowers/specs/2026-03-18-admin-config-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase-schema.sql` | Modify | Add migration section for config table changes |
| `src/worker.js` | Modify | Extend GET `/api/config`, add PUT `/api/config` |
| `public/js/supabase-config.js` | Modify | Export `promptConfig`, `gameplayConfig` from API response |
| `public/js/prompt-builder.js` | Modify | Remove `LATEX_RULES`, accept `promptConfig` param |
| `public/js/gemini-api.js` | Modify | Remove `SAFETY_SETTINGS` export, add `cacheTtl` param to `createCache` |
| `public/js/app-play.js` | Modify | Replace hardcoded constants with config, remove duplicate MODEL_PRICING |
| `public/js/app-editor.js` | Modify | Replace hardcoded constants with config |
| `public/base_story_admin.html` | Modify | Add tab UI and config form |
| `public/js/app-admin.js` | Modify | Add config tab load/save/validate logic |

---

### Task 1: Database Migration

**Files:**
- Modify: `supabase-schema.sql` (append migration section at end)

- [ ] **Step 1: Add migration SQL to schema file**

Append this section at the end of `supabase-schema.sql`:

```sql
-- ============================================
-- Admin Config Migration (2026-03-18)
-- ============================================

-- Add value and updated_at columns to config table
ALTER TABLE config ADD COLUMN IF NOT EXISTS value JSONB;
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Insert default prompt config
INSERT INTO config (id, value) VALUES ('prompt_config', '{
  "system_preamble": "당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.\n아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.\n\n사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.\n각 응답은 소설체로 작성하세요.",
  "latex_rules": "[LaTeX 연출 규칙]\n대사와 효과음에 LaTeX 수식 문법을 사용하여 시각적으로 연출하세요.\n반드시 $ 기호로 감싸서 인라인 수식으로 작성합니다.\n\n■ 대사 작성 형식:\n발화자 이름과 대사를 반드시 하나의 $ 안에 함께 포함하세요.\n형식: $\\\\text{발화자: }\\\\textsf{\\\\textbf{\"대사 내용\"}}$\n잘못된 예: 사내 $\\\\textsf{\\\\textbf{\"대사\"}}$ (발화자가 $ 밖에 있음 ✗)\n올바른 예: $\\\\text{사내: }\\\\textsf{\\\\textbf{\"대사\"}}$ (발화자가 $ 안에 있음 ✓)\n\n■ 대사 감정 연출:\n- 일반 대사: $\\\\text{이름: }\\\\textsf{\\\\textbf{\"대사 내용\"}}$\n- 귓속말/속삭임: $\\\\text{이름: }\\\\color{gray}\\\\small\\\\textsf{\\\\textbf{\"속삭이는 내용\"}}$\n- 외침/비명: $\\\\text{이름: }\\\\huge\\\\textsf{\\\\textbf{\"외치는 내용!\"}}$\n- 분노/격앙: $\\\\text{이름: }\\\\large\\\\color{red}\\\\textsf{\\\\textbf{\"분노하는 내용!\"}}$\n- 부끄러움/유혹: $\\\\text{이름: }\\\\color{lightpink}\\\\textsf{\\\\textbf{\"부끄러운 내용\"}}$\n- 슬픔/비탄: $\\\\text{이름: }\\\\color{SteelBlue}\\\\textsf{\\\\textbf{\"슬픈 내용...\"}}$\n- 냉소/조롱: $\\\\text{이름: }\\\\color{darkviolet}\\\\textit{\\\\textsf{\"냉소적인 내용\"}}$\n- 위압/경고: $\\\\text{이름: }\\\\Large\\\\color{darkred}\\\\textsf{\\\\textbf{\"위압적인 내용\"}}$\n- 신비/예언: $\\\\text{이름: }\\\\color{gold}\\\\mathcal{\\\\text{신비로운 내용}}$\n\n■ 효과 연출:\n- 효과음/환경음: $\\\\colorbox{black}{\\\\color{cyan}\\\\small\\\\text{효과음}}$\n- 시스템/알림: $\\\\fcolorbox{gray}{black}{\\\\color{lime}\\\\footnotesize\\\\text{시스템 메시지}}$\n- 취소선(부정/철회): $\\\\cancel{\\\\text{취소된 내용}}$\n- 강조/각성: $\\\\boxed{\\\\color{orange}\\\\textbf{\\\\text{강조 내용}}}$\n\n■ 주의사항 (매우 중요 - 반드시 준수):\n- 모든 LaTeX 표현은 반드시 $ 기호로 열고 닫아야 합니다. $가 없으면 렌더링되지 않습니다!\n- 잘못된 예: \\\\text{이름: }\\\\textsf{\\\\textbf{\"대사\"}} ($ 없음 ✗)\n- 올바른 예: $\\\\text{이름: }\\\\textsf{\\\\textbf{\"대사\"}}$ ($ 있음 ✓)\n- LaTeX 수식($...$) 내부에 줄바꿈을 절대 넣지 마세요. 반드시 한 줄로 작성!\n- 발화자 이름은 반드시 $ 안에 \\\\text{이름: } 형태로 포함하세요.\n- HTML 태그나 &quot; 같은 HTML 엔티티는 절대 사용하지 마세요. 따옴표는 그냥 \"를 쓰세요.\n- 지문/나레이션은 LaTeX 없이 일반 텍스트로 작성하세요.\n- 대사에만 LaTeX를 적용하세요. 남용하지 마세요.",
  "narrative_length_template": "[!!! 서술 분량 규칙 - 최우선 필수 준수 !!!]\n반드시 매 응답마다 지문/묘사 문단을 정확히 {nl}문단으로 작성하세요.\n각 문단은 최소 3문장 이상으로 충분히 풍부하게 서술하세요.\n대사는 문단 수에 포함하지 않습니다. 대사와 대사 사이에도 상황 묘사, 표정, 심리, 분위기 등을 지문으로 충분히 서술하세요.\n{nl}문단보다 짧거나 길게 쓰지 마세요. 이 규칙은 절대적이며, 어떤 상황에서도 예외 없이 지켜야 합니다.\n상태창, 시스템 표시 등은 문단 수에 포함하지 않습니다.",
  "summary_system_instruction": "당신은 이야기 요약 전문가입니다. 핵심 줄거리, 캐릭터 상태, 중요 사건을 간결하게 요약하세요. {max_chars}자 이내.",
  "summary_request_new": "아래 대화 내용을 핵심 줄거리, 중요 사건, 캐릭터 상태 변화 중심으로 요약해주세요.",
  "summary_request_update": "기존 요약:\n{summary}\n\n아래 새로운 대화를 기존 요약에 통합하여 업데이트해주세요.",
  "game_start_message": "게임을 시작해줘",
  "safety_settings": [
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
  ],
  "cache_ttl": "3600s"
}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- Insert default gameplay config
INSERT INTO config (id, value) VALUES ('gameplay_config', '{
  "default_narrative_length": 3,
  "narrative_length_min": 1,
  "narrative_length_max": 10,
  "sliding_window_size": 20,
  "max_history": 20,
  "message_limit": 500,
  "message_warning_threshold": 300,
  "summary_trigger_offset": 10,
  "summary_max_chars": 500,
  "auto_save_interval_ms": 300000,
  "max_session_list": 50
}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- Add updated_at trigger for config table
CREATE TRIGGER config_updated_at
  BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase-schema.sql
git commit -m "db: add admin config migration (value JSONB column + default rows)"
```

**Note:** This migration must be run in Supabase Dashboard SQL Editor before deploying the new Worker code.

**RLS note:** The spec mentions tightening RLS for config writes. This is intentionally omitted because admin writes go through the Worker with `SUPABASE_SERVICE_KEY` (which bypasses RLS entirely). The existing RLS already blocks client-side config writes. No RLS changes needed.

**Trigger dependency:** The `update_updated_at()` function must already exist. It's defined in the base schema. If running this migration on a fresh DB, run the full `supabase-schema.sql` first.

---

### Task 2: Worker — Extend GET `/api/config`

**Files:**
- Modify: `src/worker.js:24-42` (replace `handleApiConfig` function)

- [ ] **Step 1: Replace `handleApiConfig` to fetch config from Supabase**

Replace the existing `handleApiConfig` function (lines 24-42) with:

```javascript
// --- /api/config: Supabase 설정 + 앱 설정 제공 ---
async function handleApiConfig(env) {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch admin config rows from Supabase
  let promptConfig = null;
  let gameplayConfig = null;

  try {
    const configRes = await fetch(
      `${url}/rest/v1/config?id=in.(prompt_config,gameplay_config)&select=id,value`,
      {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
      }
    );

    if (!configRes.ok) {
      throw new Error(`Supabase API error: ${configRes.status}`);
    }

    const rows = await configRes.json();
    for (const row of rows) {
      if (row.id === 'prompt_config') promptConfig = row.value;
      else if (row.id === 'gameplay_config') gameplayConfig = row.value;
    }

    if (!promptConfig || !gameplayConfig) {
      const missing = [];
      if (!promptConfig) missing.push('prompt_config');
      if (!gameplayConfig) missing.push('gameplay_config');
      throw new Error(`Missing config: ${missing.join(', ')}`);
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ url, anonKey, promptConfig, gameplayConfig }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/worker.js
git commit -m "feat(worker): extend GET /api/config to serve admin config from Supabase"
```

---

### Task 3: Worker — Add PUT `/api/config`

**Files:**
- Modify: `src/worker.js` (add new handler + route)

- [ ] **Step 1: Add `handleApiConfigUpdate` function**

Add this function after `handleApiConfig`, before `handleAdminAuth`:

```javascript
// --- PUT /api/config: 관리자 설정 업데이트 ---
async function handleApiConfigUpdate(request, env) {
  // Basic Auth 검증 (관리자만 접근 가능)
  const authResult = handleAdminAuth(request, env);
  if (authResult) return authResult;

  const serviceKey = env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'Service key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { promptConfig, gameplayConfig } = body;
  if (!promptConfig || !gameplayConfig) {
    return new Response(JSON.stringify({ error: 'Missing promptConfig or gameplayConfig' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = env.SUPABASE_URL;

  try {
    // Update prompt_config
    const res1 = await fetch(
      `${supabaseUrl}/rest/v1/config?id=eq.prompt_config`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ value: promptConfig }),
      }
    );
    if (!res1.ok) throw new Error(`prompt_config update failed: ${res1.status}`);

    // Update gameplay_config
    const res2 = await fetch(
      `${supabaseUrl}/rest/v1/config?id=eq.gameplay_config`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ value: gameplayConfig }),
      }
    );
    if (!res2.ok) throw new Error(`gameplay_config update failed: ${res2.status}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

- [ ] **Step 2: Add route in Worker entry point**

In the `fetch` handler, add this route **before** the existing `/api/config` check (line 104):

```javascript
    // PUT /api/config → 관리자 설정 업데이트
    if (url.pathname === '/api/config' && request.method === 'PUT') {
      return handleApiConfigUpdate(request, env);
    }

    // GET /api/config → Supabase 설정 반환
    if (url.pathname === '/api/config') {
      return handleApiConfig(env);
    }
```

- [ ] **Step 3: Update Worker header comment to include SUPABASE_SERVICE_KEY**

Update the comment at the top of `worker.js` (line 5-8) to add:

```javascript
 *   SUPABASE_SERVICE_KEY - Supabase service_role key (관리자 설정 저장용, 암호화 필수)
```

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "feat(worker): add PUT /api/config for admin config updates"
```

---

### Task 4: Client — `supabase-config.js` export config

**Files:**
- Modify: `public/js/supabase-config.js`

- [ ] **Step 1: Add config exports**

Replace the entire file content with:

```javascript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SEC-001: 환경변수에서 Supabase 설정 로드 (Cloudflare Pages Function)
// 로컬 개발 시에는 폴백 값 사용
const FALLBACK_URL = 'https://cjpbsgdjpodrfdyqhaja.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcGJzZ2RqcG9kcmZkeXFoYWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzM3NTcsImV4cCI6MjA4OTM0OTc1N30.cuOaqpl6qZk2iXeCZeyyBmGkzPCn1EfUY_njTaFS1Oo';

let supabaseUrl = FALLBACK_URL;
let supabaseAnonKey = FALLBACK_ANON_KEY;
let promptConfig = null;
let gameplayConfig = null;

try {
  const res = await fetch('/api/config');
  if (res.ok) {
    const config = await res.json();
    supabaseUrl = config.url;
    supabaseAnonKey = config.anonKey;
    promptConfig = config.promptConfig || null;
    gameplayConfig = config.gameplayConfig || null;
  }
} catch (e) {
  // /api/config 없음 (로컬 개발) → 폴백 사용
}

// NOTE: promptConfig/gameplayConfig may be null.
// Admin page (app-admin.js) does NOT need these — it reads config directly from Supabase.
// Play/editor pages MUST check for null at point of use and show error if missing.
// Do NOT throw here — it would break the admin page which imports supabase from this module.

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 익명 인증
let currentUser = null;
try {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
  } else {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    currentUser = data.user;
  }
} catch (e) {
  console.warn('Supabase auth failed:', e);
}

export { supabase, currentUser, promptConfig, gameplayConfig };
```

**IMPORTANT:** `promptConfig` and `gameplayConfig` can be `null` if `/api/config` fails or returns incomplete data. The admin page imports `supabase` from this module but doesn't need the config values. Play/editor pages must guard at their entry point (see Tasks 7 and 8).

- [ ] **Step 2: Commit**

```bash
git add public/js/supabase-config.js
git commit -m "feat(config): export promptConfig and gameplayConfig from supabase-config"
```

---

### Task 5: Refactor `prompt-builder.js`

**Files:**
- Modify: `public/js/prompt-builder.js`

- [ ] **Step 1: Replace entire file**

Replace the file content with:

```javascript
/**
 * 프롬프트 빌더
 * @param {object} fields - { worldSetting, story, characterName, characterSetting, characters, userNote, systemRules }
 * @param {object} options - { useLatex: boolean, narrativeLength?: number }
 * @param {object} promptConfig - { system_preamble, latex_rules, narrative_length_template }
 * @returns {string}
 */
export function buildPrompt(fields, options, promptConfig) {
  const { worldSetting, story, characterName, characterSetting, characters, userNote, systemRules } = fields;
  const w = (worldSetting || '').trim();
  const s = (story || '').trim();
  const cn = (characterName || '').trim();
  const cs = (characterSetting || '').trim();
  const ch = (characters || '').trim();
  const un = (userNote || '').trim();
  const sr = (systemRules || '').trim();

  let prompt = promptConfig.system_preamble;

  if (options.narrativeLength) {
    const nl = String(options.narrativeLength);
    prompt += '\n\n' + promptConfig.narrative_length_template.replaceAll('{nl}', nl);
  }

  if (sr) prompt += `\n\n[시스템 규칙]\n${sr}`;
  if (w) prompt += `\n\n[세계관]\n${w}`;
  if (s) prompt += `\n\n[스토리]\n${s}`;
  if (ch) prompt += `\n\n[등장인물]\n${ch}`;
  if (cn || cs) {
    prompt += `\n\n[주인공]`;
    if (cn) prompt += `\n이름: ${cn}`;
    if (cs) prompt += `\n설정: ${cs}`;
  }
  if (un) prompt += `\n\n[유저노트]\n${un}`;

  if (options.useLatex) {
    prompt += `\n\n${promptConfig.latex_rules}`;
  }

  if (cn) prompt = prompt.replaceAll('{{user}}', cn);

  return prompt;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/prompt-builder.js
git commit -m "refactor(prompt-builder): use promptConfig instead of hardcoded constants"
```

---

### Task 6: Refactor `gemini-api.js`

**Files:**
- Modify: `public/js/gemini-api.js:6-11` (remove SAFETY_SETTINGS), `public/js/gemini-api.js:63-75` (add cacheTtl param)

- [ ] **Step 1: Remove SAFETY_SETTINGS export**

Delete lines 6-11 (the `SAFETY_SETTINGS` constant). Keep `GEMINI_BASE`.

- [ ] **Step 2: Add `cacheTtl` parameter to `createCache`**

Change `createCache` function signature from:
```javascript
export async function createCache(apiKey, model, promptText, statusElement) {
```
to:
```javascript
export async function createCache(apiKey, model, promptText, statusElement, cacheTtl) {
```

And change the hardcoded `ttl: '3600s'` (line 74) to:
```javascript
        ttl: cacheTtl,
```

- [ ] **Step 3: Commit**

```bash
git add public/js/gemini-api.js
git commit -m "refactor(gemini-api): remove SAFETY_SETTINGS, add cacheTtl param to createCache"
```

---

### Task 7: Refactor `app-editor.js`

**Files:**
- Modify: `public/js/app-editor.js`

- [ ] **Step 1: Update imports**

Change line 1-9 imports. Replace:
```javascript
import { SAFETY_SETTINGS, fetchModels as _fetchModels, createCache as _createCache, clearCache as _clearCache, streamGenerate } from './gemini-api.js';
```
with:
```javascript
import { fetchModels as _fetchModels, createCache as _createCache, clearCache as _clearCache, streamGenerate } from './gemini-api.js';
```

Add config imports — change line 1:
```javascript
import { supabase } from './supabase-config.js';
```
to:
```javascript
import { supabase, promptConfig, gameplayConfig } from './supabase-config.js';
```

- [ ] **Step 1b: Add config null guard at module top**

After the imports, before any DOM references, add:
```javascript
if (!promptConfig || !gameplayConfig) {
  document.body.innerHTML = '<div style="padding:40px;color:#e94560;font-size:16px;">앱 설정을 불러올 수 없습니다. 관리자에게 문의하세요.</div>';
  throw new Error('앱 설정을 불러올 수 없습니다.');
}
```

- [ ] **Step 2: Update narrative length defaults and range**

Change line 43:
```javascript
let narrativeLength = 3;
```
to:
```javascript
let narrativeLength = gameplayConfig.default_narrative_length;
```

Change line 48 (`narrativeLength > 1`) to:
```javascript
  if (narrativeLength > gameplayConfig.narrative_length_min) { narrativeLength--; updateNarrativeDisplay(); }
```

Change line 51 (`narrativeLength < 10`) to:
```javascript
  if (narrativeLength < gameplayConfig.narrative_length_max) { narrativeLength++; updateNarrativeDisplay(); }
```

- [ ] **Step 3: Update buildPrompt calls to pass promptConfig**

Change `getPrompt()` function (lines 55-65) — add `promptConfig` as third argument:
```javascript
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
```

- [ ] **Step 4: Update MAX_HISTORY**

Change line 317:
```javascript
const MAX_HISTORY = 20;
```
to:
```javascript
const MAX_HISTORY = gameplayConfig.max_history;
```

- [ ] **Step 5: Update safety settings and cache TTL usage**

In `sendToGemini` (around line 358-360), there are **TWO** `safetySettings: SAFETY_SETTINGS` references on the same ternary expression (one for cached, one for non-cached). Update **both**:
```javascript
    const body = cachedContentName
      ? { cachedContent: cachedContentName, contents: conversationHistory, safetySettings: promptConfig.safety_settings }
      : { system_instruction: { parts: [{ text: getPrompt() }] }, contents: conversationHistory, safetySettings: promptConfig.safety_settings };
```

In `createCache` call (around line 411), change:
```javascript
    const ok = await createCache(apiKey, model);
```
Find the actual `createCache` wrapper function (around line 292) and update it:
```javascript
async function createCache(apiKey, model) {
  const result = await _createCache(apiKey, model, getPrompt(), els.cacheStatus, promptConfig.cache_ttl);
```

- [ ] **Step 6: Update game start message**

Change line 417:
```javascript
  sendToGemini('게임을 시작해줘');
```
to:
```javascript
  sendToGemini(promptConfig.game_start_message);
```

- [ ] **Step 7: Commit**

```bash
git add public/js/app-editor.js
git commit -m "refactor(app-editor): use config instead of hardcoded constants"
```

---

### Task 8: Refactor `app-play.js`

**Files:**
- Modify: `public/js/app-play.js`

- [ ] **Step 1: Update imports**

Change line 2:
```javascript
import { supabase, currentUser } from './supabase-config.js';
```
to:
```javascript
import { supabase, currentUser, promptConfig, gameplayConfig } from './supabase-config.js';
```

Change line 5 — remove `SAFETY_SETTINGS`:
```javascript
import { fetchModels as _fetchModels, createCache as _createCache, clearCache as _clearCache, streamGenerate, generate } from './gemini-api.js';
```

Add `token-tracker.js` import (currently not imported in this file):
```javascript
import { updateTokenDisplay, resetTokens } from './token-tracker.js';
```

- [ ] **Step 1b: Add config null guard at module top**

After the imports, before DOM references, add:
```javascript
if (!promptConfig || !gameplayConfig) {
  document.body.innerHTML = '<div style="padding:40px;color:#e94560;font-size:16px;">앱 설정을 불러올 수 없습니다. 관리자에게 문의하세요.</div>';
  throw new Error('앱 설정을 불러올 수 없습니다.');
}
```

- [ ] **Step 2: Replace hardcoded session constants**

Change lines 34, 40-42, 48:
```javascript
let narrativeLength = gameplayConfig.default_narrative_length;
```

```javascript
const SESSION_LIST_KEY = 'ai-story-game-sessions';
const SESSION_DATA_PREFIX = 'ai-story-session-';
const MAX_SESSION_LIST = gameplayConfig.max_session_list;
```

```javascript
const SLIDING_WINDOW_SIZE = gameplayConfig.sliding_window_size;
```

- [ ] **Step 3: Replace summary prompts in `generateSummary()`**

Replace lines 122-133 in `generateSummary()`:

```javascript
  const summaryPrompt = storySummary
    ? promptConfig.summary_request_update.replace('{summary}', storySummary)
    : promptConfig.summary_request_new;

  const messages = toSummarize.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.parts[0].text}`).join('\n\n');

  try {
    const summaryInstruction = promptConfig.summary_system_instruction
      .replace('{max_chars}', String(gameplayConfig.summary_max_chars));
    const result = await generate({
      apiKey, model,
      body: {
        contents: [{ role: 'user', parts: [{ text: `${summaryPrompt}\n\n---\n${messages}` }] }],
        systemInstruction: { parts: [{ text: summaryInstruction }] },
      },
    });
```

- [ ] **Step 4: Remove duplicate MODEL_PRICING and token tracking**

Delete ALL of the following from `app-play.js` (lines 277-331). These are duplicate code — `token-tracker.js` is the single source:

- `const MODEL_PRICING = { ... };` (lines 278-290)
- `let totalInputTokens = 0;` (line 292)
- `let totalOutputTokens = 0;` (line 293)
- `let totalCost = 0;` (line 294)
- `function getModelPricing(modelId) { ... }` (lines 296-301)
- `function updateTokenDisplay(usageMetadata) { ... }` (lines 303-323)
- `function resetTokens() { ... }` (lines 325-331)

The import was already added in Step 1. Now update ALL call sites to use the `token-tracker.js` function signatures:

Update `updateTokenDisplay` call (around line 549) — current local version takes 1 arg, `token-tracker.js` takes 4:
```javascript
    if (usageMetadata) updateTokenDisplay(usageMetadata, els.modelSelect.value, els.tokenInfo, els.costInfo);
```

Update `resetTokens` call (around line 585) — current local version takes 0 args, `token-tracker.js` takes 2:
```javascript
  resetTokens(els.tokenInfo, els.costInfo);
```

- [ ] **Step 5: Replace buildPrompt calls**

Update `getPrompt()` (around line 334):
```javascript
function getPrompt() {
  return buildPrompt(settingsData, {
    useLatex: els.useLatex.checked,
    narrativeLength,
  }, promptConfig);
}
```

- [ ] **Step 6: Replace safety settings and cache TTL**

Update the `sendToGemini` body construction (around line 528-529):
```javascript
      ? { cachedContent: cachedContentName, contents: recentMessages, safetySettings: promptConfig.safety_settings }
      : { system_instruction: { parts: [{ text: systemPrompt }] }, contents: recentMessages, safetySettings: promptConfig.safety_settings };
```

Update `createCache` wrapper (around line 460):
```javascript
async function createCache(apiKey, model) {
  const result = await _createCache(apiKey, model, getPrompt(), els.cacheStatus, promptConfig.cache_ttl);
```

- [ ] **Step 7: Replace message limit and warning threshold**

Change line 499:
```javascript
  if (conversationHistory.length >= gameplayConfig.message_limit) {
    alert(`이 세션은 메시지 한도(${gameplayConfig.message_limit})에 도달했습니다. 새 게임을 시작해주세요.`);
```

Change line 554 (summary trigger):
```javascript
    if (conversationHistory.length > SLIDING_WINDOW_SIZE + gameplayConfig.summary_trigger_offset) {
```

Change auto-save interval (line 255):
```javascript
  }, gameplayConfig.auto_save_interval_ms);
```

Change narrative length range in `applySettings` (around line 362):
```javascript
    narrativeLength = Math.max(gameplayConfig.narrative_length_min, Math.min(gameplayConfig.narrative_length_max, data.narrativeLength));
```

**Also** change the SECOND occurrence in `loadSession` (around line 984):
```javascript
      narrativeLength = Math.max(gameplayConfig.narrative_length_min, Math.min(gameplayConfig.narrative_length_max, data.preset.narrativeLength));
```

And narrative length buttons (lines 751-764):
```javascript
  if (narrativeLength > gameplayConfig.narrative_length_min) {
```
```javascript
  if (narrativeLength < gameplayConfig.narrative_length_max) {
```

- [ ] **Step 8: Replace game start message**

Change line 604:
```javascript
  sendToGemini(promptConfig.game_start_message);
```

- [ ] **Step 9: Replace turn count warning thresholds**

Change line 930:
```javascript
  el.className = 'turn-count' + (msgCount >= gameplayConfig.message_limit ? ' danger' : msgCount >= gameplayConfig.message_warning_threshold ? ' warning' : '');
```

Also line 928 (checked in another place around session loading):
```javascript
    if (msgCount >= gameplayConfig.message_limit) { /* ... */ }
```

- [ ] **Step 10: Commit**

```bash
git add public/js/app-play.js
git commit -m "refactor(app-play): use config, remove duplicate MODEL_PRICING"
```

---

### Task 9: Admin UI — Tab Structure in HTML

**Files:**
- Modify: `public/base_story_admin.html`

- [ ] **Step 1: Add tab navigation and config form**

After the `<div class="admin-header">` block (line 326-328), add tab navigation. Replace:

```html
    <div class="admin-header">
      <h1>프리셋 관리</h1>
    </div>
```

with:

```html
    <div class="admin-header">
      <h1>관리자</h1>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button class="tab-btn active" data-tab="presets">프리셋</button>
      <button class="tab-btn" data-tab="config">앱 설정</button>
    </div>
```

- [ ] **Step 2: Wrap existing preset content in tab container**

Wrap everything from the "프리셋 목록" section title through the form section (lines 331-405) with:

```html
    <!-- Tab: 프리셋 -->
    <div class="tab-content active" id="tabPresets">
      <!-- ...existing preset list and form content... -->
    </div>
```

- [ ] **Step 3: Add config tab content**

After the presets tab div, add:

```html
    <!-- Tab: 앱 설정 -->
    <div class="tab-content" id="tabConfig" style="display:none;">
      <div class="form-section">
        <div class="form-section-title">프롬프트 설정</div>

        <div class="form-group">
          <label for="cfgSystemPreamble">시스템 프리앰블
            <span class="tooltip" title="AI의 기본 역할을 정의하는 시스템 프롬프트 첫 부분. 모든 게임 세션에 적용됩니다.">ⓘ</span>
          </label>
          <textarea id="cfgSystemPreamble" rows="5"></textarea>
        </div>

        <div class="form-group">
          <label for="cfgLatexRules">LaTeX 연출 규칙
            <span class="tooltip" title="LaTeX 활성화 시 AI에게 전달되는 대사/효과 연출 문법 규칙. 대사 형식, 감정 연출, 효과음 등의 LaTeX 표현법을 정의합니다.">ⓘ</span>
          </label>
          <textarea id="cfgLatexRules" rows="8"></textarea>
        </div>

        <div class="form-group">
          <label for="cfgNarrativeTemplate">서술 분량 규칙 템플릿
            <span class="tooltip" title="서술 문단 수를 강제하는 프롬프트 템플릿. {nl}은 실제 문단 수로 치환됩니다.">ⓘ</span>
          </label>
          <textarea id="cfgNarrativeTemplate" rows="5"></textarea>
        </div>

        <div class="form-group">
          <label for="cfgSummaryInstruction">요약 시스템 지시
            <span class="tooltip" title="이야기 요약 생성 시 AI에게 전달되는 시스템 인스트럭션. {max_chars}는 게임 파라미터의 '요약 최대 글자수'로 치환됩니다.">ⓘ</span>
          </label>
          <textarea id="cfgSummaryInstruction" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label for="cfgSummaryNew">요약 요청 (신규)
            <span class="tooltip" title="첫 요약 생성 시 사용되는 프롬프트. 대화 내용 앞에 붙습니다.">ⓘ</span>
          </label>
          <textarea id="cfgSummaryNew" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label for="cfgSummaryUpdate">요약 요청 (업데이트)
            <span class="tooltip" title="기존 요약 업데이트 시 사용되는 프롬프트. {summary}는 기존 요약 내용으로 치환됩니다.">ⓘ</span>
          </label>
          <textarea id="cfgSummaryUpdate" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label for="cfgGameStartMsg">게임 시작 메시지
            <span class="tooltip" title="게임 시작 시 AI에게 보내는 첫 메시지. 사용자 대신 자동 전송됩니다.">ⓘ</span>
          </label>
          <input type="text" id="cfgGameStartMsg">
        </div>

        <div class="form-group">
          <label>Safety Settings
            <span class="tooltip" title="각 Gemini Safety 카테고리의 차단 수준">ⓘ</span>
          </label>
          <div class="safety-grid">
            <div class="safety-row">
              <span class="safety-label">성적 콘텐츠</span>
              <select id="cfgSafetySexual" class="safety-select"></select>
            </div>
            <div class="safety-row">
              <span class="safety-label">혐오 발언</span>
              <select id="cfgSafetyHate" class="safety-select"></select>
            </div>
            <div class="safety-row">
              <span class="safety-label">괴롭힘</span>
              <select id="cfgSafetyHarassment" class="safety-select"></select>
            </div>
            <div class="safety-row">
              <span class="safety-label">위험 콘텐츠</span>
              <select id="cfgSafetyDangerous" class="safety-select"></select>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="cfgCacheTtl">캐시 TTL
            <span class="tooltip" title="Gemini Context Cache 유지 시간 (예: 3600s). 캐시 활성화 시 이 시간만큼 유지됩니다.">ⓘ</span>
          </label>
          <input type="text" id="cfgCacheTtl" placeholder="3600s">
        </div>
      </div>

      <div class="form-section" style="margin-top: 20px;">
        <div class="form-section-title">게임 파라미터</div>

        <div class="form-group">
          <label for="cfgDefaultNarrLen">기본 서술 길이
            <span class="tooltip" title="새 게임 시작 시 기본 서술 문단 수">ⓘ</span>
          </label>
          <input type="number" id="cfgDefaultNarrLen" min="1">
        </div>

        <div class="form-group">
          <label for="cfgNarrMin">서술 길이 최소
            <span class="tooltip" title="사용자가 설정할 수 있는 서술 문단 수 하한">ⓘ</span>
          </label>
          <input type="number" id="cfgNarrMin" min="1">
        </div>

        <div class="form-group">
          <label for="cfgNarrMax">서술 길이 최대
            <span class="tooltip" title="사용자가 설정할 수 있는 서술 문단 수 상한">ⓘ</span>
          </label>
          <input type="number" id="cfgNarrMax" min="1">
        </div>

        <div class="form-group">
          <label for="cfgSlidingWindow">슬라이딩 윈도우 크기
            <span class="tooltip" title="API에 전송하는 최근 대화 메시지 수. 이 수를 초과하면 오래된 대화는 요약으로 대체됩니다.">ⓘ</span>
          </label>
          <input type="number" id="cfgSlidingWindow" min="1">
        </div>

        <div class="form-group">
          <label for="cfgMaxHistory">최대 히스토리
            <span class="tooltip" title="에디터 미리보기에서 유지하는 최대 대화 메시지 수">ⓘ</span>
          </label>
          <input type="number" id="cfgMaxHistory" min="1">
        </div>

        <div class="form-group">
          <label for="cfgMsgLimit">메시지 한도
            <span class="tooltip" title="한 세션에서 허용되는 최대 메시지 수. 초과 시 새 게임을 시작해야 합니다.">ⓘ</span>
          </label>
          <input type="number" id="cfgMsgLimit" min="1">
        </div>

        <div class="form-group">
          <label for="cfgMsgWarning">경고 임계값
            <span class="tooltip" title="메시지 한도 접근 시 경고를 표시하는 기준 메시지 수">ⓘ</span>
          </label>
          <input type="number" id="cfgMsgWarning" min="1">
        </div>

        <div class="form-group">
          <label for="cfgSummaryOffset">요약 트리거 오프셋
            <span class="tooltip" title="슬라이딩 윈도우 크기 + 이 값을 초과하면 자동으로 요약을 생성합니다.">ⓘ</span>
          </label>
          <input type="number" id="cfgSummaryOffset" min="1">
        </div>

        <div class="form-group">
          <label for="cfgSummaryMaxChars">요약 최대 글자수
            <span class="tooltip" title="AI가 생성하는 요약의 최대 글자수">ⓘ</span>
          </label>
          <input type="number" id="cfgSummaryMaxChars" min="1">
        </div>

        <div class="form-group">
          <label for="cfgAutoSaveMs">자동저장 간격 (ms)
            <span class="tooltip" title="클라우드 자동저장 주기 (밀리초). 300000 = 5분">ⓘ</span>
          </label>
          <input type="number" id="cfgAutoSaveMs" min="1000" step="1000">
        </div>

        <div class="form-group">
          <label for="cfgMaxSessions">최대 세션 목록 수
            <span class="tooltip" title="로컬에 유지하는 최대 플레이 세션 수">ⓘ</span>
          </label>
          <input type="number" id="cfgMaxSessions" min="1">
        </div>
      </div>

      <div class="form-actions" style="margin-top: 20px;">
        <button class="btn btn-primary" id="btnSaveConfig">설정 저장</button>
      </div>
    </div>
```

- [ ] **Step 4: Add CSS for tabs, tooltips, and safety grid**

Add inside the existing `<style>` block (before `</style>`):

```css
    /* Tabs */
    .tab-nav {
      display: flex;
      gap: 0;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .tab-btn {
      padding: 10px 20px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tab-btn:hover {
      color: var(--text);
    }

    .tab-btn.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    /* Tooltip */
    .tooltip {
      display: inline-block;
      width: 16px;
      height: 16px;
      line-height: 16px;
      text-align: center;
      font-size: 11px;
      font-style: normal;
      color: var(--text-muted);
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 50%;
      cursor: help;
      margin-left: 4px;
      vertical-align: middle;
    }

    /* Safety Settings Grid */
    .safety-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .safety-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .safety-label {
      flex: 0 0 120px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .safety-select {
      flex: 1;
      padding: 6px 8px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 13px;
    }
```

- [ ] **Step 5: Commit**

```bash
git add public/base_story_admin.html
git commit -m "feat(admin): add tab navigation and config form UI"
```

---

### Task 10: Admin Logic — Tab Switching + Config Load/Save/Validate

**Files:**
- Modify: `public/js/app-admin.js`

- [ ] **Step 1: Add tab switching logic**

Add after the `initTheme()` call (line 5):

```javascript
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
```

- [ ] **Step 2: Add safety settings option population**

```javascript
// --- Config: Safety Settings Options ---
const SAFETY_THRESHOLDS = ['BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_HIGH_AND_ABOVE'];
const SAFETY_CATEGORY_MAP = {
  'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'cfgSafetySexual',
  'HARM_CATEGORY_HATE_SPEECH': 'cfgSafetyHate',
  'HARM_CATEGORY_HARASSMENT': 'cfgSafetyHarassment',
  'HARM_CATEGORY_DANGEROUS_CONTENT': 'cfgSafetyDangerous',
};

// Populate safety select options
for (const elId of Object.values(SAFETY_CATEGORY_MAP)) {
  const sel = $(elId);
  for (const t of SAFETY_THRESHOLDS) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  }
}
```

- [ ] **Step 3: Add config load function**

```javascript
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

    // Populate prompt fields
    $('cfgSystemPreamble').value = prompt.system_preamble || '';
    $('cfgLatexRules').value = prompt.latex_rules || '';
    $('cfgNarrativeTemplate').value = prompt.narrative_length_template || '';
    $('cfgSummaryInstruction').value = prompt.summary_system_instruction || '';
    $('cfgSummaryNew').value = prompt.summary_request_new || '';
    $('cfgSummaryUpdate').value = prompt.summary_request_update || '';
    $('cfgGameStartMsg').value = prompt.game_start_message || '';
    $('cfgCacheTtl').value = prompt.cache_ttl || '';

    // Populate safety settings
    for (const setting of (prompt.safety_settings || [])) {
      const elId = SAFETY_CATEGORY_MAP[setting.category];
      if (elId) $(elId).value = setting.threshold;
    }

    // Populate gameplay fields
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
```

- [ ] **Step 4: Add validation function**

```javascript
// --- Config Validation ---
function validateConfig(prompt, gameplay) {
  // Prompt fields must not be empty
  const promptFields = ['system_preamble', 'latex_rules', 'narrative_length_template',
    'summary_system_instruction', 'summary_request_new', 'summary_request_update', 'game_start_message'];
  for (const f of promptFields) {
    if (!prompt[f]?.trim()) return `프롬프트 필드 "${f}"는 비워둘 수 없습니다.`;
  }

  // Cache TTL format
  if (!/^\d+s$/.test(prompt.cache_ttl)) return '캐시 TTL은 "숫자s" 형식이어야 합니다 (예: 3600s).';

  // All number fields > 0 (parseInt returns NaN for empty strings — typeof NaN === 'number' so check isNaN too)
  for (const [key, val] of Object.entries(gameplay)) {
    if (typeof val !== 'number' || isNaN(val) || val <= 0) return `"${key}" 값은 0보다 커야 합니다.`;
  }

  // Range checks
  if (gameplay.narrative_length_min < 1) return '서술 길이 최소값은 1 이상이어야 합니다.';
  if (gameplay.narrative_length_max <= gameplay.narrative_length_min) return '서술 길이 최대값은 최소값보다 커야 합니다.';
  if (gameplay.default_narrative_length < gameplay.narrative_length_min || gameplay.default_narrative_length > gameplay.narrative_length_max) {
    return '기본 서술 길이는 최소~최대 범위 내여야 합니다.';
  }
  if (gameplay.message_warning_threshold >= gameplay.message_limit) return '경고 임계값은 메시지 한도보다 작아야 합니다.';

  return null;
}
```

- [ ] **Step 5: Add save handler**

```javascript
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
    configLoaded = false; // Reset so next tab switch re-fetches fresh data
    showToast('설정이 저장되었습니다. 5분 이내에 반영됩니다.');
  } catch (e) {
    console.error('Config save failed:', e);
    showToast('설정 저장에 실패했습니다: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '설정 저장';
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add public/js/app-admin.js
git commit -m "feat(admin): add config tab load/save/validate logic"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run migration SQL**

Execute the migration section from `supabase-schema.sql` in the Supabase Dashboard SQL Editor. Verify:
```sql
SELECT id, value FROM config WHERE id IN ('prompt_config', 'gameplay_config');
```
Both rows should be returned with valid JSON values.

- [ ] **Step 2: Add SUPABASE_SERVICE_KEY to Worker secrets**

In Cloudflare Dashboard > Workers > ai-story-game > Settings > Variables and Secrets, add:
- `SUPABASE_SERVICE_KEY` = (your Supabase service_role key, encrypted)

- [ ] **Step 3: Deploy and test**

```bash
npx wrangler deploy
```

Test sequence:
1. Open `/base_story_admin.html` → verify tabs appear ("프리셋" and "앱 설정")
2. Click "앱 설정" tab → verify all fields populated with default values
3. Modify a value (e.g., change game start message) → click "설정 저장" → verify success toast
4. Wait 5 minutes (or redeploy) → open play page → start game → verify new start message is used
5. Open editor page → verify narrative length range uses config values

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: admin config system — manage prompts and gameplay params from admin page"
```
