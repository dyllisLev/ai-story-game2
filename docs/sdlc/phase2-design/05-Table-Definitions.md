# AI Story Game - 테이블 정의서 (Logical/Physical ERD)

> **버전:** 1.0
> **작성일:** 2026-04-01
> **작성자:** Software Architect
> **상태:** 최종

---

## 목차

1. [개요](#개요)
2. [논리 ERD (Logical ERD)](#논리-erd-logical-erd)
3. [물리 ERD (Physical ERD)](#물리-erd-physical-erd)
4. [테이블 상세 정의](#테이블-상세-정의)
5. [인덱스 전략](#인덱스-전략)
6. [RLS 정책](#rls-정책)
7. [데이터 무결성](#데이터-무결성)

---

## 개요

본 문서는 AI Story Game 플랫폼의 데이터베이스 스키마를 논리적/물리적 수준에서 정의한다. Phase 1 개념 ERD를 기반으로 현행 스키마(`story_game`)와 TO-BE 개선사항(`ai_story_game`)을 모두 반영한다.

### 스키마 전략

- **현행 스키마:** `story_game` (Self-hosted Supabase)
- **TO-BE 스키마:** `ai_story_game` (Cloud Supabase)
- **공통 테이블:** Supabase Auth `auth.users`

---

## 논리 ERD (Logical ERD)

논리 ERD는 엔티티 간의 관계와 카디널리티를 정의한다.

### ERD 다이어그램

```
┌──────────────────────┐
│    auth.users        │
│   (Supabase Auth)    │
├──────────────────────┤
│ id (PK)              │
│ email                │
│ password_hash        │
│ created_at           │
└──────────────────────┘
           │ 1:1
           ▼
┌──────────────────────┐
│   user_profiles      │
├──────────────────────┤
│ id (PK, FK)          │◄────────────┐
│ display_name         │             │
│ email                │             │
│ api_key_encrypted    │             │
│ role                 │             │
└──────────────────────┘             │
           │                          │
           │ 1:N                      │ 1:N
           ▼                          │
┌──────────────────────┐             │
│      stories         │             │
├──────────────────────┤             │
│ id (PK)              │             │
│ title                │             │
│ description          │             │
│ tags[]               │             │
│ world_setting        │             │
│ story                │             │
│ characters           │             │
│ character_name       │             │
│ character_setting    │             │
│ system_rules         │             │
│ use_latex            │             │
│ status_preset_id (FK)├────────────┤
│ is_public            │             │
│ password_hash        │             │
│ play_count           │             │
│ like_count           │             │
│ badge                │             │
│ is_featured          │             │
│ owner_name           │             │
│ owner_uid (FK)       │             │
│ created_at           │             │
│ updated_at           │             │
└──────────────────────┘             │
           │                          │
           │ 1:N                      │
           ▼                          │
┌──────────────────────┐             │
│     sessions         │             │
├──────────────────────┤             │
│ id (PK)              │             │
│ story_id (FK)        │             │
│ title                │             │
│ preset (JSONB)       │             │
│ messages (JSONB)     │             │
│ model                │             │
│ turn_count           │             │
│ progress_pct         │             │
│ chapter_label        │             │
│ preview_text         │             │
│ summary              │             │
│ summary_up_to_index  │             │
│ owner_uid (FK)       │             │
│ created_at           │             │
│ updated_at           │             │
│ last_played_at       │             │
└──────────────────────┘             │
           │                          │
           ├──────────────┬──────────┘
           │ 1:N          │ 1:N
           ▼              ▼
┌──────────────────────┐ ┌──────────────────────┐
│  session_memory      │ │     api_logs         │
├──────────────────────┤ ├──────────────────────┤
│ id (PK)              │ │ id (PK)              │
│ session_id (FK)      │ │ session_id (FK)      │
│ type (ENUM)          │ │ endpoint             │
│ content (JSONB)      │ │ request_model        │
│ updated_at           │ │ request_system_prompt│
└──────────────────────┘ │ request_messages     │
                        │ request_body         │
                        │ response_text        │
                        │ response_usage       │
                        │ response_error       │
                        │ duration_ms          │
                        │ created_at           │
                        └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│   status_presets     │       │      presets         │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │──1:N──│ id (PK)              │
│ title                │       │ title                │
│ genre                │       │ is_default           │
│ attributes (JSONB)   │       │ genre                │
│ created_at           │       │ status_preset_id (FK)│
│ updated_at           │       │ world_setting        │
└──────────────────────┘       │ story                │
                               │ characters           │
                               │ character_name       │
                               │ character_setting    │
                               │ system_rules         │
                               │ use_latex            │
                               │ created_at           │
                               │ updated_at           │
                               └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│       config         │       │   service_logs       │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │
│ value (JSONB)        │       │ method               │
│ created_at           │       │ path                 │
│ updated_at           │       │ status_code          │
└──────────────────────┘       │ duration_ms          │
                               │ ip                   │
                               │ created_at           │
                               └──────────────────────┘
```

### 관계 요약

| 관계 | 부모 | 자식 | 카디널리티 | 설명 |
|------|------|------|-----------|------|
| R1 | auth.users | user_profiles | 1:1 | 사용자 인증 → 프로필 |
| R2 | user_profiles | stories | 1:N | 사용자 → 작성한 스토리 |
| R3 | user_profiles | sessions | 1:N | 사용자 → 플레이 세션 |
| R4 | stories | sessions | 1:N | 스토리 → 플레이 세션 |
| R5 | sessions | session_memory | 1:N | 세션 → 메모리 |
| R6 | sessions | api_logs | 1:N | 세션 → API 로그 |
| R7 | status_presets | stories | 1:N | 상태창 프리셋 → 스토리 |
| R8 | status_presets | presets | 1:N | 상태창 프리셋 → 프리셋 |

---

## 물리 ERD (Physical ERD)

물리 ERD는 실제 테이블 구조, 데이터 타입, 제약조건을 정의한다.

### 스키마 선택

```sql
-- Self-hosted Supabase
SET search_path TO story_game, public;

-- Cloud Supabase
SET search_path TO ai_story_game, public;
```

### 테이블 생성 순서

1. **user_profiles** (auth.users 의존)
2. **status_presets** (독립)
3. **stories** (user_profiles, status_presets 의존)
4. **sessions** (stories, user_profiles 의존)
5. **session_memory** (sessions 의존)
6. **api_logs** (sessions 의존)
7. **presets** (status_presets 의존)
8. **config** (독립)
9. **service_logs** (독립)

---

## 테이블 상세 정의

### 1. auth.users (Supabase Auth)

**설명:** Supabase가 제공하는 인증 테이블 (수정 불가)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|-----------|---------|------|
| id | UUID | PK NOT NULL | 사용자 고유 ID |
| email | TEXT | NOT NULL UNIQUE | 이메일 주소 |
| encrypted_password | TEXT | NOT NULL | 암호화된 비밀번호 |
| email_confirmed_at | TIMESTAMPTZ | NULL | 이메일 확인 일시 |
| invited_at | TIMESTAMPTZ | NULL | 초대 일시 |
| confirmation_token | TEXT | NULL | 확인 토큰 |
| recovery_token | TEXT | NULL | 복구 토큰 |
| email_change_token_new | TEXT | NULL | 이메일 변경 토큰 |
| email_change | TEXT | NULL | 새 이메일 |
| last_sign_in_at | TIMESTAMPTZ | NULL | 마지막 로그인 일시 |
| raw_app_meta_data | JSONB | NULL | 앱 메타데이터 |
| raw_user_meta_data | JSONB | NULL | 사용자 메타데이터 |
| is_super_admin | BOOLEAN | DEFAULT FALSE | 슈퍼 관리자 여부 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 |

**인덱스:**
- `auth.users_pkey` (PRIMARY KEY, id)
- `auth.users_email_key` (UNIQUE, email)

---

### 2. user_profiles

**설명:** 사용자 추가 정보 (auth.users와 1:1)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK, FK NOT NULL | 사용자 ID (auth.users.id) | - |
| display_name | TEXT | NOT NULL | 닉네임 | - |
| email | TEXT | NOT NULL | 이메일 (auth.users 복제) | - |
| api_key_encrypted | TEXT | NULL | Gemini API 키 (AES-256) | NULL |
| role | TEXT | NOT NULL CHECK (role IN ('user', 'admin')) | 역할 | 'user' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |

**외래 키:**
```sql
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
```

**인덱스:**
- `user_profiles_pkey` (PRIMARY KEY, id)
- `idx_user_profiles_role` (role)

**RLS 정책:**
```sql
-- 본인만 조회/수정 가능
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 관리자 전체 접근
CREATE POLICY "Admins can full access user_profiles"
  ON user_profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

### 3. stories

**설명:** 스토리 템플릿 (AI가 생성하는 이야기의 기반)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 스토리 고유 ID | gen_random_uuid() |
| title | TEXT | NOT NULL | 제목 | - |
| description | TEXT | NULL | 설명 (목록 표시용) | NULL |
| tags | TEXT[] | NOT NULL DEFAULT '{}' | 장르 태그 배열 | '{}' |
| icon | TEXT | NULL | 아이콘 이모지 | '📖' |
| banner_gradient | TEXT | NULL | 배너 그라데이션 CSS | NULL |
| world_setting | TEXT | NOT NULL DEFAULT '' | 세계관 설정 | '' |
| story | TEXT | NOT NULL DEFAULT '' | 스토리 개요 및 줄거리 | '' |
| characters | TEXT | NOT NULL DEFAULT '' | 등장인물 정보 | '' |
| character_name | TEXT | NULL | 플레이어 캐릭터 이름 | NULL |
| character_setting | TEXT | NULL | 플레이어 캐릭터 설정 | NULL |
| user_note | TEXT | NULL | 사용자 노트 | NULL |
| system_rules | TEXT | NOT NULL DEFAULT '' | 시스템 규칙 (게임 룰) | '' |
| use_latex | BOOLEAN | NOT NULL DEFAULT FALSE | LaTeX 수식 사용 여부 | FALSE |
| status_preset_id | UUID | FK NULL | 상태창 프리셋 ID | NULL |
| is_public | BOOLEAN | NOT NULL DEFAULT FALSE | 공개 여부 | FALSE |
| password_hash | TEXT | NULL | 비밀번호 해시 (bcrypt) | NULL |
| play_count | INTEGER | NOT NULL DEFAULT 0 | 플레이 수 | 0 |
| like_count | INTEGER | NOT NULL DEFAULT 0 | 좋아요 수 | 0 |
| badge | TEXT | NULL CHECK (badge IN ('new', 'hot')) | 뱃지 | NULL |
| is_featured | BOOLEAN | NOT NULL DEFAULT FALSE | 추천 스토리 여부 | FALSE |
| owner_name | TEXT | NULL | 작성자 이름 (비정규화) | NULL |
| owner_uid | UUID | FK NOT NULL | 소유자 ID | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |

**외래 키:**
```sql
FOREIGN KEY (owner_uid) REFERENCES auth.users(id) ON DELETE SET NULL
FOREIGN KEY (status_preset_id) REFERENCES status_presets(id) ON DELETE SET NULL
```

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_stories_owner_uid ON stories(owner_uid);
CREATE INDEX idx_stories_status_preset_id ON stories(status_preset_id) WHERE status_preset_id IS NOT NULL;

-- 검색/필터 인덱스
CREATE INDEX idx_stories_public ON stories(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_stories_featured ON stories(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_badge ON stories(badge) WHERE badge IS NOT NULL;

-- 정렬 인덱스
CREATE INDEX idx_stories_play_count ON stories(play_count DESC);
CREATE INDEX idx_stories_like_count ON stories(like_count DESC);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);

-- 복합 인덱스 (공개 + 추천 + 플레이수)
CREATE INDEX idx_stories_public_featured_play ON stories(is_public DESC, is_featured DESC, play_count DESC)
  WHERE is_public = TRUE;
```

**RLS 정책:**
```sql
-- 비로그인: 공개 스토리만 조회
CREATE POLICY "Anon can view public stories"
  ON stories FOR SELECT
  TO anon
  USING (is_public = TRUE);

-- 로그인 사용자: 공개 스토리 + 자신의 스토리
CREATE POLICY "Users can view public or own stories"
  ON stories FOR SELECT
  TO authenticated
  USING (is_public = TRUE OR owner_uid = auth.uid());

-- 스토리 생성
CREATE POLICY "Users can create own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (owner_uid = auth.uid());

-- 스토리 수정 (본인만)
CREATE POLICY "Users can update own stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (owner_uid = auth.uid())
  WITH CHECK (owner_uid = auth.uid());

-- 스토리 삭제 (본인만)
CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE
  TO authenticated
  USING (owner_uid = auth.uid());

-- 관리자 전체 접근
CREATE POLICY "Admins can full access stories"
  ON stories FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

### 4. sessions

**설명:** 게임 세션 (사용자가 스토리를 플레이하는 단위)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 세션 고유 ID | gen_random_uuid() |
| story_id | UUID | FK NOT NULL | 스토리 ID | - |
| title | TEXT | NOT NULL | 세션 제목 (사용자 지정) | - |
| preset | JSONB | NOT NULL DEFAULT '{}' | 프리셋 정보 (복사본) | '{}' |
| messages | JSONB | NOT NULL DEFAULT '[]' | 대화 기록 배열 | '[]' |
| model | TEXT | NULL | Gemini 모델명 | NULL |
| turn_count | INTEGER | NOT NULL DEFAULT 0 | 턴 수 | 0 |
| progress_pct | REAL | NULL | 진행률 (0-100) | NULL |
| chapter_label | TEXT | NULL | 챕터 라벨 | NULL |
| preview_text | TEXT | NULL | 미리보기 텍스트 | NULL |
| summary | TEXT | NULL | 대화 요약 | NULL |
| summary_up_to_index | INTEGER | NULL | 요약 기준 인덱스 | NULL |
| owner_uid | UUID | FK NOT NULL | 소유자 ID | - |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |
| last_played_at | TIMESTAMPTZ | DEFAULT NOW() | 마지막 플레이 일시 | NOW() |

**외래 키:**
```sql
FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE SET NULL
FOREIGN KEY (owner_uid) REFERENCES auth.users(id) ON DELETE CASCADE
```

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
    "status_window": "HP: 50/100\nMP: 30/50"
  }
]
```

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_sessions_story_id ON sessions(story_id);
CREATE INDEX idx_sessions_owner_uid ON sessions(owner_uid);

-- 정렬 인덱스
CREATE INDEX idx_sessions_last_played_at ON sessions(last_played_at DESC);
CREATE INDEX idx_sessions_turn_count ON sessions(turn_count DESC);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- 복합 인덱스 (사용자별 최근 플레이)
CREATE INDEX idx_sessions_owner_played ON sessions(owner_uid, last_played_at DESC);
CREATE INDEX idx_sessions_story_owner ON sessions(story_id, owner_uid);
```

**RLS 정책:**
```sql
-- 본인 세션만 접근 가능
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (owner_uid = auth.uid());

CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (owner_uid = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (owner_uid = auth.uid())
  WITH CHECK (owner_uid = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (owner_uid = auth.uid());

-- 관리자 전체 접근
CREATE POLICY "Admins can full access sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

### 5. session_memory

**설명:** 구조화 메모리 (세션별 AI 참조 정보)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 메모리 고유 ID | gen_random_uuid() |
| session_id | UUID | FK NOT NULL | 세션 ID | - |
| type | TEXT | NOT NULL CHECK (type IN ('short_term', 'long_term', 'characters', 'goals')) | 메모리 타입 | - |
| content | JSONB | NOT NULL DEFAULT '[]' | 메모리 내용 | '[]' |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |

**외래 키:**
```sql
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
```

**Unique 제약조건:**
```sql
UNIQUE(session_id, type)
```

**content JSONB 구조 (type=characters 예시):**
```json
[
  {
    "name": "검사",
    "personality": "냉철하지만 의리",
    "status": "부상당함",
    "relationship": "동료",
    "last_updated": "2026-03-31T12:00:00Z"
  }
]
```

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_session_memory_session_id ON session_memory(session_id);
CREATE INDEX idx_session_memory_type ON session_memory(type);

-- 복합 인덱스
CREATE INDEX idx_session_memory_session_type ON session_memory(session_id, type);
```

**RLS 정책:**
```sql
-- 세션 소유자 간접 접근
CREATE POLICY "Users can view memory for own sessions"
  ON session_memory FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_memory.session_id
    AND sessions.owner_uid = auth.uid()
  ));

CREATE POLICY "Users can insert memory for own sessions"
  ON session_memory FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_memory.session_id
    AND sessions.owner_uid = auth.uid()
  ));

CREATE POLICY "Users can update memory for own sessions"
  ON session_memory FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_memory.session_id
    AND sessions.owner_uid = auth.uid()
  ));

CREATE POLICY "Users can delete memory for own sessions"
  ON session_memory FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_memory.session_id
    AND sessions.owner_uid = auth.uid()
  ));

-- 관리자 전체 접근
CREATE POLICY "Admins can full access session_memory"
  ON session_memory FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

### 6. status_presets

**설명:** 상태창 프리셋 (장르별 속성 정의)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 프리셋 고유 ID | gen_random_uuid() |
| title | TEXT | NOT NULL UNIQUE | 프리셋 제목 | - |
| genre | TEXT | NOT NULL | 장르 | - |
| attributes | JSONB | NOT NULL DEFAULT '[]' | 속성 배열 | '[]' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |

**attributes JSONB 구조:**
```json
[
  {
    "name": "내공",
    "type": "gauge",
    "max_value": 100,
    "color": "#3b82f6",
    "icon": "⚡"
  },
  {
    "name": "무공",
    "type": "number",
    "max_value": null,
    "color": "#ef4444",
    "icon": "⚔️"
  },
  {
    "name": "문파",
    "type": "text",
    "max_value": null,
    "color": "#10b981",
    "icon": "🏯"
  }
]
```

**attribute type:**
- `gauge`: 게이지 (HP, MP, 내공 등) - max_value 필수
- `number`: 숫자 (레벨, 경험치 등) - max_value 없음
- `text`: 텍스트 (직업, 문파 등) - max_value 없음

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_status_presets_genre ON status_presets(genre);
```

**시드 데이터:**
```sql
INSERT INTO status_presets (title, genre, attributes) VALUES
  ('무협 기본', '무협', '[
    {"name": "내공", "type": "gauge", "max_value": 100, "color": "#3b82f6", "icon": "⚡"},
    {"name": "체력", "type": "gauge", "max_value": 100, "color": "#ef4444", "icon": "❤️"},
    {"name": "무공", "type": "number", "max_value": null, "color": "#f59e0b", "icon": "⚔️"},
    {"name": "경공", "type": "number", "max_value": null, "color": "#8b5cf6", "icon": "🦶"},
    {"name": "문파", "type": "text", "max_value": null, "color": "#10b981", "icon": "🏯"}
  ]'::jsonb),
  ('판타지 기본', '판타지', '[
    {"name": "HP", "type": "gauge", "max_value": 100, "color": "#ef4444", "icon": "❤️"},
    {"name": "MP", "type": "gauge", "max_value": 50, "color": "#3b82f6", "icon": "💙"},
    {"name": "레벨", "type": "number", "max_value": null, "color": "#f59e0b", "icon": "⭐"},
    {"name": "직업", "type": "text", "max_value": null, "color": "#8b5cf6", "icon": "🧙"},
    {"name": "칭호", "type": "text", "max_value": null, "color": "#ec4899", "icon": "👑"}
  ]'::jsonb),
  ('현대 기본', '현대', '[
    {"name": "체력", "type": "gauge", "max_value": 100, "color": "#ef4444", "icon": "❤️"},
    {"name": "정신력", "type": "gauge", "max_value": 100, "color": "#3b82f6", "icon": "🧠"},
    {"name": "직업", "type": "text", "max_value": null, "color": "#10b981", "icon": "💼"},
    {"name": "평판", "type": "number", "max_value": null, "color": "#f59e0b", "icon": "⭐"}
  ]'::jsonb);
```

---

### 7. presets

**설명:** 스토리 프리셋 (미리 정의된 설정 템플릿)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 프리셋 고유 ID | gen_random_uuid() |
| title | TEXT | NOT NULL UNIQUE | 프리셋 제목 | - |
| is_default | BOOLEAN | NOT NULL DEFAULT FALSE | 기본 프리셋 여부 | FALSE |
| genre | TEXT | NOT NULL | 장르 | - |
| status_preset_id | UUID | FK NULL | 상태창 프리셋 ID | NULL |
| world_setting | TEXT | NOT NULL DEFAULT '' | 세계관 설정 | '' |
| story | TEXT | NOT NULL DEFAULT '' | 스토리 개요 | '' |
| characters | TEXT | NOT NULL DEFAULT '' | 캐릭터 정보 | '' |
| character_name | TEXT | NULL | 플레이어 캐릭터 이름 | NULL |
| character_setting | TEXT | NULL | 플레이어 캐릭터 설정 | NULL |
| user_note | TEXT | NULL | 사용자 노트 | NULL |
| system_rules | TEXT | NOT NULL DEFAULT '' | 시스템 규칙 | '' |
| use_latex | BOOLEAN | NOT NULL DEFAULT FALSE | LaTeX 사용 여부 | FALSE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |

**외래 키:**
```sql
FOREIGN KEY (status_preset_id) REFERENCES status_presets(id) ON DELETE SET NULL
```

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_presets_status_preset_id ON presets(status_preset_id) WHERE status_preset_id IS NOT NULL;
CREATE INDEX idx_presets_is_default ON presets(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_presets_genre ON presets(genre);
```

---

### 8. config

**설명:** 앱 설정 (시스템 전체 설정)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | TEXT | PK NOT NULL | 설정 키 | - |
| value | JSONB | NULL | 설정 값 | NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 | NOW() |

**설정 키:**

#### 1. prompt_config
```json
{
  "system_preamble": "You are an AI storyteller for an interactive fiction game.",
  "latex_rules": "Use LaTeX syntax for sound effects: $\\text{effect}$",
  "narrative_length_template": "Write {narrative_length} paragraphs.",
  "summary_system_instruction": "Summarize the conversation so far.",
  "summary_request_new": "Create a summary of the story.",
  "summary_request_update": "Update the summary with new events.",
  "game_start_message": "Welcome to the story!",
  "safety_settings": "BLOCK_NONE"
}
```

#### 2. gameplay_config
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

#### 3. genre_config
```json
{
  "무협": {
    "narrative_length": 5,
    "description": "중국 무협 소설 장르"
  },
  "판타지": {
    "narrative_length": 4,
    "description": "서양 판타지 장르"
  },
  "로맨스": {
    "narrative_length": 3,
    "description": "로맨스 장르"
  }
}
```

---

### 9. api_logs

**설명:** Gemini API 로그

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 로그 고유 ID | gen_random_uuid() |
| session_id | UUID | FK NULL | 세션 ID | NULL |
| endpoint | TEXT | NOT NULL | API 엔드포인트 | - |
| request_model | TEXT | NULL | 요청 모델명 | NULL |
| request_system_prompt | TEXT | NULL | 시스템 프롬프트 | NULL |
| request_messages | JSONB | NULL | 요청 메시지 배열 | NULL |
| request_body | JSONB | NULL | 요청 본문 | NULL |
| response_text | TEXT | NULL | 응답 텍스트 | NULL |
| response_usage | JSONB | NULL | 토큰 사용량 | NULL |
| response_error | TEXT | NULL | 에러 메시지 | NULL |
| duration_ms | INTEGER | NULL | 소요 시간 (ms) | NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |

**외래 키:**
```sql
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
```

**response_usage JSONB 구조:**
```json
{
  "prompt_tokens": 1000,
  "completion_tokens": 500,
  "total_tokens": 1500
}
```

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_api_logs_session_id ON api_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);

-- 복합 인덱스 (세션별 최신 로그)
CREATE INDEX idx_api_logs_session_created ON api_logs(session_id, created_at DESC);
```

**RLS 정책:**
```sql
-- 세션 소유자 간접 접근
CREATE POLICY "Users can view logs for own sessions"
  ON api_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = api_logs.session_id
    AND sessions.owner_uid = auth.uid()
  ));

-- 관리자 전체 접근
CREATE POLICY "Admins can full access api_logs"
  ON api_logs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

### 10. service_logs

**설명:** HTTP 요청 로그

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 | 기본값 |
|--------|-----------|---------|------|-------|
| id | UUID | PK NOT NULL | 로그 고유 ID | gen_random_uuid() |
| method | TEXT | NOT NULL | HTTP 메서드 | - |
| path | TEXT | NOT NULL | 요청 경로 | - |
| status_code | INTEGER | NOT NULL | 상태 코드 | - |
| duration_ms | INTEGER | NOT NULL | 소요 시간 (ms) | - |
| ip | TEXT | NULL | 클라이언트 IP | NULL |
| user_agent | TEXT | NULL | User Agent | NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 일시 | NOW() |

**인덱스:**
```sql
-- 기본 인덱스
CREATE INDEX idx_service_logs_created_at ON service_logs(created_at DESC);
CREATE INDEX idx_service_logs_status_code ON service_logs(status_code);
CREATE INDEX idx_service_logs_method ON service_logs(method);

-- 복합 인덱스 (성능 모니터링)
CREATE INDEX idx_service_logs_status_created ON service_logs(status_code, created_at DESC);
```

**RLS 정책:**
```sql
-- 관리자만 접근
CREATE POLICY "Admins can view service_logs"
  ON service_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

## 인덱스 전략

### 인덱싱 원칙

1. **외래 키 인덱싱**: 모든 FK 컬럼에 인덱스 생성
2. **검색 컬럼 인덱싱**: 자주 검색하는 컬럼에 인덱스 생성
3. **정렬 컬럼 인덱싱:** ORDER BY에 사용하는 컬럼에 DESC 인덱스 생성
4. **부분 인덱스 활용:** WHERE 조건이 있는 쿼리에 부분 인덱스 사용
5. **GIN 인덱스:** JSONB, TEXT[] 타입에는 GIN 인덱스 사용
6. **복합 인덱스:** 여러 컬럼을 함께 검색할 때 복합 인덱스 사용

### 주요 인덱스 목록

| 테이블 | 인덱스명 | 컬럼 | 타입 | 용도 |
|--------|---------|------|------|------|
| stories | idx_stories_public | is_public | B-tree | 공개 스토리 필터 |
| stories | idx_stories_featured | is_featured | B-tree | 추천 스토리 필터 |
| stories | idx_stories_tags | tags | GIN | 장르 검색 |
| stories | idx_stories_public_featured_play | is_public, is_featured, play_count | B-tree | 홈 표시 정렬 |
| sessions | idx_sessions_owner_played | owner_uid, last_played_at | B-tree | 내 최근 플레이 |
| sessions | idx_sessions_story_owner | story_id, owner_uid | B-tree | 스토리별 세션 |
| session_memory | idx_session_memory_session_type | session_id, type | B-tree | 세션별 메모리 |
| api_logs | idx_api_logs_session_created | session_id, created_at | B-tree | 세션별 API 로그 |
| service_logs | idx_service_logs_status_created | status_code, created_at | B-tree | 에러 로그 모니터링 |

### 인덱스 모니터링

```sql
-- 미사용 인덱스 확인
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname IN ('ai_story_game', 'story_game');

-- 인덱스 크기 확인
SELECT schemaname, tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS size
FROM pg_stat_user_indexes
WHERE schemaname IN ('ai_story_game', 'story_game')
ORDER BY pg_relation_size(indexrelid::regclass) DESC;
```

---

## RLS 정책

### RLS 활성화

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
```

### RLS 정책 요약

| 테이블 | anon | authenticated | admin | 설명 |
|--------|------|---------------|-------|------|
| user_profiles | - | 본인 조회/수정 | 전체 접근 | 프로필 |
| stories | 공개 스토리 조회 | 공개 + 본인 CRUD | 전체 접근 | 스토리 |
| sessions | - | 본인 CRUD | 전체 접근 | 세션 |
| session_memory | - | 본인(세션 통해) | 전체 접근 | 메모리 |
| api_logs | - | 본인(세션 통해) | 전체 접근 | API 로그 |
| service_logs | - | - | 전체 접근 | 서비스 로그 |
| status_presets | 조회 | 조회 | 전체 접근 | 상태창 프리셋 |
| presets | 조회 | 조회 | 전체 접근 | 프리셋 |
| config | 조회 | 조회 | 전체 접근 | 설정 |

### RLS 성능 최적화

```sql
-- RLS 정책에 인덱스 추가
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_stories_is_public ON stories(is_public);
CREATE INDEX idx_sessions_owner_uid ON sessions(owner_uid);

-- 뷰를 통한 RLS 우회 (stories_safe)
CREATE VIEW stories_safe AS
SELECT id, title, description, tags, icon, banner_gradient,
       world_setting, story, characters, character_name,
       character_setting, system_rules, use_latex,
       status_preset_id, play_count, like_count, badge,
       is_featured, owner_name, owner_uid, created_at, updated_at
FROM stories
WHERE is_public = TRUE;
```

---

## 데이터 무결성

### Primary Keys

모든 테이블의 `id` 컬럼은 UUID 타입의 PK입니다.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### Foreign Keys

| FK 컬럼 | 참조 테이블 | ON DELETE | 설명 |
|---------|-----------|-----------|------|
| user_profiles.id | auth.users(id) | CASCADE | 사용자 삭제 시 프로필 삭제 |
| stories.owner_uid | auth.users(id) | SET NULL | 사용자 삭제 시 owner_uid NULL |
| stories.status_preset_id | status_presets(id) | SET NULL | 프리셋 삭제 시 NULL |
| sessions.story_id | stories(id) | SET NULL | 스토리 삭제 시 story_id NULL |
| sessions.owner_uid | auth.users(id) | CASCADE | 사용자 삭제 시 세션 삭제 |
| session_memory.session_id | sessions(id) | CASCADE | 세션 삭제 시 메모리 삭제 |
| api_logs.session_id | sessions(id) | SET NULL | 세션 삭제 시 session_id NULL |
| presets.status_preset_id | status_presets(id) | SET NULL | 프리셋 삭제 시 NULL |

### Unique Constraints

| 테이블 | 컬럼 | 설명 |
|--------|------|------|
| user_profiles | id | auth.users.id와 1:1 |
| session_memory | (session_id, type) | 세션별 메모리 타입 중복 방지 |
| status_presets | title | 프리셋 제목 중복 방지 |
| presets | title | 프리셋 제목 중복 방지 |
| config | id | 설정 키 중복 방지 |
| auth.users | email | Supabase 제공 |

### Check Constraints

| 테이블 | 컬럼 | 제약조건 |
|--------|------|---------|
| user_profiles | role | CHECK (role IN ('user', 'admin')) |
| stories | badge | CHECK (badge IN ('new', 'hot')) |
| session_memory | type | CHECK (type IN ('short_term', 'long_term', 'characters', 'goals')) |

### Not Null Constraints

| 테이블 | 컬럼 | 설명 |
|--------|------|------|
| user_profiles | display_name | 닉네임 필수 |
| stories | title | 제목 필수 |
| sessions | title | 세션 제목 필수 |
| status_presets | title | 프리셋 제목 필수 |
| presets | title | 프리셋 제목 필수 |

---

## 트리거

### updated_at 자동 갱신

```sql
-- 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 등록
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER session_memory_updated_at
  BEFORE UPDATE ON session_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER status_presets_updated_at
  BEFORE UPDATE ON status_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER config_updated_at
  BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### user_profiles 자동 생성

```sql
-- auth.users 생성 시 user_profiles 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
          NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 등록
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 뷰

### stories_safe VIEW

password_hash를 제외하고 공개 스토리만 노출하는 뷰입니다.

```sql
CREATE VIEW stories_safe AS
SELECT id, title, description, tags, icon, banner_gradient,
       world_setting, story, characters, character_name,
       character_setting, user_note, system_rules, use_latex,
       status_preset_id, is_public, play_count, like_count,
       badge, is_featured, owner_name, owner_uid,
       created_at, updated_at
FROM stories
WHERE is_public = TRUE;
```

---

## 파티셔닝 (향후 확장)

### sessions 테이블 파티셔닝 (향후 계획)

대량의 세션 데이터를 효율적으로 관리하기 위해 파티셔닝 고려:

```sql
-- 월별 파티셔닝 (예시)
CREATE TABLE sessions (
  id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 기타 컬럼
) PARTITION BY RANGE (created_at);

-- 파티션 생성
CREATE TABLE sessions_2026_01 PARTITION OF sessions
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE sessions_2026_02 PARTITION OF sessions
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 백업 및 복구

### 백업 전략

1. **일일 백업**: Supabase 자동 백업 (Cloud)
2. **수동 백업**: 주요 마이그레이션 전 pg_dump
3. **논리 백업**: `pg_dump --schema-only`
4. **물리 백업**: WAL 아카이빙

### 복구 절차

```bash
# 스키마 복구
pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
  --schema-only --no-owner --no-privileges \
  -f schema_backup.sql

# 데이터 복구
pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
  --data-only --no-owner --no-privileges \
  -f data_backup.sql
```

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-04-01 | Software Architect | 최초 작성 (논리/물리 ERD, 테이블 정의서 완성) |

---

## 참고 문헌

- [Phase 1 개념 ERD](../phase1-requirements/04-Conceptual-ERD.md)
- [SRS 요구사항 정의서](../phase1-requirements/01-SRS.md)
- [Supabase Migration Files](../../../supabase/migrations/)
- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
