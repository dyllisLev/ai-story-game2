# Backend Migration Implementation Plan

> **SUPERSEDED:** 이 계획은 `2026-03-20-full-stack-migration-design.md`에 의해 대체되었습니다. API 키 전달 방식이 body → `X-Gemini-Key` 헤더로 변경되었으며, 전체 아키텍처가 Fastify + React로 재설계되었습니다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프론트엔드의 프롬프트 조합/Gemini API 호출/메모리 생성을 Cloudflare Worker로 이관하여 백엔드 중심 아키텍처로 전환한다.

**Architecture:** Worker가 `/api/game/start`와 `/api/game/chat` 엔드포인트를 제공. DB에서 스토리/세션/메모리/config를 조회하고 프롬프트를 조합하여 Gemini API를 호출, SSE로 응답을 스트리밍한다. 프론트엔드는 API Key + 사용자 입력만 전송하고 응답을 렌더링한다.

**Tech Stack:** Cloudflare Workers (ES modules), Supabase REST API, Google Gemini API, Vanilla JS frontend

**Spec:** `docs/superpowers/specs/2026-03-19-backend-migration-design.md`

---

## File Structure

### 새로 생성

| 파일 | 역할 |
|------|------|
| `src/db.js` | Supabase REST API 쿼리 헬퍼 |
| `src/gemini-client.js` | Gemini API 스트리밍/비스트리밍 호출 |
| `src/prompt-builder.js` | 시스템 프롬프트 조합 (프론트에서 이관) |
| `src/memory-handler.js` | 메모리 트리거/생성/저장 |
| `src/game-handler.js` | /api/game/* 엔드포인트 핸들러 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/worker.js` | 새 엔드포인트 라우팅 추가 |
| `public/js/app-play.js` | AI 호출 로직 제거, Worker API 호출로 대체 |
| `supabase-schema.sql` | api_logs 테이블 추가 |

---

### Task 1: DB 헬퍼 모듈 (`src/db.js`)

**Files:**
- Create: `src/db.js`

- [ ] **Step 1: Supabase REST API 헬퍼 작성**

```js
// src/db.js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

function headers(env) {
  return {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
  };
}

function url(env, path) {
  return `${env.SUPABASE_URL}/rest/v1/${path}`;
}

export async function getSession(env, sessionId) {
  const res = await fetch(url(env, `sessions?id=eq.${sessionId}&select=*`), { headers: headers(env) });
  if (!res.ok) throw new Error(`Session query failed: ${res.status}`);
  const rows = await res.json();
  if (!rows.length) return null;
  return rows[0];
}

export async function getStory(env, storyId) {
  const res = await fetch(url(env, `stories?id=eq.${storyId}&select=*`), { headers: headers(env) });
  if (!res.ok) throw new Error(`Story query failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

export async function getConfig(env) {
  const res = await fetch(
    url(env, `config?id=in.(prompt_config,gameplay_config)&select=id,value`),
    { headers: headers(env) }
  );
  if (!res.ok) throw new Error(`Config query failed: ${res.status}`);
  const rows = await res.json();
  const result = {};
  for (const row of rows) {
    if (row.id === 'prompt_config') result.promptConfig = row.value;
    else if (row.id === 'gameplay_config') result.gameplayConfig = row.value;
  }
  return result;
}

export async function getSessionMemory(env, sessionId) {
  const res = await fetch(
    url(env, `session_memory?session_id=eq.${sessionId}&select=type,content`),
    { headers: headers(env) }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  const memory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
  for (const row of rows) {
    if (row.type === 'short_term') memory.shortTerm = row.content;
    else if (row.type === 'long_term') memory.longTerm = row.content;
    else if (row.type === 'characters') memory.characters = row.content;
    else if (row.type === 'goals') memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
  }
  return memory;
}

export async function createSession(env, data) {
  const res = await fetch(url(env, 'sessions'), {
    method: 'POST',
    headers: { ...headers(env), 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Session create failed: ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

export async function updateSession(env, sessionId, data) {
  const res = await fetch(url(env, `sessions?id=eq.${sessionId}`), {
    method: 'PATCH',
    headers: { ...headers(env), 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Session update failed: ${res.status}`);
}

export async function deleteSession(env, sessionId) {
  const res = await fetch(url(env, `sessions?id=eq.${sessionId}`), {
    method: 'DELETE',
    headers: headers(env),
  });
  if (!res.ok) throw new Error(`Session delete failed: ${res.status}`);
}

export async function upsertMemory(env, sessionId, type, content) {
  const res = await fetch(url(env, 'session_memory'), {
    method: 'POST',
    headers: { ...headers(env), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ session_id: sessionId, type, content }),
  });
  if (!res.ok) throw new Error(`Memory upsert failed: ${res.status}`);
}

export async function insertApiLog(env, logData) {
  await fetch(url(env, 'api_logs'), {
    method: 'POST',
    headers: { ...headers(env), 'Prefer': 'return=minimal' },
    body: JSON.stringify(logData),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db.js
git commit -m "feat: add Supabase DB helper module for Worker"
```

---

### Task 2: Gemini Client (`src/gemini-client.js`)

**Files:**
- Create: `src/gemini-client.js`

- [ ] **Step 1: Gemini API 스트리밍/비스트리밍 래퍼 작성**

```js
// src/gemini-client.js
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini 스트리밍 호출. ReadableStream을 반환하여 SSE로 프론트에 중계.
 * 스트림 완료 후 { text, usageMetadata }를 onComplete 콜백으로 전달.
 */
export function streamGenerate({ apiKey, model, body, onComplete }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      let lastUsage = null;

      try {
        const res = await fetch(
          `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          const errorEvent = `data: ${JSON.stringify({ type: 'error', message: `API Error ${res.status}: ${err}` })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          if (onComplete) onComplete({ text: '', usageMetadata: null, error: `API Error ${res.status}: ${err}` });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
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
              if (data.usageMetadata) lastUsage = data.usageMetadata;
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullResponse += text;
                const chunk = `data: ${JSON.stringify({ type: 'chunk', text })}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            } catch (e) { /* skip malformed JSON */ }
          }
        }

        if (onComplete) onComplete({ text: fullResponse, usageMetadata: lastUsage, error: null });
      } catch (err) {
        try {
          const errorEvent = `data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } catch { /* controller already closed */ }
        if (onComplete) onComplete({ text: '', usageMetadata: null, error: err.message });
      }
      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return stream;
}

/**
 * Gemini 비스트리밍 호출 (메모리 생성용).
 */
export async function generate({ apiKey, model, body }) {
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usageMetadata: data.usageMetadata || null,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gemini-client.js
git commit -m "feat: add Gemini API client module for Worker"
```

---

### Task 3: Prompt Builder (`src/prompt-builder.js`)

**Files:**
- Create: `src/prompt-builder.js`
- Reference: `public/js/prompt-builder.js` (프론트 원본)

- [ ] **Step 1: 프론트의 prompt-builder.js를 Worker용으로 이관**

```js
// src/prompt-builder.js
// 프론트의 public/js/prompt-builder.js와 동일 로직, Worker 환경용

/**
 * 시스템 프롬프트 조합
 * @param {object} story - DB의 stories row (world_setting, story, characters, system_rules 등)
 * @param {object} preset - 세션의 preset (characterName, characterSetting, useLatex, narrativeLength 등)
 * @param {object} promptConfig - config 테이블의 prompt_config value
 * @returns {string}
 */
export function buildPrompt(story, preset, promptConfig) {
  const w = (story.world_setting || '').trim();
  const s = (story.story || '').trim();
  const cn = (preset.characterName || story.character_name || '').trim();
  const cs = (preset.characterSetting || story.character_setting || '').trim();
  const ch = (story.characters || '').trim();
  const un = (story.user_note || '').trim();
  const sr = (story.system_rules || '').trim();

  let prompt = promptConfig.system_preamble;

  if (preset.narrativeLength) {
    const nl = String(preset.narrativeLength);
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

  const useLatex = preset.useLatex !== undefined ? preset.useLatex : story.use_latex;
  if (useLatex) {
    prompt += `\n\n${promptConfig.latex_rules}`;
  }

  if (cn) prompt = prompt.replaceAll('{{user}}', cn);

  return prompt;
}

/**
 * 메모리 데이터를 시스템 프롬프트용 텍스트로 변환
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
git add src/prompt-builder.js
git commit -m "feat: add prompt-builder module for Worker (migrated from frontend)"
```

---

### Task 4: Memory Handler (`src/memory-handler.js`)

**Files:**
- Create: `src/memory-handler.js`
- Reference: `public/js/memory-manager.js` (프론트 원본)

- [ ] **Step 1: 메모리 트리거/생성/저장 로직 작성**

```js
// src/memory-handler.js
import { generate } from './gemini-client.js';
import { getSessionMemory, upsertMemory } from './db.js';

/**
 * 메모리 생성 트리거 조건 체크
 */
export function shouldGenerateMemory(messages, summaryUpToIndex, gameplayConfig) {
  const windowSize = gameplayConfig.sliding_window_size || 20;
  if (messages.length <= windowSize) return false;
  if ((messages.length - summaryUpToIndex) < windowSize) return false;
  return true;
}

/**
 * 메모리 생성 + DB 저장 (비스트리밍 Gemini 호출)
 */
export async function generateAndSaveMemory({ env, apiKey, model, sessionId, messages, promptConfig, gameplayConfig }) {
  const windowSize = gameplayConfig.sliding_window_size || 20;
  const windowStart = Math.max(0, messages.length - windowSize);
  const recentMessages = messages.slice(windowStart);

  // 기존 메모리 조회
  const existingMemory = await getSessionMemory(env, sessionId);
  const memoryText = existingMemory ? JSON.stringify(existingMemory, null, 2) : '없음';

  const messagesText = recentMessages
    .map(m => `[${m.role}] ${m.content}`)
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

  const parsed = parseMemoryResponse(result.text);

  // DB에 4종 메모리 UPSERT
  await Promise.all([
    upsertMemory(env, sessionId, 'short_term', parsed.shortTerm),
    upsertMemory(env, sessionId, 'long_term', parsed.longTerm),
    upsertMemory(env, sessionId, 'characters', parsed.characters),
    upsertMemory(env, sessionId, 'goals', parsed.goals),
  ]);

  return parsed;
}

function parseMemoryResponse(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    json = JSON.parse(cleaned);
  }

  return {
    shortTerm: Array.isArray(json.shortTerm) ? json.shortTerm : [],
    characters: Array.isArray(json.characters) ? json.characters : [],
    goals: typeof json.goals === 'string' ? json.goals : '',
    longTerm: Array.isArray(json.longTerm) ? json.longTerm : [],
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/memory-handler.js
git commit -m "feat: add memory handler module for Worker (migrated from frontend)"
```

---

### Task 5: Game Handler (`src/game-handler.js`)

**Files:**
- Create: `src/game-handler.js`

- [ ] **Step 1: handleGameStart 구현**

```js
// src/game-handler.js
import { getStory, getConfig, getSession, getSessionMemory, createSession, updateSession, insertApiLog, isValidUUID } from './db.js';
import { buildPrompt, buildMemoryPrompt } from './prompt-builder.js';
import { streamGenerate } from './gemini-client.js';
import { shouldGenerateMemory, generateAndSaveMemory } from './memory-handler.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGameStart(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { apiKey, storyId, model, options } = body;
  if (!apiKey) return jsonResponse({ error: 'apiKey required' }, 400);
  if (!storyId || !isValidUUID(storyId)) return jsonResponse({ error: 'valid storyId required' }, 400);
  if (!model) return jsonResponse({ error: 'model required' }, 400);

  // DB 조회 (병렬)
  const [story, { promptConfig, gameplayConfig }] = await Promise.all([
    getStory(env, storyId),
    getConfig(env),
  ]);

  if (!story) return jsonResponse({ error: 'Story not found' }, 404);
  if (!promptConfig) return jsonResponse({ error: 'Config not found' }, 500);

  // preset 구성
  const preset = {
    characterName: options?.characterName || story.character_name || '',
    characterSetting: options?.characterSetting || story.character_setting || '',
    useLatex: options?.useLatex !== undefined ? options.useLatex : story.use_latex,
    narrativeLength: options?.narrativeLength || gameplayConfig.default_narrative_length,
  };

  // 프롬프트 조합
  const systemPrompt = buildPrompt(story, preset, promptConfig);
  const startMessage = promptConfig.game_start_message || '게임을 시작해줘';

  const geminiBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: startMessage }] }],
    safetySettings: promptConfig.safety_settings || [],
  };

  // 세션 생성
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();

  // SSE 스트리밍 + 완료 후 저장
  let completionData = { usageMetadata: null };

  const stream = streamGenerate({
    apiKey, model, body: geminiBody,
    onComplete({ text, usageMetadata, error }) {
      completionData.usageMetadata = usageMetadata;
      ctx.waitUntil((async () => {
        const messages = [
          { role: 'user', content: startMessage, timestamp: Date.now() },
          { role: 'model', content: text, timestamp: Date.now() },
        ];

        await createSession(env, {
          id: sessionId,
          story_id: storyId,
          title: story.title || '제목 없음',
          preset,
          messages,
          model,
          summary: '',
          summary_up_to_index: 0,
        });

        await insertApiLog(env, {
          session_id: sessionId,
          endpoint: 'game/start',
          request_model: model,
          request_system_prompt: systemPrompt,
          request_messages: [{ role: 'user', content: startMessage }],
          request_body: geminiBody,
          response_text: text,
          response_usage: usageMetadata,
          response_error: error,
          duration_ms: Date.now() - startTime,
        });
      })());
    },
  });

  // done 이벤트를 스트림 끝에 추가 (usage 포함)
  const encoder = new TextEncoder();
  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      const doneEvent = `data: ${JSON.stringify({ type: 'done', sessionId, usage: completionData.usageMetadata, memoryStatus: 'none' })}\n\n`;
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });

  return new Response(wrappedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: handleGameChat 구현 (같은 파일에 추가)**

```js
export async function handleGameChat(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { apiKey, sessionId, userMessage, regenerate } = body;
  if (!apiKey) return jsonResponse({ error: 'apiKey required' }, 400);
  if (!sessionId || !isValidUUID(sessionId)) return jsonResponse({ error: 'valid sessionId required' }, 400);
  if (!regenerate && !userMessage) return jsonResponse({ error: 'userMessage required' }, 400);

  // DB 조회 (병렬)
  const [session, { promptConfig, gameplayConfig }] = await Promise.all([
    getSession(env, sessionId),
    getConfig(env),
  ]);

  if (!session) return jsonResponse({ error: 'Session not found' }, 404);
  if (!session.story_id) return jsonResponse({ error: 'Session has no story' }, 400);

  const [story, memory] = await Promise.all([
    getStory(env, session.story_id),
    getSessionMemory(env, sessionId),
  ]);

  if (!story) return jsonResponse({ error: 'Story not found' }, 404);

  let messages = session.messages || [];

  // regenerate: 마지막 user+model 쌍 제거
  let actualUserMessage = userMessage;
  if (regenerate && messages.length >= 2) {
    const lastModel = messages[messages.length - 1];
    const lastUser = messages[messages.length - 2];
    if (lastModel.role === 'model' && lastUser.role === 'user') {
      actualUserMessage = lastUser.content;
      messages = messages.slice(0, -2);
    }
  }

  // 프롬프트 조합
  let systemPrompt = buildPrompt(story, session.preset || {}, promptConfig);
  systemPrompt += buildMemoryPrompt(memory);

  // 슬라이딩 윈도우
  const windowSize = gameplayConfig.sliding_window_size || 20;
  const allMessages = [...messages, { role: 'user', content: actualUserMessage, timestamp: Date.now() }];
  const windowStart = Math.max(0, allMessages.length - windowSize);
  const windowMessages = allMessages.slice(windowStart);

  // Gemini 요청 body
  const contents = windowMessages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const geminiBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    safetySettings: promptConfig.safety_settings || [],
  };

  const model = session.model || 'gemini-2.0-flash';
  const startTime = Date.now();

  let completionData = { usageMetadata: null };

  const stream = streamGenerate({
    apiKey, model, body: geminiBody,
    onComplete({ text, usageMetadata, error }) {
      completionData.usageMetadata = usageMetadata;
      ctx.waitUntil((async () => {
        // 메시지 저장
        const updatedMessages = [
          ...messages,
          { role: 'user', content: actualUserMessage, timestamp: Date.now() },
          { role: 'model', content: text, timestamp: Date.now() },
        ];

        const summaryUpToIndex = session.summary_up_to_index || 0;
        const updateData = { messages: updatedMessages };

        // 메모리 트리거 체크
        if (!error && shouldGenerateMemory(updatedMessages, summaryUpToIndex, gameplayConfig)) {
          try {
            await generateAndSaveMemory({
              env, apiKey, model, sessionId,
              messages: updatedMessages,
              promptConfig, gameplayConfig,
            });
            updateData.summary_up_to_index = updatedMessages.length;
          } catch (e) {
            console.error('Memory generation failed:', e);
          }
        }

        await updateSession(env, sessionId, updateData);

        await insertApiLog(env, {
          session_id: sessionId,
          endpoint: 'game/chat',
          request_model: model,
          request_system_prompt: systemPrompt,
          request_messages: windowMessages,
          request_body: geminiBody,
          response_text: text,
          response_usage: usageMetadata,
          response_error: error,
          duration_ms: Date.now() - startTime,
        });
      })());
    },
  });

  const encoder = new TextEncoder();
  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      const doneEvent = `data: ${JSON.stringify({ type: 'done', sessionId, usage: completionData.usageMetadata, memoryStatus: 'pending' })}\n\n`;
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    },
  });

  return new Response(wrappedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game-handler.js
git commit -m "feat: add game handler with start/chat endpoints"
```

---

### Task 6: Worker 라우터 업데이트 (`src/worker.js`)

**Files:**
- Modify: `src/worker.js`

- [ ] **Step 1: 새 엔드포인트 라우팅 추가**

파일 상단에 import 추가:
```js
import { handleGameStart, handleGameChat } from './game-handler.js';
import { getSession, getSessionMemory, deleteSession } from './db.js';
```

`export default { async fetch(request, env) { ... } }` 내부, 기존 `/api/config` 라우트 아래에 추가:

```js
    // POST /api/game/start → 새 게임 시작
    if (url.pathname === '/api/game/start' && request.method === 'POST') {
      return handleGameStart(request, env, ctx);
    }

    // POST /api/game/chat → 게임 진행
    if (url.pathname === '/api/game/chat' && request.method === 'POST') {
      return handleGameChat(request, env, ctx);
    }

    // GET /api/session/:id → 세션 조회
    if (url.pathname.startsWith('/api/session/') && request.method === 'GET') {
      const parts = url.pathname.split('/');
      const sessionId = parts[3];
      if (parts[4] === 'memory') {
        // GET /api/session/:id/memory
        const memory = await getSessionMemory(env, sessionId);
        return new Response(JSON.stringify(memory || { shortTerm: [], longTerm: [], characters: [], goals: '' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // GET /api/session/:id
      const session = await getSession(env, sessionId);
      if (!session) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      const memoryData = await getSessionMemory(env, sessionId);
      const hasMemory = !!memoryData;
      return new Response(JSON.stringify({
        sessionId: session.id,
        storyId: session.story_id,
        title: session.title,
        model: session.model,
        preset: session.preset,
        messages: session.messages,
        memoryStatus: hasMemory ? 'exists' : 'none',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // DELETE /api/session/:id → 세션 삭제
    if (url.pathname.startsWith('/api/session/') && request.method === 'DELETE') {
      const sessionId = url.pathname.split('/')[3];
      await deleteSession(env, sessionId);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }
```

- [ ] **Step 2: Worker fetch 시그니처에 ctx 추가**

```js
// 변경 전:
export default {
  async fetch(request, env) {

// 변경 후:
export default {
  async fetch(request, env, ctx) {
```

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "feat: add game/session API routes to Worker"
```

---

### Task 7: DB 스키마 — api_logs 테이블

**Files:**
- Modify: `supabase-schema.sql` (참조용 추가)
- Execute: Supabase SQL Editor에서 실행

- [ ] **Step 1: api_logs 테이블 SQL을 스키마 파일에 추가**

`supabase-schema.sql` 파일 끝에 추가:

```sql
-- ============================================================
-- API Logs (디버깅용)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_model TEXT,
  request_system_prompt TEXT,
  request_messages JSONB,
  request_body JSONB,
  response_text TEXT,
  response_usage JSONB,
  response_error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_session ON api_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
-- 클라이언트 접근 차단 (service_role만 INSERT/SELECT)
```

- [ ] **Step 2: Supabase에서 SQL 실행**

```bash
source .env
PGPASSWORD=$SUPABASE_DB_PASSWORD psql "$SUPABASE_DB_POOLER" -f - <<'SQL'
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_model TEXT,
  request_system_prompt TEXT,
  request_messages JSONB,
  request_body JSONB,
  response_text TEXT,
  response_usage JSONB,
  response_error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_logs_session ON api_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
SQL
```

- [ ] **Step 3: Commit**

```bash
git add supabase-schema.sql
git commit -m "feat: add api_logs table schema"
```

---

### Task 8: 프론트엔드 수정 (`app-play.js`)

**Files:**
- Modify: `public/js/app-play.js`

이 Task는 가장 크므로 단계를 세분화한다.

- [ ] **Step 1: 불필요한 import 제거**

```js
// 제거:
import { fetchModels as _fetchModels, createCache as _createCache, clearCache as _clearCache, streamGenerate, generate } from './gemini-api.js';
import { buildPrompt, buildMemoryPrompt } from './prompt-builder.js';
import { generateMemory, saveMemoryToLocal, loadMemoryFromLocal, migrateOldSummary } from './memory-manager.js';

// fetchModels는 유지 (모델 목록은 프론트에서 직접 조회)
// token-tracker.js의 updateTokenDisplay도 유지 (usage 표시용)
```

- [ ] **Step 2: sendToGemini() → Worker API 호출로 대체**

기존 `sendToGemini()` 함수를 완전히 교체:

```js
async function sendToAI(userMessage) {
  const apiKey = els.apiKey.value.trim();
  if (!apiKey) { alert('API Key를 입력해주세요.'); return; }
  if (!currentSessionId) { alert('게임을 먼저 시작해주세요.'); return; }

  isGenerating = true;
  els.gameInput.disabled = true;
  els.btnSend.disabled = true;
  els.btnRegenerate.disabled = true;
  els.btnStart.disabled = true;

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
```

- [ ] **Step 3: SSE 스트리밍 수신 헬퍼 추가**

```js
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

          if (data.usage) {
            updateTokenDisplay(data.usage, els.modelSelect.value, els.tokenInfo, els.costInfo);
          }

          // 대화 기록에 추가 (턴 카운트 및 재생성용)
          conversationHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
          updateTurnCount();

          if (data.memoryStatus === 'pending') {
            updateMemoryBadge('exists');
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
```

- [ ] **Step 4: 게임 시작 로직 변경**

```js
els.btnStart.addEventListener('click', async () => {
  if (isGenerating) return;
  const apiKey = els.apiKey.value.trim();
  const model = els.modelSelect.value;
  if (!apiKey) { alert('API Key를 입력해주세요.'); return; }
  if (!model) { alert('모델을 선택해주세요.'); return; }
  if (!currentStoryId) { alert('스토리를 선택해주세요.'); return; }

  isGenerating = true;
  els.btnStart.disabled = true;
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
          narrativeLength,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    await handleSSEStream(res, responseDiv);

    // done 이벤트에서 sessionId를 받아서 설정
    // (handleSSEStream 내에서 data.sessionId로 설정하도록 수정 필요)

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
```

- [ ] **Step 5: handleSSEStream에서 sessionId 설정 로직 추가**

`handleSSEStream`의 `data.type === 'done'` 블록에 추가:

```js
if (data.sessionId && !currentSessionId) {
  currentSessionId = data.sessionId;
  addToSessionList(currentSessionId, settingsData.title || '제목 없음');
  renderSessionList();
}
```

- [ ] **Step 6: regenerate 로직 변경**

```js
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
```

- [ ] **Step 7: 캐시 관련 코드 제거**

`app-play.js`에서 제거할 항목:
- `cachedContentName` 변수
- `createCache()` 함수
- `clearCache()` 함수
- `els.useCache`, `els.cacheStatus` 참조
- `btnStart` 핸들러 내 캐시 로직

- [ ] **Step 8: 세션 로드 시 메모리 조회를 API로 변경**

```js
// 기존: loadMemoryFromLocal, loadSessionMemory 직접 호출
// 변경: GET /api/session/:id/memory 호출
async function loadSessionMemoryFromAPI(sessionId) {
  try {
    const res = await fetch(`/api/session/${sessionId}/memory`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
```

- [ ] **Step 9: Commit**

```bash
git add public/js/app-play.js
git commit -m "feat: migrate app-play.js to use Worker API instead of direct Gemini calls"
```

---

### Task 9: play.html 정리

**Files:**
- Modify: `public/play.html`

- [ ] **Step 1: 캐시 UI 제거**

play.html에서 캐시 체크박스와 상태 표시 제거:
- `<input type="checkbox" id="useCache">` 관련 DOM
- `<span class="cache-status" id="cacheStatus">` 제거

- [ ] **Step 2: Commit**

```bash
git add public/play.html
git commit -m "feat: remove cache UI from play page"
```

---

### Task 10: 통합 테스트 + 배포

- [ ] **Step 1: 로컬 서버 시작**

```bash
npx wrangler dev --port 8787
```

- [ ] **Step 2: curl로 API 테스트**

```bash
# 게임 시작 테스트
curl -X POST http://localhost:8787/api/game/start \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_KEY","storyId":"e091418c-878c-4387-9535-57ebe0276190","model":"gemini-2.0-flash"}'

# 세션 조회 테스트
curl http://localhost:8787/api/session/SESSION_ID

# 메모리 조회 테스트
curl http://localhost:8787/api/session/SESSION_ID/memory
```

- [ ] **Step 3: 브라우저에서 전체 플로우 테스트**

1. 스토리 선택 → 게임 시작 → 응답 스트리밍 확인
2. 대화 입력 → 응답 확인
3. 재생성 버튼 → 동작 확인
4. 세션 이어하기 → 대화 기록 복원 확인
5. 메모리 모달 → 데이터 표시 확인

- [ ] **Step 4: api_logs 확인**

```bash
source .env
PGPASSWORD=$SUPABASE_DB_PASSWORD psql "$SUPABASE_DB_POOLER" -c "
SELECT endpoint, request_model, duration_ms, response_error, created_at
FROM api_logs ORDER BY created_at DESC LIMIT 5;
"
```

- [ ] **Step 5: Commit & Push (배포)**

```bash
git add -A
git commit -m "feat: complete backend migration - Worker handles AI calls"
git push origin main
```
