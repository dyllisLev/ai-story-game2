# AI Story Game - 아키텍처 검토 보고서 (Architectural Review)

> **버전:** 1.0
> **작성일:** 2026-03-31
> **작성자:** Software Architect
> **검토 범위:** Phase 1 Requirements + Current Implementation

---

## 개요 (Executive Summary)

본 보고서는 AI Story Game 플랫폼의 아키텍처를 포괄적으로 검토하고, 개선이 필요한 영역을 식별하며, 권장사항을 제공한다. **전체적으로 아키텍처는 잘 설계되어 있으나, 몇 가지 중요한 개선 사항이 확인되었다.**

### 주요 발견 (Key Findings)

| 카테고리 | 상태 | 요약 |
|---------|------|------|
| **보안 (Security)** | ⚠️ 주의 필요 | API 키 암호화 구현됨, but rate limiting weak |
| **성능 (Performance)** | ✅ 양호 | SSE 스트리밍, RLS 최적화됨, DB 인덱스 필요 |
| **확장성 (Scalability)** | ⚠️ 개선 필요 | WebSocket 없음, 캐싱 전략 부족 |
| **유지보수성 (Maintainability)** | ✅ 우수 | 모듈화 잘됨, 타입 안전성 확보 |
| **테스트 가능성 (Testability)** | ⚠️ 개선 필요 | E2E만 있음, 단위/통합 테스트 부족 |

---

## 1. 아키텍처 평가 (Architecture Assessment)

### 1.1 계층 구조 (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│              (React Frontend :5173)                         │
│  Pages → Components → Hooks → Lib (api, auth, sse)         │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/SSE
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                      │
│                (Fastify Backend :3000)                      │
│  Routes → Plugins (auth, supabase, config) → Services      │
└─────────────────────────────────────────────────────────────┘
                              ↓ Supabase Client
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│              (Supabase PostgreSQL + RLS)                    │
│  Tables: stories, sessions, user_profiles, config, etc.    │
└─────────────────────────────────────────────────────────────┘
                              ↓ REST API
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│              (Gemini API - Direct from Frontend)            │
└─────────────────────────────────────────────────────────────┘
```

**평가:** ✅ **우수**
- 명확한 관심사 분리 (Separation of Concerns)
- 계층 간 결합도 낮음 (Low Coupling)
- 공유 타입으로 프론트/백엔드 계약 안전성 확보

### 1.2 API 설계 (API Design)

**현재 상태:**
```
/api/config       → GET/PUT (전역 설정)
/api/auth/*       → POST (signup, login, logout, refresh)
/api/me           → GET/PUT (프로필, API 키)
/api/stories      → GET/POST/PUT/DELETE (스토리 CRUD)
/api/sessions     → GET/POST/PUT/DELETE (세션 CRUD)
/api/game/start   → POST (SSE 스트리밍 시작)
/api/game/chat    → POST (SSE 스트리밍 채팅)
/api/admin/*      → GET/POST/DELETE (관리자 기능)
/api/health       → GET (헬스체크)
```

**평가:** ✅ **우수**
- RESTful 원칙 준수
- 자원 기반 URL 설계
- HTTP 메서드 적절히 사용
- SSE 스트리밍으로 실시간 응답 처리

**개선 권장사항:**
- ❌ **API 버저닝 없음:** `/api/v1/...` 형식 권장
- ❌ **OpenAPI/Swagger 문서 부족:** API 계약 자동화 필요
- ❌ **일관성 없는 에러 응답:** 표준 에러 형식 정의 필요

### 1.3 데이터 모델 (Data Model)

**테이블 구조:**
```
auth.users (Supabase) ← 1:1 → user_profiles
                                     ↓ 1:N
                                  stories ←──────┐
                                     ↓ 1:N       | status_presets
                                  sessions       | presets
                                     ↓ 1:N       |
                               session_memory    |
                                     ↓           |
                                  api_logs ──────┘

config (singleton)
service_logs
status_presets ← 1:N → stories
```

**평가:** ✅ **우수**
- 정규화 잘됨 (3NF 준수)
- 적절한 FK 제약조건
- RLS로 행 수준 보안
- JSONB로 유연한 스키마 (messages, content)

**개선 권장사항:**
- ⚠️ **복합 인덱스 부족:** `(owner_uid, created_at)` 등 필요
- ⚠️ **파티셔닝 고려:** api_logs, service_logs는 시계열 데이터

---

## 2. 보안 검토 (Security Review)

### 2.1 인증 및 인가 (Authentication & Authorization)

**현재 구현:**
```typescript
// backend/src/plugins/auth.ts
- JWT 토큰 검증 (Supabase Auth)
- requireAuth(): 로그인 + 승인 사용자
- requireAdmin(): 관리자 권한
- verifyResourceOwner(): 리소스 소유자 검증
- verifySessionAccess(): 세션 토큰 또는 owner_uid 검증
```

**평가:** ✅ **우수**
- Supabase Auth로 안전한 JWT 관리
- 역할 기반 접근 제어 (RBAC): pending, user, admin
- 리소스 소유권 검증 구현됨

**개선 권장사항:**
- ⚠️ **세션 토큰 만료 없음:** X-Session-Token에 TTL 없음
- ⚠️ **Refresh Token Rotation:** 구현되지 않음
- ❌ **2FA/MFA 지원 부족:** 보안 강화 필요 시 추가

### 2.2 API 키 보안 (API Key Security)

**현재 구현:**
```typescript
// backend/src/services/crypto.ts
- AES-256-GCM 암호화
- user_profiles.api_key_encrypted에 저장
- 복호화는 사용자 요청 시만
```

**평가:** ✅ **우수**
- 강력한 암호화 알고리즘
- 키 관리 분리
- 로그에서 redact 처리

**개선 권장사항:**
- ⚠️ **암호화 키 관리:** 환경변수만으로는 부족, KMS 권장
- ⚠️ **키 로테이션:** 주기적 재암호화 없음

### 2.3 Rate Limiting

**현재 구현:**
```typescript
// backend/src/server.ts
await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  allowList: (req) => req.url === '/api/health',
});
```

**평가:** ⚠️ **개선 필요**
- 전역 적용으로 세분화 부족
- 사용자별/엔드포인트별 제한 없음
- 분산 환경에서 메모리 기반은 비효율

**개선 권장사항:**
- Redis 기반 분산 rate limiting (upstash, redis-cloud)
- 엔드포인트별 정책:
  - `/api/game/chat`: 10/분 (AI 비용 방지)
  - `/api/auth/login`: 5/분 (무차별 대입 방지)
  - `/api/stories`: 60/분 (일반 조회)

### 2.4 RLS (Row Level Security)

**현재 상태:**
```sql
-- stories 테이블 RLS 정책
CREATE POLICY "Users can view their own stories"
ON stories FOR SELECT
USING (auth.uid() = owner_uid OR is_public = true);
```

**평가:** ✅ **우수**
- 모든 테이블에 RLS 활성화
- 정책 적절히 설계됨
- 최신 마이그레이션에서 복합 인덱스 최적화됨

**개선 권장사항:**
- ✅ 최신 마이그레이션 `20260331030000_optimize_rls_policies_with_composite_index.sql`으로 개선됨

### 2.5 입력 검증 (Input Validation)

**현재 상태:**
- JSON Schema로 요청 검증
- Fastify의 schema 강제

**평가:** ⚠️ **부분적**
- API 레벨에서 검증됨
- 프론트엔드에서의 XSS 방지 확인 필요 (DOMPurify 사용 확인 필요)

---

## 3. 성능 검토 (Performance Review)

### 3.1 데이터베이스 성능

**현재 인덱스:**
```sql
-- stories 테이블
CREATE INDEX idx_stories_owner_uid ON stories(owner_uid);
CREATE INDEX idx_stories_is_public ON stories(is_public) WHERE is_public = true;
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_owner_public_idx ON stories(owner_uid, is_public, created_at);
```

**평가:** ✅ **우수**
- GIN 인덱스로 배열 검색 최적화
- 복합 인덱스로 RLS 성능 개선
- 부분 인덱스로 공개 스토리 최적화

**개선 권장사항:**
- ⚠️ **sessions 테이블 인덱스:** `(owner_uid, updated_at)` 필요
- ⚠️ **api_logs 파티셔닝:** 시계열 데이터로 월별 파티션 권장

### 3.2 API 응답 시간

**NFR 요구사항:**
- NFR-PERF-001: API 응답 < 500ms
- NFR-PERF-002: SSE 첫 응답 < 2초

**평가:** ✅ **충족 예상**
- RLS 최적화로 DB 쿼리 개선됨
- SSE 스트리밍으로 첫 응답 빠름

**개선 권장사항:**
- ⚠️ **API 로그 집계:** api_logs.duration_ms 모니터링 대시보드 필요
- ⚠️ **느린 쿼리 감지:** pg_stat_statements 활성화 권장

### 3.3 프론트엔드 성능

**현재 상태:**
- React 19 + Vite
- 코드 스플리팅
- SSE 스트리밍

**평가:** ✅ **우수**
- Vite로 빠른 빌드
- SSE로 실시간 업데이트

**개선 권장사항:**
- ⚠️ **번들 분석:** bundle-Analyzer로 번들 크기 확인
- ⚠️ **이미지 최적화:** next/image 또는 similar 필요

---

## 4. 확장성 검토 (Scalability Review)

### 4.1 수직 확장 (Vertical Scaling)

**현재 상태:**
- 단일 Fastify 서버
- Supabase Cloud (관리형 PostgreSQL)

**평가:** ✅ **양호**
- 현재 단일 서버로 충분

**개선 권장사항:**
- ⚠️ **컨테이너화:** Dockerfile 추가 권장
- ⚠️ **오토스케일링:** Kubernetes 준비 필요

### 4.2 수평 확장 (Horizontal Scaling)

**현재 상태:**
- 세션 상태: DB 저장 (stateless)
- Rate limiting: 메모리 기반

**평가:** ⚠️ **제한적**
- Fastify는 stateless로 잘 설계됨
- but rate limiting이 메모리 기반으로 분산 불가

**개선 권장사항:**
- ❌ **Redis 기반 rate limiting:** 분산 환경에서 필수
- ❌ **로드 밸런서:** Nginx/ALB 준비
- ❌ **CORS 설정:** 현재 dev에서만 원천 허용

### 4.3 캐싱 전략 (Caching Strategy)

**현재 상태:**
```typescript
// backend/src/plugins/config-cache.ts
- config 테이블만 캐싱 (in-memory)
```

**평가:** ⚠️ **부족**
- 전역 설정만 캐싱
- 스토리/프리셋 캐싱 없음
- CDN 전략 없음

**개선 권장사항:**
- ❌ **Redis 캐싕:** 스토리, 프리셋 캐싱
- ❌ **HTTP 캐싕:** Cache-Control 헤더 추가
- ❌ **CDN:** 정적 리소스 (이미지, 배너) CDN 배포

---

## 5. 유지보수성 검토 (Maintainability Review)

### 5.1 코드 모듈화

**평가:** ✅ **우수**
```
backend/src/
├── plugins/       # 재사용 가능한 플러그인
├── routes/        # API 라우트
├── services/      # 비즈니스 로직
└── config.ts      # 환경변수 관리
```

### 5.2 타입 안전성 (Type Safety)

**평가:** ✅ **우수**
- TypeScript 전면 사용
- 공유 타입 패키지로 프론트/백엔드 계약 안전
- Zod 또는 JSON Schema로 런타임 검증

### 5.3 문서화 (Documentation)

**평가:** ⚠️ **개선 필요**
- ✅ SDLC 문서 잘 작성됨 (SRS, RTM, ERD)
- ❌ API 문서 부족 (OpenAPI/Swagger)
- ❌ 코드 내 JSDoc 부족

**개선 권장사항:**
- Swagger/OpenAPI 자동 생성
- JSDoc으로 공용 함수 문서화

---

## 6. 테스트 가능성 검토 (Testability Review)

### 6.1 현재 테스트 상태

**평가:** ⚠️ **부족**
- ✅ E2E 테스트 계획 (235개 테스트케이스)
- ❌ 단위 테스트 없음
- ❌ 통합 테스트 없음

### 6.2 테스트 피라미드

```
         ▲
        /E2E\          235개 (계획)
       /-----\
      /  통합  \        0개 ❌
     /---------\
    /   단위    \      0개 ❌
   /-------------\
```

**평가:** ⚠️ **불균형**
- E2E만 의존하면 실행 시간 길어짐
- 단위 테스트로 빠른 피드백 필요

**개선 권장사항:**
- ❌ **단위 테스트:** services/ 레이어 (Vitest)
- ❌ **통합 테스트:** API 라우트 (Supertest)
- ✅ E2E: Playwright로 기존 계획 유지

---

## 7. 모니터링 및 로깅 (Monitoring & Logging)

### 7.1 현재 상태

**구현된 로깅:**
```typescript
// backend/src/plugins/request-logger.ts
- 모든 요청 로깅
- service_logs 테이블에 저장
```

**평가:** ⚠️ **기본적**
- ✅ 요청 로깅 구현됨
- ❌ APM (Application Performance Monitoring) 없음
- ❌ 에러 추적 (Sentry 등) 없음

**개선 권장사항:**
- ❌ **Sentry:** 에러 추적
- ❌ **Grafana:** 메트릭 대시보드
- ❌ **로그 집계:** ELK Stack 또는 Loki

---

## 8. 우선순위별 개선 권장사항 (Prioritized Recommendations)

### 🔴 P0 (즉시 실행)

| 항목 | 설명 | 이유 | 예상 작업량 |
|------|------|------|-------------|
| Redis Rate Limiting | 분산 환경용 rate limiting | 현재 메모리 기반으로 스케일링 불가 | 2일 |
| API 버저닝 | `/api/v1/...` 도입 | breaking change 방지 | 1일 |
| 복합 인덱스 추가 | sessions 테이블 인덱스 | 조회 성능 저하 방지 | 2시간 |

### 🟡 P1 (1-2주 내)

| 항목 | 설명 | 이유 | 예상 작업량 |
|------|------|------|-------------|
| 단위 테스트 추가 | services/ 레이어 테스트 | 빠른 피드백, 리팩토링 안전성 | 5일 |
| OpenAPI 문서 | Swagger 자동 생성 | API 계약 명세화 | 2일 |
| 에러 추적 | Sentry 통합 | 프로덕션 에러 모니터링 | 1일 |
| 캐싱 전략 | Redis에 스토리/프리셋 캐싱 | DB 부하 감소 | 3일 |

### 🟢 P2 (1-2월 내)

| 항목 | 설명 | 이유 | 예상 작업량 |
|------|------|------|-------------|
| 통합 테스트 | API 라우트 테스트 | 계층별 테스트 커버리지 | 5일 |
| 로그 파티셔닝 | api_logs, service_logs | 대용량 로그 관리 | 2일 |
| APM 대시보드 | Grafana + Prometheus | 성능 모니터링 | 3일 |
| 컨테이너화 | Docker + K8s 준비 | 배포 자동화 | 5일 |

---

## 9. 결론 (Conclusion)

### 9.1 전체 평가

AI Story Game 플랫폼의 아키텍처는 **전반적으로 잘 설계**되어 있으며, 현재 요구사항을 충실히 반영하고 있다. 특히:

- ✅ **보안:** RLS, API 키 암호화 등 보안 조치 적절
- ✅ **성능:** SSE 스트리밍, RLS 최적화 등 성능 고려됨
- ✅ **유지보수성:** 모듈화, 타입 안전성 확보

### 9.2 우선 개선 필요 사항

다음 영역에서 즉각적인 개선이 권장된다:

1. **Redis 기반 Rate Limiting:** 분산 환경 대비
2. **단위 테스트:** 테스트 피라미드 균형화
3. **API 문서화:** OpenAPI/Swagger 도입
4. **캐싱 전략:** Redis에 스토리/프리셋 캐싱

### 9.3 장기적 로드맵

- **Q2 2026:** P0 + P1 완료, 단위/통합 테스트 커버리지 70% 달성
- **Q3 2026:** P2 완료, 프로덕션 배포 준비
- **Q4 2026:** 확장성 테스트, 부하 테스트, 오토스케일링 구현

---

## 부록 (Appendix)

### A. 참고 문서

- `docs/sdlc/phase1-requirements/01-SRS.md` - 요구사항 정의서
- `docs/sdlc/phase1-requirements/02-RTM.md` - 요구사항 추적 매트릭스
- `docs/sdlc/phase1-requirements/04-Conceptual-ERD.md` - 개념 ERD
- `docs/sdlc/phase1-requirements/05-TO-BE-Process-Definitions.md` - 프로세스 정의

### B. 아키텍처 검토 체크리스트

- [x] 계층 구조 명확성
- [x] API 설계 RESTful 준수
- [x] 데이터 모델 정규화
- [x] 인증/인가 구현
- [x] RLS 정책 적절성
- [x] DB 인덱스 최적화
- [x] 타입 안전성 확보
- [ ] Rate limiting 분산 지원
- [ ] 캐싱 전략 수립
- [ ] 단위 테스트 커버리지
- [ ] API 문서 자동화
- [ ] 모니터링 대시보드
