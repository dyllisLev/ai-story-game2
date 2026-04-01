# AI Story Game - 화면 설계서 (Screen Design Specification)

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Designer (SDLC 2단계: 설계)
> **상태:** 최종

---

## 목차 (Table of Contents)

1. [개요](#개요)
2. [디자인 시스템](#디자인-시스템)
3. [공통 레이아웃](#공통-레이아웃)
4. [인증 플로우](#인증-플로우)
5. [Home 화면](#home-화면)
6. [Play 화면](#play-화면)
7. [Editor 화면](#editor-화면)
8. [Admin 화면](#admin-화면)
9. [반응형 디자인](#반응형-디자인)
10. [접근성](#접근성)

---

## 개요

본 문서는 AI Story Game 플랫폼의 전체 화면 설계를 정의한다. Phase 1 요구사항과 유스케이스를 기반으로, 현행 UI와 TO-BE 개선사항을 모두 반영한다.

### 설계 원칙

| 원칙 | 설명 |
|------|------|
| **일관성** | 모든 페이지에서 동일한 디자인 토큰, 간격, 타이포그래피 사용 |
| **피드백** | 사용자 모든 행동에 즉각적인 시각적 피드백 제공 |
| **계층 구조** | 명확한 시각적 계층으로 정보 우선순위 전달 |
| **접근성** | WCAG AA 준수, 키보드 내비게이션, 스크린 리더 지원 |
| **성능** | 최적화된 렌더링, 지연 로딩, 효율적인 애니메이션 |

### 관련 문서

- `docs/sdlc/phase1-requirements/03-UseCase-Specifications.md` — 15개 유스케이스
- `docs/sdlc/phase1-requirements/05-TO-BE-Process-Definitions.md` — 6개 프로세스 영역
- `docs/ui-designs/final/` — 현행 UI 디자인 시안

---

## 디자인 시스템

### 색상 토큰 (Color Tokens)

#### 다크 테마 (기본)

```css
:root {
  /* 기본 색상 */
  --bg-primary:      #0a0a0f;   /* 메인 배경 */
  --bg-secondary:    #111118;   /* 2차 배경 */
  --bg-card:         #16161f;   /* 카드 배경 */
  --bg-card-hover:   #1c1c28;   /* 카드 호버 */
  --bg-elevated:     #1e1e2a;   /* 높임 배경 */

  /* 테두리 */
  --border-subtle:   rgba(255,255,255,0.07);
  --border-default:  rgba(255,255,255,0.10);
  --border-strong:   rgba(255,255,255,0.16);
  --border-accent:   rgba(197,168,74,0.30);

  /* 텍스트 */
  --text-primary:    #f0eff8;   /* 1차 텍스트 */
  --text-secondary:  #9896b0;   /* 2차 텍스트 */
  --text-muted:      #5c5a72;   /* 비활성 텍스트 */

  /* 브랜드 컬러 */
  --accent:          #c5a84a;   /* 골드/엠버 */
  --accent-dim:      rgba(197,168,74,0.15);
  --accent-glow:     rgba(197,168,74,0.30);

  --purple:          #7c6df0;   /* 보라색 */
  --purple-dim:      rgba(124,109,240,0.15);
  --purple-glow:     rgba(124,109,240,0.25);

  /* 상태 컬러 */
  --rose:            #e05a7a;   /* 오류/삭제 */
  --rose-dim:        rgba(224,90,122,0.12);
  --teal:            #4ab8a8;   /* 성공/안내 */
  --teal-dim:        rgba(74,184,168,0.12);
  --amber:           #fbbf24;   /* 경고/시스템 메시지 */
}
```

#### 라이트 테마

```css
[data-theme="light"] {
  --bg-primary:      #f4f3fa;
  --bg-secondary:    #eceaf5;
  --bg-card:         #ffffff;
  --bg-card-hover:   #f8f7ff;
  --bg-elevated:     #f0eeff;

  --border-subtle:   rgba(0,0,0,0.08);
  --border-default:  rgba(0,0,0,0.10);
  --border-strong:   rgba(0,0,0,0.18);

  --text-primary:    #1a1826;
  --text-secondary:  #5a5870;
  --text-muted:      #9896b0;

  --accent:          #a8881e;
  --accent-dim:      rgba(168,136,30,0.10);
  --accent-glow:     rgba(168,136,30,0.20);

  --purple:          #6055d4;
  --purple-dim:      rgba(96,85,212,0.12);
}
```

### 타이포그래피 (Typography)

| 스타일 | 폰트 | 크기 | 웨이트 | 라인하이트 | 용도 |
|--------|------|------|--------|------------|------|
| **Display** | Noto Serif KR | clamp(28px, 5vw, 52px) | 700 | 1.2 | 히어로 제목 |
| **H1** | Noto Serif KR | 32px | 700 | 1.3 | 페이지 제목 |
| **H2** | Noto Sans KR | 20px | 600 | 1.4 | 섹션 제목 |
| **H3** | Noto Sans KR | 16px | 600 | 1.5 | 소섹션 제목 |
| **Body** | Noto Sans KR | 14px | 400 | 1.6 | 본문 |
| **Body Strong** | Noto Sans KR | 14px | 500 | 1.6 | 강조 본문 |
| **Caption** | Noto Sans KR | 12px | 400 | 1.5 | 캡션/라벨 |
| **Small** | Noto Sans KR | 11px | 500 | 1.4 | 작은 텍스트 |
| **Mono** | JetBrains Mono | 13px | 400 | 1.5 | 코드/시스템 |

### 간격 (Spacing)

```css
--space-1:  4px;    /* 아주 작은 간격 */
--space-2:  8px;    /* 작은 간격 */
--space-3:  12px;   /* 기본 간격 */
--space-4:  16px;   /* 보통 간격 */
--space-5:  20px;   /* 넓은 간격 */
--space-6:  24px;   /* 큰 간격 */
--space-8:  32px;   /* 매우 큰 간격 */
--space-10: 40px;   /* 섹션 간격 */
--space-12: 48px;   /* 페이지 레벨 간격 */
```

### 라운드 (Radius)

```css
--radius-sm:   4px;   /* 작은 둥근 모서리 */
--radius-md:   8px;   /* 기본 둥근 모서리 */
--radius-lg:   12px;  /* 큰 둥근 모서리 */
--radius-xl:   16px;  /* 매우 큰 둥근 모서리 */
--radius-full: 9999px; /* 완전 둥글 */
```

### 트랜지션 (Transition)

```css
--duration-fast:   100ms;
--duration-base:   200ms;
--duration-slow:   350ms;
--easing:          cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 공통 레이아웃

### 헤더 (Header)

#### 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  [Search Box]           [Icon] [Icon] [Avatar]              │
└─────────────────────────────────────────────────────────────────────┘
```

#### 레이아웃

```css
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 60px;
  background: rgba(10,10,15,0.85); /* 다크 */
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--border-subtle);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
```

#### 컴포넌트 사양

**1. 로고**

```
[▦] 스토리월드
```

- 아이콘: 32×32px, 그라데이션 (accent → purple)
- 텍스트: Noto Serif KR, 16px, Bold
- 링크: `/`
- 호버: 미려함(미사용)

**2. 검색 박스**

```
[🔍] 검색어 입력... [⌘K]
```

- 너비: flex 1, 최대 480px
- 높이: 38px
- 배경: var(--bg-card)
- 테두리: 1px solid var(--border-subtle)
- 포커스: 1px solid var(--accent), box-shadow 0 0 0 3px var(--accent-dim)
- 플레이스홀더: var(--text-muted)
- 단축키 표시: 우측 상단, 11px

**3. 헤더 액션 버튼**

```
[✏️] [🔔] [👤▼]
```

- 아이콘 버튼: 36×36px
- 테두리: 1px solid var(--border-subtle)
- 호버: 배경 var(--bg-card), 테두리 var(--border-default)
- 사용자 아바타: 34×34px, 둥근, 그라데이션 배경

**4. 아바타 드롭다운**

```
┌─────────────────────────┐
│ 홍길동                  │
│ hong@example.com        │
├─────────────────────────┤
│ [📝] 내 스토리          │
│ [⚙️] 설정               │
│ [🌙] 다크 모드          │
├─────────────────────────┤
│ [🚪] 로그아웃           │
└─────────────────────────┘
```

- 너비: 최소 200px
- 배경: var(--bg-card)
- 라운드: var(--radius-lg)
- 그림자: 0 16px 48px rgba(0,0,0,0.5)
- 애니메이션: opacity + transform 180ms

### 푸터 (Footer)

```
┌─────────────────────────────────────────────────────────────────────┐
│  © 2026 AI Story Game · [이용약관] [개인정보] [문의]               │
└─────────────────────────────────────────────────────────────────────┘
```

- 높이: 60px
- 배경: var(--bg-secondary)
- 테두리: 상단 1px solid var(--border-subtle)
- 텍스트: var(--text-muted), 12px

---

## 인증 플로우

### 회원가입 (Signup)

#### 페이지: `/signup`

```
┌─────────────────────────────────────────────────────────────────────┐
│                              [Logo]                                 │
│                                                                     │
│                        스토리월드에 오신 것을                       │
│                        환영합니다                                   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  이메일                                                    │  │
│   │  [_____________________________________________]            │  │
│   │                                                            │  │
│   │  비밀번호 (8자 이상)                                       │  │
│   │  [_____________________________________________]            │  │
│   │                                                            │  │
│   │  비밀번호 확인                                             │  │
│   │  [_____________________________________________]            │  │
│   │                                                            │  │
│   │              [가입하기]                                     │  │
│   │                                                            │  │
│   │  이미 계정이 있으신가요? [로그인]                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 레이아웃

```css
.signup-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(ellipse 70% 50% at 30% 0%, rgba(124,109,240,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 80% 0%, rgba(197,168,74,0.08) 0%, transparent 60%);
}

.signup-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}
```

#### 폼 필드 사양

**이메일 입력**

- 라벨: 13px, var(--text-secondary), 500 weight
- 입력상자: 높이 44px, 배경 var(--bg-elevated)
- 플레이스홀더: "example@email.com"
- 유효성 검사: 이메일 형식, 중복 체크

**비밀번호 입력**

- 라벨: 13px, var(--text-secondary)
- 입력상자: 높이 44px, type="password"
- 강도 표시: Weak (빨강) → Medium (노랑) → Strong (녹색)
- 에러 메시지: 입력상자 하단, var(--rose), 12px

**가입하기 버튼**

- 너비: 100%
- 높이: 44px
- 배경: var(--accent)
- 텍스트: 14px, Bold, #0a0a0f
- 호버: 배경 #d4b85a, box-shadow 0 0 20px var(--accent-glow)
- 비활성: opacity 0.5, pointer-events none

### 로그인 (Login)

#### 페이지: `/login`

```
┌─────────────────────────────────────────────────────────────────────┐
│                              [Logo]                                 │
│                                                                     │
│                        다시 오신 것을                               │
│                        환영합니다                                   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  이메일                                                    │  │
│   │  [_____________________________________________]            │  │
│   │                                                            │  │
│   │  비밀번호                                                 │  │
│   │  [___________________________________] [비밀번호 찾기]     │  │
│   │                                                            │  │
│   │              [로그인]                                      │  │
│   │                                                            │  │
│   │  계정이 없으신가요? [회원가입]                              │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 레이아웃

회원가입과 동일한 레이아웃 사용.

#### 폼 필드 사양

**이메일 입력**

- 회원가입과 동일

**비밀번호 입력**

- 입력상자: 높이 44px, type="password"
- "비밀번호 찾기" 링크: 우측, 12px, var(--accent)

---

## Home 화면

### 페이지: `/`

#### 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Header]                                                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─[Hero Section]──────────────────────────────────────────────┐   │
│  │  추천 스토리                                                  │   │
│  │  [카드1] [카드2] [카드3]                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─[Continue Section]────────(로그인 시)────────────────────────┐   │
│  │  이어하기                                                     │   │
│  │  [세션1] [세션2] [세션3]                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─[Filter Bar]─────────────────────────────────────────────────┐   │
│  │  [전체] [무협] [판타지] [로맨스] [+] 검색 [▼ 최신순]        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─[Story Grid]─────────────────────────────────────────────────┐   │
│  │  [카드] [카드] [카드] [카드]                                 │   │
│  │  [카드] [카드] [카드] [카드]                                 │   │
│  │  [카드] [카드] [카드] [카드]                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─[Pagination]─────────────────────────────────────────────────┐   │
│  │  [<] [1] [2] [3] ... [10] [>]                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 히어로 섹션 (Hero Section)

#### 목적
추천 스토리(Featured)를 시각적으로 강조하여 사용자의 관심을 끈다.

#### 레이아웃

```css
.hero {
  position: relative;
  overflow: hidden;
  padding: 72px 24px 56px;
  text-align: center;
  border-bottom: 1px solid var(--border-subtle);
  background:
    radial-gradient(ellipse 70% 50% at 30% 0%, rgba(124,109,240,0.12) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 80% 0%, rgba(197,168,74,0.08) 0%, transparent 60%);
}
```

#### 컴포넌트 사양

**1. 히어로 제목**

```
천 마신의 세계에
오신 것을 환영합니다
```

- 폰트: Noto Serif KR
- 크기: clamp(28px, 5vw, 52px)
- 웨이트: 700
- 컬러: 그라데이션 (text-primary → text-secondary)
- 라인하이트: 1.2

**2. 히어로 부제**

```
AI와 함께하는 무한한 이야기의 세계
```

- 크기: 15px
- 컬러: var(--text-secondary)
- 최대 너비: 480px, 중앙 정렬

**3. 히어로 통계**

```
[1,234] 스토리    [5,678] 플레이    [890] 작성자
```

- 레이아웃: flex, 간격 48px
- 숫자: Noto Serif KR, 26px, Bold, var(--accent)
- 라벨: 12px, var(--text-muted)

**4. 히어로 CTA 버튼**

```
[스토리 둘러보기] [새 스토리 만들기]
```

- 높이: 44px
- 패딩: 0 28px
- 간격: 12px

**추천 스토리 카드**

```
┌──────────────────────────────┐
│  ┌────────────────────────┐  │
│  │      배너 이미지        │  │
│  │   (그라데이션 오버레이) │  │
│  │                          │  │
│  │    [⭐] 추천             │  │
│  └────────────────────────┘  │
│  천마신교                    │
│  무림LINEX의 대작           │
│  🎮 1.2K  ❤️ 345            │
└──────────────────────────────┘
```

- 너비: 280px
- 배너 높이: 160px
- 배너: 그라데이션 + 아이콘
- 추천 배지: 좌상단, var(--accent)
- 제목: 16px, Bold, 2줄 말줄임
- 설명: 13px, var(--text-secondary), 2줄 말줄임
- 통계: 12px, var(--text-muted)
- 호버: transform translateY(-4px), box-shadow

### 이어하기 섹션 (Continue Section)

#### 목적
로그인 사용자에게 최근 플레이 세션을 표시하여 재접속을 유도한다.

#### 레이아웃

```css
.continue-section {
  padding: 32px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}
```

#### 컴포넌트 사양

**세션 카드**

```
┌──────────────────────────────────┐
│ 천마신교                          │
│ 제10장: 결전의 시간               │
│ ⏱️ 2시간 전 · 🎮 15턴            │
│ [━━━━━━━━━━] 60%                 │
└──────────────────────────────────┘
```

- 너비: 200px
- 높이: 100px
- 배경: var(--bg-card)
- 테두리: 1px solid var(--border-subtle)
- 라운드: var(--radius-lg)
- 진행률 바: 높이 4px, var(--purple)

### 필터 바 (Filter Bar)

#### 목적
사용자가 장르, 검색어, 정렬 기준으로 스토리 목록을 필터링한다.

#### 레이아웃

```css
.filters-bar {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
}
```

#### 컴포넌트 사양

**1. 장르 필터 칩**

```
[전체] [무협] [판타지] [로맨스] [현대] [+]
```

- 높이: 32px
- 패딩: 0 14px
- 라운드: var(--radius-full)
- 배경: transparent
- 테두리: 1px solid var(--border-subtle)
- 컬러: var(--text-secondary)
- 활성: 배경 var(--accent), 텍스트 #0a0a0f
- 호버: 테두리 var(--border-default), 텍스트 var(--text-primary)

**2. 검색 입력**

```
[🔍] 검색어 입력...
```

- 너비: 200px
- 높이: 32px
- 패딩: 0 12px 0 36px
- 라운드: var(--radius-full)
- 아이콘: 좌측 12px

**3. 정렬 드롭다운**

```
[▼ 최신순]
```

- 높이: 32px
- 패딩: 0 32px 0 12px
- 라운드: var(--radius-md)
- 옵션: 최신순, 인기순, 이름순

### 스토리 그리드 (Story Grid)

#### 목적
스토리 카드를 그리드 레이아웃으로 표시한다.

#### 레이아웃

```css
.story-grid {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

@media (max-width: 640px) {
  .story-grid {
    grid-template-columns: 1fr;
  }
}
```

#### 스토리 카드

```
┌────────────────────────────────────┐
│  ┌──────────────────────────────┐  │
│  │      배너 이미지              │  │
│  │   (그라데이션 오버레이)       │  │
│  └──────────────────────────────┘  │
│  천마신교                          │
│  무림LINEX의 대작                 │
│  🎮 1.2K  ❤️ 345  ⏱️ 2일 전       │
└────────────────────────────────────┘
```

- 너비: 280px
- 배너 높이: 160px
- 배너: 그라데이션 (아이콘 + 2색)
- 제목: 16px, Bold, 2줄 말줄임
- 설명: 13px, var(--text-secondary), 2줄 말줄임
- 통계: 12px, var(--text-muted)
- 호버:
  - transform: translateY(-4px)
  - box-shadow: 0 12px 32px rgba(0,0,0,0.3)
  - 배경: var(--bg-card-hover)
- 애니메이션: 200ms ease

### 페이지네이션 (Pagination)

```
[<] [1] [2] [3] ... [10] [>]
```

- 높이: 36px
- 버튼: 36×36px, 라운드 var(--radius-md)
- 활성 페이지: 배경 var(--accent), 텍스트 #0a0a0f
- 비활성: 테두리 1px solid var(--border-subtle)

---

## Play 화면

### 페이지: `/play/:storyId`

#### 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Top Bar]                                                           │
├──────┬────────────────────────────────────────────────────┬─────────┤
│      │                                                    │         │
│  세션 │              스토리 콘텐츠                          │  정보   │
│  패널 │             (대화 기록)                           │  패널   │
│      │                                                    │         │
│      │  ┌──────────────────────────────────────────────┐  │         │
│      │  │  시스템: 천마신교 세계에 오신 것을 환영한다   │  │         │
│      │  ├──────────────────────────────────────────────┤  │         │
│      │  │  사용자: 마을 입구에서 기다린다               │  │         │
│      │  ├──────────────────────────────────────────────┤  │         │
│      │  │  AI: 흑의 봉인을 풀고 마을로 들어서니...     │  │         │
│      │  └──────────────────────────────────────────────┘  │         │
│      │                                                    │         │
│      │  [제안 칩] [제안 칩] [제안 칩]                     │         │
│      │                                                    │         │
│      │  [행동] [생각] 대화 입력...         [전송]         │         │
│      │                                                    │         │
└──────┴────────────────────────────────────────────────────┴─────────┘
```

### 레이아웃 (3-Column Grid)

```css
.play-layout {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  grid-template-rows: 48px 1fr;
  height: 100vh;
  overflow: hidden;
  transition: grid-template-columns var(--duration-slow) var(--easing);
}

/* 왼쪽 패널 접기 */
.play-layout.left-collapsed {
  grid-template-columns: 0px 1fr 320px;
}

/* 오른쪽 패널 접기 */
.play-layout.right-collapsed {
  grid-template-columns: 260px 1fr 0px;
}

/* 양쪽 모두 접기 */
.play-layout.both-collapsed {
  grid-template-columns: 0px 1fr 0px;
}

@media (max-width: 1024px) {
  .play-layout {
    grid-template-columns: 0px 1fr 0px;
  }
}
```

### 탑 바 (Top Bar)

#### 구조

```
[▦] 천마신교 [NEW] │ [🔑 API키 입력...] [▼ 모델] [◀] [▶] [⚙️] [👤]
```

#### 레이아웃

```css
.topbar {
  grid-column: 1 / -1;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 50;
}
```

#### 컴포넌트 사양

**1. 로고 + 스토리 제목**

```
[▦] 천마신교 [NEW]
```

- 로고: 24×24px
- 스토리 제목: 14px, Semibold, 1줄 말줄임
- NEW 배지: 18px 높이, var(--purple)

**2. API 키 입력**

```
[🔑] AIzaSy...***xxx
```

- 너비: 145px
- 높이: 28px
- 라운드: var(--radius-md)
- 아이콘: 좌측, 12px
- 마스킹: `***xxx` (마지막 3자만 표시)

**3. 모델 선택**

```
[▼ gemini-2.0-flash]
```

- 높이: 28px
- 패딩: 0 24px 0 12px
- 라운드: var(--radius-md)
- 배경: var(--bg-elevated)
- 화살표: 우측, 10px SVG

**4. 토글 버튼**

```
[◀] [▶] [⚙️]
```

- 크기: 30×30px
- 아이콘: 13px
- 활성: 배경 var(--brand-muted)

### 세션 패널 (Left Panel)

#### 목적
사용자의 플레이 세션 목록을 표시하고, 새 세션을 시작할 수 있다.

#### 레이아웃

```css
.panel-left {
  background: var(--panel-bg);
  border-right: 1px solid var(--border-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--panel-header-bg);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 10;
}
```

#### 컴포넌트 사양

**1. 새 세션 버튼**

```
┌────────────────────┐
│  [+ 새 세션 시작]   │
└────────────────────┘
```

- 높이: 36px
- 테두리: 1px dashed var(--border-strong)
- 라운드: var(--radius-lg)
- 컬러: var(--text-tertiary)
- 호버: 테두리 var(--brand), 텍스트 var(--brand)

**2. 세션 그룹 라벨**

```
오늘
```

- 패딩: 12px 12px 8px
- 크기: 10px
- 웨이트: 600
- 텍스트 변환: uppercase
- 컬러: var(--text-tertiary)

**3. 세션 아이템**

```
┌────────────────────────┐
│ 제10장: 결전의 시간     │
│ ⏱️ 2시간 전 · 15턴      │
│ [━━━━━━━━━━] 60%       │
└────────────────────────┘
```

- 패딩: 10px
- 라운드: var(--radius-md)
- 배경: transparent
- 호버: 배경 var(--bg-elevated)
- 활성: 배경 var(--brand-muted), 테두리 var(--brand)
- 진행률 바: 높이 2px, var(--brand)

### 스토리 콘텐츠 (Center Panel)

#### 목적
AI와의 대화 기록을 표시하고, 사용자 입력을 받는다.

#### 레이아웃

```css
.story-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.story-content::-webkit-scrollbar {
  width: 5px;
}
```

#### 컴포넌트 사양

**1. 시스템 메시지**

```
┌──────────────────────────────────────────────┐
│ 📢 천마신교 세계에 오신 것을 환영합니다      │
│    무림LINEX의 대작을 시작하십시오           │
└──────────────────────────────────────────────┘
```

- 배경: var(--amber-dim)
- 테두리: 1px solid var(--border-accent)
- 라운드: var(--radius-lg)
- 아이콘: 16px, var(--amber)
- 텍스트: 14px, var(--text-primary)
- 패딩: 12px 16px

**2. 내레이터 블록**

```
┌──────────────────────────────────────────────┐
│ 흑의 봉인을 풀고 마을로 들어서니, 소문만    │
│ 듣던 장면이 펼쳐진다.                       │
└──────────────────────────────────────────────┘
```

- 배경: transparent
- 텍스트: var(--narr-text)
- 폰트: Noto Serif KR, 15px
- 라인하이트: 1.8
- 패딩: 8px 0

**3. 대화 블록**

```
┌──────────────────────────────────────────────┐
│ 홍길동                                       │
│ ┌──────────────────────────────────────────┐ │
│ │ 마을 입구에서 기다린다                    │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

- 이름: 13px, var(--dialogue-char-color), Bold
- 말풍선: 배경 var(--bg-elevated), 라운드 var(--radius-lg)
- 텍스트: var(--dialogue-text-color), 14px

**4. 상태창 (```status``` block 파싱)**

```
┌──────────────────────────────────────────────┐
│  체력  │  ████████░░ 80/100                 │
│  내공  │  ██████░░░░ 60/100                 │
│  경험  │  Level 5                           │
└──────────────────────────────────────────────┘
```

- 배경: var(--bg-overlay)
- 라운드: var(--radius-lg)
- 패딩: 12px
- 속성명: 12px, var(--text-secondary)
- 게이지: 높이 6px, 라운드 var(--radius-full)

**5. 제안 칩 (Suggestion Chips)**

```
[주변을 둘러본다] [마을 사람들에게 말을 건다] [무기를 점검한다]
```

- 높이: 32px
- 패딩: 0 16px
- 라운드: var(--radius-full)
- 배경: var(--bg-card)
- 테두리: 1px solid var(--border-default)
- 호버: 배경 var(--brand-muted), 테두리 var(--brand)

**6. 입력 영역**

```
┌────────────────────────────────────────────┐
│ [행동] [생각]                              │
│ [대화 입력...]              [전송]         │
└────────────────────────────────────────────┘
```

- 배경: var(--bg-raised)
- 라운드: var(--radius-lg)
- 패딩: 12px
- 모드 버튼: 높이 28px, 라운드 var(--radius-md)
- 입력상자: flex 1, 최소 높이 40px
- 전송 버튼: 40×40px, 라운드 var(--radius-md), 배경 var(--accent)

### 정보 패널 (Right Panel)

#### 목적
캐릭터 정보, 메모리, 노트를 표시한다.

#### 레이아웃

```css
.panel-right {
  background: var(--panel-bg);
  border-left: 1px solid var(--border-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

#### 컴포넌트 사양

**1. 탭 네비게이션**

```
┌──────────────────────────────────┐
│ [정보] [메모리] [노트]            │
└──────────────────────────────────┘
```

- 높이: 48px
- 탭: flex 1, 중앙 정렬
- 활성: 하단 테두리 2px solid var(--brand)

**2. 정보 탭 (Info Tab)**

```
┌──────────────────────────────────┐
│ 홍길동                            │
│ 무림LINEX 제자                    │
│ ──────────────────────────        │
│ 체력  │ 80/100                    │
│ 내공  │ 60/100                    │
│ 경험  │ Level 5                   │
└──────────────────────────────────┘
```

- 캐릭터명: 18px, Bold
- 직업: 13px, var(--text-secondary)
- 속성: 게이지 또는 숫자

**3. 메모리 탭 (Memory Tab)**

```
┌──────────────────────────────────┐
│ 최근 사건                         │
│ • 천마신교 본거지 발견           │
│ • 흑의 봉인 해제                 │
│ ──────────────────────────        │
│ 장기 메모리                       │
│ 무림LINEX과 함께 마을을 탈출...   │
└──────────────────────────────────┘
```

- 섹션 제목: 12px, Bold, uppercase
- 항목: 13px, bullet list
- 장기 메모리: 13px, var(--text-secondary)

**4. 노트 탭 (Notes Tab)**

```
┌──────────────────────────────────┐
│ [+ 새 노트]                       │
│ ──────────────────────────        │
│ 📝 천마신교 약점                  │
│ 3일 전                            │
│ 불화의 진공격에 취약함...         │
└──────────────────────────────────┘
```

- 노트 카드: 배경 var(--bg-elevated), 라운드 var(--radius-md)
- 제목: 14px, Bold
- 날짜: 11px, var(--text-muted)
- 내용: 13px, var(--text-secondary)

---

## Editor 화면

### 페이지: `/editor` 또는 `/editor/:storyId`

#### 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Editor Header]                                                     │
├──────┬─────────────────────────────────────────────────────┬────────┤
│      │                                                     │        │
│  사이드바 │          에디터 영역                           │  미리보기│
│          │                                             │          │
│  [기본 설정]                                             │          │
│  [세계관]   ┌──────────────────────────────────────────┐  │          │
│  [스토리]   │                                          │  │  프롬프트│
│  [캐릭터]   │  세계관 입력...                           │  │  미리보기│
│  [시스템 규칙]│                                          │  │          │
│  [출력 설정]│                                          │  │          │
│  [상태창]   │                                          │  │          │
│  [공개 설정]│                                          │  │          │
│  [프리셋]   └──────────────────────────────────────────┘  │          │
│             │                                             │          │
│             │  [저장] [프롬프트 미리보기] [테스트 플레이]   │          │
└──────┴─────────────────────────────────────────────────────┴────────┘
```

### 레이아웃 (3-Column)

```css
.editor-layout {
  display: grid;
  grid-template-columns: 240px 1fr 400px;
  height: calc(100vh - 60px); /* 헤더 제외 */
  overflow: hidden;
}

@media (max-width: 1024px) {
  .editor-layout {
    grid-template-columns: 240px 1fr 0px;
  }
}
```

### 에디터 헤더 (Editor Header)

#### 구조

```
[←] [새 스토리]                         [저장] [프롬프트 미리보기] [▶ 테스트 플레이]
```

#### 레이아웃

```css
.editor-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border-subtle);
}
```

#### 컴포넌트 사양

**1. 뒤로 가기 버튼**

```
[←]
```

- 크기: 36×36px
- 라운드: var(--radius-md)
- 아이콘: 16px

**2. 스토리 제목**

```
새 스토리
```

- 크기: 18px
- 웨이트: 600

**3. 액션 버튼**

```
[저장] [프롬프트 미리보기] [▶ 테스트 플레이]
```

- 높이: 36px
- 저장: 둥급 버튼 (ghost)
- 프롬프트 미리보기: 둥급 버튼
- 테스트 플레이: 프라이머리 버튼 (accent)

### 사이드바 (Editor Sidebar)

#### 목적
에디터 섹션을 빠르게 전환한다.

#### 레이아웃

```css
.editor-sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  overflow-y: auto;
  padding: 16px 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all var(--duration-base) var(--easing);
}

.sidebar-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--brand-muted);
  border-left-color: var(--brand);
  color: var(--brand);
}
```

#### 컴포넌트 사양

**사이드바 아이템**

```
[📝] 기본 설정
[🌍] 세계관
[📖] 스토리
[👥] 캐릭터
[⚙️] 시스템 규칙
[📤] 출력 설정
[📊] 상태창
[🔒] 공개 설정
[📋] 프리셋
```

- 아이콘: 16px
- 텍스트: 13px
- 활성: 배경 var(--brand-muted), 좌측 테두리 2px solid var(--brand)

### 에디터 영역 (Center Panel)

#### 목적
각 섹션별로 스토리 정보를 입력한다.

#### 레이아웃

```css
.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.editor-section {
  max-width: 720px;
  margin: 0 auto;
}
```

#### 컴포넌트 사양

**1. 섹션 제목**

```
기본 설정
```

- 크기: 24px
- 웨이트: 600
- 하단 간격: 16px

**2. 폼 필드**

```
제목
[_____________________________________________________________]

설명
[_____________________________________________________________]
[_____________________________________________________________]

아이콘
[⚔️] [🧙] [👸] [🎭] [🌟] [+]

배너 그라데이션
[linear-gradient(135deg, #7c6df0, #e05a7a)]
```

- 라벨: 13px, var(--text-secondary), 500 weight, 하단 간격 6px
- 입력상자: 높이 40px, 배경 var(--bg-elevated), 라운드 var(--radius-md)
- 텍스트영역: 최소 높이 100px, 동적 확장
- 아이콘 선택기: 36×36px 버튼 그리드
- 배너 그라데이션: 미리보기 + 색상 선택기

**3. 캐릭터 카드**

```
┌──────────────────────────────────────────────────┐
│ 👤 캐릭터                     [편집] [삭제]       │
│ ──────────────────────────────────────────────── │
│ 이름: 홍길동                                      │
│ 성격: 용맹하고 정의로움                            │
│ 배경: 무림LINEX 제자                               │
└──────────────────────────────────────────────────┘
```

- 배경: var(--bg-card)
- 라운드: var(--radius-lg)
- 패딩: 16px
- 호버: 배경 var(--bg-card-hover)

**4. 섹션별 에디터**

**세계관 (WorldSetting)**
- 큰 텍스트영역: 최소 높이 200px
- 플레이스홀더: "세계관 배경 설정을 입력하세요..."

**스토리 (StorySection)**
- 세부 섹션:
  - 스토리 개요
  - 캐릭터명
  - 캐릭터 설정
- 각각 별도 텍스트영역

**시스템 규칙 (SystemRules)**
- 텍스트영역: 최소 높이 150px
- 플레이스홀더: "게임 룰과 제약사항을 입력하세요..."

### 미리보기 패널 (Right Panel)

#### 목적
조합된 시스템 프롬프트를 실시간으로 확인한다.

#### 레이아웃

```css
.preview-panel {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
```

#### 컴포넌트 사양

**프롬프트 미리보기**

```
┌──────────────────────────────────────────┐
│ 프롬프트 미리보기                         │
├──────────────────────────────────────────┤
│                                          │
│ # 시스템 프롬프트                         │
│                                          │
│ ## 세계관                                 │
│ 무림LINEX의 세계...                       │
│                                          │
│ ## 스토리                                 │
│ 천마신교가 세상을 지배한다...              │
│                                          │
│ ## 캐릭터                                 │
│ • 홍길동: 용맹하고 정의로움              │
│                                          │
│ ## 시스템 규칙                            │
│ 1. 사용자는 [행동], [생각] 모드를...     │
│                                          │
└──────────────────────────────────────────┘
```

- 폰트: JetBrains Mono, 12px
- 마크다운 렌더링
- 라인하이트: 1.6

### 테스트 플레이 모달 (TestPlayModal)

#### 목적
에디터에서 바로 테스트 플레이를 한다.

#### 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│ [✕] 테스트 플레이                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  시스템: 천마신교 세계에 오신 것을 환영한다                  │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  사용자: 마을 입구에서 기다린다                             │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  AI: 흑의 봉인을 풀고 마을로 들어서니...                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [행동] [생각] 대화 입력...                        [전송]         │
│                                                                     │
│                                        [닫기]                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 사양

- 너비: 90vw, 최대 1000px
- 높이: 80vh, 최대 700px
- 배경: var(--bg-primary)
- 라운드: var(--radius-xl)
- 오버레이: rgba(0,0,0,0.7)
- Play 화면과 동일한 레이아웃, 패널 없이 콘텐츠만 표시

---

## Admin 화면

### 페이지: `/admin`

#### 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Admin Header]                                                      │
├──────┬──────────────────────────────────────────────────────────────┤
│      │                                                              │
│ 네비 │              콘텐츠 영역                                     │
│ 게이션 │                                                              │
│      │  ┌──────────────────────────────────────────────────────┐  │
│ [대시보드]  │  전체 스토리    전체 플레이    전체 작성자           │  │
│ [서비스 로그] │  [1,234]       [5,678]        [890]                │  │
│ [API 로그]   └──────────────────────────────────────────────────────┘  │
│ [설정]                                                                │
│ [상태창]                                                              │
│ [위험 구역] │                                                          │
└──────┴──────────────────────────────────────────────────────────────┘
```

### 레이아웃 (2-Column)

```css
.admin-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: calc(100vh - 60px);
  overflow: hidden;
}

@media (max-width: 768px) {
  .admin-layout {
    grid-template-columns: 0px 1fr;
  }
}
```

### 어드민 헤더 (Admin Header)

#### 구조

```
[Admin Panel]                                      [관리자] [로그아웃]
```

#### 사양

- 높이: 48px
- 배경: var(--bg-raised)
- 테두리: 하단 1px solid var(--border-subtle)
- 제목: 16px, Bold

### 어드민 네비게이션 (AdminNav)

#### 목적
관리자 기능 메뉴를 제공한다.

#### 레이아웃

```css
.admin-nav {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  padding: 16px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all var(--duration-base) var(--easing);
}

.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--brand-muted);
  border-left-color: var(--brand);
  color: var(--brand);
}
```

#### 컴포넌트 사양

**메뉴 아이템**

```
[📊] 대시보드
[📋] 서비스 로그
[🔌] API 로그
[⚙️] 설정
[📊] 상태창 프리셋
[⚠️] 위험 구역
```

- 아이콘: 16px
- 텍스트: 13px
- 활성: 배경 var(--brand-muted), 좌측 테두리 2px solid var(--brand)

### 대시보드 (Dashboard)

#### 목적
시스템 전체 통계를 실시간으로 표시한다.

#### 레이아웃

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  padding: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
}
```

#### 컴포넌트 사양

**통계 카드**

```
┌────────────────────┐
│ 전체 스토리        │
│                    │
│      1,234         │
│   +12% 이번 주      │
└────────────────────┘
```

- 너비: 240px
- 배경: var(--bg-card)
- 라운드: var(--radius-lg)
- 제목: 13px, var(--text-secondary)
- 숫자: 32px, Bold, var(--accent)
- 변화: 12px, var(--teal) (증가), var(--rose) (감소)

### 서비스 로그 (ServiceLogs)

#### 목적
HTTP 요청 로그를 필터링하여 검색한다.

#### 레이아웃

```css
.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.logs-table th {
  background: var(--bg-elevated);
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--border-subtle);
}

.logs-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-subtle);
}
```

#### 컴포넌트 사양

**필터 바**

```
[▼ 모든 메서드] [▼ 모든 경로] [▼ 모든 상태] [검색어 입력...]
```

- 높이: 36px
- 셀렉트: 120px
- 검색: flex 1

**로그 테이블**

```
┌────────┬─────────────────────┬──────┬─────────┬──────────┐
│ 시간   │ 메서드  │ 경로            │ 상태 │ 지연(ms) │ IP        │
├────────┼─────────┼─────────────────┼──────┼─────────┼──────────┤
│ 12:34 │ POST    │ /api/game/chat  │ 200  │ 1234    │ 1.2.3.4   │
│ 12:33 │ GET     │ /api/stories    │ 200  │ 45      │ 5.6.7.8   │
└────────┴─────────┴─────────────────┴──────┴─────────┴──────────┘
```

- 헤더: 배경 var(--bg-elevated), 13px, Bold
- 셀: 패딩 12px, 하단 테두리 1px solid var(--border-subtle)
- 상태 코드 색상: 200 (var(--teal)), 400 (var(--amber)), 500 (var(--rose))

### API 로그 (ApiLogs)

#### 목적
Gemini API 호출 로그를 상세히 표시한다.

#### 컴포넌트 사양

**로그 상세 모달**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [✕] API 로그 상세                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 요청                                                                │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Model: gemini-2.0-flash                                         │ │
│ │ System Prompt:                                                  │ │
│ │   당신은 천마신교 세계의 이야기꾼입니다...                       │ │
│ │ Messages:                                                       │ │
│ │   [{"role": "user", "parts": [{"text": "..."}]}]                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ 응답                                                               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Text:                                                           │ │
│ │   흑의 봉인을 풀고 마을로 들어서니...                           │ │
│ │ Usage:                                                          │ │
│ │   TotalTokens: 1234                                             │ │
│ │   PromptTokens: 456                                             │ │
│ │   CompletionTokens: 778                                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ 지연 시간: 1,234ms                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- 너비: 80vw, 최대 800px
- JSON: 폰트 JetBrains Mono, 11px
- 코드 하이라이팅

### 설정 (Settings)

#### 목적
프롬프트 설정과 게임플레이 설정을 수정한다.

#### 컴포넌트 사양

**설정 폼**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 프롬프트 설정                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ System Preamble                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 당신은 AI 스토리 게임의 이야기꾼입니다...                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ LaTeX Rules                                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 수학 공식은 LaTeX 표기법을 사용합니다...                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                                        [저장] [취소]              │
└─────────────────────────────────────────────────────────────────────┘
```

- 텍스트영역: 최소 높이 120px
- 저장 버튼: 우측 하단 고정

### 위험 구역 (DangerZone)

#### 목적
위험한 작업(데이터 삭제)을 수행한다. 이중 확인이 필요하다.

#### 컴포넌트 사양

**위험 작업 카드**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ 위험 구역                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 모든 스토리 삭제                                                   │
│ 이 작업은 되돌릴 수 없습니다. 모든 스토리 데이터가 삭제됩니다.     │
│                                                                     │
│ [모든 스토리 삭제]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- 배경: var(--rose-dim)
- 테두리: 1px solid var(--rose)
- 버튼: 배경 var(--rose), 텍스트 white
- 첫 클릭: 확인 모달
- 두 번 클릭: 실행

---

## 반응형 디자인

### 브레이크포인트

```css
/* 모바일 */
@media (max-width: 640px) {
  /* 1단 레이아웃 */
  .story-grid { grid-template-columns: 1fr; }
  .play-layout { grid-template-columns: 0px 1fr 0px; }
  .editor-layout { grid-template-columns: 0px 1fr 0px; }
  .admin-layout { grid-template-columns: 0px 1fr; }
}

/* 태블릿 */
@media (min-width: 641px) and (max-width: 1024px) {
  /* 2단 레이아웃 */
  .story-grid { grid-template-columns: repeat(2, 1fr); }
  .play-layout { grid-template-columns: 0px 1fr 320px; }
  .editor-layout { grid-template-columns: 0px 1fr 400px; }
}

/* 데스크톱 */
@media (min-width: 1025px) {
  /* 3단 레이아웃 */
  .story-grid { grid-template-columns: repeat(3, 1fr); }
  .play-layout { grid-template-columns: 260px 1fr 320px; }
  .editor-layout { grid-template-columns: 240px 1fr 400px; }
  .admin-layout { grid-template-columns: 220px 1fr; }
}

/* 와이드 */
@media (min-width: 1400px) {
  .story-grid { grid-template-columns: repeat(4, 1fr); }
}
```

### 모바일 최적화

**1. 햄버거 메뉴**

```
[☰] 메뉴
```

- 모바일 전용: 640px 이하
- 위치: 헤더 우측
- 드롭다운: 전체 화면 오버레이

**2. 하단 네비게이션 (Play 화면)**

```
┌─────────────────────────────────────────┐
│ [세션] [정보] [노트]                    │
└─────────────────────────────────────────┘
```

- 모바일 전용: 640px 이하
- 위치: 화면 하단 고정
- 높이: 56px

**3. 터치 타겟 최소 크기**

- 버튼: 최소 44×44px
- 링크: 최소 44×44px
- 간격: 최소 8px

---

## 접근성 (Accessibility)

### WCAG AA 준수

#### 색상 대비

| 텍스트 | 배경 | 대비비 | 등급 |
|--------|------|--------|------|
| var(--text-primary) | var(--bg-primary) | 15:1 | AAA |
| var(--text-secondary) | var(--bg-primary) | 7:1 | AA |
| var(--accent) | var(--bg-primary) | 4.5:1 | AA |

#### 키보드 내비게이션

- **탭 순서**: 논리적 순서 (왼쪽 → 오른쪽, 위 → 아래)
- **포커스 표시**: 2px solid var(--accent), outline-offset 2px
- **단축키**:
  - `⌘K` / `Ctrl+K`: 검색
  - `⌘/` / `Ctrl+/`: 단축키 도움말
  - `Esc`: 모달 닫기

#### 스크린 리더

- **ARIA 라벨**:
  - 버튼: `aria-label="새 세션 시작"`
  - 입력상자: `aria-label="검색어 입력"`
  - 모달: `role="dialog" aria-modal="true"`
- **라이브 리전**:
  - SSE 스트리밍: `aria-live="polite"`
  - 오류 메시지: `aria-live="assertive"`

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-03-31 | Designer | 최초 작성 |
