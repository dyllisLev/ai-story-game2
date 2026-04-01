# AI Story Game - 코딩 컨벤션 (Coding Conventions)

> **버전:** 1.0
> **작성일:** 2026-04-01
> **작성자:** Fullstack Developer
> **Phase:** SDLC Phase 3 - Implementation

---

## 1. 개요 (Overview)

### 1.1 문서 목적

본 문서는 AI Story Game 플랫폼 개발을 위한 코딩 표준과 관례를 정의한다. 일관된 코드 스타일과 아키텍처 패턴을 유지하여 코드 가독성, 유지보수성, 협업 효율성을 높인다.

### 1.2 적용 범위

- **Frontend:** `frontend/` (React 19 + TypeScript + Vite)
- **Backend:** `backend/` (Fastify 5 + TypeScript)
- **Shared:** `packages/shared/` (TypeScript 타입 정의)

---

## 2. 공통 규칙 (Common Rules)

### 2.1 TypeScript 사용 원칙

| 규칙 | 설명 | 예외 |
|------|------|------|
| **타입 안전성** | 모든 함수/변수에 타입 명시 | `any` 사용 금지 |
| **인터페이스 우선** | 객체 타입은 `interface` 사용 | 공용 타입은 `type` |
| **엄격 모드** | `strict: true` 필수 | - |
| **널 체크** | `strictNullChecks: true` | - |

### 2.2 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| **파일명** | kebab-case | `user-profile.ts`, `api-client.js` |
| **컴포넌트** | PascalCase | `UserProfile.tsx`, `ApiLogDetail.js` |
| **함수/변수** | camelCase | `getUserById`, `accessToken` |
| **상수** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| **타입/인터페이스** | PascalCase | `UserProfile`, `ApiResponse` |
| **비공개 멤버** | _prefix | `_internalMethod`, `_cache` |

### 2.3 주석 규칙

```typescript
/**
 * 함수 목적을 한 줄로 설명
 *
 * @param param1 - 파라미터 설명
 * @param param2 - 파라미터 설명
 * @returns 반환값 설명
 * @throws {Error} 에러 조건
 */
function functionName(param1: string, param2: number): boolean {
  // 복잡한 로직에는 라인 주석
  const result = param1 + param2;
  return result > 0;
}
```

---

## 3. 프론트엔드 규칙 (Frontend Rules)

### 3.1 컴포넌트 구조

**파일 구조:**
```javascript
// 1. Imports
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// 2. Types/Interfaces
interface Props {
  title: string;
  onSave: () => void;
}

// 3. Component
export default function ComponentName({ title, onSave }: Props) {
  // 4. Hooks (순서 준수)
  const [state, setState] = useState(null);
  useEffect(() => { /* ... */ }, []);

  // 5. Event Handlers
  const handleClick = () => { /* ... */ };

  // 6. Render Helpers
  const renderItem = (item) => <div>{item}</div>;

  // 7. Return
  return <div>{/* JSX */}</div>;
}
```

### 3.2 Hooks 사용 규칙

| 규칙 | 설명 |
|------|------|
| **호출 순서** | `useState` → `useEffect` → `useCallback` → `useMemo` |
| **의존성 배열** | 빠짐없이 명시, ESLint 경로 무시 금지 |
| **커스텀 훅** | `use` 접두사, 단일 책임 |
| **조건부 호출** | 금지 (`if` 문 내에서 호출 금지) |

### 3.3 상태 관리

```javascript
// ✅ GOOD: 단일 책임 상태
const [user, setUser] = useState(null);
const [isLoading, setIsLoading] = useState(false);

// ❌ BAD: 복합 상태 (객체로 분리)
const [state, setState] = useState({ user, isLoading, error });

// ✅ GOOD: 복잡한 상태는 useReducer
const [state, dispatch] = useReducer(reducer, initialState);
```

### 3.4 스타일링

```javascript
// Tailwind CSS 우선
<div className="flex items-center gap-4 p-4 bg-white rounded-lg">

// 동적 스타일은 clsx/cn 조합
import { cn } from '@/lib/utils';
<div className={cn('base-class', isActive && 'active-class')}>

// 인라인 스타일 최소화 (동적 값만 허용)
<div style={{ '--progress': `${progress}%` }}>
```

### 3.5 API 호출

```javascript
// ✅ GOOD: api client 사용 (자동 토큰 갱신 지원)
import { api } from '@/lib/api';
const data = await api.get('/stories');

// ❌ BAD: 직접 fetch 사용 (토큰 갱신 미지원)
const data = await fetch('/api/stories').then(r => r.json());
```

### 3.6 XSS 방지

```javascript
// ✅ GOOD: DOMPurify 사용 (자동 sanitization)
import { renderMarkdown } from '@/lib/markdown';
const html = renderMarkdown(userInput); // 내부에서 DOMPurify 적용

// ❌ BAD: 직접 렌더링 (위험)
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## 4. 백엔드 규칙 (Backend Rules)

### 4.1 라우트 구조

```typescript
// backend/src/routes/resource/action.ts
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { ErrorHelpers } from '../services/error-handler.js';

export default async function routeName(app: FastifyInstance) {
  // HTTP METHOD + 경로
  app.get('/api/resource/:id', async (request, reply) => {
    // 1. 인증 체크
    const user = requireAuth(request);

    // 2. 입력 검증
    const { id } = request.params as { id: string };
    if (!id) {
      return ErrorHelpers.validationError(reply, 'ID가 필요합니다');
    }

    // 3. 비즈니스 로직
    const { data, error } = await app.supabaseAdmin
      .from('resource')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return ErrorHelpers.internalError(reply, '조회 실패');
    }

    // 4. 응답
    return reply.send(data);
  });
}
```

### 4.2 에러 핸들링

```typescript
// ✅ GOOD: 표준화된 에러 처리
import { ErrorHelpers, handleSupabaseError } from '../services/error-handler.js';

if (error) {
  return handleSupabaseError(app, reply, 'GET /api/resource', error, '사용자 정의 메시지');
}

// ❌ BAD: 일관성 없는 에러 처리
if (error) {
  return reply.status(500).send({ error: error.message });
}
```

### 4.3 데이터베이스 쿼리

```typescript
// ✅ GOOD: 선택적 쿼리 + 인덱스 활용
const { data } = await app.supabaseAdmin
  .from('stories')
  .select('id, title, created_at')
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .limit(20);

// ✅ GOOD: RPC for 복잡한 쿼리
const { data } = await app.supabaseAdmin.rpc('get_dashboard_stats');
```

### 4.4 보안 규칙

| 규칙 | 설명 | 예외 |
|------|------|------|
| **인증** | 모든 private 라우트에 인증 필수 | 공개 API |
| **이중 인증** | Admin 엔드포인트는 Basic Auth + JWT | - |
| **SQL Injection** | Supabase Client만 사용 (Raw Query 금지) | - |
| **XSS** | 프론트엔드에서 DOMPurify 사용 | - |
| **암호화** | API 키는 AES-256 암호화 | - |

### 4.5 Admin 보안

```typescript
// ✅ GOOD: 이중 보안 (Basic Auth + JWT)
import { requireAdminWithBasicAuth } from '../plugins/auth.js';

app.get('/api/admin/dashboard', async (request, reply) => {
  requireAdminWithBasicAuth(request); // Basic Auth + JWT 체크
  // ...
});
```

---

## 5. 공유 타입 규칙 (Shared Types Rules)

### 5.1 타입 정의

```typescript
// packages/shared/src/types/resource.ts

// ✅ GOOD: 명시적 타입 내보내기
export interface Resource {
  id: string;
  name: string;
  createdAt: string;
}

export type ResourceCreateInput = Omit<Resource, 'id' | 'createdAt'>;
export type ResourceUpdateInput = Partial<ResourceCreateInput>;

// ✅ GOOD: Enum 사용
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PENDING = 'pending',
}
```

### 5.2 타입 가져오기

```typescript
// ✅ GOOD: @story-game/shared에서 가져오기
import type { Story, Session } from '@story-game/shared';

// ❌ BAD: 중복 정의
interface Story { /* ... */ } // 중복!
```

---

## 6. 개발 워크플로우 (Development Workflow)

### 6.1 브랜치 전략

| 브랜치 | 용도 | 규칙 |
|--------|------|------|
| `main` | 프로덕션 | 직접 커밋 금지 |
| `develop` | 개발 | feature 브랜치에서 PR 후 merge |
| `feature/*` | 기능 개발 | `feature/AI-54-implementation` |
| `fix/*` | 버그 수정 | `fix/auth-error-handling` |

### 6.2 커밋 메시지

```bash
# 규칙: <type>(<scope>): <subject>

# type:
# - feat: 새 기능
# - fix: 버그 수정
# - refactor: 리팩토링
# - style: 코드 스타일 (로직 변경 없음)
# - docs: 문서
# - test: 테스트
# - chore: 빌드/설정

# 예시:
feat(auth): implement automatic token refresh
fix(admin): add Basic Auth for admin routes
docs(api): update API endpoint documentation
```

### 6.3 코드 리뷰 체크리스트

- [ ] 타입 안전성 (`any` 미사용)
- [ ] 에러 핸들링 (`ErrorHelpers` 사용)
- [ ] 보안 (인증/인가, SQL Injection 방지)
- [ ] 성능 (불필요한 리렌더링, N+1 쿼리)
- [ ] 테스트 (단위 테스트, E2E 테스트)
- [ ] 문서 (주석, README)

---

## 7. 테스트 규칙 (Testing Rules)

### 7.1 테스트 작성 원칙

| 원칙 | 설명 |
|------|------|
| **AAA 패턴** | Arrange → Act → Assert |
| **단일 책임** | 테스트 하나당 하나의 시나리오 |
| **독립성** | 테스트 간 의존성 제거 |
| **가독성** | 명확한 테스트 이름 (`should return 401 when unauthorized`) |

### 7.2 E2E 테스트

```javascript
// ✅ GOOD: 명확한 테스트 케이스
test('should redirect to login when accessing admin without auth', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/login');
});

// ✅ GOOD: 사용자 시나리오 기반
test('admin user can manage stories', async ({ page }) => {
  // 1. 로그인
  await loginAsAdmin(page);

  // 2. 관리자 페이지 접근
  await page.goto('/admin');

  // 3. 스토리 삭제
  await page.click('[data-testid="delete-story-1"]');

  // 4. 확인
  await expect(page.locator('text=스토리가 삭제되었습니다')).toBeVisible();
});
```

---

## 8. 성능 규칙 (Performance Rules)

### 8.1 프론트엔드 성능

| 규칙 | 설명 |
|------|------|
| **코드 분할** | `React.lazy()`, `import()` 사용 |
| **이미지 최적화** | WebP 형식, lazy loading |
| **번들 크기** | `vite build` 후 500KB 미만 권장 |
| **렌더링 최적화** | `useMemo`, `useCallback` 적절 사용 |

### 8.2 백엔드 성능

| 규칙 | 목표 |
|------|------|
| **API 응답 시간** | p95 < 500ms |
| **DB 쿼리** | < 100ms (인덱스 활용) |
| **동시 사용자** | 100+ concurrent users |

---

## 9. 보안 규칙 (Security Rules)

### 9.1 인증/인가

```typescript
// ✅ GOOD: 이중 보안 (Basic Auth + JWT)
import { requireAdminWithBasicAuth } from '../plugins/auth.js';

app.get('/api/admin/dashboard', async (request, reply) => {
  requireAdminWithBasicAuth(request); // Basic Auth + JWT 체크
  // ...
});
```

### 9.2 입력 검증

```typescript
// ✅ GOOD: 입력 검증
if (!body.title || body.title.length > 100) {
  return ErrorHelpers.validationError(reply, '제목을 입력해주세요 (100자 이내)');
}

// ✅ GOOD: SQL Injection 방지 (Supabase Client 자동 처리)
const { data } = await app.supabaseAdmin
  .from('stories')
  .select('*')
  .eq('id', id); // 자동으로 파라미터화된 쿼리
```

### 9.3 XSS 방지

```javascript
// ✅ GOOD: DOMPurify 사용
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(userInput);
```

---

## 10. 환경 설정 (Environment Setup)

### 10.1 필수 환경변수

```bash
# Database
SUPABASE_URL=<Supabase 프로젝트 URL>
SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_KEY=<Supabase service_role key>

# Security
API_KEY_ENCRYPTION_SECRET=<AES-256 암호화 키>
ADMIN_BASIC_AUTH_USERNAME=<Admin Basic Auth ID> (기본값: admin)
ADMIN_BASIC_AUTH_PASSWORD=<Admin Basic Auth 비밀번호> (필수)

# Server
PORT=3000
NODE_ENV=development|production
CORS_ORIGIN=http://localhost:5173
```

### 10.2 개발 서버 관리

```bash
# 시작
./dev.sh start

# 중지
./dev.sh stop

# 재시작
./dev.sh restart

# 로그 확인
./dev.sh logs
./dev.sh logs backend
./dev.sh logs frontend
```

---

## 11. 도구 설정 (Tool Configuration)

### 11.1 패키지 매니저

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
./dev.sh start

# 빌드
pnpm build
```

### 11.2 코드 품질 도구

```bash
# 타입 체크
pnpm lint

# 포맷팅
pnpm format
```

---

## 12. 문서화 (Documentation)

### 12.1 코드 문서화

```typescript
/**
 * 사용자 세션을 생성하고 AI 메시지를 전송합니다
 *
 * @remarks
 * 이 함수는 SSE 스트리밍을 사용하여 실시간 응답을 제공합니다
 *
 * @param request - Fastify 요청 객체
 * @param reply - Fastify 응답 객체 (SSE 지원)
 * @returns Promise<void> - 스트리밍 응답
 *
 * @throws {ValidationError} 스토리 ID가 없는 경우
 * @throws {UnauthorizedError} 인증되지 않은 사용자
 *
 * @example
 * ```typescript
 * app.post('/api/game/start', gameStartRoute);
 * ```
 */
async function gameStartRoute(request: FastifyRequest, reply: FastifyReply): Promise<void>
```

### 12.2 API 문서화

```typescript
/**
 * @api {post} /api/stories 스토리 생성
 * @apiName CreateStory
 * @apiGroup Stories
 *
 * @apiHeader {String} Authorization JWT Bearer 토큰
 *
 * @apiBody {String} title 스토리 제목 (필수)
 * @apiBody {String} description 스토리 설명
 * @apiBody {String[]} tags 장르 태그
 *
 * @apiSuccess {String} id 생성된 스토리 ID
 * @apiSuccess {String} title 스토리 제목
 * @apiSuccess {String} createdAt 생성 일시
 *
 * @apiError (400  ValidationError) {String} message 필수 필드 누락
 * @apiError (401  Unauthorized) {String} message 인증 실패
 */
```

---

## 13. 부록 (Appendix)

### 13.1 유용한 팁

1. **타입 추적:** `Ctrl+Click` (VS Code)으로 타입 정의로 이동
2. **디버깅:** `console.log` 대신 디버거 사용
3. **성능:** React DevTools Profiler로 렌더링 병목 발견
4. **보안:** `pnpm audit`으로 취약점 확인

### 13.2 참고 자료

- [React 19 Docs](https://react.dev/)
- [Fastify Docs](https://fastify.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)

### 13.3 관련 문서

- [CLAUDE.md](../../CLAUDE.md) — 개발 가이드 및 워크플로우
- [Phase 2 Design Specs](../phase2-design/) — API 및 아키텍처 사양
- [Migration Tasks](../../migration-tasks.md) — DB 마이그레이션 체크리스트

---

## 14. 변경 이력 (Changelog)

| 버전 | 날짜 | 변경 사항 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-04-01 | 초판 작성 (Phase 3 구현 기반) | Fullstack Developer |

---

**문서 관리:** 본 문서는 프로젝트 진행에 따라 지속적으로 업데이트된다. major 변경 시에는 버전을 올리고 변경 이력을 기록한다.
