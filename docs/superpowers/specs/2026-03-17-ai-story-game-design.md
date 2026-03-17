# AI Story Game — 설계 문서

## 개요

AI(Gemini)를 활용한 인터랙티브 텍스트 소설 게임. 사용자가 세계관, 스토리, 캐릭터를 설정하면 AI가 이를 기반으로 소설을 진행하고, 사용자의 행동 입력에 따라 이야기가 분기된다.

테스트/프로토타입 목적의 단일 HTML 파일 애플리케이션.

## 기술 스택

- 순수 HTML + CSS + JS (단일 `index.html`)
- 외부 의존성 없음
- Gemini API 직접 호출 (`generativelanguage.googleapis.com`)

## 화면 구조

3분할 수평 레이아웃 (flexbox):

```
┌──────────────┬──────────────────┬────────────────────┐
│  ① 설정      │  ② 프롬프트      │  ③ 게임            │
│  (flex: 1)   │  미리보기        │  (flex: 1.2)       │
│              │  (flex: 1)       │                    │
│  API Key     │                  │  소설 텍스트 출력   │
│  모델 선택    │  읽기 전용       │  (스크롤 영역)      │
│  세계관       │  시스템 프롬프트  │                    │
│  스토리       │  조합 결과       │                    │
│  주인공 이름   │                  │                    │
│  주인공 설정   │  섹션별 색상 구분 │                    │
│  유저노트     │                  │  ──────────────    │
│              │                  │  입력창 + 전송 버튼  │
│  [게임 시작]  │                  │                    │
│  [저장][불러오기]│               │                    │
└──────────────┴──────────────────┴────────────────────┘
```

## 패널 상세

### 패널 ① 설정

| 필드 | 입력 타입 | 설명 |
|------|----------|------|
| API Key | `<input type="password">` | Gemini API 키 |
| 모델 선택 | `<select>` | API 키 입력 시 `models.list` 호출하여 동적 로드 |
| 세계관 | `<textarea>` | 게임의 세계관 설명 |
| 스토리 | `<textarea>` | 메인 스토리/줄거리 |
| 주인공 이름 | `<input type="text">` | 플레이어 캐릭터 이름 |
| 주인공 설정 | `<textarea>` | 캐릭터 배경/성격/능력 |
| 유저노트 | `<textarea>` | AI에 대한 추가 지시사항 (문체, 분위기 등) |

**버튼:**
- **게임 시작** — 프롬프트 조합 후 첫 장면 생성
- **저장** — 현재 설정을 JSON 파일로 다운로드
- **불러오기** — JSON 파일 업로드 후 폼에 반영

### 패널 ② 프롬프트 미리보기

- 읽기 전용, 모노스페이스 폰트
- 1번 패널 입력값 변경 시 실시간 갱신
- 섹션별 색상 구분으로 가독성 확보:
  - `[시스템 프롬프트]` — 빨간색
  - `[세계관]`, `[스토리]`, `[주인공]`, `[유저노트]` — 시안색

### 패널 ③ 게임

- 소설/텍스트 어드벤처 스타일
- AI 서술이 순차적으로 표시 (스트리밍)
- 하단 입력창에서 행동/대사 입력 → 전송
- 스크롤 자동 하단 이동

## Gemini API 연동

### 엔드포인트

- 모델 목록: `GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}`
  - 응답에서 `generateContent`를 지원하는 모델만 필터링 (이름이 `gemini-`로 시작하는 모델)
- 콘텐츠 생성 (스트리밍): `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={apiKey}`
  - SSE 스트림의 각 `data:` 라인은 JSON 객체, `candidates[0].content.parts[0].text`에서 텍스트 추출
  - generation config는 API 기본값 사용 (temperature, maxOutputTokens 등 별도 설정 없음)

### 요청 구조

```json
{
  "system_instruction": {
    "parts": [{ "text": "조합된 시스템 프롬프트" }]
  },
  "contents": [
    { "role": "user", "parts": [{ "text": "게임을 시작해줘" }] },
    { "role": "model", "parts": [{ "text": "첫 장면..." }] },
    { "role": "user", "parts": [{ "text": "유저 행동 입력" }] }
  ]
}
```

### 대화 히스토리 관리

- `contents` 배열로 전체 대화 히스토리 유지
- 게임 시작 시 첫 user 메시지: "게임을 시작해줘"
- 이후 사용자 입력 → user role, AI 응답 → model role로 누적

## 데이터 저장

### localStorage (자동)

- 키: `ai-story-game-settings`
- 모든 설정 필드값 실시간 저장
- 페이지 로드 시 자동 복원

### JSON 파일 (수동)

**저장 형식:**

```json
{
  "apiKey": "...",
  "model": "gemini-2.0-flash",
  "worldSetting": "중세 판타지 세계...",
  "story": "마왕이 부활하고...",
  "characterName": "아린",
  "characterSetting": "검술에 뛰어난 기사...",
  "userNote": "전투씬 묘사를 자세히..."
}
```

- **저장**: 설정 → JSON → `Blob` → `<a download>` 트리거
- **불러오기**: `<input type="file" accept=".json">` → 파싱 → 폼 반영 + localStorage 갱신

### Claude Code 연동 워크플로우

프롬프트 작성 비용을 절감하기 위한 협업 프로세스:

1. 사용자가 Claude Code에 원하는 게임 컨셉을 설명
2. Claude가 세계관/스토리/캐릭터 설정을 작성하고 JSON 파일로 프로젝트 폴더에 저장
3. Claude가 해당 프롬프트 기반으로 예상 스토리 전개를 시뮬레이션하여 미리보기 제공
4. 만족 시 → 앱에서 JSON 불러오기로 로드 → Gemini로 실제 테스트
5. 수정 필요 시 → Claude와 대화로 JSON 수정 → 재테스트

이를 통해 Gemini API 호출은 최종 테스트에만 사용하고, 프롬프트 반복 작업은 Claude Code 구독으로 처리.

## 시스템 프롬프트 템플릿

```
당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.
아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.

사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.
각 응답은 소설체로 작성하고, 마지막에 "▸ 당신의 행동은?" 으로 끝내세요.

[세계관]
{worldSetting}

[스토리]
{story}

[주인공]
이름: {characterName}
설정: {characterSetting}

[유저노트]
{userNote}
```

## 비기능 요구사항

- 다크 테마 UI
- 반응형 레이아웃 (최소 너비에서 세로 스택으로 전환은 미구현 — 데스크탑 전용)
- 에러 처리: API 키 미입력, 네트워크 오류, 잘못된 응답 시 사용자 알림
- 스트리밍 응답으로 타이핑 효과
