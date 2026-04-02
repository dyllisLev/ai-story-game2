# 버그 보고서: Config API Mock Admin 인증 실패

**발견 시간:** 2026-04-02 03:55 UTC
**심각도:** P0 - E2E 테스트 차단
**상태:** 🔴 블로커 활성화

## 문제

Dev 모드에서 Mock Admin User 헤더가 백엔드에서 인식되지 않아 Config API 호출이 401 Unauthorized로 실패합니다.

## 증상

1. **Frontend**: `X-Dev-Admin: skip` 헤더 전송
2. **Backend**: 헤더 인식 못함, 401 반환
3. **E2E 테스트**: 장르 설정/게임 파라미터 테스트 28개 실패

## 루트 원인

Frontend와 Backend에서 헤더 상수 정의가 불일치:

### Frontend (`frontend/src/lib/constants.ts`)
```typescript
export const DEV_HEADERS = {
  ADMIN_SKIP: 'X-Dev-Admin',  // ❌ 대문자 X, D, A
} as const;
```

### Backend (`backend/src/constants.ts`)
```typescript
export const DEV_HEADERS = {
  ADMIN_SKIP: 'x-dev-admin',  // ❌ 소문자
} as const;
```

## 영향받는 기능

- ❌ `/api/v1/me` - Mock admin user 인증 실패
- ❌ `/api/v1/config` - Config 로딩 실패
- ❌ Admin 페이지 장르 설정 관리
- ❌ Admin 페이지 게임 파라미터 관리
- ❌ E2E 테스트 28개 (admin-genre-settings 11개, admin-game-params 17개)

## 해결 방안

### 옵션 1: Shared Constants로 통합 (권장)

`@story-game/shared` 패키지에서 상수 정의:

```typescript
// packages/shared/src/constants/dev.ts
export const DEV_HEADERS = {
  ADMIN_SKIP: 'x-dev-admin',
} as const;

export const DEV_HEADER_VALUES = {
  SKIP: 'skip',
} as const;
```

Frontend/Backend에서 import:
```typescript
import { DEV_HEADERS, DEV_HEADER_VALUES } from '@story-game/shared/constants';
```

### 옵션 2: 일시적 수정

Frontend를 Backend와 맞추거나 그 반대:

**Frontend 수정**:
```typescript
export const DEV_HEADERS = {
  ADMIN_SKIP: 'x-dev-admin',  // 소문자로 통일
} as const;
```

## 검증 단계

1. Frontend/Backend 상수 통일
2. 백엔드 재시작
3. `curl -H "x-dev-admin: skip" http://localhost:3000/api/v1/me` 테스트
4. 브라우저에서 Admin 페이지 접속
5. E2E 테스트 재실행

## 담당자

**Fullstack Dev** - 상수 통일 및 테스트

## 예상 시간

15-20분 (상수 통일 10분 + 테스트 10분)

## 관련 이슈

- **AI-104**: E2E 테스트 (현재 블로커)
- **E2E-FINAL-REPORT-20260402.md**: Config API 인증 문제로 28개 테스트 대기 중

---

**QA Engineer**: 2026-04-02 03:55 UTC
**Paperclip API unavailable** - 이슈 업데이트 불가. 로컬 버그 보고서로 대체.
