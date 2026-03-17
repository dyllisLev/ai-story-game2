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
- Firestore 문서 최대 1MB, 200턴 대화는 충분히 수용

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
| `visibilitychange` (hidden) | 탭 전환, 앱 최소화 | 모바일에서 가장 신뢰 |
| `pagehide` | 페이지 떠날 때 | 모바일 Safari 호환 |
| 5분 주기 (`setInterval`) | 안전망 | 모바일 갑작스러운 종료 대비, 최대 5분 손실 |
| 수동 저장 버튼 | 사용자 클릭 | 명시적 저장 |

### 더티 플래그

- 변경이 있을 때만 `isDirty = true`
- Firestore 저장 이벤트 발생 시 `isDirty` 확인 → false면 스킵
- 저장 성공 시 `isDirty = false`

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

- UUID v4 형식 (예: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- 생성 시점: 새 게임 시작 시
- 추측 불가, 중복 불가

### 새 게임 시작

1. UUID v4로 세션 ID 생성
2. Firestore에 세션 문서 생성 (preset, model, createdAt 등)
3. localStorage 세션 목록에 추가
4. 플레이 시작

### 이어하기 (같은 브라우저)

1. localStorage 세션 목록에서 선택
2. localStorage 캐시에서 즉시 로드 (빠른 복원)
3. 백그라운드에서 Firestore 최신 데이터와 비교 → 더 최신이면 갱신

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
- 출력 디렉토리: `/` (루트)
- 커스텀 도메인: Cloudflare DNS에서 CNAME 레코드 추가

### 배포 파일

```
/
├── index.html          # 설정 페이지
├── play.html           # 게임 플레이 페이지
├── presets/
│   └── basic-murim.json
└── (기타 정적 파일)
```

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
      allow create: if true;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['messages', 'updatedAt', 'lastPlayedAt', 'title', 'ttl', 'preset', 'model']);
      allow delete: if false;
    }

    // 프리셋: 누구나 읽기/생성 가능, 수정/삭제 불가
    match /presets/{presetId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

## 변경 범위

| 파일 | 변경 내용 |
|------|-----------|
| `play.html` | Firebase SDK 추가, 세션 관리 UI (목록, ID 입력, 복사), 저장 로직 (2계층), 저장 상태 인디케이터 + 수동 저장 버튼 |
| `index.html` | Firebase config 추가 (프리셋 저장/공유용, 향후) |
| `firestore.rules` | 새 파일 — Firestore Security Rules |
| 기존 Gemini 연동 | 변경 없음 |

## 향후 확장 (이번 범위 아님)

- TTL 기반 세션 자동 삭제 (Firestore TTL 정책 또는 scheduled function)
- 프리셋 공유/검색 기능
- 사용자 인증 추가 (필요 시)
- PWA 지원 (오프라인 플레이)
