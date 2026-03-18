# AI Story Game - Development Guide

> **프로젝트 스펙 문서:** [docs/PROJECT-SPEC.md](docs/PROJECT-SPEC.md) — DB 스키마, 접속 정보, 파일 역할, 디버깅 방법 등 개발에 필요한 전체 정보

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (빌드 도구 없음)
- **AI:** Google Gemini API
- **DB:** Supabase (PostgreSQL + RLS)
- **Hosting:** Cloudflare Workers + Assets (GitHub push → 자동 배포)

## Development Workflow (필수 준수)

모든 요구사항은 아래 프로세스를 반드시 따른다.

### 1. 요구사항 확인

- 사용자 요청을 정확히 파악한다.
- 불명확한 부분은 반드시 질문하여 확인한다.
- 변경 범위(영향받는 파일/기능)를 식별한다.

### 2. 구체화

- 변경할 파일과 수정 내용을 구체적으로 정리한다.
- 필요 시 사용자에게 접근 방식을 공유하고 합의한다.
- 기존 코드를 반드시 읽고 이해한 후 수정 계획을 세운다.

### 3. 구현

- 코드를 수정하거나 새로 작성한다.
- 기존 파일 수정을 우선하고, 새 파일 생성은 최소화한다.
- 보안 취약점(XSS, 인젝션 등)에 주의한다.

### 4. 코드 정리 (1회)

- `/simplify` 스킬을 실행하여 변경된 코드의 중복, 품질, 효율성을 점검한다.
- 수정이 발생하면 바로 **5. 로컬 테스트**로 진행한다.
- 이 단계는 1회만 실행한다. (정리→테스트 실패→구현→정리 루프에서 재실행)

### 5. 로컬 테스트

**모의 테스트가 아닌, 실제 로컬 서버 + 브라우저 기반 사용자 테스트로 진행한다.**

```bash
# 로컬 서버 시작
npx wrangler dev
# → http://localhost:8787
```

- `agent-browser` 스킬을 사용하여 브라우저에서 실제 페이지를 열고 동작을 확인한다.
- 테스트 항목:
  - 수정한 내용이 제대로 반영되었는지 확인
  - `/api/config` 등 API 응답이 올바른지
  - 사용자 인터랙션(클릭, 입력 등)이 의도대로 동작하는지

### 6. 테스트 실패 시 → 3으로

- 실패 원인을 분석하고 **3. 구현** 단계로 돌아가 수정한다.
- 수정 후 **4. 코드 정리** → **5. 로컬 테스트**를 다시 반복한다.

### 7. 보안 점검

- `security-auditor` 에이전트를 사용하여 변경된 코드에 대한 보안 점검을 수행한다.
- OWASP Top 10, 인증/인가, 데이터 보호 관점에서 검토한다.
- 보안 이슈 발견 시 **3. 구현** 단계로 돌아가 전체 루프(3→4→5→7)를 다시 거친다.

### 8. 커밋 & 푸시 (= 배포)

- 코드 정리(4) + 로컬 테스트(5) + 보안 점검(7)을 모두 통과한 상태에서만 커밋한다.
- `git push origin main` → Cloudflare 자동 배포가 트리거된다.
- **`wrangler deploy`를 직접 실행하지 않는다.** 배포는 반드시 GitHub push를 통해서만 이뤄진다.
- 시크릿 변경이 있는 경우에만 별도로 `wrangler secret put <KEY>`를 실행한다.

### 9. 배포 확인

```bash
# 배포 이력 확인
npx wrangler deployments list

# 실시간 로그 확인 (필요 시)
npx wrangler tail
```

- 자동 배포 완료를 확인한 후, 프로덕션 URL에서 변경사항이 정상 반영되었는지 확인한다.
- API 엔드포인트 응답을 curl로 검증한다.
- **배포 확인 실패 시:** 원인 분석 후 **3. 구현**으로 돌아가 전체 루프를 다시 진행하거나, Cloudflare Dashboard에서 이전 버전으로 롤백한다.

## Project Structure

```
src/worker.js          # Cloudflare Worker (API + 관리자 인증)
public/                # 정적 파일 (HTML, CSS, JS)
  index.html           # 스토리 목록 페이지
  play.html            # 게임 플레이 페이지
  editor.html          # 스토리 에디터 페이지
  admin.html           # 관리자 설정 페이지
  js/                  # 프론트엔드 JS 모듈
  styles/              # CSS
  presets/             # 스토리 프리셋 JSON
wrangler.jsonc         # Cloudflare Worker 배포 설정
supabase-schema.sql    # DB 스키마
.env                   # 로컬 개발용 환경변수 (배포 안됨)
```

## Environment Variables

- **wrangler.jsonc vars:** `SUPABASE_URL`, `ADMIN_USER`
- **Cloudflare secrets:** `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASS`
- **.env (로컬 전용):** 위 변수들 + `GEMINI_API`, `CLOUDFLARE_API_TOKEN` 등
