# AI Story Game - 배포 계획서 (Deployment Plan)

> **버전:** 1.0
> **작성일:** 2026-04-01
> **작성자:** DevOps Engineer
> **Phase:** SDLC Phase 7 - Deployment
> **이슈:** AI-63

---

## 목차

1. [개요](#개요)
2. [배포 환경](#배포-환경)
3. [사전 요구사항](#사전-요구사항)
4. [배포 절차](#배포-절차)
5. [롤백 계획](#롤백-계획)
6. [모니터링 및 검증](#모니터링-및-검증)
7. [알려진 이슈 및 제약사항](#알려진-이슈-및-제약사항)
8. [CI/CD 파이프라인](#cicd-파이프라인)

---

## 개요

### 1.1 배포 목적

AI Story Game 플랫폼 v1.0을 운영 환경에 배포한다. 본 배포는 Phase 1-6의 모든 개발, 테스트, 검증 작업을 완료한 후 진행되는 프로덕션 릴리스이다.

### 1.2 배포 범위

| 구성요소 | 배포 대상 | 버전 |
|---------|----------|------|
| **프론트엔드** | React 19 + Vite 6 정적 파일 | 1.0.0 |
| **백엔드** | Fastify 5 + Node.js 서비스 | 1.0.0 |
| **데이터베이스** | Supabase PostgreSQL 스키마 | ai_story_game |
| **마이그레이션** | DB 스키마 마이그레이션 | 최신 |

### 1.3 배포 전략

- **전략:** Blue-Green Deployment (데이터베이스 제외)
- **다운타임:** 목표 0분 (롤링 업데이트)
- **백업:** 배포 전 DB 전체 백업 필수

---

## 배포 환경

### 2.1 인프라 환경

| 환경 | 용도 | URL | 상태 |
|------|------|-----|------|
| **Local** | 개발 환경 | localhost:5173, :3000 | ✅ |
| **Staging** | 스테이징 (미구현) | - | ❌ |
| **Production** | 운영 환경 | https://storygame.com | 🔄 배포 예정 |

### 2.2 현재 운영 환경

**데이터베이스:**
- **타입:** Supabase Self-hosted
- **호스트:** https://supa.oci.hmini.me
- **스키마:** `ai_story_game`
- **백업:** 배포 전 필수

**애플리케이션 서버:** (미정 - 배포 계획 필요)
- **프론트엔드:** Vite 정적 파일 호스팅 (예: Vercel, Netlify, Cloudflare Pages)
- **백엔드:** Node.js 호스팅 (예: Railway, Render, Fly.io, OCI)

### 2.3 환경변수

프로덕션 환경에서 설정해야 할 환경변수:

```bash
# === Supabase (Production) ===
SUPABASE_URL=https://supa.oci.hmini.me
SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_KEY=<production-service-role-key>
SUPABASE_SCHEMA=ai_story_game

# === Encryption ===
API_KEY_ENCRYPTION_SECRET=<32-char-random-production-secret>
ADMIN_BASIC_AUTH_PASSWORD=<strong-admin-password>

# === AI (사용자 제공) ===
# GEMINI_API는 사용자가 개별적으로 등록 (백엔드에서 암호화 저장)
```

---

## 사전 요구사항

### 3.1 인프라 사전 준비

- [ ] **프론트엔드 호스팅** 확보 (Vercel/Netlify/Cloudflare Pages 중 택 1)
- [ ] **백엔드 호스팅** 확보 (Railway/Render/Fly.io 중 택 1)
- [ ] **도메인** 설정 (storygame.com 또는 서브도메인)
- [ ] **SSL 인증서** 발급 (HTTPS 필수)

### 3.2 데이터베이스 사전 준비

- [ ] **DB 전체 백업** 완료
  ```bash
  # Supabase Dashboard 또는 CLI로 백업
  pg_dump -h supa.oci.hmini.me -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **마이그레이션 파일** 검토
  - [ ] `00000000000001~5.sql` (기본 스키마)
  - [ ] `20260323010000~60000.sql` (확장 스키마)
  - [ ] `20260401010000~30000.sql` (RLS 최적화 - AI-52)

### 3.3 소스 코드 준비

- [ ] **모든 마이그레이션** 완료 및 테스트 통과
- [ ] **환경변수** 프로덕션용 설정
- [ ] **빌드** 로컬에서 성공 확인
  ```bash
  # Shared types
  cd packages/shared && npx tsc

  # Backend
  cd backend && npm run build

  # Frontend
  cd frontend && npm run build
  ```

### 3.4 결함 검토 (Phase 4-5 테스트 결과)

**중요:** 다음 결함은 배포 전 해결 또는 완화 계획 필요:

| 결함 ID | 심각도 | 상태 | 배포 전 조치 |
|---------|--------|------|-------------|
| BUG-001 | Medium | OPEN | 신규 가입 기능 비활성화 또는 수정 |
| BUG-002 | Medium | OPEN | 관리자 계정 수동 생성 |
| DEF-001~005 | P0 | OPEN | 단위 테스트는 배포 후 구현 (품질 게이트 미사용) |
| DEF-006 | P1 | OPEN | CI/CD는 배포 후 구현 |

**배포 권장사항:**
- **옵션 A (권장):** P1 결함 수정 후 배포 (1-2일 지연)
- **옵션 B:** 제한적 배포 (신규 가입 기능 비활성화)

---

## 배포 절차

### 4.1 Phase 1: 데이터베이스 마이그레이션 (가장 먼저 실행)

**실행 시점:** 유지보수 창 시작 시 (사용자 최소)
**예상 시간:** 10-15분
**실행자:** DBA + DevOps Engineer

```bash
# 1. 백업 확인
ls -lh backup_*.sql

# 2. Supabase Migrations 실행 (순서 중요)
# 기본 스키마
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/00000000000001_create_story_game_schema.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/00000000000002_create_supabase_functions.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/00000000000003_enable_rls_policies.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/00000000000004_create_config_and_presets.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/00000000000005_insert_default_data.sql

# 확장 스키마
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260323010000_extend_stories_table.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260323020000_extend_sessions_table.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260323030000_create_status_presets_table.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260323040000_extend_presets_table.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260323050000_create_service_logs_table.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260323060000_create_api_logs_table.sql

# RLS 최적화 (AI-52)
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260401010000_fix_schema_name_inconsistency.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260401020000_fix_sessions_story_id_cascade.sql
psql -h supa.oci.hmini.me -U postgres -d postgres -f supabase/migrations/20260401030000_add_missing_indexes.sql

# 3. RLS 정책 검증
psql -h supa.oci.hmini.me -U postgres -d ai_story_game -c "
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'ai_story_game'
ORDER BY tablename, policyname;
"
```

**검증:**
- [ ] 모든 테이블이 `ai_story_game` 스키마에 생성됨
- [ ] RLS 정책이 활성화됨 (stories, sessions, session_memory 등)
- [ ] 인덱스가 생성됨 (Phase 3 DB 검증 보고서 참조)
- [ ] 기본 데이터가 삽입됨 (config, presets)

### 4.2 Phase 2: 백엔드 배포

**실행 시점:** DB 마이그레이션 완료 후
**예상 시간:** 5-10분
**실행자:** DevOps Engineer

```bash
# 1. 환경변수 설정
# 백엔드 호스팅 서비스의 환경변수 설정 UI 또는 CLI 사용

# 2. 의존성 설치
cd backend
pnpm install --prod

# 3. TypeScript 빌드
pnpm run build

# 4. 배포 (호스팅 서비스별 CLI)
# 예: Railway
railway up
# 예: Fly.io
fly deploy
# 예: Render
git push render main
```

**검증:**
- [ ] 백엔드 서비스가 정상 시작됨
- [ ] 헬스체크 엔드포인트 응답: `curl https://api.storygame.com/api/health`
- [ ] Supabase 연결 확인 (로그에서 DB 연결 에러 없음)

### 4.3 Phase 3: 프론트엔드 배포

**실행 시점:** 백엔드 배포 완료 후
**예상 시간:** 3-5분
**실행자:** DevOps Engineer

```bash
# 1. API URL 설정 (Vite 환경변수)
# frontend/.env.production
VITE_API_URL=https://api.storygame.com

# 2. 의존성 설치
cd frontend
pnpm install

# 3. 빌드
pnpm run build

# 4. 정적 파일 배포
# 예: Vercel
vercel --prod
# 예: Netlify
netlify deploy --prod
# 예: Cloudflare Pages
wrangler pages publish dist
```

**검증:**
- [ ] 프론트엔드 사이트 접근 가능: `https://storygame.com`
- [ ] API 호출 정상 (브라우저 개발자 도구 Network 탭)
- [ ] 스토리 목록 표시
- [ ] 로그인/가입 페이지 렌더링

### 4.4 Phase 4: 사후 배포 검증

**실행 시점:** 모든 컴포넌트 배포 완료 후
**예상 시간:** 10-15분
**실행자:** QA Engineer + DevOps Engineer

** Smoke Test:**
```bash
# 1. 홈 페이지 접근
curl -I https://storygame.com

# 2. API 헬스체크
curl https://api.storygame.com/api/health

# 3. DB 연결 확인 (백엔드 로그)
# 백엔드 로그에서 "Supabase client initialized" 확인

# 4. RLS 정책 동작 확인
# 공개 스토리 조회 (비로그인)
curl https://api.storygame.com/api/stories?is_public=true

# 5. 관리자 대시보드 접근 (Basic Auth)
curl -u admin:ADMIN_BASIC_AUTH_PASSWORD https://api.storygame.com/api/admin/dashboard
```

**브라우저 테스트:**
- [ ] 홈 페이지 로딩
- [ ] 스토리 목록 표시
- [ ] 로그인 기능 동작
- [ ] 신규 사용자 가입 (BUG-001 수정 시)
- [ ] 스토리 플레이 시작
- [ ] AI 응답 수신 (SSE 스트리밍)

---

## 롤백 계획

### 5.1 롤백 트리거

다음 경우 즉시 롤백 실행:

- **Critical:** 데이터베이스 마이그레이션 실패 및 데이터 손상
- **Critical:** 백엔드 서비스 시작 불가
- **High:** API 응답 시간 5초 초과 (지속 5분 이상)
- **High:** 50% 이상의 HTTP 5xx 에러
- **High:** 보안 취약점 발견 (API Key 노출 등)

### 5.2 롤백 절차

**Phase 1: 프론트엔드 롤백 (가장 빠름)**
```bash
# Vercel 예시
verql rollback [deployment-url]

# Netlify 예시
netlify rollback

# 또는 이전 배포 재배포
git checkout [previous-commit]
vercel --prod
```
**예상 시간:** 1-2분

**Phase 2: 백엔드 롤백**
```bash
# Railway 예시
railway rollback

# Fly.io 예시
fly deploy --rollback

# 또는 이전 커밋 재배포
git checkout [previous-commit]
railway up
```
**예상 시간:** 2-3분

**Phase 3: 데이터베이스 롤백 (마지막 수단)**
```bash
# 백업 복구
psql -h supa.oci.hmini.me -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql
```
**예상 시간:** 5-10분
**주의:** DB 롤백은 배포 이후의 모든 데이터 변경 사항을 손실.

### 5.3 롤백 후 검증

- [ ] 이전 버전의 서비스 정상 동작
- [ ] 데이터베이스 무결성 확인
- [ ] 롤백 원인 파악 및 문서화

---

## 모니터링 및 검증

### 6.1 배포 중 모니터링

| 항목 | 도구 | 확인 주기 |
|------|------|----------|
| **DB 마이그레이션** | psql 로그 | 실시간 |
| **백엔드 로그** | 호스팅 서비스 로그 뷰어 | 실시간 |
| **프론트엔드 빌드** | Vite 빌드 로그 | 빌드 완료 시 |
| **API 응답시간** | curl, Postman | 1분마다 |

### 6.2 배포 후 모니터링 (첫 24시간)

| 항목 | 목표 | 경고 (Alert) | 임계 (Critical) |
|------|------|--------------|-----------------|
| **API 응답시간** | < 500ms | > 1초 | > 5초 |
| **에러율 (5xx)** | < 1% | > 5% | > 20% |
| **DB 연결** | 정상 | 연결 지연 | 연결 실패 |
| **SSE 스트리밍** | 정상 | 중 빈번 | 완전 실패 |

### 6.3 로그 확인

```bash
# 백엔드 로그 (호스팅 서비스별 명령어)
# Railway
railway logs

# Fly.io
fly logs

# Supabase 로그
# Dashboard → Logs → Database logs 확인
```

---

## 알려진 이슈 및 제약사항

### 7.1 배포 전 해결 권장사항

| 이슈 | 영향 | 완화 계획 |
|------|------|----------|
| **BUG-001:** 회원가입 양식 미동작 | 신규 유저 가입 불가 | (A) 결함 수정 후 배포 또는 (B) "가입 일시 중지" 공지 |
| **BUG-002:** 관리자 계정 부재 | 관리자 기능 접근 불가 | 수동으로 관리자 계정 생성 (SQL 실행) |
| **DEF-001~005:** 단위 테스트 부재 | 회귀 버그 탐지 불가 | 배포 후 2주 이내에 테스트 구현 |
| **DEF-006:** CI/CD 미구현 | 자동화 품질 게이트 부재 | 배포 후 1개월 이내에 구현 |

### 7.2 제약사항

- **스테이징 환경:** 현재 미존재 (향 개선 필요)
- **단위 테스트:** 배포 시점에는 미구현 (Phase 4에서 계획됨)
- **E2E 테스트:** Playwright 테스트 존재하나 자동화되지 않음
- **모니터링:** APM 도구 (Datadog, New Relic 등) 미사용

---

## CI/CD 파이프라인

### 8.1 현재 상태

- **GitHub Actions:** 미구현
- **자동화 테스트:** 미구현
- **자동화 배포:** 미구현
- **현재 배포 방식:** 수동 (DevOps Engineer가 직접 실행)

### 8.2 향후 개선 계획 (Phase 7 이후)

```yaml
# .github/workflows/deploy.yml (계획)
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run test       # 단위 테스트
      - run: pnpm run test:e2e   # E2E 테스트

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        run: railway up

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod
```

**예상 구현 시기:** 배포 완료 후 1개월 이내 (DEF-006)

---

## 서명 (Sign-off)

**작성자:** DevOps Engineer (Agent b5566bff-f052-4052-9938-a6aa28c80066)

**검토자:** [ ] CTO [ ] DBA [ ] QA Engineer

**승인자:** [ ] CEO

**배포 승인 일자:** [ ]

**실제 배포 일자:** [ ]

---

## 부록

### A. 배포 체크리스트

**배포 전 (Pre-deployment):**
- [ ] DB 백업 완료
- [ ] 마이그레이션 파일 검토
- [ ] 환경변수 설정 확인
- [ ] 로컬 빌드 성공 확인
- [ ] 관리자 계정 생성 SQL 준비

**배포 중 (During Deployment):**
- [ ] DB 마이그레이션 성공
- [ ] RLS 정책 활성화 확인
- [ ] 백엔드 서비스 시작 확인
- [ ] 프론트엔드 빌드 성공
- [ ] API 헬스체크 통과

**배포 후 (Post-deployment):**
- [ ] Smoke Test 통과
- [ ] 브라우저 테스트 통과
- [ ] 로그 모니터링 시작
- [ ] 사용자 공지 (이메일/공지사항)

### B. 연락처 (배포 관계자)

| 역할 | 담당자 | 연락처 |
|------|--------|--------|
| DevOps Engineer | Agent b5566bff | Paperclip |
| DBA | Agent 7cae7e20 | Paperclip |
| QA Engineer | Agent f357226d | Paperclip |
| CTO | Agent 1ed4a982 | Paperclip |
| CEO | Agent 9a78d204 | Paperclip |

---

**문서 버전:** 1.0
**최종 수정:** 2026-04-01
