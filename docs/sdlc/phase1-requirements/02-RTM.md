# AI Story Game - 요구사항 추적 매트릭스 (RTM)
**Requirements Traceability Matrix**

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Business Analyst

---

## 개요

본 문서는 요구사항 정의서(SRS)에 정의된 요구사항을 실제 구현 요소(기능/모듈/컴포넌트/테이블)와 매핑한다. 각 요구사항이 어디서 구현되는지 추적 가능하도록 한다.

---

## 매트릭스 구조

| 요구사항 ID | 요구사항 명 | 우선순위 | 프론트엔드 | 백엔드 | DB | 테스트 |
|-------------|-------------|----------|-----------|---------|-----|--------|
| AUTH-001 | 회원가입 | HIGH | Signup.tsx, lib/auth.ts | routes/auth.ts | auth.users, user_profiles | E2E-Auth-001 |
| AUTH-002 | 로그인 | HIGH | Login.tsx, lib/auth.ts | routes/auth.ts | auth.users, user_profiles | E2E-Auth-002 |
| AUTH-003 | 로그아웃 | MEDIUM | Header.tsx, lib/auth.ts | routes/auth.ts | - | E2E-Auth-003 |
| AUTH-004 | 프로필 조회 | MEDIUM | Settings.tsx | routes/me.ts | user_profiles | E2E-Auth-004 |
| AUTH-005 | API 키 관리 | HIGH | ApiKeySettings.tsx | routes/me.ts | user_profiles.api_key_encrypted | E2E-Auth-005 |
| AUTH-006 | 세션 새로고침 | MEDIUM | lib/auth.ts | routes/auth.ts | - | E2E-Auth-006 |
| STORY-BROWSE-001 | 스토리 목록 조회 | HIGH | Home.tsx, StoryGrid.tsx | routes/stories/list.ts | stories, stories_safe VIEW | E2E-Home-001 |
| STORY-BROWSE-002 | 장르 필터 | HIGH | FilterBar.tsx | routes/stories/list.ts | stories.tags (TEXT[]) | E2E-Home-002 |
| STORY-BROWSE-003 | 검색 | MEDIUM | FilterBar.tsx | routes/stories/list.ts | stories.title, description | E2E-Home-003 |
| STORY-BROWSE-004 | 정렬 | MEDIUM | FilterBar.tsx | routes/stories/list.ts | - | E2E-Home-004 |
| STORY-BROWSE-005 | 추천 스토리 | MEDIUM | FeaturedSection.tsx | routes/stories/list.ts | stories.is_featured | E2E-Home-005 |
| STORY-BROWSE-006 | 이어하기 | MEDIUM | ContinueSection.tsx | routes/sessions/list.ts | sessions | E2E-Home-006 |
| GAME-001 | 새 세션 시작 | HIGH | Play.tsx, useGameEngine.ts | routes/game/start.ts | sessions, stories | E2E-Play-001 |
| GAME-002 | 대화 전송 | HIGH | InputArea.tsx, useGameEngine.ts | routes/game/chat.ts | sessions.messages | E2E-Play-002 |
| GAME-003 | SSE 스트리밍 | HIGH | lib/sse.ts, StoryContent.tsx | routes/game/chat.ts | - | E2E-Play-003 |
| GAME-004 | 메시지 모드 | MEDIUM | InputArea.tsx, SuggestionChips.tsx | - | - | E2E-Play-004 |
| GAME-005 | 상태창 파싱 | MEDIUM | StoryContent.tsx, lib/status-parser.ts | - | - | E2E-Play-005 |
| GAME-006 | 자동 저장 | HIGH | useGameEngine.ts | routes/game/chat.ts | sessions | E2E-Play-006 |
| GAME-007 | 세션 조회 | HIGH | SessionPanel.tsx, useSessions.ts | routes/sessions/list.ts | sessions | E2E-Play-007 |
| GAME-008 | 세션 삭제 | MEDIUM | SessionPanel.tsx | routes/sessions/crud.ts | sessions (CASCADE) | E2E-Play-008 |
| GAME-009 | 슬라이딩 윈도우 | MEDIUM | useGameEngine.ts | services/session-manager.ts | - | E2E-Play-009 |
| GAME-010 | LaTeX 효과음 | LOW | StoryContent.tsx | - | - | E2E-Play-010 |
| MEMORY-001 | 단기 메모리 | MEDIUM | InfoPanel.tsx (MemoryTab) | services/memory-handler.ts | session_memory (type=short_term) | E2E-Play-011 |
| MEMORY-002 | 장기 메모리 | MEDIUM | InfoPanel.tsx (MemoryTab) | services/memory-handler.ts | session_memory (type=long_term) | E2E-Play-012 |
| MEMORY-003 | 캐릭터 메모리 | MEDIUM | InfoPanel.tsx (MemoryTab) | services/memory-handler.ts | session_memory (type=characters) | E2E-Play-013 |
| MEMORY-004 | 목표 메모리 | LOW | InfoPanel.tsx (MemoryTab) | services/memory-handler.ts | session_memory (type=goals) | E2E-Play-014 |
| EDITOR-001 | 스토리 생성 | HIGH | Editor.tsx, StorySection.tsx | routes/stories/crud.ts | stories | E2E-Editor-001 |
| EDITOR-002 | 스토리 수정 | HIGH | Editor.tsx, StorySection.tsx | routes/stories/crud.ts | stories | E2E-Editor-002 |
| EDITOR-003 | 스토리 삭제 | MEDIUM | Editor.tsx, ActionBar.tsx | routes/stories/crud.ts | stories | E2E-Editor-003 |
| EDITOR-004 | 공개 설정 | MEDIUM | Editor.tsx, PublishSettings.tsx | routes/stories/crud.ts | stories.is_public, password_hash | E2E-Editor-004 |
| EDITOR-005 | 메타데이터 | MEDIUM | Editor.tsx, BasicSettings.tsx | routes/stories/crud.ts | stories.description, tags, icon | E2E-Editor-005 |
| EDITOR-006 | 상태창 설정 | MEDIUM | Editor.tsx, StatusSettings.tsx | routes/stories/crud.ts | stories.status_preset_id | E2E-Editor-006 |
| EDITOR-007 | 프리셋 적용 | LOW | Editor.tsx, EditorSidebar.tsx | routes/stories/presets.ts | presets | E2E-Editor-007 |
| EDITOR-008 | 프롬프트 미리보기 | MEDIUM | Editor.tsx, PromptPreview.tsx | routes/game/test-prompt.ts | - | E2E-Editor-008 |
| EDITOR-009 | 테스트 플레이 | MEDIUM | Editor.tsx, TestPlayModal.tsx | - | - | E2E-Editor-009 |
| ADMIN-001 | 대시보드 | HIGH | Admin.tsx, Dashboard.tsx | routes/admin/dashboard.ts | - (집계 쿼리) | E2E-Admin-001 |
| ADMIN-002 | 스토리 관리 | MEDIUM | Admin.tsx, StoryManagement.tsx | routes/admin/stories.ts | stories | E2E-Admin-002 |
| ADMIN-003 | 사용자 관리 | MEDIUM | Admin.tsx, UserManagement.tsx | routes/admin/users.ts | user_profiles | E2E-Admin-003 |
| ADMIN-004 | 서비스 로그 | LOW | Admin.tsx, ServiceLogs.tsx | routes/admin/service-logs.ts | service_logs | E2E-Admin-004 |
| ADMIN-005 | API 로그 | MEDIUM | Admin.tsx, ApiLogs.tsx | routes/admin/api-logs.ts | api_logs | E2E-Admin-005 |
| ADMIN-006 | 설정 수정 | MEDIUM | Admin.tsx, GameParams.tsx | routes/config.ts | config | E2E-Admin-006 |
| ADMIN-007 | 상태창 프리셋 | LOW | Admin.tsx, StatusPresets.tsx | routes/admin/status-presets.ts | status_presets | E2E-Admin-007 |
| ADMIN-008 | 위험 구역 | LOW | Admin.tsx, DangerZone.tsx | routes/admin/danger-zone.ts | - (TRUNCATE) | E2E-Admin-008 |

---

## 비기능 요구사항 매핑

| NFR ID | 요구사항 명 | 관련 기능/모듈 | 측정 방법 |
|--------|-------------|----------------|-----------|
| NFR-PERF-001 | API 응답 시간 < 500ms | 모든 API 라우트 | api_logs.duration_ms 집계 |
| NFR-PERF-002 | SSE 첫 응답 < 2초 | game/start, game/chat | 로그 타임스탬프 비교 |
| NFR-PERF-003 | 페이지 로드 < 3초 | 모든 페이지 | Lighthouse FCP 측정 |
| NFR-PERF-004 | DB 쿼리 < 100ms | 모든 DB 쿼리 | EXPLAIN ANALYZE |
| NFR-SEC-001 | API 키 암호화 | routes/me.ts, services/crypto.ts | user_profiles.api_key_encrypted 확인 |
| NFR-SEC-002 | RLS | user_profiles, stories 테이블 | RLS 정책 테스트 |
| NFR-SEC-003 | Basic Auth (Admin) | plugins/auth.ts (admin) | Admin 페이지 접근 테스트 |
| NFR-SEC-004 | SQL Injection 방지 | 모든 DB 쿼리 | Prepared statements 사용 확인 |
| NFR-SEC-005 | XSS 방지 | 모든 React 컴포넌트 | DOMPurify 사용 확인 |

---

## 기능별 구현 요소 매핑

### 1. 인증 (Authentication)
| 요구사항 | 프론트엔드 컴포넌트 | 백엔드 라우트 | DB 테이블 |
|----------|-------------------|---------------|-----------|
| 회원가입 | Signup.tsx | POST /api/auth/signup | auth.users, user_profiles |
| 로그인 | Login.tsx | POST /api/auth/login | auth.users |
| 로그아웃 | Header.tsx (Logout 버튼) | POST /api/auth/logout | - |
| 프로필 관리 | Settings.tsx, ApiKeySettings.tsx | GET/PUT /api/me, PUT /api/me/apikey | user_profiles |

### 2. 스토리 탐색 (Story Browsing)
| 요구사항 | 프론트엔드 컴포넌트 | 백엔드 라우트 | DB 테이블 |
|----------|-------------------|---------------|-----------|
| 스토리 목록 | Home.tsx, StoryGrid.tsx, StoryCard.tsx | GET /api/stories | stories_safe VIEW |
| 필터/검색/정렬 | FilterBar.tsx | GET /api/stories (query params) | stories.tags, title, description |
| 추천 스토리 | FeaturedSection.tsx | GET /api/stories?featured=true | stories.is_featured |
| 이어하기 | ContinueSection.tsx | GET /api/sessions | sessions |

### 3. 게임 플레이 (Game Play)
| 요구사항 | 프론트엔드 컴포넌트 | 백엔드 라우트 | DB 테이블 |
|----------|-------------------|---------------|-----------|
| 세션 시작 | Play.tsx | POST /api/game/start | sessions, stories |
| 대화 | InputArea.tsx, StoryContent.tsx | POST /api/game/chat | sessions.messages (JSONB) |
| SSE 스트리밍 | lib/sse.ts | reply.raw (SSE) | - |
| 메시지 모드 | InputArea.tsx, SuggestionChips.tsx | - | - |
| 상태창 파싱 | lib/status-parser.ts | - | - |
| 세션 관리 | SessionPanel.tsx, SessionItem.tsx | GET/DELETE /api/sessions | sessions |
| 메모리 | InfoPanel.tsx (MemoryTab) | GET /api/sessions/:id/memory | session_memory |

### 4. 스토리 에디터 (Story Editor)
| 요구사항 | 프론트엔드 컴포넌트 | 백엔드 라우트 | DB 테이블 |
|----------|-------------------|---------------|-----------|
| 스토리 CRUD | Editor.tsx, EditorSidebar.tsx, ActionBar.tsx | POST/PUT/DELETE /api/stories | stories |
| 세션 설정 | StorySection.tsx, CharacterSection.tsx, WorldSetting.tsx | - | stories.story, characters, world_setting |
| 출력 설정 | OutputSettings.tsx, StatusSettings.tsx, SystemRules.tsx | - | stories.system_rules, status_preset_id |
| 메타데이터 | BasicSettings.tsx | - | stories.description, tags, icon |
| 공개 설정 | PublishSettings.tsx | - | stories.is_public, password_hash |
| 프리셋 | EditorSidebar.tsx (Preset 선택) | GET /api/presets | presets |
| 프롬프트 미리보기 | PromptPreview.tsx, usePromptPreview.ts | POST /api/game/test-prompt | - |
| 테스트 플레이 | TestPlayModal.tsx, useTestPlayEngine.ts | - | - |

### 5. 관리자 (Admin)
| 요구사항 | 프론트엔드 컴포넌트 | 백엔드 라우트 | DB 테이블 |
|----------|-------------------|---------------|-----------|
| 대시보드 | Dashboard.tsx | GET /api/admin/dashboard | - (집계) |
| 스토리 관리 | StoryManagement.tsx | GET/DELETE /api/admin/stories | stories |
| 사용자 관리 | UserManagement.tsx | GET/PUT /api/admin/users | user_profiles |
| 서비스 로그 | ServiceLogs.tsx | GET/DELETE /api/admin/service-logs | service_logs |
| API 로그 | ApiLogs.tsx, ApiLogDetail.tsx | GET/DELETE /api/admin/api-logs | api_logs |
| 설정 수정 | GameParams.tsx, PromptSettings.tsx, SystemSection.tsx | PUT /api/config | config |
| 상태창 프리셋 | StatusPresets.tsx, PresetEditModal.tsx | CRUD /api/admin/status-presets | status_presets |
| 위험 구역 | DangerZone.tsx | DELETE /api/admin/danger-zone/* | - |

---

## 테스트 케이스 매핑

E2E 테스트케이스는 [Google Sheets](https://docs.google.com/spreadsheets/d/1vXwfGaAxOy4iE8Yxz1oiN4_osW77tmzkkB7E2U8ze0c/edit)에서 관리한다.

| 탭 | 테스트케이스 수 | 주요 커버리지 |
|----|----------------|---------------|
| Home | 32 | 스토리 목록, 필터, 검색, 추천 |
| Play | 60 | 세션 시작, 대화, 상태창, 메모리 |
| Editor | 73 | 스토리 CRUD, 프리셋, 프롬프트 미리보기, 테스트 플레이 |
| Admin | 70 | 대시보드, 로그, 설정, 프리셋, 위험 구역 |
| **합계** | **235** | 전체 기능 커버리지 |

---

## 추적 가능성 검증

### 요구사항 → 구현 추적

✅ **모든 기능 요구사항이 최소 하나 이상의 구현 요소에 매핑됨**
- AUTH: 6개 요구사항 → 4개 페이지 + 2개 라우트
- STORY-BROWSE: 6개 요구사항 → 2개 페이지 + 1개 라우트
- GAME: 10개 요구사항 → 1개 페이지 + 2개 라우트 + 1개 서비스
- MEMORY: 4개 요구사항 → 1개 컴포넌트 + 1개 서비스 + 1개 테이블
- EDITOR: 9개 요구사항 → 1개 페이지 + 3개 라우트
- ADMIN: 8개 요구사항 → 1개 페이지 + 8개 라우트

✅ **모든 비기능 요구사항이 측정 가능한 지표와 연결됨**

✅ **모든 테스트케이스가 요구사항 ID와 연결됨**

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-03-31 | Business Analyst | 최초 작성 |
