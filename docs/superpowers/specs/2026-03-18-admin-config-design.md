# Admin Config System Design

## Overview

하드코딩된 프롬프트 설정과 게임 파라미터를 관리자 페이지에서 동적으로 변경할 수 있는 시스템.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Prompt + Gameplay params | UI defaults/pricing are low-change, defer |
| Loading | Worker `/api/config` with 5min cache | Consistent with existing pattern |
| Admin UI | Tab in existing admin page | No auth changes needed |
| Cache invalidation | Natural 5min expiry | Simple, sufficient for low-change config |
| DB structure | 2 rows in existing `config` table | Reuse table, add `value` column via migration |
| Fallback | None — error on failure | Surface real errors immediately |
| Admin save | Worker-proxied writes | Basic Auth protects writes; direct Supabase blocked by RLS |

## Data Structure

### `config` table — schema change + new rows

The existing `config` table has `(id TEXT PK, password_hash TEXT, created_at TIMESTAMPTZ)` but no `value` column. Migration must add it first.

**Row: `id='prompt_config'`**

```json
{
  "system_preamble": "당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.\n아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.\n\n사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.\n각 응답은 소설체로 작성하세요.",
  "latex_rules": "[LaTeX 연출 규칙]\n대사와 효과음에 LaTeX 수식 문법을 사용하여 시각적으로 연출하세요.\n...(full current LATEX_RULES constant from prompt-builder.js lines 1-36)",
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
}
```

**Row: `id='gameplay_config'`**

```json
{
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
}
```

### Template Variables

Templates in `prompt_config` use `{variable}` placeholders. Replacement happens at the point of use in client code:

| Template field | Variable | Replaced with | Replacement location |
|---------------|----------|---------------|---------------------|
| `narrative_length_template` | `{nl}` (appears 2x) | actual narrative length number | `prompt-builder.js` via `replaceAll('{nl}', ...)` |
| `summary_system_instruction` | `{max_chars}` | `gameplayConfig.summary_max_chars` | `app-play.js` in `generateSummary()` |
| `summary_request_update` | `{summary}` | existing summary text | `app-play.js` in `generateSummary()` |

### Migration SQL

```sql
-- Step 1: Add value column (existing table only has id, password_hash, created_at)
ALTER TABLE config ADD COLUMN IF NOT EXISTS value JSONB;
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 2: Insert default config rows
INSERT INTO config (id, value) VALUES
  ('prompt_config', '<prompt_config JSON above>'::jsonb),
  ('gameplay_config', '<gameplay_config JSON above>'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Tighten RLS — only admin_uid can write config rows
-- (Existing policy allows any authenticated user to update config)
DROP POLICY IF EXISTS config_update_admin ON config;
CREATE POLICY config_update_admin ON config FOR UPDATE
  USING (auth.uid()::text = (SELECT value FROM config WHERE id = 'admin_uid'));
```

## Deployment Order

**Migration MUST run before deploying new Worker code.** If the new Worker is deployed without the migration, `/api/config` will fail and break the entire app (Supabase credentials are also served from this endpoint). Steps:

1. Run migration SQL in Supabase dashboard
2. Verify: `SELECT id, value FROM config WHERE id IN ('prompt_config', 'gameplay_config');`
3. Deploy new Worker code

## Worker Changes (`src/worker.js`)

### Read: `GET /api/config`

1. Read env vars for Supabase URL/key (existing)
2. Call Supabase REST API to fetch config rows:
   ```
   GET {SUPABASE_URL}/rest/v1/config?id=in.(prompt_config,gameplay_config)&select=id,value
   Authorization: Bearer {SUPABASE_ANON_KEY}
   apikey: {SUPABASE_ANON_KEY}
   ```
3. Parse the two rows, JSON.parse each `value` field
4. Return combined response (keep existing field names `url`, `anonKey`):
   ```json
   {
     "url": "...",
     "anonKey": "...",
     "promptConfig": { ... },
     "gameplayConfig": { ... }
   }
   ```
5. On success: `Cache-Control: public, max-age=300`
6. **On error: NO Cache-Control header** — prevent caching failures

Error cases:
- Supabase REST API unreachable → HTTP 500 `{ error: "Failed to load app config" }`
- One or both config rows missing → HTTP 500 `{ error: "Missing config: prompt_config|gameplay_config" }`
- `value` field contains invalid JSON → HTTP 500 `{ error: "Malformed config value" }`

### Write: `PUT /api/config` (new endpoint)

Admin config saves go through the Worker to leverage Basic Auth:

1. Require Basic Auth (same check as admin page access)
2. Read request body: `{ promptConfig: {...}, gameplayConfig: {...} }`
3. Validate required fields exist (see Validation section)
4. Use **SUPABASE_SERVICE_KEY** env var to bypass RLS and UPDATE each row
5. Return `{ ok: true }` or `{ error: "..." }`

This requires adding `SUPABASE_SERVICE_KEY` to Worker env vars.

## Client Changes

### `supabase-config.js`

- Extract `promptConfig` and `gameplayConfig` from existing `/api/config` response
- Export as named exports alongside existing `supabase`, `currentUser`
- If either is null/missing → throw `Error('앱 설정을 불러올 수 없습니다. 관리자에게 문의하세요.')`
- Existing Supabase URL/key fallback for local dev is separate concern — unchanged

### `prompt-builder.js`

- Remove `LATEX_RULES` constant (lines 1-36)
- Change signature: `buildPrompt(fields, options)` → `buildPrompt(fields, options, promptConfig)`
- Use `promptConfig.system_preamble` for preamble (was hardcoded lines 54-58)
- Use `promptConfig.narrative_length_template` with `replaceAll('{nl}', narrativeLength)` (was hardcoded lines 62-67)
- Use `promptConfig.latex_rules` when `options.useLatex` is true (was `LATEX_RULES` constant)

### `gemini-api.js`

- Remove `SAFETY_SETTINGS` constant export
- `createCache(apiKey, model, promptText, statusElement)` → add `cacheTtl` parameter (was hardcoded `'3600s'`)
- `streamGenerate()` and `generate()` — no change (callers already pass `safetySettings` in body)
- Callers in `app-play.js` and `app-editor.js` pass `promptConfig.safety_settings` and `promptConfig.cache_ttl`

### `app-play.js`

Remove hardcoded constants and use config imports:

| Remove | Replace with |
|--------|-------------|
| `const SLIDING_WINDOW_SIZE = 20` | `gameplayConfig.sliding_window_size` |
| `const MAX_SESSION_LIST = 50` | `gameplayConfig.max_session_list` |
| `conversationHistory.length >= 500` | `gameplayConfig.message_limit` |
| `msgCount >= 300` (warning) | `gameplayConfig.message_warning_threshold` |
| `SLIDING_WINDOW_SIZE + 10` (summary trigger) | `gameplayConfig.sliding_window_size + gameplayConfig.summary_trigger_offset` |
| `5 * 60 * 1000` (auto-save) | `gameplayConfig.auto_save_interval_ms` |
| Summary prompt strings (lines 122-133) | `promptConfig.summary_*` with template replacement |
| `'게임을 시작해줘'` | `promptConfig.game_start_message` |
| `SAFETY_SETTINGS` import | `promptConfig.safety_settings` |
| Duplicate `MODEL_PRICING` (lines 278-290) | **Remove** — use `token-tracker.js` only (pricing stays hardcoded, deferred to future) |

### `app-editor.js`

| Remove | Replace with |
|--------|-------------|
| `const MAX_HISTORY = 20` | `gameplayConfig.max_history` |
| `narrativeLength > 1` / `< 10` | `gameplayConfig.narrative_length_min` / `narrative_length_max` |
| `'게임을 시작해줘'` | `promptConfig.game_start_message` |
| `SAFETY_SETTINGS` import | `promptConfig.safety_settings` |

### Error Handling

- `/api/config` failure → page shows error overlay, game start/send buttons disabled
- Missing required config field at point of use → explicit `throw new Error(...)` with field name

## Admin UI

### Tab Structure

Add tab navigation to `base_story_admin.html`:
- Tab 1: "프리셋" (existing preset management, default active)
- Tab 2: "앱 설정" (new config management)

Tab switching hides/shows content sections. No page reload.

### Load Flow

On tab switch to "앱 설정":
1. Fetch current values: `supabase.from('config').select('id,value').in('id', ['prompt_config', 'gameplay_config'])`
2. Parse JSON values and populate form fields
3. If fetch fails → show error toast, keep form disabled

### App Config Tab Layout

Two sections with a single save button. Each field has a label and `title` attribute (tooltip) with description.

**Section: 프롬프트 설정**

| Field | Type | Description (tooltip) |
|-------|------|-----------------------|
| 시스템 프리앰블 | textarea | AI의 기본 역할을 정의하는 시스템 프롬프트 첫 부분. 모든 게임 세션에 적용됩니다. |
| LaTeX 연출 규칙 | textarea | LaTeX 활성화 시 AI에게 전달되는 대사/효과 연출 문법 규칙. 대사 형식, 감정 연출, 효과음 등의 LaTeX 표현법을 정의합니다. |
| 서술 분량 규칙 템플릿 | textarea | 서술 문단 수를 강제하는 프롬프트 템플릿. {nl}은 실제 문단 수로 치환됩니다. |
| 요약 시스템 지시 | textarea | 이야기 요약 생성 시 AI에게 전달되는 시스템 인스트럭션. {max_chars}는 게임 파라미터의 '요약 최대 글자수'로 치환됩니다. |
| 요약 요청 (신규) | textarea | 첫 요약 생성 시 사용되는 프롬프트. 대화 내용 앞에 붙습니다. |
| 요약 요청 (업데이트) | textarea | 기존 요약 업데이트 시 사용되는 프롬프트. {summary}는 기존 요약 내용으로 치환됩니다. |
| 게임 시작 메시지 | input | 게임 시작 시 AI에게 보내는 첫 메시지. 사용자 대신 자동 전송됩니다. |
| Safety Settings | select ×4 | 각 Gemini Safety 카테고리의 차단 수준. BLOCK_NONE / BLOCK_LOW_AND_ABOVE / BLOCK_MEDIUM_AND_ABOVE / BLOCK_HIGH_AND_ABOVE |
| 캐시 TTL | input | Gemini Context Cache 유지 시간 (예: 3600s). 캐시 활성화 시 이 시간만큼 유지됩니다. |

**Section: 게임 파라미터**

| Field | Type | Description (tooltip) |
|-------|------|-----------------------|
| 기본 서술 길이 | number | 새 게임 시작 시 기본 서술 문단 수 |
| 서술 길이 최소 | number | 사용자가 설정할 수 있는 서술 문단 수 하한 |
| 서술 길이 최대 | number | 사용자가 설정할 수 있는 서술 문단 수 상한 |
| 슬라이딩 윈도우 크기 | number | API에 전송하는 최근 대화 메시지 수. 이 수를 초과하면 오래된 대화는 요약으로 대체됩니다. |
| 최대 히스토리 | number | 에디터 미리보기에서 유지하는 최대 대화 메시지 수 |
| 메시지 한도 | number | 한 세션에서 허용되는 최대 메시지 수. 초과 시 새 게임을 시작해야 합니다. |
| 경고 임계값 | number | 메시지 한도 접근 시 경고를 표시하는 기준 메시지 수 |
| 요약 트리거 오프셋 | number | 슬라이딩 윈도우 크기 + 이 값을 초과하면 자동으로 요약을 생성합니다. |
| 요약 최대 글자수 | number | AI가 생성하는 요약의 최대 글자수 |
| 자동저장 간격 (ms) | number | 클라우드 자동저장 주기 (밀리초). 300000 = 5분 |
| 최대 세션 목록 수 | number | 로컬에 유지하는 최대 플레이 세션 수 |

### Validation (client-side, on save)

| Rule | Error message |
|------|--------------|
| `narrative_length_min` >= 1 | 서술 길이 최소값은 1 이상이어야 합니다 |
| `narrative_length_max` > `narrative_length_min` | 서술 길이 최대값은 최소값보다 커야 합니다 |
| `default_narrative_length` within min/max range | 기본 서술 길이는 최소~최대 범위 내여야 합니다 |
| `message_warning_threshold` < `message_limit` | 경고 임계값은 메시지 한도보다 작아야 합니다 |
| `cache_ttl` matches pattern `/^\d+s$/` | 캐시 TTL은 "숫자s" 형식이어야 합니다 (예: 3600s) |
| All number fields > 0 | 모든 숫자 값은 0보다 커야 합니다 |
| All textarea fields non-empty | 프롬프트 필드는 비워둘 수 없습니다 |

### Save Flow

1. 저장 버튼 클릭
2. Client-side validation (see above)
3. Construct `{ promptConfig: {...}, gameplayConfig: {...} }`
4. `PUT /api/config` (Worker-proxied, Basic Auth via browser's cached credentials)
5. 성공/실패 토스트 표시

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/xxx_admin_config.sql` | ALTER TABLE + INSERT default config rows + RLS |
| `src/worker.js` | Extend GET `/api/config`, add PUT `/api/config` |
| `public/js/supabase-config.js` | Export promptConfig, gameplayConfig |
| `public/js/prompt-builder.js` | Remove LATEX_RULES, accept promptConfig param |
| `public/js/gemini-api.js` | Remove SAFETY_SETTINGS export, add cacheTtl param |
| `public/js/app-play.js` | Remove hardcoded constants + duplicate MODEL_PRICING, use config |
| `public/js/app-editor.js` | Remove hardcoded constants, use config |
| `public/base_story_admin.html` | Add tab UI, config form with tooltips |
| `public/js/app-admin.js` | Add config tab logic, load/save/validate |
| `wrangler.jsonc` | Add SUPABASE_SERVICE_KEY to vars/secrets |

## Notes

- `MODEL_PRICING` in `token-tracker.js` stays hardcoded (pricing is deferred to future scope). Duplicate in `app-play.js` is removed — `token-tracker.js` is the single source.
- Existing Supabase URL/key fallback in `supabase-config.js` is unchanged (needed for local dev). "No fallback" applies only to promptConfig/gameplayConfig.
