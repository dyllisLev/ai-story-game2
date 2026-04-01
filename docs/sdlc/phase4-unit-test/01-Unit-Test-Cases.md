# AI Story Game - 단위 테스트 케이스 (Unit Test Cases)

> **버전:** 1.0
> **작성일:** 2026-04-01
> **작성자:** QA Engineer
> **Phase:** SDLC Phase 4 - Unit Testing

---

## 1. 개요 (Overview)

### 1.1 문서 목적

본 문서는 AI Story Game 플랫폼의 단위 테스트 케이스를 정의한다. 백엔드 서비스, 플러그인, 라우트 핸들러와 프론트엔드 커스텀 훅, 유틸리티 함수에 대한 테스트 시나리오를 포함한다.

### 1.2 테스트 범위

- **백엔드:** 서비스 레이어 (7개), 플러그인 (4개), 라우트 (20개)
- **프론트엔드:** 커스텀 훅 (14개), 유틸리티 (9개)
- **공통:** 타입 정의 검증

### 1.3 테스트 도구

| 도구 | 용도 | 버전 |
|------|------|------|
| **Vitest** | 단위 테스트 러너 (백엔드) | Latest |
| **Vitest (Browser Mode)** | 프론트엔드 컴포넌트 테스트 | Latest |
| **@testing-library/react** | React 컴포넌트 테스트 | Latest |
| **msw (Mock Service Worker)** | API mocking | Latest |
| **Supabase Test Helpers** | DB mocking | - |

---

## 2. 백엔드 단위 테스트 (Backend Unit Tests)

### 2.1 서비스 레이어 (Services Layer)

#### 2.1.1 crypto.ts - 암호화 서비스

**파일:** `backend/src/services/crypto.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-001 | encrypt: 정상 동작 | 평문을 AES-256-GCM로 암호화 | plaintext: "hello", secret: "test-secret" | iv:authTag:ciphertext 형식의 hex string | HIGH |
| BE-SVC-002 | encrypt: 빈 문자열 | 빈 문자열 암호화 | plaintext: "", secret: "test-secret" | 유효한 암호화된 문자열 | MEDIUM |
| BE-SVC-003 | encrypt: UTF-8 한글 | 한글 포함 암호화 | plaintext: "안녕하세요", secret: "test-secret" | 정상적으로 암호화된 한글 | HIGH |
| BE-SVC-004 | encrypt: 긴 텍스트 | API 키 길이 (39자) 암호화 | plaintext: "AIzaSyC..." (39자), secret: "test-secret" | 유효한 암호화된 문자열 | HIGH |
| BE-SVC-005 | decrypt: 정상 동작 | 암호화된 문자열 복호화 | ciphertext (from encrypt), secret: "test-secret" | 원본 평문 | HIGH |
| BE-SVC-006 | decrypt: 잘못된 형식 | 형식이 잘못된 ciphertext | "invalid-format", secret: "test-secret" | Error thrown: "Invalid ciphertext format" | HIGH |
| BE-SVC-007 | decrypt: 틀린 secret | 다른 secret으로 복호화 시도 | ciphertext, secret: "wrong-secret" | Error thrown (auth tag mismatch) | HIGH |
| BE-SVC-008 | decrypt: tampering detection | ciphertext 변조 시도 | modified ciphertext (iv 부분 변경), secret: "test-secret" | Error thrown (auth tag mismatch) | HIGH |
| BE-SVC-009 | round-trip: 암호화-복호화 | 암호화 후 복호화하여 원본 복원 | plaintext: "test-data", secret: "test-secret" | 복호화 결과 == 원본 | HIGH |

#### 2.1.2 error-handler.ts - 에러 핸들링 서비스

**파일:** `backend/src/services/error-handler.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-010 | sendError: validation error | 400 에러 응답 | reply, code: VALIDATION_ERROR, message: "Invalid input" | status: 400, error.code: "VALIDATION_ERROR" | HIGH |
| BE-SVC-011 | sendError: unauthorized | 401 에러 응답 | reply, code: UNAUTHORIZED | status: 401, error.code: "UNAUTHORIZED" | HIGH |
| BE-SVC-012 | sendError: forbidden | 403 에러 응답 | reply, code: FORBIDDEN | status: 403 | MEDIUM |
| BE-SVC-013 | sendError: not found | 404 에러 응답 | reply, code: NOT_FOUND | status: 404 | HIGH |
| BE-SVC-014 | sendError: conflict | 409 에러 응답 | reply, code: CONFLICT | status: 409 | MEDIUM |
| BE-SVC-015 | sendError: internal error | 500 에러 응답 | reply, code: INTERNAL_ERROR | status: 500 | HIGH |
| BE-SVC-016 | sendError: with details | details 포함 에러 응답 | reply, code: VALIDATION_ERROR, details: { field: "email" } | error.details: { field: "email" } | MEDIUM |
| BE-SVC-017 | handleSupabaseError: PGRST116 | 리소스 없음 에러 매핑 | error: { code: "PGRST116" } | 404 NOT_FOUND response | HIGH |
| BE-SVC-018 | handleSupabaseError: PGRST204 | 잘못된 요청 에러 매핑 | error: { code: "PGRST204" } | 400 VALIDATION_ERROR response | HIGH |
| BE-SVC-019 | handleSupabaseError: 23505 | 중복 데이터 에러 매핑 | error: { code: "23505" } | 409 CONFLICT response | HIGH |
| BE-SVC-020 | handleSupabaseError: unknown | 알 수 없는 에러 기본 처리 | error: { code: "UNKNOWN" } | 500 INTERNAL_ERROR response | HIGH |
| BE-SVC-021 | logError: Error 객체 | Error 인스턴스 로깅 | app, context: "TEST", error: new Error("test") | log.error 호출됨 | LOW |
| BE-SVC-022 | logError: 문자열 에러 | 문자열 에러 로깅 | app, context: "TEST", error: "string error" | log.error 호출됨 | LOW |

#### 2.1.3 prompt-builder.ts - 프롬프트 빌더 서비스

**파일:** `backend/src/services/prompt-builder.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-030 | buildPrompt: 최소 설정 | 필수 필드만 있는 스토리 | story: {}, preset: {}, promptConfig: { system_preamble: "You are..." } | system_preamble만 포함된 프롬프트 | HIGH |
| BE-SVC-031 | buildPrompt: 전체 필드 | 모든 필드가 있는 스토리 | story: { world_setting: "...", story: "...", ... }, preset: {...} | 모든 섹션이 포함된 프롬프트 | HIGH |
| BE-SVC-032 | buildPrompt: 세계관 섹션 | world_setting 포함 | story: { world_setting: "판타지 세계" } | "[세계관]\\n판타지 세계" 포함 | HIGH |
| BE-SVC-033 | buildPrompt: 캐릭터 섹션 | characters 포함 | story: { characters: "용사, 마왕" } | "[등장인물]\\n용사, 마왕" 포함 | HIGH |
| BE-SVC-034 | buildPrompt: 주인공 섹션 | character_name, character_setting | story: { character_name: "카인", character_setting: "용사" } | "[주인공]\\n이름: 카인\\n설정: 용사" 포함 | HIGH |
| BE-SVC-035 | buildPrompt: 시스템 규칙 | system_rules 포함 | story: { system_rules: "전투 시 주사위 굴림" } | "[시스템 규칙]\\n전투 시 주사위 굴림" 포함 | HIGH |
| BE-SVC-036 | buildPrompt: useLatex true | LaTeX 규칙 추가 | story: { use_latex: true }, promptConfig: { latex_rules: "..." } | latex_rules 포함 | MEDIUM |
| BE-SVC-037 | buildPrompt: status window | 상태창 프리셋 | story: { preset: { useStatusWindow: true, statusAttributes: [...] } } | "[상태창 규칙]" 섹션 포함 | HIGH |
| BE-SVC-038 | buildPrompt: {{user}} 치환 | 주인공 이름으로 치환 | story: { character_name: "카인" }, promptConfig: { system_preamble: "당신은 {{user}}입니다" } | "당신은 카인입니다" | HIGH |
| BE-SVC-039 | buildPrompt: narrativeLength | narrative length 템플릿 | preset: { narrativeLength: 300 }, promptConfig: { narrative_length_template: "길이: {nl}" } | "길이: 300" 포함 | MEDIUM |
| BE-SVC-040 | buildMemoryPrompt: null memory | null 메모리 처리 | memory: null | 빈 문자열 | HIGH |
| BE-SVC-041 | buildMemoryPrompt: longTerm | 장기 기억 포함 | memory: { longTerm: [{ title: "목표", content: "마왕 격파" }] } | "## 장기기억\\n- 목표: 마왕 격파" 포함 | HIGH |
| BE-SVC-042 | buildMemoryPrompt: shortTerm | 단기 기억 포함 | memory: { shortTerm: [{ title: "현재 위치", content: "마을" }] } | "## 단기기억" 포함 | HIGH |
| BE-SVC-043 | buildMemoryPrompt: characters | 캐릭터 현황 포함 | memory: { characters: [{ name: "상점주인", role: "NPC", description: "친절" }] } | "## 등장인물 현황\\n- 상점주인 (NPC): 친절" | HIGH |
| BE-SVC-044 | buildMemoryPrompt: goals | 목표 포함 | memory: { goals: "마왕을 격파한다" } | "## 현재 목표\\n마왕을 격파한다" | HIGH |

#### 2.1.4 memory-handler.ts - 메모리 핸들러 서비스

**파일:** `backend/src/services/memory-handler.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-050 | extractMemory: status block | ```status``` 블록 추출 | content: "```\nstatus\nHP: 100\n```" | { status: "HP: 100" } | HIGH |
| BE-SVC-051 | extractMemory: 단기 기억 | AI 응답에서 단기 기억 추출 | AI response: "최근 마을에 도착했다" | shortTerm에 추가됨 | MEDIUM |
| BE-SVC-052 | extractMemory: 장기 기억 | 중요한 사건 장기 기억화 | AI response: "마왕을 격파했다" | longTerm에 추가됨 | MEDIUM |
| BE-SVC-053 | updateMemory: sliding window | 최근 N개 메시지만 유지 | messages: [1..100], windowSize: 10 | 최근 10개만 유지 | HIGH |
| BE-SVC-054 | formatMemoryForAI | AI 컨텍스트용 포맷팅 | memory: {...} | buildMemoryPrompt 결과와 동일 | HIGH |

#### 2.1.5 session-manager.ts - 세션 매니저 서비스

**파일:** `backend/src/services/session-manager.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-060 | createSession: 정상 생성 | 새 세션 생성 | storyId, userId, title | sessionId, 초기 system message | HIGH |
| BE-SVC-061 | createSession: 익명 세션 | 인증 없는 세션 생성 | storyId, null, title | sessionId, x-session-token 헤더 | HIGH |
| BE-SVC-062 | addMessage: 사용자 메시지 | 사용자 메시지 추가 | sessionId, { role: "user", content: "test" } | 메시지 저장됨 | HIGH |
| BE-SVC-063 | addMessage: AI 메시지 | AI 메시지 추가 | sessionId, { role: "assistant", content: "..." } | 메시지 저장됨 | HIGH |
| BE-SVC-064 | getSession: 존재하는 세션 | 세션 조회 | 존재하는 sessionId | 세션 데이터 반환 | HIGH |
| BE-SVC-065 | getSession: 없는 세션 | 존재하지 않는 세션 조회 | 없는 sessionId | 404 에러 | HIGH |
| BE-SVC-066 | deleteSession: 정상 삭제 | 세션 삭제 | 존재하는 sessionId | 세션 및 연관 메모리 삭제됨 | HIGH |
| BE-SVC-067 | listSessions: 사용자 세션 목록 | 사용자의 모든 세션 조회 | userId | 세션 목록 반환 | HIGH |
| BE-SVC-068 | listSessions: storyId 필터 | 특정 스토리의 세션만 | userId, storyId | 해당 스토리의 세션만 | MEDIUM |

#### 2.1.6 gemini.ts - Gemini API 서비스

**파일:** `backend/src/services/gemini.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-070 | validateApiKey: 정상 키 | 유효한 Gemini API 키 | "AIzaSyC..." (39자) | true | HIGH |
| BE-SVC-071 | validateApiKey: 짧은 키 | 너무 짧은 키 | "short" | false | HIGH |
| BE-SVC-072 | validateApiKey: 잘못된 prefix | AIza로 시작하지 않음 | "invalid-key" | false | HIGH |
| BE-SVC-073 | streamResponse: 정상 응답 | SSE 스트리밍 | apiKey, prompt | SSE events emitted | HIGH |
| BE-SVC-074 | streamResponse: quota exceeded | 할당량 초과 | invalid apiKey | 402 PAYMENT_REQUIRED error | HIGH |
| BE-SVC-075 | streamResponse: 네트워크 에러 | 네트워크 실패 | mocked network error | 적절한 에러 처리 | MEDIUM |

#### 2.1.7 request-logger.ts - 요청 로거 서비스

**파일:** `backend/src/plugins/request-logger.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-SVC-080 | logRequest: 모든 필드 | 요청 로깅 | method, path, statusCode, durationMs | service_logs에 저장됨 | MEDIUM |
| BE-SVC-081 | logRequest: 200 OK | 성공 요청 | GET /api/health, 200, 50ms | 로그에 저장됨 | LOW |
| BE-SVC-082 | logRequest: 500 에러 | 실패 요청 | POST /api/game/start, 500, 100ms | 로그에 저장됨 | LOW |

---

### 2.2 플러그인 (Plugins)

#### 2.2.1 auth.ts - 인증 플러그인

**파일:** `backend/src/plugins/auth.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-PLG-001 | requireAuth: 정상 토큰 | 유효한 JWT 토큰 | request: { headers: { authorization: "Bearer valid-token" } } | user object 반환 | HIGH |
| BE-PLG-002 | requireAuth: 없는 토큰 | Authorization 헤더 없음 | request: {} | 401 UNAUTHORIZED error | HIGH |
| BE-PLG-003 | requireAuth: 만료 토큰 | 만료된 JWT | request: { headers: { authorization: "Bearer expired-token" } } | 401 UNAUTHORIZED error | HIGH |
| BE-PLG-004 | requireAuth: 잘못된 형식 | "Bearer" 없음 | request: { headers: { authorization: "invalid-token" } } | 401 UNAUTHORIZED error | HIGH |
| BE-PLG-005 | requireAdmin: admin 사용자 | admin role 사용자 | request: { user: { role: "admin" } } | 통과 | HIGH |
| BE-PLG-006 | requireAdmin: 일반 사용자 | user role 사용자 | request: { user: { role: "user" } } | 403 FORBIDDEN error | HIGH |
| BE-PLG-007 | requireAdmin: pending 사용자 | pending role 사용자 | request: { user: { role: "pending" } } | 403 FORBIDDEN error | MEDIUM |
| BE-PLG-008 | requireAdminWithBasicAuth: Basic 인증 성공 | 올바른 username/password | request: { headers: { authorization: "Basic base64(user:pass)" } } | 통과 | HIGH |
| BE-PLG-009 | requireAdminWithBasicAuth: Basic 인증 실패 | 틀린 username/password | request: { headers: { authorization: "Basic invalid" } } | 401 UNAUTHORIZED error | HIGH |
| BE-PLG-010 | requireAdminWithBasicAuth: Basic 없음 | Basic Auth 헤더 없음 | request: {} | 401 UNAUTHORIZED error | HIGH |

#### 2.2.2 supabase.ts - Supabase 플러그인

**파일:** `backend/src/plugins/supabase.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-PLG-020 | supabaseAdmin: 등록됨 | app.supabaseAdmin 접근 | app | supabase client 객체 | HIGH |
| BE-PLG-021 | connection: 정상 연결 | DB 연결 확인 | app | 연결 상태 OK | HIGH |

#### 2.2.3 config-cache.ts - 설정 캐시 플러그인

**파일:** `backend/src/plugins/config-cache.ts`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-PLG-030 | getConfig: 초기 로드 | DB에서 설정 로드 | app | config 객체 반환 | MEDIUM |
| BE-PLG-031 | getConfig: 캐싱 | 두 번째 호출은 캐시 사용 | app | 캐시된 값 반환 | MEDIUM |
| BE-PLG-032 | invalidateCache: 캐시 무효화 | 설정 변경 후 캐시 비움 | app | 다음 호출은 DB 조회 | LOW |

---

### 2.3 라우트 핸들러 (Route Handlers)

#### 2.3.1 인증 라우트 (auth.ts)

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-RT-001 | POST /api/auth/signup: 정상 | 회원가입 성공 | { email: "test@example.com", password: "Pass123!", displayName: "Test" } | 201, user + tokens | HIGH |
| BE-RT-002 | POST /api/auth/signup: 중복 이메일 | 이미 존재하는 이메일 | { email: "existing@example.com", ... } | 409 CONFLICT | HIGH |
| BE-RT-003 | POST /api/auth/signup: weak password | 약한 비밀번호 | { email: "test@example.com", password: "123" } | 400 VALIDATION_ERROR | HIGH |
| BE-RT-004 | POST /api/auth/signup: 잘못된 이메일 | 이메일 형식 오류 | { email: "invalid", ... } | 400 VALIDATION_ERROR | HIGH |
| BE-RT-005 | POST /api/auth/login: 정상 | 로그인 성공 | { email: "test@example.com", password: "Pass123!" } | 200, user + tokens | HIGH |
| BE-RT-006 | POST /api/auth/login: 틀린 비밀번호 | 비밀번호 불일치 | { email: "test@example.com", password: "wrong" } | 401 UNAUTHORIZED | HIGH |
| BE-RT-007 | POST /api/auth/login: 없는 이메일 | 존재하지 않는 이메일 | { email: "nonexistent@example.com", ... } | 401 UNAUTHORIZED | HIGH |
| BE-RT-008 | POST /api/auth/logout: 정상 | 로그아웃 성공 | headers: { authorization: "Bearer token" } | 200, message | MEDIUM |
| BE-RT-009 | POST /api/auth/refresh: 정상 | 토큰 갱신 성공 | { refreshToken: "valid-refresh-token" } | 200, new tokens | MEDIUM |
| BE-RT-010 | POST /api/auth/refresh: 만료 토큰 | 만료된 refresh token | { refreshToken: "expired" } | 401 UNAUTHORIZED | MEDIUM |

#### 2.3.2 스토리 라우트 (stories/*.ts)

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-RT-020 | GET /api/stories: 목록 조회 | 공개 스토리 목록 | page: 1, limit: 20 | stories[] + pagination | HIGH |
| BE-RT-021 | GET /api/stories: 장르 필터 | 특정 장르 필터링 | genre: "fantasy" | fantasy 스토리만 | HIGH |
| BE-RT-022 | GET /api/stories: 검색 | 키워드 검색 | search: "용사" | title/description에 "용사" 포함 | HIGH |
| BE-RT-023 | GET /api/stories: 정렬 | 최신순 정렬 | sort: "latest" | created_at 내림차순 | MEDIUM |
| BE-RT-024 | GET /api/stories/:id: 상세 조회 | 존재하는 스토리 | storyId | 스토리 상세 정보 | HIGH |
| BE-RT-025 | GET /api/stories/:id: 없는 스토리 | 존재하지 않는 스토리 | invalid storyId | 404 NOT_FOUND | HIGH |
| BE-RT-026 | GET /api/stories/:id: 비공개 스토리 | 비공개 스토리 접근 (비소유자) | private storyId, non-owner | 403 FORBIDDEN | HIGH |
| BE-RT-027 | POST /api/stories: 생성 | 새 스토리 생성 | { title: "Test", ... } + auth | 201, storyId | HIGH |
| BE-RT-028 | POST /api/stories: 필수 필드 누락 | title 없음 | { description: "..." } + auth | 400 VALIDATION_ERROR | HIGH |
| BE-RT-029 | PUT /api/stories/:id: 수정 | 스토리 수정 | { title: "Updated" } + owner auth | 200, updated story | HIGH |
| BE-RT-030 | PUT /api/stories/:id: 권한 없음 | 다른 사용자의 스토리 수정 | { title: "..." } + non-owner auth | 403 FORBIDDEN | HIGH |
| BE-RT-031 | DELETE /api/stories/:id: 삭제 | 스토리 삭제 | owner auth | 200, message | HIGH |
| BE-RT-032 | DELETE /api/stories/:id: 권한 없음 | 다른 사용자의 스토리 삭제 | non-owner auth | 403 FORBIDDEN | HIGH |
| BE-RT-033 | GET /api/stories/mine: 내 스토리 | 내 스토리 목록 | auth | 내 스토리만 | HIGH |
| BE-RT-034 | GET /api/stories/stats: 통계 | 스토리 통계 조회 | auth | totalStories, publishedStories, etc | MEDIUM |
| BE-RT-035 | GET /api/presets: 프리셋 목록 | 프리셋 목록 조회 | - | presets[] | MEDIUM |

#### 2.3.3 세션 라우트 (sessions/*.ts)

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-RT-040 | GET /api/sessions: 목록 조회 | 사용자 세션 목록 | auth | sessions[] | HIGH |
| BE-RT-041 | GET /api/sessions: storyId 필터 | 특정 스토리의 세션만 | auth, storyId | 해당 스토리 세션만 | MEDIUM |
| BE-RT-042 | GET /api/sessions/:id: 상세 조회 | 세션 상세 조회 | auth, sessionId | messages + memory | HIGH |
| BE-RT-043 | GET /api/sessions/:id: 권한 없음 | 다른 사용자의 세션 | auth, non-owner sessionId | 403 FORBIDDEN | HIGH |
| BE-RT-044 | POST /api/sessions: 생성 | 새 세션 생성 | { storyId, title } + auth | 201, sessionId + system message | HIGH |
| BE-RT-045 | POST /api/sessions: 익명 세션 | 인증 없이 세션 생성 | { storyId, title } + x-session-token | 201, sessionId | HIGH |
| BE-RT-046 | PUT /api/sessions/:id: 수정 | 세션 제목 수정 | { title: "New Title" } + owner auth | 200, updated session | MEDIUM |
| BE-RT-047 | DELETE /api/sessions/:id: 삭제 | 세션 삭제 | owner auth | 200, message | MEDIUM |
| BE-RT-048 | GET /api/sessions/:id/memory: 메모리 조회 | 세션 메모리 조회 | auth, sessionId | memory object | MEDIUM |

#### 2.3.4 게임 라우트 (game/*.ts)

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-RT-060 | POST /api/game/start: 정상 | 새 게임 시작 | { storyId } + auth + x-gemini-key | 200, sessionId + systemPrompt | HIGH |
| BE-RT-061 | POST /api/game/start: API key 없음 | Gemini API 키 미제공 | { storyId } + auth (no x-gemini-key) | 400 VALIDATION_ERROR | HIGH |
| BE-RT-062 | POST /api/game/start: 없는 스토리 | 존재하지 않는 스토리 | { invalidStoryId } | 404 NOT_FOUND | HIGH |
| BE-RT-063 | POST /api/game/start: SSE 스트림 | SSE 이벤트 확인 | { storyId } + x-gemini-key | event: message, status, memory, done | HIGH |
| BE-RT-064 | POST /api/game/chat: 정상 | 대화 전송 | { sessionId, content: "test", mode: "action" } + x-gemini-key | 200, messageId + SSE stream | HIGH |
| BE-RT-065 | POST /api/game/chat: 없는 세션 | 존재하지 않는 세션 | { invalidSessionId, ... } | 404 NOT_FOUND | HIGH |
| BE-RT-066 | POST /api/game/chat: quota exceeded | Gemini 할당량 초과 | { sessionId, ... } + invalid x-gemini-key | 402 PAYMENT_REQUIRED | HIGH |
| BE-RT-067 | POST /api/game/chat: 메시지 모드 | 모드 파싱 | { sessionId, mode: "thought" } | AI가 생각 모드로 응답 | MEDIUM |
| BE-RT-068 | POST /api/game/test-prompt: 정상 | 프롬프트 미리보기 | { storyId } + owner auth | 200, systemPrompt + estimatedTokens | MEDIUM |
| BE-RT-069 | POST /api/game/test-prompt: 권한 없음 | 다른 사용자의 스토리 | { storyId } + non-owner auth | 403 FORBIDDEN | MEDIUM |

#### 2.3.5 관리자 라우트 (admin/*.ts)

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-RT-080 | GET /api/admin/dashboard: 정상 | 대시보드 통계 | admin auth + basic auth | overview + recentActivity + popularStories | HIGH |
| BE-RT-081 | GET /api/admin/dashboard: Basic 인증 없음 | Basic Auth 누락 | admin auth (no basic auth) | 401 UNAUTHORIZED | HIGH |
| BE-RT-082 | GET /api/admin/dashboard: 일반 사용자 | user role 접근 | user auth | 403 FORBIDDEN | HIGH |
| BE-RT-083 | GET /api/admin/stories: 목록 조회 | 전체 스토리 목록 | admin auth + basic auth | stories[] + pagination | HIGH |
| BE-RT-084 | DELETE /api/admin/stories/:id: 강제 삭제 | 강제 스토리 삭제 | admin auth + basic auth | 200, message | MEDIUM |
| BE-RT-085 | GET /api/admin/users: 목록 조회 | 사용자 목록 | admin auth + basic auth | users[] | MEDIUM |
| BE-RT-086 | GET /api/admin/users: role 필터 | 역할별 필터 | admin auth, role: "pending" | pending users only | LOW |
| BE-RT-087 | PUT /api/admin/users/:id/role: 역할 변경 | 사용자 역할 변경 | admin auth, { role: "admin" } | 200, updated user | MEDIUM |
| BE-RT-088 | GET /api/admin/service-logs: 목록 조회 | 서비스 로그 목록 | admin auth + basic auth | logs[] | LOW |
| BE-RT-089 | DELETE /api/admin/service-logs: 로그 삭제 | 모든 서비스 로그 삭제 | admin auth + basic auth | 200, message | LOW |
| BE-RT-090 | GET /api/admin/api-logs: 목록 조회 | API 로그 목록 | admin auth + basic auth | logs[] | LOW |
| BE-RT-091 | DELETE /api/admin/api-logs: 로그 삭제 | 모든 API 로그 삭제 | admin auth + basic auth | 200, message | LOW |
| BE-RT-092 | GET /api/admin/status-presets: 목록 조회 | 상태창 프리셋 목록 | admin auth | presets[] | MEDIUM |
| BE-RT-093 | POST /api/admin/status-presets: 생성 | 새 프리셋 생성 | admin auth, { title, genre, attributes } | 201, presetId | MEDIUM |
| BE-RT-094 | POST /api/admin/danger-zone/truncate-stories | 모든 스토리 삭제 | admin auth + basic auth | 200, message | LOW |
| BE-RT-095 | POST /api/admin/danger-zone/truncate-sessions | 모든 세션 삭제 | admin auth + basic auth | 200, message | LOW |
| BE-RT-096 | POST /api/admin/danger-zone/reset-config | 설정 초기화 | admin auth + basic auth | 200, message | LOW |

#### 2.3.6 설정 라우트 (config.ts)

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| BE-RT-100 | GET /api/config: 조회 | 설정 조회 | admin auth | prompt + gameplay + genres | MEDIUM |
| BE-RT-101 | GET /api/config: 일반 사용자 | user role 접근 | user auth | 403 FORBIDDEN | MEDIUM |
| BE-RT-102 | PUT /api/config: 수정 | 설정 수정 | admin auth, { temperature: 0.9 } | 200, message | MEDIUM |
| BE-RT-103 | PUT /api/config: 잘못된 값 | 잘못된 설정 값 | admin auth, { temperature: 2.0 } | 400 VALIDATION_ERROR | MEDIUM |

---

## 3. 프론트엔드 단위 테스트 (Frontend Unit Tests)

### 3.1 유틸리티 함수 (Utilities)

#### 3.1.1 format.js - 포맷 유틸리티

**파일:** `frontend/src/lib/format.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-001 | formatTime: 정상 동작 | ISO 타임스탬프 포맷팅 | "2026-04-01T12:34:56Z" | "12:34:56" | HIGH |
| FE-UTIL-002 | formatTime: 자정 | 00:00:00 | "2026-04-01T00:00:00Z" | "00:00:00" | MEDIUM |
| FE-UTIL-003 | formatNumber: 천 단위 구분 | 숫자 포맷팅 | 1234567 | "1,234,567" | HIGH |
| FE-UTIL-004 | formatNumber: 0 | 0 포맷팅 | 0 | "0" | MEDIUM |
| FE-UTIL-005 | formatCount: K 변환 | 큰 수 K 단위 | 1200 | "1.2K" | HIGH |
| FE-UTIL-006 | formatCount: 1000 미만 | 1000 미만 | 999 | "999" | HIGH |
| FE-UTIL-007 | formatCount: null/undefined | null 처리 | null | "0" | MEDIUM |
| FE-UTIL-008 | formatTokens: 토큰 수 포맷 | 토큰 수 포맷팅 | 1500 | "1.5K" | MEDIUM |
| FE-UTIL-009 | generateId: 고유성 | ID 생성 중복 없음 | - 호출 10회 | 모두 다른 ID | MEDIUM |
| FE-UTIL-010 | generateId: 길이 | ID 길이 확인 | - | 8자 | LOW |

#### 3.1.2 markdown.js - 마크다운 렌더러

**파일:** `frontend/src/lib/markdown.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-020 | renderMarkdown: 기본 마크다운 | 마크다운 파싱 | "# Hello\\nWorld" | "<h1>Hello</h1>\\n<p>World</p>" | HIGH |
| FE-UTIL-021 | renderMarkdown: XSS 방지 | 악성 스크립트 필터링 | "<script>alert('xss')</script>" | sanitized HTML | HIGH |
| FE-UTIL-022 | renderMarkdown: LaTeX 블록 | $$...$$ LaTeX | "$$x^2$$" | KaTeX rendered HTML | MEDIUM |
| FE-UTIL-023 | renderMarkdown: LaTeX 인라인 | $...$ LaTeX | "$x^2$" | KaTeX rendered HTML | MEDIUM |
| FE-UTIL-024 | renderMarkdown: 코드 블록 | ``` 코드 블록 | "```js\\nconsole.log('test')\\n```" | <pre><code>...</code></pre> | MEDIUM |
| FE-UTIL-025 | renderMarkdown: 빈 문자열 | 빈 입력 | "" | "" | LOW |
| FE-UTIL-026 | renderMarkdown: marked.js 없음 | marked.js 없을 때 fallback | (window.marked 없음) | HTML escaped + <br> | LOW |

#### 3.1.3 sse.js - SSE 유틸리티

**파일:** `frontend/src/lib/sse.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-040 | parseSSE: message 이벤트 | SSE message 파싱 | "event: message\\ndata: {\\"role\\": \\"assistant\\"}" | { type: "message", data: {...} } | HIGH |
| FE-UTIL-041 | parseSSE: status 이벤트 | SSE status 파싱 | "event: status\\ndata: {\\"HP\\": 100}" | { type: "status", data: {...} } | HIGH |
| FE-UTIL-042 | parseSSE: memory 이벤트 | SSE memory 파싱 | "event: memory\\ndata: {...}" | { type: "memory", data: {...} } | HIGH |
| FE-UTIL-043 | parseSSE: done 이벤트 | SSE done 파싱 | "event: done\\ndata: {\\"turnCount\\": 1}" | { type: "done", data: {...} } | HIGH |
| FE-UTIL-044 | parseSSE: 여러 이벤트 | 다중 이벤트 스트림 | "event: message\\ndata: {...}\\n\\nevent: done\\ndata: {...}" | [{ type: "message", ... }, { type: "done", ... }] | HIGH |
| FE-UTIL-045 | parseSSE: 잘못된 형식 | 잘못된 SSE 데이터 | "invalid data" | 적절한 에러 처리 | MEDIUM |

#### 3.1.4 api.js - API 클라이언트

**파일:** `frontend/src/lib/api.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-060 | api.get: 정상 응답 | GET 요청 성공 | "/stories" | data 반환 | HIGH |
| FE-UTIL-061 | api.get: 401 에러 | 인증 에러 처리 | "/me" (no auth) | 401, 토큰 갱신 시도 | HIGH |
| FE-UTIL-062 | api.get: 토큰 갱신 | 만료 토큰 자동 갱신 | "/me" (expired token) | 토큰 갱신 후 재요청 | HIGH |
| FE-UTIL-063 | api.post: 정상 응답 | POST 요청 성공 | "/stories", { title: "Test" } | 201, data | HIGH |
| FE-UTIL-064 | api.post: validation 에러 | 400 에러 처리 | "/stories", {} | 400 error 반환 | HIGH |
| FE-UTIL-065 | api.delete: 정상 응답 | DELETE 요청 성공 | "/sessions/123" | 200, message | MEDIUM |
| FE-UTIL-066 | api.stream: SSE 스트림 | SSE 스트리밍 | "/game/chat", { ... } | EventSource 생성 | HIGH |
| FE-UTIL-067 | api.stream: 에러 처리 | 스트림 에러 처리 | (mock error) | 적절한 에러 처리 | MEDIUM |

#### 3.1.5 auth.js - 인증 유틸리티

**파일:** `frontend/src/lib/auth.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-080 | getToken: 정상 | localStorage에서 토큰 조회 | - | accessToken 반환 | HIGH |
| FE-UTIL-081 | getToken: 없음 | 토큰 없음 | - | null 반환 | MEDIUM |
| FE-UTIL-082 | setTokens: 토큰 저장 | 토큰 저장 | { accessToken, refreshToken } | localStorage에 저장됨 | HIGH |
| FE-UTIL-083 | clearTokens: 토큰 삭제 | 토큰 삭제 | - | localStorage에서 제거됨 | HIGH |
| FE-UTIL-084 | isAuthenticated: 인증 상태 | 로그인 여부 확인 | (토큰 있음) | true | HIGH |
| FE-UTIL-085 | isAuthenticated: 미인증 | 로그인 안 함 | (토큰 없음) | false | HIGH |
| FE-UTIL-086 | refreshToken: 갱신 성공 | 토큰 갱신 | - | 새 토큰 저장됨 | HIGH |
| FE-UTIL-087 | refreshToken: 갱신 실패 | 갱신 실패 시 로그아웃 | - | 토큰 삭제됨 | HIGH |

#### 3.1.6 genre.js - 장르 유틸리티

**파일:** `frontend/src/lib/genre.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-100 | getGenreLabel: 판타지 | 장르 라벨 조회 | "fantasy" | "판타지" | MEDIUM |
| FE-UTIL-101 | getGenreLabel: 모던 | 장르 라벨 조회 | "modern" | "모던" | MEDIUM |
| FE-UTIL-102 | getGenreLabel: 알 수 없음 | 없는 장르 | "unknown" | "기타" | LOW |
| FE-UTIL-103 | getGenreIcon: 판타지 | 장르 아이콘 | "fantasy" | "⚔️" | LOW |
| FE-UTIL-104 | getGenreIcon: 모던 | 장르 아이콘 | "modern" | "🏙️" | LOW |

#### 3.1.7 status-parser.js - 상태창 파서

**파일:** `frontend/src/lib/status-parser.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-120 | parseStatusBlock: 기본 형식 | 상태창 블록 파싱 | "```status\\nHP: 100\\n```" | { HP: "100" } | HIGH |
| FE-UTIL-121 | parseStatusBlock: 여러 속성 | 여러 줄 파싱 | "```status\\nHP: 100\\nMP: 50\\n```" | { HP: "100", MP: "50" } | HIGH |
| FE-UTIL-122 | parseStatusBlock: max 값 | / 최대값 파싱 | "```status\\nHP: 50/100\\n```" | { HP: "50/100", current: 50, max: 100 } | HIGH |
| FE-UTIL-123 | parseStatusBlock: 목록 형식 | 쉼표로 구분된 목록 | "```status\\nInventory: sword, shield\\n```" | { Inventory: ["sword", "shield"] } | MEDIUM |
| FE-UTIL-124 | parseStatusBlock: 빈 블록 | 빈 상태창 | "```status\\n```" | {} | LOW |

#### 3.1.8 constants.js - 상수

**파일:** `frontend/src/lib/constants.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-140 | API_BASE_URL: 정의 | API URL 상수 | - | "http://localhost:3000" (dev) | LOW |
| FE-UTIL-141 | MAX_TURNS: 정의 | 최대 턴 수 | - | 100 | LOW |

#### 3.1.9 theme.js - 테마 유틸리티

**파일:** `frontend/src/lib/theme.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-UTIL-150 | getTheme: 시스템 테마 | 시스템 테마 감지 | - | "dark" or "light" | LOW |
| FE-UTIL-151 | applyTheme: 다크 모드 | 다크 모드 적용 | "dark" | documentElement class="dark" | LOW |
| FE-UTIL-152 | applyTheme: 라이트 모드 | 라이트 모드 적용 | "light" | documentElement class removed | LOW |

---

### 3.2 커스텀 훅 (Custom Hooks)

#### 3.2.1 useStories - 스토리 훅

**파일:** `frontend/src/hooks/useStories.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-001 | useStories: 목록 조회 | 스토리 목록 로드 | - | stories[], loading: false | HIGH |
| FE-HOOK-002 | useStories: 필터링 | 장르/검색/정렬 | { genre: "fantasy", search: "test" } | 필터링된 stories | HIGH |
| FE-HOOK-003 | useStories: 페이지네이션 | 페이지 변경 | page: 2 | 2페이지 stories | HIGH |
| FE-HOOK-004 | useStories: 로딩 상태 | 로딩 중 표시 | - | loading: true → false | MEDIUM |
| FE-HOOK-005 | useStories: 에러 처리 | 에러 발생 시 | (mock error) | error 객체 | HIGH |

#### 3.2.2 useGameEngine - 게임 엔진 훅

**파일:** `frontend/src/hooks/useGameEngine.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-020 | useGameEngine: 게임 시작 | 새 게임 시작 | storyId | sessionId, systemMessage | HIGH |
| FE-HOOK-021 | useGameEngine: 메시지 전송 | 사용자 입력 전송 | { content: "test", mode: "action" } | userMessage + aiMessage stream | HIGH |
| FE-HOOK-022 | useGameEngine: SSE 스트림 | 실시간 응답 수신 | - | onMessage callback 호출 | HIGH |
| FE-HOOK-023 | useGameEngine: status 업데이트 | 상태창 업데이트 | - | onStatus callback 호출 | HIGH |
| FE-HOOK-024 | useGameEngine: memory 업데이트 | 메모리 업데이트 | - | onMemory callback 호출 | MEDIUM |
| FE-HOOK-025 | useGameEngine: 완료 이벤트 | 게임 턴 완료 | - | onDone callback 호출 | MEDIUM |
| FE-HOOK-026 | useGameEngine: 에러 처리 | Gemini API 에러 | (mock 402 error) | onError callback 호출 | HIGH |
| FE-HOOK-027 | useGameEngine: API key 없음 | API 키 미등록 | (no API key) | 적절한 에러 메시지 | HIGH |

#### 3.2.3 useSession - 세션 훅

**파일:** `frontend/src/hooks/useSession.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-040 | useSession: 조회 | 세션 조회 | sessionId | session object | HIGH |
| FE-HOOK-041 | useSession: 없는 세션 | 404 에러 | invalid sessionId | error: "not found" | HIGH |
| FE-HOOK-042 | useSession: 업데이트 | 세션 수정 | sessionId, { title: "New" } | updated session | MEDIUM |
| FE-HOOK-043 | useSession: 삭제 | 세션 삭제 | sessionId | 성공 메시지 | MEDIUM |

#### 3.2.4 useSessions - 세션 목록 훅

**파일:** `frontend/src/hooks/useSessions.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-050 | useSessions: 목록 조회 | 세션 목록 로드 | - | sessions[] | HIGH |
| FE-HOOK-051 | useSessions: storyId 필터 | 특정 스토리 세션 | { storyId } | 해당 스토리 세션만 | MEDIUM |
| FE-HOOK-052 | useSessions: 로딩 상태 | 로딩 중 | - | loading: true → false | LOW |

#### 3.2.5 useStoryEditor - 스토리 에디터 훅

**파일:** `frontend/src/hooks/useStoryEditor.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-060 | useStoryEditor: 생성 | 새 스토리 생성 | { title: "Test", ... } | storyId | HIGH |
| FE-HOOK-061 | useStoryEditor: 수정 | 스토리 수정 | storyId, { title: "Updated" } | 성공 메시지 | HIGH |
| FE-HOOK-062 | useStoryEditor: 필수 필드 검증 | title 없음 | { description: "..." } | validation error | HIGH |
| FE-HOOK-063 | useStoryEditor: 프리셋 적용 | 프리셋 로드 | presetId | preset data 적용됨 | MEDIUM |
| FE-HOOK-064 | useStoryEditor: 프롬프트 미리보기 | 프롬프트 조합 확인 | storyData | systemPrompt + estimatedTokens | MEDIUM |

#### 3.2.6 useConfig - 설정 훅

**파일:** `frontend/src/hooks/useConfig.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-070 | useConfig: 조회 | 설정 조회 | - | config object | MEDIUM |
| FE-HOOK-071 | useConfig: 수정 (admin) | 관리자 설정 수정 | { temperature: 0.9 } | 성공 (admin만) | MEDIUM |

#### 3.2.7 useMemory - 메모리 훅

**파일:** `frontend/src/hooks/useMemory.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-080 | useMemory: 조회 | 메모리 조회 | sessionId | memory object | MEDIUM |
| FE-HOOK-081 | useMemory: 없는 메모리 | 빈 메모리 | - | null 또는 빈 객체 | LOW |

#### 3.2.8 usePresets - 프리셋 훅

**파일:** `frontend/src/hooks/usePresets.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-090 | usePresets: 목록 조회 | 프리셋 목록 | - | presets[] | LOW |

#### 3.2.9 usePromptPreview - 프롬프트 미리보기 훅

**파일:** `frontend/src/hooks/usePromptPreview.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-100 | usePromptPreview: 조회 | 프롬프트 미리보기 | storyId | { systemPrompt, estimatedTokens } | MEDIUM |

#### 3.2.10 useTestPlayEngine - 테스트 플레이 훅

**파일:** `frontend/src/hooks/useTestPlayEngine.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-110 | useTestPlayEngine: 시작 | 테스트 플레이 시작 | storyData | sessionId | MEDIUM |
| FE-HOOK-111 | useTestPlayEngine: 메시지 전송 | 테스트 중 메시지 | { content: "test" } | userMessage + aiMessage | MEDIUM |

#### 3.2.11 useAdminConfig - 관리자 설정 훅

**파일:** `frontend/src/hooks/useAdminConfig.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-120 | useAdminConfig: 조회 | 설정 조회 (admin) | - | config object | MEDIUM |
| FE-HOOK-121 | useAdminConfig: 수정 | 설정 수정 | { promptConfig: {...} } | 성공 | MEDIUM |

#### 3.2.12 useAdminDashboard - 관리자 대시보드 훅

**파일:** `frontend/src/hooks/useAdminDashboard.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-130 | useAdminDashboard: 조회 | 대시보드 데이터 | - | { overview, recentActivity, popularStories } | MEDIUM |

#### 3.2.13 useAdminStories - 관리자 스토리 훅

**파일:** `frontend/src/hooks/useAdminStories.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-140 | useAdminStories: 목록 조회 | 전체 스토리 목록 | - | stories[] | MEDIUM |
| FE-HOOK-141 | useAdminStories: 삭제 | 스토리 강제 삭제 | storyId | 성공 메시지 | MEDIUM |

#### 3.2.14 useLogs - 로그 훅

**파일:** `frontend/src/hooks/useLogs.js`

| TC_ID | 테스트 케이스 | 설명 | 입력 | 기대 출력 | 우선순위 |
|-------|--------------|------|------|----------|----------|
| FE-HOOK-150 | useLogs: service logs | 서비스 로그 조회 | - | serviceLogs[] | LOW |
| FE-HOOK-151 | useLogs: API logs | API 로그 조회 | - | apiLogs[] | LOW |

---

## 4. 테스트 데이터 준비 (Test Data Preparation)

### 4.1 백엔드 테스트 데이터

```sql
-- 테스트 사용자
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com');

INSERT INTO user_profiles (id, email, display_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User', 'user'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com', 'Admin', 'admin');

-- 테스트 스토리
INSERT INTO stories (id, title, description, owner_uid, is_public) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Test Story 1', 'Public story', '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000002', 'Test Story 2', 'Private story', '00000000-0000-0000-0000-000000000001', false);

-- 테스트 세션
INSERT INTO sessions (id, story_id, user_id, title) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Session 1');
```

### 4.2 프론트엔드 Mock 데이터

```javascript
// frontend/src/test-utils/mock-data.js
export const mockStories = [
  { id: '1', title: 'Test Story', description: 'Test', playCount: 100, isPublic: true },
];

export const mockSession = {
  id: '1',
  storyId: '1',
  title: 'Test Session',
  messages: [
    { role: 'system', content: 'You are...', timestamp: '2026-04-01T00:00:00Z' },
    { role: 'assistant', content: 'Welcome!', timestamp: '2026-04-01T00:00:01Z' },
  ],
};

export const mockConfig = {
  prompt: { systemPrompt: 'You are...', temperature: 0.8 },
  gameplay: { maxTurns: 100 },
};
```

---

## 5. 테스트 실행 계획 (Test Execution Plan)

### 5.1 테스트 우선순위

| 우선순위 | 테스트 수 | 비고 |
|----------|----------|------|
| HIGH | ~80 | 핵심 기능 (인증, 스토리, 게임) |
| MEDIUM | ~50 | 일반 기능 (관리자, 유틸리티) |
| LOW | ~20 | 선택적 기능 |
| **합계** | **~150** | |

### 5.2 실행 순서

1. **백엔드 서비스 테스트** (.crypto.ts → error-handler.ts → prompt-builder.ts)
2. **백엔드 플러그인 테스트** (auth.ts → supabase.ts)
3. **백엔드 라우트 테스트** (auth → stories → sessions → game → admin)
4. **프론트엔드 유틸리티 테스트** (format → markdown → sse → api → auth)
5. **프론트엔드 훅 테스트** (useStories → useGameEngine → useSession)

---

## 6. 관련 문서 (Related Documents)

- `docs/sdlc/phase1-requirements/01-SRS.md` — 기능 요구사항
- `docs/sdlc/phase2-design/02-API-Design-Specification.md` — API 설계서
- `docs/sdlc/phase3-implementation/coding-conventions.md` — 코딩 컨벤션
- `docs/sdlc/phase4-unit-test/02-Test-Results.md` — 테스트 결과서 (다음 작성)
- `docs/sdlc/phase4-unit-test/03-Defect-Report.md` — 결함 보고서 (다음 작성)

---

**문서 관리:** 본 문서는 테스트 실행 결과에 따라 업데이트된다.
