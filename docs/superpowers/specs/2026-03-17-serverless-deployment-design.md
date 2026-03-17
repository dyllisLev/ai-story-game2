# AI Story Game — 서버리스 배포 설계 문서

## 개요

AI Story Game을 온라인에 배포하고, 플레이 이력을 클라우드에 저장하여 기기 간 이어하기를 지원한다. 로그인 없이 UUID 세션 ID 기반으로 동작하며, 완전 서버리스 아키텍처를 사용한다.

## 아키텍처

```
[브라우저] ──→ Cloudflare Pages (정적 호스팅)
    │
    ├─→ Gemini API (AI 스토리, 기존과 동일)
    ├─→ Firebase Firestore (세션/프리셋 저장)
    └─→ localStorage (캐시 + 세션 목록)
```

- 서버 코드 없음
- 브라우저에서 Firestore JS SDK (CDN) 직접 사용
- 인증 없음 — UUID 세션 ID가 사실상 접근 토큰 역할

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 호스팅 | Cloudflare Pages | 도메인이 이미 Cloudflare, 무료, 빌드 불필요 |
| DB | Firebase Firestore (Spark 무료 플랜) | CDN SDK로 빌드 도구 없이 사용, 무료 한도 넉넉 |
| 프론트엔드 | 현재 그대로 (순수 HTML/CSS/JS) | 변경 최소화 |

### Firestore 무료 한도

- 저장: 1GB
- 읽기: 50,000/일
- 쓰기: 20,000/일

예상 사용량 (30명 × 5이야기/일): 이벤트 기반 저장으로 ~500~1,500 쓰기/일 (무료 한도의 10% 이하)

## 데이터 모델 (Firestore)

### 컬렉션: `sessions`

```
sessions/{sessionId}    // sessionId = UUID v4
├── title: string              // 이야기 제목
├── preset: object             // 사용된 프리셋 설정
│   ├── worldSetting: string
│   ├── story: string
│   ├── characterName: string
│   ├── characterSetting: string
│   ├── characters: string
│   ├── userNote: string
│   ├── systemRules: string
│   ├── useLatex: boolean
│   └── useCache: boolean
├── messages: array            // 대화 내역
│   └── [{role: string, content: string, timestamp: number}]
├── model: string              // 사용된 Gemini 모델
├── createdAt: timestamp
├── updatedAt: timestamp
├── lastPlayedAt: timestamp
├── ttl: timestamp | null      // 자동 삭제용 (향후 활성화)
```

- 세션 1개 = 문서 1개
- Firestore 문서 최대 1MB
- 200턴 기준 예상 크기: 200~500KB (턴당 1~2.5KB, LaTeX 포함 시)
- 300턴 초과 시 UI에 경고 표시, 500턴에서 하드 리밋 (새 세션 생성 유도)
- `messages` 배열의 각 항목은 Gemini API 포맷(`{role, parts}`)을 `{role, content, timestamp}`로 변환하여 저장

### 컬렉션: `presets`

```
presets/{presetId}     // presetId = UUID v4
├── title: string
├── data: object               // 프리셋 JSON 전체
├── createdAt: timestamp
├── isPublic: boolean          // 향후 공유 기능용
```

## 저장 전략

### 2계층 저장

```
턴 발생 → localStorage 즉시 저장 → 상태: "저장안됨"
        → 이벤트/주기/수동 저장 → Firestore → 상태: "저장됨"
```

### localStorage (비용 0, 즉시)

- **매 턴마다** 현재 세션 데이터 저장
- 세션 목록 캐시: `[{sessionId, title, lastPlayedAt}]`
- API 키, 모델 선택 등 설정 (기존과 동일)

### Firestore (이벤트 기반)

| 트리거 | 시점 | 비고 |
|--------|------|------|
| `visibilitychange` (hidden) | 탭 전환, 앱 최소화 | Firestore SDK 비동기 호출 |
| `pagehide` | 페이지 떠날 때 | `fetch()` + `keepalive: true`로 REST API 직접 호출 (SDK 비동기 호출은 페이지 종료 시 중단될 수 있음) |
| 5분 주기 (`setInterval`) | 안전망 | 모바일 갑작스러운 종료 대비, 최대 5분 손실 |
| 수동 저장 버튼 | 사용자 클릭 | 명시적 저장 |

#### 페이지 종료 시 안정적 저장

`pagehide` 이벤트에서 Firestore JS SDK의 비동기 Promise가 완료되기 전에 페이지가 종료될 수 있다. 이를 해결하기 위해 `pagehide` 핸들러에서는 Firestore REST API를 `fetch()` + `keepalive: true`로 직접 호출한다.

**중요: `keepalive` fetch는 페이로드 64KB 제한이 있다.** `messages` 배열 전체를 보내면 수십 턴만에도 초과할 수 있으므로, `pagehide`에서는 메타데이터만 저장하고 대화 내역은 다른 트리거에 의존한다:

```javascript
window.addEventListener('pagehide', () => {
  if (!isDirty) return;
  // 메타데이터만 전송 (64KB 미만 보장)
  fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sessions/${sessionId}?updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=lastPlayedAt`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toMetadataPayload(sessionData)),
    keepalive: true
  });
});
```

대화 내역(`messages`) 전체 저장은 다음 트리거에서 처리:
- `visibilitychange` (hidden) — SDK 비동기 호출, 탭 전환 시 브라우저가 즉시 종료하지 않으므로 충분한 시간 확보
- 5분 주기 자동 저장
- 수동 저장 버튼

이 설계에서 최악의 데이터 손실: 마지막 `visibilitychange`/주기 저장 이후의 턴만 유실 (메타데이터 타임스탬프는 `pagehide`로 보존).

### 더티 플래그

- 변경이 있을 때만 `isDirty = true`
- Firestore 저장 이벤트 발생 시 `isDirty` 확인 → false면 스킵
- 저장 성공 시 `isDirty = false`
- 저장 실패 시 `isDirty = true` 유지 → 다음 트리거(5분 주기 등)에서 자동 재시도
- `navigator.onLine` 감지: 오프라인이면 Firestore 쓰기 스킵, "오프라인 — 로컬만 저장" 상태 표시
- `online` 이벤트 수신 → 복귀 시 즉시 Firestore 동기화 시도

### 저장 상태 UI

| 상태 | 표시 | 조건 |
|------|------|------|
| 저장안됨 | `저장안됨` (회색/경고) | localStorage에만 존재, Firestore 미반영 |
| 저장 중... | `저장 중...` (노란색) | Firestore 전송 중 |
| 저장됨 | `저장됨` (녹색) | Firestore 반영 완료 |
| 저장 실패 | `저장 실패` (빨간색) | Firestore 오류 시 |

- 헤더 영역에 상태 인디케이터 + 수동 저장 버튼 배치
- 턴 추가 시 자동으로 `저장안됨`으로 전환

## 세션 관리 UX

### 세션 ID

- `crypto.randomUUID()`로 생성 (HTTPS 환경 필요, Cloudflare Pages가 제공)
- UUID v4 형식 (예: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- 생성 시점: 새 게임 시작 시
- 추측 불가, 중복 불가

### 세션 목록 관리

- localStorage의 세션 목록은 최대 50개로 제한
- 50개 초과 시 `lastPlayedAt` 기준 가장 오래된 항목 자동 제거
- 제거는 로컬 목록에서만 — Firestore 데이터는 유지 (세션 ID로 복구 가능)

### 새 게임 시작

1. UUID v4로 세션 ID 생성
2. Firestore에 세션 문서 생성 (preset, model, createdAt 등)
3. localStorage 세션 목록에 추가
4. 플레이 시작

### 이어하기 (같은 브라우저)

1. localStorage 세션 목록에서 선택
2. localStorage 캐시에서 즉시 로드 (빠른 복원)
3. 백그라운드에서 Firestore 최신 데이터와 비교 → `updatedAt` 기준으로 더 최신인 쪽을 채택 (last-write-wins)

### 충돌 해결 정책

- **Last-write-wins**: `updatedAt` 타임스탬프가 더 큰 쪽이 승리
- 두 기기에서 동시 플레이는 지원하지 않음 (한 쪽의 변경이 덮어씀)
- 세션 로드 시 localStorage vs Firestore 비교하여 최신 데이터 자동 선택

### 이어하기 (다른 기기)

1. 세션 ID 직접 입력
2. Firestore에서 로드
3. localStorage에 캐시 + 세션 목록에 추가

### play.html UI 추가 요소

- **세션 목록**: localStorage 기반, 제목 + 마지막 플레이 시간 표시
- **세션 ID 입력 필드**: 다른 기기에서 이어하기
- **세션 ID 복사 버튼**: 현재 세션 ID를 클립보드에 복사
- **저장 상태 인디케이터 + 수동 저장 버튼**: 헤더 영역

## 배포 (Cloudflare Pages)

### 설정

- GitHub 리포 연결 → `main` 브랜치 push 시 자동 배포
- 빌드 명령어: 없음 (Framework preset: None)
- 출력 디렉토리: `public/` (배포용 파일만 포함, docs/설정 파일 노출 방지)
- 커스텀 도메인: Cloudflare DNS에서 CNAME 레코드 추가

### 배포 파일 (`public/` 디렉토리)

```
public/
├── index.html          # 설정 페이지
├── play.html           # 게임 플레이 페이지
└── presets/
    └── basic-murim.json
```

기존 루트의 HTML 파일을 `public/`으로 이동. `docs/`, `story-game-settings.json`, `.superpowers/` 등은 배포에서 제외.

## Firebase 설정

### 필요 작업

1. Firebase 콘솔에서 프로젝트 생성
2. Firestore 데이터베이스 활성화
3. 웹 앱 등록 → Firebase config 키 발급
4. Firestore Security Rules 배포

### Firebase Config

`play.html`과 `index.html`에 CDN 스크립트 + config 삽입:

```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.x.x/firebase-app.js';
  import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.x.x/firebase-firestore.js';

  const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
</script>
```

참고: Firebase API 키는 공개 가능 (Firestore Security Rules가 접근 제어 담당)

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 세션: 누구나 읽기/생성 가능, 업데이트는 허용 필드만
    match /sessions/{sessionId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['title', 'createdAt'])
                    && request.resource.data.createdAt == request.time;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['messages', 'updatedAt', 'lastPlayedAt', 'title', 'ttl', 'preset', 'model']);
      allow delete: if false;
    }

    // 프리셋: 누구나 읽기/생성 가능, 수정/삭제 불가
    match /presets/{presetId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['title', 'createdAt'])
                    && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

참고: Firestore는 플랫폼 레벨에서 1MB 문서 크기 제한을 자동 적용. `createdAt == request.time` 검증으로 기본적인 남용 방지. 소규모 사용(~30명)이므로 Firebase App Check는 향후 필요 시 추가.

## 변경 범위

| 파일 | 변경 내용 |
|------|-----------|
| `play.html` | Firebase SDK 추가, 세션 관리 UI (목록, ID 입력, 복사), 저장 로직 (2계층), 저장 상태 인디케이터 + 수동 저장 버튼 |
| `index.html` | Firebase config 추가는 향후 프리셋 공유 기능 구현 시 (이번 스코프 아님) |
| `firestore.rules` | 새 파일 — Firestore Security Rules |
| 기존 Gemini 연동 | 변경 없음 |

## 스토리지 용량 예측

30명 × 5세션/일 × ~200KB/세션 = ~30MB/일

| 기간 | 누적 용량 | 무료 한도 대비 |
|------|-----------|---------------|
| 1주 | ~210MB | 21% |
| 1개월 | ~900MB | 90% |
| 2개월 | ~1.8GB | **초과** |

→ TTL 기반 자동 삭제를 1개월 이내에 구현 필요. 또는 사용 패턴이 예상보다 적으면 여유 있음.

## 향후 확장 (이번 범위 아님)

- **TTL 기반 세션 자동 삭제** (우선순위 높음 — 1개월 이내 구현 권장)
- 프리셋 공유/검색 기능
- 사용자 인증 추가 (필요 시)
- PWA 지원 (오프라인 플레이)
- Firebase App Check (남용 방지 강화)
