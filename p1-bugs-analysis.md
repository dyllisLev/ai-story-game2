# P1 버그 상세 기술 분석 - 해결 방안 제안

## 1. game/chat API 세션 조회 실패

### 발생 위치
- **File**: `backend/src/routes/game/chat.ts:28-36`
- **Endpoint**: `POST /api/v1/game/chat`
- **Error**: 404 NOT_FOUND - "세션을 찾을 수 없습니다"

### 현상
```bash
# 세션 생성 성공
POST /api/v1/game/start
→ sessionId: "086d19e8-74c9-4000-917a-a9e23b6ed815"
→ response: { sessionId, sessionToken: null, systemPrompt, ... }

# 하지만 채팅 시 조회 실패
POST /api/v1/game/chat
→ body: { sessionId: "086d19e8-74c9-4000-917a-a9e23b6ed815", userMessage: "..." }
→ error: { code: "NOT_FOUND", message: "세션을 찾을 수 없습니다" }
```

### 근본 원인 분석

#### 1. Dev 모드 인증 컨텍스트 문제
**현재 로직** (`backend/src/routes/game/start.ts:57`):
```typescript
owner_uid: request.user?.id || null
```

**문제점**:
- Dev bypass 모드에서 `request.user`가 존재하지 않거나 `user.id`가 'dev-admin-user' 문자열
- Supabase RLS 정책은 `owner_uid`가 유효한 UUID인 행만 조회 허용
- `owner_uid = NULL`인 행은 RLS로 필터링되어 조회 불가

**Supabase RLS 정책** (추정):
```sql
-- sessions 테이블 RLS
CREATE POLICY "users_can_view_own_sessions" ON sessions
  FOR SELECT
  USING (
    auth.uid()::text = owner_uid::text  -- UUID 비교
    OR owner_uid IS NULL                   -- NULL은 아무도 못 보거나?
  );
```

실제로는 아래와 같은 정책일 가능성:
```sql
-- 실제 정책可能是
CREATE POLICY "users_can_view_own_sessions" ON sessions
  FOR SELECT
  USING (auth.uid()::text = owner_uid::text);  -- NULL은 제외
```

#### 2. verifySessionAccess 함수의 한계
**현재 로직** (`backend/src/plugins/auth.ts:203`):
```typescript
const isDev = process.env.NODE_ENV === 'development';
if (isDev && request.headers['x-dev-admin-skip'] === 'skip') {
  // 세션 존재 여부만 확인
  const { data } = await app.supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .single();

  if (!data) throw { statusCode: 404, ... };
  return;
}
```

**문제점**:
- Dev bypass 모드에서는 세션 존재 여부 확인은 성공
- 하지만 이후 `game/chat`의 쿼리에서 여전히 404 반환
- 이는 `supabaseAdmin.from('sessions').select('*')`가 RLS를 거쳐서 NULL을 반환하기 때문

### 해결 방안

#### 옵션 A: Dev 모드에서 owner_uid를 더미 UUID로 설정 (권장)
```typescript
// backend/src/routes/game/start.ts
const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000'; // 유효한 더미 UUID

const { data: sessionData } = await app.supabaseAdmin
  .from('sessions')
  .insert({
    id: sessionId,
    story_id: body.storyId,
    title: story.title || config.gameplayConfig.default_labels.untitled_story,
    preset,
    messages: [],
    model: body.model,
    summary: '',
    summary_up_to_index: 0,
    owner_uid: request.user?.id || (isDev ? DUMMY_USER_ID : null),  // Dev 모드에서는 더미 UUID 사용
  })
  .select('session_token')
  .single();
```

**장점**:
- 기존 RLS 정책 유지 가능
- Dev 모드에서 정상적인 세션 생성/조회 가능

**단점**:
- 더미 UUID를 쓰기 때문에 "진짜" dev 모드가 아님
- 여러 사용자가 동시에 dev 모드로 테스트 시 충돌 가능

#### 옵션 B: RLS 정책 수정 (Dev 전용)
```sql
-- Dev 환경용 RLS 정책 추가
CREATE POLICY "dev_bypass_all_sessions" ON sessions
  FOR ALL
  TO anon
  USING (
    current_setting('app.is_dev_mode') = 'true'
  );

-- 설정
ALTER DATABASE postgres SET app.is_dev_mode TO 'true';
```

**장점**:
- Clean separation: Dev vs Production
- RLS 정책 유지하면서 Dev 우회 가능

**단점**:
- Supabase 설정 변경 필요
- Production 배포 시 Dev 설정 꺼야 함 (실수 가능성 높음)

#### 옵션 C: Supabase Client 사용 (Service Role 권한)
```typescript
// Supabase service role은 RLS를 우회할 수 있음
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  app.config.SUPABASE_URL,
  app.config.SUPABASE_SERVICE_KEY,  // Service role key
  {
    db: { schema: process.env.SUPABASE_SCHEMA || 'ai_story_game' }
  }
);

// Service role로는 RLS 무시하고 조회 가능
const { data: session } = await supabase
  .from('sessions')
  .select('*')
  .eq('id', sessionId)
  .single();
```

**장점**:
- Service role은 RLS를 완전히 우회하므로 항상 조회 가능
- 코드 변경 최소

**단점**:
- 현재 `app.supabaseAdmin`가 이미 service role을 사용 중이어서 이미 적용되어 있어야 함
- 만약 그렇다면 다른 원인일 가능성

#### 옵션 D: 실제 원인 파악 필요

**확인 필요 사항**:
1. `app.supabaseAdmin`가 정말 service role로 설정되어 있는지?
2. Sessions 테이블 RLS 정책 실제 내용은?
3. Dev 모드에서 `request.user`는 무엇인지?

### 권장 해결 방안: **옵션 A + 추가 로깅**

가장 현실적인 해결책입니다:
1. Dev 모드에서는 더미 UUID 사용
2. 세션 생성/조회 시 상세 로깅 추가
3. 5분 내로 수정 및 테스트 가능

---

## 2. Play 페이지 세션 자동 로드

### 발생 위치
- **File**: `frontend/src/pages/Play.tsx`
- **URL**: `/play/:storyId`
- **Symptom**: URL 파라미터로 storyId를 전달해도 세션 자동 시작 안 됨

### 현재 구조
```typescript
// Play.tsx
const { storyId: routeStoryId } = useParams<{ storyId?: string }>();

// storyId가 있어도 "게임 시작" 버튼을 클릭해야 세션 생성됨
// 자동으로 세션을 시작하는 로직이 없음
```

### 해결 방안

#### 옵션 A: storyId가 있으면 자동으로 세션 시작
```typescript
useEffect(() => {
  if (storyId && apiKey && !engine.currentSessionId) {
    // storyId가 있고 API 키가 있고 현재 세션이 없으면 자동 시작
    handleStartGame({ storyId, model: selectedModel || 'gemini-2.0-flash-exp' });
  }
}, [storyId, apiKey]);
```

**장점**:
- 사용자 경험 개선
- URL 공유 가능 (storyId만 있으면 바로 플레이)

**단점**:
- 사용자가 storyId만 있으면 자동으로 게임이 시작되어 혼란스러울 수 있음
- API 키가 없는 경우 처리 필요

#### 옵션 B: storyId가 있으면 "게임 시작" 버튼 자동 클릭
```typescript
// 더 안전한 접근
useEffect(() => {
  if (storyId && apiKey && !engine.currentSessionId) {
    // "게임 시작" 버튼의 클릭 핸들러 호출
    // 사용자가 수동으로 시작할 수도 있도록 확인 모달 추가
    setShowStartPrompt(true);
  }
}, [storyId, apiKey]);
```

---

## 우선순위 정리

### 즉시 수정 필요 (P1)
1. **game/chat 세션 조회** - 옵션 A: 더미 UUID 사용
   - 예상 소요 시간: 30분
   - 영향: Dev 모드에서 게임 플레이 가능

### 이번 스프린트
2. **Play 페이지 자동 로드** - 옵션 A 구현
   - 예상 소요 시간: 1시간
   - 영향: 사용자 경험 개선, URL 공유 가능

---

**작성일**: 2026-04-03 23:58
**작성자**: QA Engineer (f357226d-9584-4675-aa21-1127ac275f18)
