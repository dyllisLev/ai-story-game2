# AI Story Game - 개념 ERD (Conceptual Entity Relationship Diagram)

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Business Analyst

---

## 개요

본 문서는 AI Story Game 플랫폼의 데이터 모델을 개념적 수준에서 정의한다. 엔티티 간의 관계와 핵심 속성을 설명한다.

---

## ERD 다이어그램

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │  user_profiles  │       │     stories     │
│  (Supabase)     │──1:1──│   (owner)       │──1:N──│   (template)    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email           │       │ display_name    │       │ title           │
│ password_hash   │       │ email           │       │ description     │
│ created_at      │       │ api_key_enc     │       │ tags[]          │
│                 │       │ role            │       │ world_setting   │
└─────────────────┘       │ owner_uid (FK)  │       │ story           │
                           └─────────────────┘       │ characters      │
                                                     │ system_rules    │
                                                     │ status_preset_id│
                                                     │ is_public       │
                                                     │ owner_uid (FK)  │
                                                     └─────────────────┘
                                                            │
                                                            │ 1:N
                                                            ▼
                                                   ┌─────────────────┐
                                                   │    sessions     │
                                                   │   (play)        │
                                                   ├─────────────────┤
                                                   │ id (PK)         │
                                                   │ story_id (FK)   │
                                                   │ title           │
                                                   │ messages (JSONB)│
                                                   │ turn_count      │
                                                   │ progress_pct    │
                                                   │ owner_uid (FK)  │
                                                   └─────────────────┘
                                                            │
                                      ┌─────────────────────┼─────────────────────┐
                                      │ 1:N                 │ 1:N                 │
                                      ▼                     ▼                     ▌
                           ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐
                           │ session_memory  │   │    api_logs     │   │ status_presets│
                           ├─────────────────┤   ├─────────────────┤   ├──────────────┤
                           │ id (PK)         │   │ id (PK)         │   │ id (PK)      │
                           │ session_id (FK) │   │ session_id (FK) │   │ title        │
                           │ type (ENUM)     │   │ endpoint        │   │ genre        │
                           │ content (JSONB) │   │ request (JSONB) │   │ attributes   │
                           └─────────────────┘   │ response (JSONB)│   └──────────────┘
                                                 │ duration_ms     │          │
                                                 └─────────────────┘          │
                                                                               │
                                                                               │ 1:N
                                                                               ▼
                                                                      ┌─────────────────┐
                                                                      │    presets      │
                                                                      ├─────────────────┤
                                                                      │ id (PK)         │
                                                                      │ title           │
                                                                      │ genre           │
                                                                      │ status_preset_id│
                                                                      │ world_setting   │
                                                                      └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     config     │       │  service_logs   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ value (JSONB)   │       │ method          │
│                 │       │ path            │
│ prompt_config   │       │ status_code     │
│ gameplay_config │       │ duration_ms     │
│ genre_config    │       │ ip              │
└─────────────────┘       └─────────────────┘
```

---

## 엔티티 상세 정의

### 1. auth.users (Supabase Auth 테이블)
Supabase가 제공하는 인증 테이블로, 사용자 인증 정보를 저장한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 사용자 고유 ID | PK |
| email | TEXT | 이메일 주소 | - |
| password_hash | TEXT | 비밀번호 해시 | - |
| created_at | TIMESTAMPTZ | 계정 생성 일시 | - |

**관계:**
- `user_profiles`와 1:1 관계 (trigger로 자동 생성)

---

### 2. user_profiles (사용자 프로필)
사용자의 추가 정보를 저장한다. auth.users와 1:1 관계다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 사용자 ID (auth.users.id와 동일) | PK, FK |
| display_name | TEXT | 닉네임 | - |
| email | TEXT | 이메일 (auth.users 복제) | - |
| api_key_encrypted | TEXT | Gemini API 키 (AES-256 암호화) | - |
| role | TEXT | 역할 (user, admin) | - |

**관계:**
- `auth.users` → `user_profiles` (1:1)
- `user_profiles` → `stories` (1:N, 작성한 스토리)
- `user_profiles` → `sessions` (1:N, 플레이 세션)

---

### 3. stories (스토리 템플릿)
AI가 생성하는 이야기의 템플릿이다. 세계관, 캐릭터, 시스템 규칙을 포함한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 스토리 고유 ID | PK |
| title | TEXT | 제목 | - |
| description | TEXT | 설명 (목록 표시용) | - |
| tags | TEXT[] | 장르 태그 배열 (무협, 판타지, 로맨스 등) | - |
| icon | TEXT | 아이콘 이모지 (기본: 📖) | - |
| banner_gradient | TEXT | 배너 그라데이션 CSS | - |
| world_setting | TEXT | 세계관 설정 | - |
| story | TEXT | 스토리 개요 및 줄거리 | - |
| characters | TEXT | 등장인물 정보 | - |
| character_name | TEXT | 플레이어 캐릭터 이름 | - |
| character_setting | TEXT | 플레이어 캐릭터 설정 | - |
| user_note | TEXT | 사용자 노트 | - |
| system_rules | TEXT | 시스템 규칙 (게임 룰) | - |
| use_latex | BOOLEAN | LaTeX 수식 사용 여부 | - |
| status_preset_id | UUID | 상태창 프리셋 ID | FK |
| is_public | BOOLEAN | 공개 여부 | - |
| password_hash | TEXT | 비밀번호 해시 (bcrypt) | - |
| play_count | INTEGER | 플레이 수 | - |
| like_count | INTEGER | 좋아요 수 | - |
| badge | TEXT | 뱃지 (new, hot) | - |
| is_featured | BOOLEAN | 추천 스토리 여부 | - |
| owner_name | TEXT | 작성자 이름 (비정규화) | - |
| owner_uid | UUID | 소유자 ID | FK |
| created_at | TIMESTAMPTZ | 생성 일시 | - |
| updated_at | TIMESTAMPTZ | 수정 일시 | - |

**관계:**
- `user_profiles` → `stories` (1:N)
- `status_presets` → `stories` (1:N, optional)
- `stories` → `sessions` (1:N)

**인덱스:**
- idx_sg_stories_public (is_public)
- idx_sg_stories_featured (is_featured)
- idx_sg_stories_play_count (play_count DESC)
- idx_sg_stories_tags (GIN index)

**View:**
- `stories_safe`: password_hash를 제외하고 is_public=true인 행만 노출

---

### 4. sessions (게임 세션)
사용자가 스토리를 플레이하는 단위이다. 대화 기록과 진행 상태를 저장한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 세션 고유 ID | PK |
| story_id | UUID | 스토리 ID | FK |
| title | TEXT | 세션 제목 (사용자 지정) | - |
| preset | JSONB | 프리셋 정보 (복사본) | - |
| messages | JSONB | 대화 기록 배열 | - |
| model | TEXT | Gemini 모델명 | - |
| turn_count | INTEGER | 턴 수 | - |
| progress_pct | REAL | 진행률 (0-100) | - |
| chapter_label | TEXT | 챕터 라벨 | - |
| preview_text | TEXT | 미리보기 텍스트 | - |
| summary | TEXT | 대화 요약 | - |
| summary_up_to_index | INTEGER | 요약 기준 인덱스 | - |
| owner_uid | UUID | 소유자 ID | FK |
| created_at | TIMESTAMPTZ | 생성 일시 | - |
| updated_at | TIMESTAMPTZ | 수정 일시 | - |
| last_played_at | TIMESTAMPTZ | 마지막 플레이 일시 | - |

**messages JSONB 구조:**
```json
[
  {
    "role": "user",
    "content": "[행동] 나는 숲 속으로 걸어갔다",
    "timestamp": "2026-03-31T12:00:00Z"
  },
  {
    "role": "model",
    "content": "숲은 울창했다...",
    "timestamp": "2026-03-31T12:00:05Z",
    "status_window": "HP: 50/100"
  }
]
```

**관계:**
- `stories` → `sessions` (1:N)
- `user_profiles` → `sessions` (1:N)
- `sessions` → `session_memory` (1:N)
- `sessions` → `api_logs` (1:N)

**인덱스:**
- idx_sg_sessions_story (story_id)
- idx_sg_sessions_owner (owner_uid)
- idx_sg_sessions_played (last_played_at DESC)
- idx_sg_sessions_turn_count (turn_count DESC)

---

### 5. session_memory (구조화 메모리)
세션별로 AI가 참조하는 구조화된 정보를 저장한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 메모리 고유 ID | PK |
| session_id | UUID | 세션 ID | FK |
| type | TEXT | 메모리 타입 (ENUM) | - |
| content | JSONB | 메모리 내용 | - |
| updated_at | TIMESTAMPTZ | 수정 일시 | - |

**type ENUM:**
- `short_term`: 단기 메모리 (세션 내 최근 사건)
- `long_term`: 장기 메모리 (전체 이야기 요약)
- `characters`: 캐릭터 정보 (성격, 관계, 상태)
- `goals`: 목표 정보 (플레이어/캐릭터 목표)

**content JSONB 구조 (예: type=characters):**
```json
[
  {
    "name": "검사",
    "personality": "냉철하지만 의리",
    "status": "부상당함",
    "relationship": "동료"
  }
]
```

**관계:**
- `sessions` → `session_memory` (1:N)
- UNIQUE(session_id, type)

---

### 6. status_presets (상태창 프리셋)
장르별 상태창 속성을 정의한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 프리셋 고유 ID | PK |
| title | TEXT | 프리셋 제목 | - |
| genre | TEXT | 장르 | - |
| attributes | JSONB | 속성 배열 | - |
| created_at | TIMESTAMPTZ | 생성 일시 | - |
| updated_at | TIMESTAMPTZ | 수정 일시 | - |

**attributes JSONB 구조:**
```json
[
  {
    "name": "내공",
    "type": "gauge",
    "max_value": 100
  },
  {
    "name": "무공",
    "type": "number",
    "max_value": null
  },
  {
    "name": "문파",
    "type": "text",
    "max_value": null
  }
]
```

**attribute type:**
- `gauge`: 게이지 (HP, MP, 내공 등) - max_value 필수
- `number`: 숫자 (레벨, 경험치 등) - max_value 없음
- `text`: 텍스트 (직업, 문파 등) - max_value 없음

**관계:**
- `status_presets` → `stories` (1:N)
- `status_presets` → `presets` (1:N)

**시드 데이터:**
- 무협 기본 (내공, 체력, 무공, 경공, 문파)
- 판타지 기본 (HP, MP, 레벨, 직업, 칭호)
- 현대 기본 (체력, 정신력, 직업, 평판)

---

### 7. presets (스토리 프리셋)
스토리 생성 시 사용할 수 있는 미리 정의된 설정 템플릿이다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 프리셋 고유 ID | PK |
| title | TEXT | 프리셋 제목 | - |
| is_default | BOOLEAN | 기본 프리셋 여부 | - |
| genre | TEXT | 장르 | - |
| status_preset_id | UUID | 상태창 프리셋 ID | FK |
| world_setting | TEXT | 세계관 설정 | - |
| story | TEXT | 스토리 개요 | - |
| characters | TEXT | 캐릭터 정보 | - |
| character_name | TEXT | 플레이어 캐릭터 이름 | - |
| character_setting | TEXT | 플레이어 캐릭터 설정 | - |
| user_note | TEXT | 사용자 노트 | - |
| system_rules | TEXT | 시스템 규칙 | - |
| use_latex | BOOLEAN | LaTeX 사용 여부 | - |
| created_at | TIMESTAMPTZ | 생성 일시 | - |
| updated_at | TIMESTAMPTZ | 수정 일시 | - |

**관계:**
- `status_presets` → `presets` (1:N)

---

### 8. config (앱 설정)
시스템 전체 설정을 저장한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | TEXT | 설정 키 (PK) | PK |
| value | JSONB | 설정 값 | - |
| created_at | TIMESTAMPTZ | 생성 일시 | - |
| updated_at | TIMESTAMPTZ | 수정 일시 | - |

**설정 키:**
- `prompt_config`: 시스템 프롬프트 설정
  - system_preamble
  - latex_rules
  - narrative_length_template
  - summary_system_instruction
  - summary_request_new
  - summary_request_update
  - game_start_message
  - safety_settings
- `gameplay_config`: 게임플레이 설정
  - default_narrative_length (기본 3문단)
  - narrative_length_min (1)
  - narrative_length_max (10)
  - sliding_window_size (20)
  - max_history (20)
  - message_limit (500)
  - message_warning_threshold (300)
  - summary_trigger_offset (10)
  - summary_max_chars (500)
  - auto_save_interval_ms (300000)
  - max_session_list (50)
- `genre_config`: 장르별 설정

---

### 9. api_logs (Gemini API 로그)
Gemini API 호출 로그를 저장한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 로그 고유 ID | PK |
| session_id | UUID | 세션 ID | FK |
| endpoint | TEXT | API 엔드포인트 | - |
| request_model | TEXT | 요청 모델명 | - |
| request_system_prompt | TEXT | 시스템 프롬프트 | - |
| request_messages | JSONB | 요청 메시지 배열 | - |
| request_body | JSONB | 요청 본문 | - |
| response_text | TEXT | 응답 텍스트 | - |
| response_usage | JSONB | 토큰 사용량 | - |
| response_error | TEXT | 에러 메시지 | - |
| duration_ms | INTEGER | 소요 시간 (ms) | - |
| created_at | TIMESTAMPTZ | 생성 일시 | - |

**관계:**
- `sessions` → `api_logs` (1:N)

**인덱스:**
- idx_sg_api_logs_session (session_id)
- idx_sg_api_logs_created (created_at DESC)

---

### 10. service_logs (HTTP 요청 로그)
백엔드 HTTP 요청 로그를 저장한다.

| 속성 | 타입 | 설명 | PK/FK |
|------|------|------|-------|
| id | UUID | 로그 고유 ID | PK |
| method | TEXT | HTTP 메서드 | - |
| path | TEXT | 요청 경로 | - |
| status_code | INTEGER | 상태 코드 | - |
| duration_ms | INTEGER | 소요 시간 (ms) | - |
| ip | TEXT | 클라이언트 IP | - |
| created_at | TIMESTAMPTZ | 생성 일시 | - |

**인덱스:**
- idx_sg_service_logs_created (created_at DESC)

---

## 관계 요약

### 1:N 관계
| 부모 엔티티 | 자식 엔티티 | 관계명 |
|-------------|-------------|--------|
| user_profiles | stories | 작성한 스토리 |
| user_profiles | sessions | 플레이 세션 |
| stories | sessions | 스토리별 세션 |
| sessions | session_memory | 세션별 메모리 |
| sessions | api_logs | 세션별 API 로그 |
| status_presets | stories | 스토리에 적용된 상태창 |
| status_presets | presets | 프리셋에 적용된 상태창 |

### 1:1 관계
| 엔티티 A | 엔티티 B | 관계명 |
|-----------|-----------|--------|
| auth.users | user_profiles | 사용자 프로필 |

---

## 데이터 무결성 제약 조건

### Primary Keys
- 모든 테이블의 `id` 컬럼 (UUID, gen_random_uuid())

### Foreign Keys
- `stories.owner_uid` → `auth.users(id)` (ON DELETE SET NULL)
- `sessions.story_id` → `stories(id)` (ON DELETE SET NULL)
- `sessions.owner_uid` → `auth.users(id)` (ON DELETE SET NULL)
- `session_memory.session_id` → `sessions(id)` (ON DELETE CASCADE)
- `api_logs.session_id` → `sessions(id)` (ON DELETE SET NULL)
- `stories.status_preset_id` → `status_presets(id)` (ON DELETE SET NULL)
- `presets.status_preset_id` → `status_presets(id)` (ON DELETE SET NULL)
- `user_profiles.id` → `auth.users(id)` (ON DELETE CASCADE)

### Unique Constraints
- `user_profiles.id`: auth.users.id와 1:1
- `session_memory(session_id, type)`: 세션별 메모리 타입 중복 방지

### Check Constraints
- `session_memory.type`: IN ('short_term', 'long_term', 'characters', 'goals')
- `stories.badge`: IN ('new', 'hot')
- `tags`: TEXT[] 배열

### Not Null Constraints
- `stories.title`, `sessions.title`
- `user_profiles.display_name`

---

## RLS (Row Level Security) 정책

### user_profiles
- SELECT/UPDATE: `auth.uid() = id` (본인만)
- INSERT: trigger로 자동 생성

### stories
- SELECT (anon/authenticated): `is_public = true`
- INSERT: 인증된 사용자만
- UPDATE/DELETE: `owner_uid = auth.uid()` (본인만)
- admin: 전체 접근 가능

### sessions
- SELECT: `owner_uid = auth.uid()` (본인만)
- INSERT: 인증된 사용자만
- UPDATE/DELETE: `owner_uid = auth.uid()` (본인만)

### session_memory
- SELECT/INSERT/UPDATE/DELETE: 세션 소유자 간접 접근

---

## 성능 최적화

### 인덱스 전략
1. **stories**: is_public, is_featured, play_count, tags (GIN)
2. **sessions**: story_id, owner_uid, last_played_at, turn_count
3. **session_memory**: session_id
4. **api_logs**: session_id, created_at
5. **service_logs**: created_at

### 뷰 활용
- **stories_safe VIEW**: password_hash 제외, is_public 필터링
- **집계 쿼리**: admin/dashboard에서 복잡한 집계 수행

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-03-31 | Business Analyst | 최초 작성 |
