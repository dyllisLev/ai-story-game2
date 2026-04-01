# AI Story Game - API 설계서 (API Design Specification)

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Software Architect
> **Phase:** SDLC Phase 2 - Design

---

## 1. 개요 (Overview)

### 1.1 문서 목적

본 문서는 AI Story Game 플랫폼의 모든 API 엔드포인트를 상세히 정의한다. 요청/응답 스키마, 인증 요구사항, 에러 코드, Rate Limiting 정책을 포함한다.

### 1.2 API 기본 정보

| 항목 | 값 |
|------|-----|
| **Base URL (Dev)** | http://localhost:3000 |
| **Base URL (Prod)** | TBD |
| **Protocol** | HTTP/1.1, HTTPS (TLS 1.3+) |
| **Data Format** | JSON (application/json) |
| **Character Set** | UTF-8 |
| **Authentication** | Bearer Token (JWT) |
| **API Version** | v1 (현재 버전 접미사 없음) |

### 1.3 공통 헤더 (Common Headers)

| 헤더 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `Authorization` | 인증 필요 | JWT Bearer 토큰 | `Bearer <access_token>` |
| `Content-Type` | POST/PUT | 요청 본문 타입 | `application/json` |
| `X-Gemini-Key` | 게임 플레이 | 사용자 Gemini API 키 | `AIzaSy...` |
| `X-Session-Token` | 익명 세션 | 익명 세션 토큰 | `uuid-v4` |
| `X-Paperclip-Run-Id` | 로깅 | Paperclip 실행 ID | `d5ccc38c-...` |

### 1.4 공통 응답 형식 (Common Response Format)

**성공 응답:**
```json
{
  "data": { /* 실제 데이터 */ },
  "meta": {
    "timestamp": "2026-03-31T23:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**에러 응답:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "사용자 입력이 올바르지 않습니다",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2026-03-31T23:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 2. 인증 API (Authentication API)

### 2.1 회원가입

**Endpoint:** `POST /api/auth/signup`

**인증:** ❌ 불필요

**Rate Limit:** 5 requests/minute per IP

**요청:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "닉네임"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "displayName": "닉네임"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 3600
    }
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: 이메일 형식 오류, 비밀번호_weak
- `409 CONFLICT`: 이메일 중복

### 2.2 로그인

**Endpoint:** `POST /api/auth/login`

**인증:** ❌ 불필요

**Rate Limit:** 5 requests/minute per IP

**요청:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "displayName": "닉네임",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 3600
    }
  }
}
```

**에러:**
- `401 UNAUTHORIZED`: 이메일 또는 비밀번호 불일치
- `403 FORBIDDEN`: 이메일 미인증 (Supabase Auth 설정 시)

### 2.3 로그아웃

**Endpoint:** `POST /api/auth/logout`

**인증:** ✅ 필요 (accessToken)

**요청:**
```json
{}
```

**응답 (200 OK):**
```json
{
  "data": {
    "message": "로그아웃되었습니다"
  }
}
```

### 2.4 토큰 갱신

**Endpoint:** `POST /api/auth/refresh`

**인증:** ✅ 필요 (refreshToken)

**요청:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 3600
    }
  }
}
```

**에러:**
- `401 UNAUTHORIZED`: 유효하지 않은 refresh token

---

## 3. 프로필 API (Profile API)

### 3.1 내 프로필 조회

**Endpoint:** `GET /api/me`

**인증:** ✅ 필요

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "displayName": "닉네임",
    "role": "user",
    "hasApiKey": true
  }
}
```

### 3.2 프로필 수정

**Endpoint:** `PUT /api/me`

**인증:** ✅ 필요

**요청:**
```json
{
  "displayName": "새 닉네임"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "displayName": "새 닉네임",
    "role": "user"
  }
}
```

### 3.3 API 키 등록

**Endpoint:** `PUT /api/me/apikey`

**인증:** ✅ 필요

**Rate Limit:** 10 requests/hour per user

**요청:**
```json
{
  "apiKey": "AIzaSyCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "message": "API 키가 안전하게 저장되었습니다"
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: 잘못된 Gemini API 키 형식

### 3.4 API 키 삭제

**Endpoint:** `DELETE /api/me/apikey`

**인증:** ✅ 필요

**응답 (200 OK):**
```json
{
  "data": {
    "message": "API 키가 삭제되었습니다"
  }
}
```

---

## 4. 설정 API (Config API)

### 4.1 전역 설정 조회

**Endpoint:** `GET /api/config`

**인증:** ✅ 필요 (admin)

**응답 (200 OK):**
```json
{
  "data": {
    "prompt": {
      "systemPrompt": "당신은 이야기의 진행자입니다...",
      "responseFormat": "markdown",
      "maxTokens": 4096,
      "temperature": 0.8,
      "topP": 0.9,
      "topK": 40
    },
    "gameplay": {
      "maxTurns": 100,
      "slidingWindowSize": 10,
      "memoryUpdateInterval": 5,
      "autoSaveInterval": 1
    },
    "genres": {
      "fantasy": {
        "enabled": true,
        "statusAttributes": ["HP", "MP", "STR", "DEX"]
      },
      "modern": {
        "enabled": true,
        "statusAttributes": ["스트레스", "체력", "자금", "인맥"]
      }
    }
  }
}
```

### 4.2 전역 설정 수정

**Endpoint:** `PUT /api/config`

**인증:** ✅ 필요 (admin)

**요청:**
```json
{
  "prompt": {
    "systemPrompt": "변경된 시스템 프롬프트",
    "temperature": 0.9
  },
  "gameplay": {
    "maxTurns": 150
  }
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "message": "설정이 저장되었습니다"
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: 잘못된 설정 값

---

## 5. 스토리 API (Stories API)

### 5.1 스토리 목록 조회

**Endpoint:** `GET /api/stories`

**인증:** ❌ 불필요 (인증 시 내 스토리 포함)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `page` | number | ❌ | 페이지 번호 (1-based) | `1` |
| `limit` | number | ❌ | 페이지당 개수 (default: 20, max: 100) | `20` |
| `genre` | string | ❌ | 장르 필터 | `fantasy` |
| `search` | string | ❌ | 검색어 (title, description) | `용사` |
| `sort` | string | ❌ | 정렬 (latest, popular, name) | `latest` |
| `featured` | boolean | ❌ | 추천 스토리만 | `true` |

**응답 (200 OK):**
```json
{
  "data": {
    "stories": [
      {
        "id": "uuid-v4",
        "title": "판타지 모험",
        "description": "용사가 되어 마왕을 물리치는 이야기",
        "tags": ["판타지", "모험"],
        "icon": "🗡️",
        "bannerGradient": "from-blue-500 to-purple-600",
        "playCount": 1234,
        "likeCount": 56,
        "badge": "hot",
        "isFeatured": true,
        "hasPassword": false,
        "ownerName": "작성자명"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### 5.2 스토리 상세 조회

**Endpoint:** `GET /api/stories/{storyId}`

**인증:** ❌ 불필요

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "title": "판타지 모험",
    "description": "용사가 되어 마왕을 물리치는 이야기",
    "worldSetting": "중세 판타지 세계관...",
    "story": "이야기 전체 내용...",
    "characterName": "카인",
    "characterSetting": "주인공 설정...",
    "characters": "마왕, 요정, 기사...",
    "userNote": "작성자 노트...",
    "systemRules": "시스템 룰...",
    "useLatex": true,
    "isPublic": true,
    "hasPassword": false,
    "tags": ["판타지", "모험"],
    "icon": "🗡️",
    "bannerGradient": "from-blue-500 to-purple-600",
    "playCount": 1234,
    "likeCount": 56,
    "badge": "hot",
    "isFeatured": true,
    "statusPresetId": "uuid-v4",
    "ownerName": "작성자명",
    "createdAt": "2026-03-31T00:00:00Z",
    "updatedAt": "2026-03-31T00:00:00Z"
  }
}
```

**에러:**
- `404 NOT_FOUND`: 스토리를 찾을 수 없음
- `403 FORBIDDEN`: 비공개 스토리 접근 (owner/admin 제외)

### 5.3 스토리 생성

**Endpoint:** `POST /api/stories`

**인증:** ✅ 필요

**요청:**
```json
{
  "title": "새 스토리",
  "description": "스토리 설명",
  "worldSetting": "세계관 설정",
  "story": "이야기 내용",
  "characterName": "주인공 이름",
  "characterSetting": "주인공 설정",
  "characters": "주요 캐릭터",
  "userNote": "작성자 노트",
  "systemRules": "시스템 룰",
  "useLatex": false,
  "isPublic": true,
  "password": null,
  "tags": ["판타지"],
  "icon": "🗡️",
  "bannerGradient": "from-blue-500 to-purple-600",
  "statusPresetId": "uuid-v4"
}
```

**응답 (201 Created):**
```json
{
  "data": {
    "id": "uuid-v4",
    "title": "새 스토리",
    "createdAt": "2026-03-31T00:00:00Z"
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: 필수 필드 누락 또는 형식 오류
- `404 NOT_FOUND`: statusPresetId를 찾을 수 없음

### 5.4 스토리 수정

**Endpoint:** `PUT /api/stories/{storyId}`

**인증:** ✅ 필요 (owner/admin)

**요청:** (5.3과 동일)

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "title": "수정된 스토리",
    "updatedAt": "2026-03-31T00:00:00Z"
  }
}
```

**에러:**
- `403 FORBIDDEN`: 수정 권한 없음
- `404 NOT_FOUND`: 스토리를 찾을 수 없음

### 5.5 스토리 삭제

**Endpoint:** `DELETE /api/stories/{storyId}`

**인증:** ✅ 필요 (owner/admin)

**응답 (200 OK):**
```json
{
  "data": {
    "message": "스토리가 삭제되었습니다"
  }
}
```

### 5.6 내 스토리 목록 조회

**Endpoint:** `GET /api/stories/mine`

**인증:** ✅ 필요

**Query Parameters:** (5.1과 동일)

**응답 (200 OK):**
```json
{
  "data": {
    "stories": [...],
    "pagination": {...}
  }
}
```

### 5.7 스토리 통계 조회

**Endpoint:** `GET /api/stories/stats`

**인증:** ✅ 필요

**응답 (200 OK):**
```json
{
  "data": {
    "totalStories": 123,
    "publishedStories": 89,
    "draftStories": 34,
    "totalPlays": 4567,
    "totalLikes": 234
  }
}
```

---

## 6. 세션 API (Sessions API)

### 6.1 세션 목록 조회

**Endpoint:** `GET /api/sessions`

**인증:** ✅ 필요

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `storyId` | string | ❌ | 특정 스토리의 세션만 |
| `limit` | number | ❌ | 최대 개수 (default: 50, max: 100) |

**응답 (200 OK):**
```json
{
  "data": {
    "sessions": [
      {
        "id": "uuid-v4",
        "storyId": "uuid-v4",
        "storyTitle": "판타지 모험",
        "title": "나의 모험",
        "turnCount": 42,
        "progressPct": 42,
        "lastPlayedAt": "2026-03-31T00:00:00Z",
        "createdAt": "2026-03-30T00:00:00Z"
      }
    ]
  }
}
```

### 6.2 세션 상세 조회

**Endpoint:** `GET /api/sessions/{sessionId}`

**인증:** ✅ 필요 (owner or x-session-token)

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "storyId": "uuid-v4",
    "title": "나의 모험",
    "messages": [
      {
        "role": "system",
        "content": "당신은 카인입니다...",
        "timestamp": "2026-03-31T00:00:00Z"
      },
      {
        "role": "assistant",
        "content": "마을에 도착했습니다...",
        "timestamp": "2026-03-31T00:00:01Z",
        "mode": "narration"
      },
      {
        "role": "user",
        "content": "상점에 들어간다",
        "timestamp": "2026-03-31T00:00:02Z",
        "mode": "action"
      }
    ],
    "turnCount": 42,
    "progressPct": 42,
    "memory": {
      "shortTerm": [
        { "fact": "상점에 들어감", "turn": 42 }
      ],
      "longTerm": [
        { "fact": "마왕을 물리치는 목표", "importance": "high" }
      ],
      "characters": [
        { "name": "상점주인", "status": "alive", "relation": "neutral" }
      ],
      "goals": "마왕을 물리치기 위해 레벨업"
    },
    "createdAt": "2026-03-30T00:00:00Z",
    "updatedAt": "2026-03-31T00:00:00Z"
  }
}
```

### 6.3 세션 생성

**Endpoint:** `POST /api/sessions`

**인증:** ❌ 불필요 (익명 세션 가능)

**요청:**
```json
{
  "storyId": "uuid-v4",
  "title": "새 모험",
  "password": null
}
```

**응답 (201 Created):**
```json
{
  "data": {
    "id": "uuid-v4",
    "storyId": "uuid-v4",
    "title": "새 모험",
    "sessionToken": "uuid-v4",
    "messages": [
      {
        "role": "system",
        "content": "당신은...",
        "timestamp": "2026-03-31T00:00:00Z"
      }
    ],
    "createdAt": "2026-03-31T00:00:00Z"
  }
}
```

### 6.4 세션 수정

**Endpoint:** `PUT /api/sessions/{sessionId}`

**인증:** ✅ 필요 (owner)

**요청:**
```json
{
  "title": "수정된 제목"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "title": "수정된 제목"
  }
}
```

### 6.5 세션 삭제

**Endpoint:** `DELETE /api/sessions/{sessionId}`

**인증:** ✅ 필요 (owner)

**응답 (200 OK):**
```json
{
  "data": {
    "message": "세션이 삭제되었습니다"
  }
}
```

---

## 7. 게임 API (Game API)

### 7.1 새 게임 시작

**Endpoint:** `POST /api/game/start`

**인증:** ✅ 필요

**Headers:**
```
X-Gemini-Key: <사용자 Gemini API 키>
```

**요청:**
```json
{
  "storyId": "uuid-v4",
  "sessionId": null
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "sessionId": "uuid-v4",
    "sessionToken": "uuid-v4",
    "systemPrompt": "당신은 카인입니다...",
    "startMessage": "자, 당신의 모험이 시작됩니다...",
    "safetySettings": [...],
    "model": "gemini-2.5-flash",
    "memory": {...}
  }
}
```

**참고:** 이 엔드포인트는 JSON 응답만 반환합니다. 실제 AI 응답 스트리밍은 프론트엔드에서 Gemini API를 직접 호출하여 처리합니다.

**에러:**
- `400 VALIDATION_ERROR`: 잘못된 API 키
- `402 PAYMENT_REQUIRED`: Gemini API quota 초과
- `404 NOT_FOUND`: 스토리를 찾을 수 없음

### 7.2 대화 전송

**Endpoint:** `POST /api/game/chat`

**인증:** ✅ 필요

**Headers:**
```
X-Gemini-Key: <사용자 Gemini API 키>
```

**요청:**
```json
{
  "sessionId": "uuid-v4",
  "userMessage": "상점에 들어간다"
}
```

또는 재생성 요청:
```json
{
  "sessionId": "uuid-v4",
  "regenerate": true
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "systemPrompt": "당신은 카인입니다...\n\n[메모리 통합]",
    "contents": [
      {
        "role": "user",
        "parts": [{ "text": "이전 대화 내용..." }]
      },
      {
        "role": "user",
        "parts": [{ "text": "상점에 들어간다" }]
      }
    ],
    "safetySettings": [...],
    "model": "gemini-2.5-flash",
    "hasMemory": true
  }
}
```

**응답 필드 설명:**
| 필드 | 타입 | 설명 |
|------|------|------|
| `systemPrompt` | string | 시스템 프롬프트 (스토리 설정 + 메모리 포함) |
| `contents` | array | Gemini API 형식의 대화 기록 |
| `safetySettings` | array | Gemini 안전 설정 |
| `model` | string | Gemini 모델 ID |
| `hasMemory` | boolean | 세션 메모리 존재 여부 |

**참고:**
- 이 엔드포인트는 **프롬프트 조합 데이터만** 반환합니다 (JSON 응답)
- **실제 AI 응답 생성은 프론트엔드에서 Gemini API를 직접 호출**하여 처리합니다
- 프론트엔드는 응답 받은 `systemPrompt`, `contents`, `safetySettings`, `model`을 사용하여 Gemini API의 `streamGenerateContent` 엔드포인트를 직접 호출합니다
- SSE 스트리밍은 **프론트엔드 ↔ Gemini API 간**에만 발생합니다
- 백엔드는 프롬프트 빌딩, 세션 관리, 메모리 처리만 담당합니다

**에러:**
- `400 VALIDATION_ERROR`: 잘못된 입력
- `402 PAYMENT_REQUIRED`: Gemini API quota 초과
- `404 NOT_FOUND`: 세션을 찾을 수 없음

### 7.3 프롬프트 미리보기 (테스트)

**Endpoint:** `POST /api/game/test-prompt`

**인증:** ✅ 필요 (owner/admin)

**요청:**
```json
{
  "storyId": "uuid-v4"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "systemPrompt": "당신은 카인입니다...\n\n세계관: ...",
    "characterInfo": "주인공: 카인\n...",
    "rules": "시스템 룰...",
    "estimatedTokens": 2500
  }
}
```

---

## 8. 관리자 API (Admin API)

> **모든 Admin API는 role=admin 필요**

### 8.1 대시보드

**Endpoint:** `GET /api/admin/dashboard`

**응답 (200 OK):**
```json
{
  "data": {
    "overview": {
      "totalUsers": 1234,
      "totalStories": 89,
      "totalSessions": 456,
      "totalPlays": 7890
    },
    "recentActivity": [
      {
        "type": "session_created",
        "timestamp": "2026-03-31T00:00:00Z",
        "user": "user@example.com"
      }
    ],
    "popularStories": [
      {
        "id": "uuid-v4",
        "title": "판타지 모험",
        "playCount": 1234
      }
    ]
  }
}
```

### 8.2 스토리 관리

**Endpoint:** `GET /api/admin/stories`

**Query Parameters:** (5.1과 동일, 인증 없이 전체 조회)

**응답 (200 OK):**
```json
{
  "data": {
    "stories": [...],
    "pagination": {...}
  }
}
```

**Endpoint:** `DELETE /api/admin/stories/{storyId}`

**응답 (200 OK):**
```json
{
  "data": {
    "message": "스토리가 강제 삭제되었습니다"
  }
}
```

### 8.3 사용자 관리

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `role` | string | ❌ | 역할 필터 (pending, user, admin) |
| `search` | string | ❌ | 이메일/닉네임 검색 |

**응답 (200 OK):**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid-v4",
        "email": "user@example.com",
        "displayName": "닉네임",
        "role": "user",
        "createdAt": "2026-03-31T00:00:00Z"
      }
    ]
  }
}
```

**Endpoint:** `PUT /api/admin/users/{userId}/role`

**요청:**
```json
{
  "role": "admin"
}
```

**응답 (200 OK):**
```json
{
  "data": {
    "id": "uuid-v4",
    "role": "admin"
  }
}
```

### 8.4 서비스 로그

**Endpoint:** `GET /api/admin/service-logs`

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `method` | string | ❌ | HTTP 메서드 필터 |
| `path` | string | ❌ | 경로 필터 |
| `limit` | number | ❌ | 최대 개수 (default: 100) |

**응답 (200 OK):**
```json
{
  "data": {
    "logs": [
      {
        "id": "uuid-v4",
        "method": "GET",
        "path": "/api/stories",
        "statusCode": 200,
        "durationMs": 45,
        "timestamp": "2026-03-31T00:00:00Z"
      }
    ]
  }
}
```

### 8.5 API 로그

**Endpoint:** `GET /api/admin/api-logs`

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `sessionId` | string | ❌ | 세션 ID 필터 |
| `endpoint` | string | ❌ | 엔드포인트 필터 |
| `limit` | number | ❌ | 최대 개수 (default: 100) |

**응답 (200 OK):**
```json
{
  "data": {
    "logs": [
      {
        "id": "uuid-v4",
        "sessionId": "uuid-v4",
        "endpoint": "/api/game/chat",
        "request": { "content": "..." },
        "response": { "content": "..." },
        "durationMs": 2345,
        "timestamp": "2026-03-31T00:00:00Z"
      }
    ]
  }
}
```

### 8.6 상태창 프리셋 관리

**Endpoint:** `GET /api/admin/status-presets`

**응답 (200 OK):**
```json
{
  "data": {
    "presets": [
      {
        "id": "uuid-v4",
        "title": "판타지 기본",
        "genre": "fantasy",
        "attributes": [
          { "name": "HP", "type": "number", "min": 0, "max": 100 },
          { "name": "MP", "type": "number", "min": 0, "max": 50 }
        ]
      }
    ]
  }
}
```

**Endpoint:** `POST /api/admin/status-presets`

**요청:**
```json
{
  "title": "새 프리셋",
  "genre": "fantasy",
  "attributes": [
    { "name": "HP", "type": "number", "min": 0, "max": 100 }
  ]
}
```

**응답 (201 Created):**
```json
{
  "data": {
    "id": "uuid-v4",
    "title": "새 프리셋"
  }
}
```

### 8.7 위험 구역 (Danger Zone)

**Endpoint:** `POST /api/admin/danger-zone/truncate-stories`

**응답 (200 OK):**
```json
{
  "data": {
    "message": "모든 스토리가 삭제되었습니다"
  }
}
```

**Endpoint:** `POST /api/admin/danger-zone/truncate-sessions`

**응답 (200 OK):**
```json
{
  "data": {
    "message": "모든 세션이 삭제되었습니다"
  }
}
```

**Endpoint:** `POST /api/admin/danger-zone/reset-config`

**응답 (200 OK):**
```json
{
  "data": {
    "message": "설정이 초기화되었습니다"
  }
}
```

---

## 9. 헬스체크 (Health Check)

### 9.1 헬스체크

**Endpoint:** `GET /api/health`

**인증:** ❌ 불필요

**Rate Limit:** ❌ 없음

**응답 (200 OK):**
```json
{
  "status": "ok",
  "supabase": "connected",
  "uptime": 12345.67,
  "version": "1.0.0"
}
```

**응답 (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "supabase": "disconnected",
  "uptime": 12345.67,
  "version": "1.0.0"
}
```

---

## 10. 에러 코드 (Error Codes)

### 10.1 HTTP 상태 코드

| 코드 | 이름 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 (validation error) |
| 401 | Unauthorized | 인증 필요 또는 토큰 만료 |
| 402 | Payment Required | Gemini API quota 초과 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 409 | Conflict | 리소스 중복 (이메일 등) |
| 429 | Too Many Requests | Rate limit 초과 |
| 500 | Internal Server Error | 서버 내부 오류 |
| 503 | Service Unavailable | 서비스 점검 중 |

### 10.2 비즈니스 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 요청 데이터 검증 실패 |
| `UNAUTHORIZED` | 401 | 인증되지 않은 요청 |
| `PENDING_APPROVAL` | 403 | 승인 대기 중 (role=pending) |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `CONFLICT` | 409 | 리소스 중복 |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit 초과 |
| `INTERNAL_ERROR` | 500 | 내부 서버 오류 |
| `SERVICE_UNAVAILABLE` | 503 | 서비스 점검 중 |

---

## 11. Rate Limiting 정책

### 11.1 전역 정책

| 엔드포인트 | 제한 | 기간 | 설명 |
|-----------|------|------|------|
| `/api/health` | 없음 | - | 헬스체크 |
| `/api/auth/login` | 5 | 1분/IP | 무차별 대입 방지 |
| `/api/auth/signup` | 5 | 1분/IP | 가입 폭발 방지 |
| `/api/game/chat` | 10 | 1분/user | AI 비용 방지 |
| `/api/stories` | 60 | 1분/user | 일반 조회 |
| `/api/me/apikey` | 10 | 1시간/user | API 키 변경 |
| 기타 | 60 | 1분/user | 기본 |

### 11.2 Rate Limit 응답 헤더

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1680307200
```

### 11.3 Rate Limit 에러 응답

**429 Too Many Requests:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.",
    "retryAfter": 60
  }
}
```

---

## 12. API 버저닝 (Future)

### 12.1 현재 상태

- **Version:** 없음 (Base URL에 버전 없음)
- **Breaking Change:** 기존 클라이언트 영향

### 12.2 계획된 버저닝

**Base URL:** `/api/v1/...`

**버전 관리 정책:**
- **Major 버전 (v1, v2):** Breaking change
- **Minor 버전 (v1.1, v1.2):** 새로운 기능 추가
- **Patch 버전 (v1.1.1):** 버그 수정

**Deprecation:**
- 최소 6개월 전 공지
- 응답 헤더: `Deprecation: true`
- 응답 헤더: `Sunset: 2026-12-31T23:59:59Z`

---

## 13. 보안 고려사항 (Security Considerations)

### 13.1 인증

- **JWT Access Token:** 1시간 만료
- **Refresh Token:** 30일 만료
- **Token Rotation:** 미구현 (P1)

### 13.2 HTTPS (Production)

- **Protocol:** TLS 1.3+
- **HSTS:** 활성화
- **Ciphers:** 강력한 암호 스위트만 허용

### 13.3 CORS (Development)

```javascript
{
  origin: config.CORS_ORIGIN, // http://localhost:5173
  credentials: true
}
```

### 13.4 입력 검증

- **JSON Schema:** 모든 요청 본문
- **SQL Injection:** Prepared statements (Supabase)
- **XSS:** DOMPurify (프론트엔드)

### 13.5 민감 데이터

- **API 키:** AES-256-GCM 암호화 저장
- **비밀번호:** Supabase Auth (bcrypt)
- **로그:** redact (`req.headers["x-gemini-key"]`)

---

## 14. 참고 문서

### 14.1 관련 문서 (Phase 2)

- `docs/sdlc/phase2-design/01-Architecture-Definition.md` - 아키텍처 정의서
- `docs/sdlc/phase2-design/03-Program-Listing.md` - 프로그램 목록
- `docs/sdlc/phase2-design/XX-Screen-Design.md` - 화면 설계서 (Designer)
- `docs/sdlc/phase2-design/XX-Table-Definition.md` - 테이블 정의서 (DBA)

### 14.2 OpenAPI/Swagger (미구현)

```bash
# TODO: OpenAPI 스펙 자동 생성
npm install --save-dev @fastify/swagger
npm install --save-dev @fastify/swagger-ui
```

---

## 부록 A: 예제 시나리오

### A.1 전체 플로우 예시

```bash
# 1. 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","displayName":"User"}'

# 2. 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'
# 응답: { "data": { "tokens": { "accessToken": "..." } } }

# 3. 스토리 목록 조회
curl -X GET http://localhost:3000/api/stories \
  -H "Authorization: Bearer <accessToken>"

# 4. 새 게임 시작
curl -X POST http://localhost:3000/api/game/start \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Gemini-Key: <gemini-api-key>" \
  -H "Accept: text/event-stream" \
  -d '{"storyId":"<story-id>"}'

# 5. 대화 전송
curl -X POST http://localhost:3000/api/game/chat \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Gemini-Key: <gemini-api-key>" \
  -H "Accept: text/event-stream" \
  -d '{"sessionId":"<session-id>","content":"상점에 들어간다","mode":"action"}'
```

### A.2 에러 처리 예시

```bash
# Rate limit 초과
curl -X POST http://localhost:3000/api/auth/login
# 응답: 429 Too Many Requests
# {"error":{"code":"RATE_LIMIT_EXCEEDED","retryAfter":60}}

# 인증 없음
curl -X GET http://localhost:3000/api/me
# 응답: 401 Unauthorized
# {"error":{"code":"UNAUTHORIZED","message":"로그인이 필요합니다"}}

# 권한 없음
curl -X DELETE http://localhost:3000/api/admin/stories/<id>
# 응답: 403 Forbidden
# {"error":{"code":"FORBIDDEN","message":"관리자 권한이 필요합니다"}}
```

---

## 부록 B: 타입스크립트 인터페이스

### B.1 공통 타입

```typescript
// packages/shared/src/types/api.ts
export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### B.2 요청/응답 타입

```typescript
// 인증
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// 스토리
export interface StoryListResponse {
  stories: StoryListItem[];
  pagination: Pagination;
}

// 게임
export interface GameStartRequest {
  storyId: string;
  sessionId: string | null;
}

export interface ChatRequest {
  sessionId: string;
  content: string;
  mode: 'action' | 'thought' | 'speech' | 'scene';
}
```
