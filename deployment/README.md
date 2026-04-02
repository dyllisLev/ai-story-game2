# 프로덕션 배포 가이드

이 문서는 AI Story Game 프로덕션 배포 프로세스 개선을 위한 가이드입니다.

## 목차

1. [개요](#개요)
2. [빠른 시작](#빠른-시작)
3. [구성 요소](#구성-요소)
4. [배포 절차](#배포-절차)
5. [롤백 절차](#롤백-절차)
6. [모니터링](#모니터링)
7. [문제 해결](#문제-해결)

## 개요

### 개선 전
- Vite 개발 서버를 프로덕션에서 사용
- 수동 배포 프로세스
- 프로세스 관리 도구 부재
- CI/CD 파이프라인 없음

### 개선 후
- nginx로 정적 파일 제공
- PM2로 프로세스 관리
- 자동화된 배포 스크립트
- CI/CD 파이프라인 (GitHub Actions)

## 빠른 시작

### 1. 초기 설정

#### 1.1 nginx 설치 및 설정
```bash
# nginx 설치
sudo apt update
sudo apt install nginx -y

# 설정 파일 복사
sudo cp deployment/nginx.conf /etc/nginx/sites-available/aistorygame
sudo ln -s /etc/nginx/sites-available/aistorygame /etc/nginx/sites-enabled/

# 설정 검증 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

#### 1.2 PM2 설치 및 설정
```bash
# PM2 설치
npm install -g pm2

# PM2 시작
pm2 start ecosystem.config.js

# PM2 부팅 시 자동 시작
pm2 startup
pm2 save
```

#### 1.3 SSL 인증서 발급 (선택)
```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급
sudo certbot --nginx -d aistorygame.nuc.hmini.me
```

### 2. 배포 실행

#### 자동 배포
```bash
./deploy.sh deploy
```

이 명령은 다음 단계를 자동으로 수행합니다:
1. 백업 생성
2. 빌드 (공유 타입, 프론트엔드, 백엔드)
3. PM2로 백엔드 재시작
4. nginx 재로드
5. 헬스체크

#### 수동 단계별 배포
```bash
# 1. 백업 생성
./deploy.sh backup

# 2. 빌드
./deploy.sh build

# 3. 배포
./deploy.sh deploy

# 4. 헬스체크
./deploy.sh healthcheck
```

## 구성 요소

### nginx

**역할**: 정적 파일 제공, Reverse Proxy, SSL Termination

**설정 파일**: `deployment/nginx.conf`

**주요 기능**:
- 정적 파일 제공 (`frontend/dist/`)
- API Reverse Proxy (`/api` → `localhost:3000`)
- HTTPS 리다이렉트
- Gzip 압축
- 캐싱

**명령어**:
```bash
# 설정 검증
sudo nginx -t

# 재시작
sudo systemctl restart nginx

# 재로드 (zero downtime)
sudo systemctl reload nginx

# 상태 확인
sudo systemctl status nginx

# 로그 확인
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### PM2

**역할**: 백엔드 프로세스 관리, 자동 재시작, 로그 관리

**설정 파일**: `ecosystem.config.js`

**주요 기능**:
- 프로세스 모니터링
- 자동 재시작
- 로그 관리
- 클러스터 모드 (향후 확장 가능)

**명령어**:
```bash
# 앱 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs aistorygame-backend

# 재시작
pm2 restart aistorygame-backend

# 중지
pm2 stop aistorygame-backend

# 모니터링
pm2 monit
```

### 배포 스크립트

**파일**: `deploy.sh`

**명령어**:
```bash
# 전체 배포
./deploy.sh deploy

# 백업만 생성
./deploy.sh backup

# 빌드만 실행
./deploy.sh build

# 헬스체크만 실행
./deploy.sh healthcheck

# 백업 목록 확인
./deploy.sh list-backups

# 상태 확인
./deploy.sh status

# 롤백
./deploy.sh rollback <backup_id>
```

## 배포 절차

### 1. 사전 체크리스트

- [ ] nginx 실행 중
- [ ] PM2 실행 중
- [ ] 환경변수 설정 완료
- [ ] 데이터베이스 연결 확인

### 2. 배포 단계

#### 단계 1: 백업
```bash
./deploy.sh backup
```

#### 단계 2: 빌드
```bash
./deploy.sh build
```

#### 단계 3: 배포
```bash
./deploy.sh deploy
```

#### 단계 4: 검증
```bash
./deploy.sh healthcheck
```

### 3. 배포 후 확인

1. **백엔드 헬스체크**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **프론트엔드 접속**
   ```bash
   curl http://localhost:80/
   ```

3. **PM2 상태**
   ```bash
   pm2 status
   ```

4. **nginx 로그**
   ```bash
   sudo tail -n 50 /var/log/nginx/error.log
   ```

## 롤백 절차

### 자동 롤백

배포 실패 시 즉시 롤백:

```bash
# 1. 백업 목록 확인
./deploy.sh list-backups

# 2. 롤백 실행
./deploy.sh rollback <backup_id>
```

### 수동 롤백

```bash
# 1. PM2로 이전 버전 재시작
pm2 restart aistorygame-backend

# 2. nginx 재로드
sudo systemctl reload nginx

# 3. 헬스체크
./deploy.sh healthcheck
```

## 모니터링

### PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs aistorygame-backend

# 로그 파일 경로
tail -f logs/pm2-backend-out.log
tail -f logs/pm2-backend-error.log
```

### nginx 모니터링

```bash
# 액세스 로그
sudo tail -f /var/log/nginx/access.log

# 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 시스템 리소스

```bash
# CPU/메모리 사용량
pm2 status

# 디스크 사용량
df -h

# 프로세스 확인
ps aux | grep node
```

## 문제 해결

### 백엔드가 시작하지 않음

```bash
# PM2 로그 확인
pm2 logs aistorygame-backend --lines 100

# PM2 재시작
pm2 restart aistorygame-backend

# PM2 재시작 (하드 리셋)
pm2 delete aistorygame-backend
pm2 start ecosystem.config.js
```

### nginx가 정적 파일을 제공하지 않음

```bash
# 빌드 확인
ls -la frontend/dist/

# nginx 설정 검증
sudo nginx -t

# nginx 재시작
sudo systemctl restart nginx

# 권한 확인
ls -la frontend/dist/
```

### 포트가 이미 사용 중

```bash
# 포트 사용 확인
sudo lsof -i :3000
sudo lsof -i :80
sudo lsof -i :443

# 프로세스 종료
sudo kill -9 <PID>
```

### 헬스체크 실패

```bash
# 백엔드 헬스체크
curl -v http://localhost:3000/api/health

# 프론트엔드 헬스체크
curl -v http://localhost:80/

# PM2 상태 확인
pm2 status

# nginx 상태 확인
sudo systemctl status nginx
```

### 배포 실패 시 롤백

```bash
# 1. 백업 목록 확인
./deploy.sh list-backups

# 2. 롤백
./deploy.sh rollback <backup_id>

# 3. 상태 확인
./deploy.sh healthcheck
```

## CI/CD 파이프라인

### GitHub Actions

**파일**: `.github/workflows/deploy-production.yml`

**단계**:
1. Test - 테스트 실행
2. Build - 빌드 수행
3. Deploy - 프로덕션 배포
4. Verify - 헬스체크

### 필요한 GitHub Secrets

- `PRODUCTION_HOST` - 프로덕션 서버 호스트
- `PRODUCTION_USER` - SSH 사용자명
- `PRODUCTION_SSH_KEY` - SSH 개인 키
- `PRODUCTION_PORT` - SSH 포트 (기본값: 22)
- `PRODUCTION_URL` - 프로덕션 URL
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_ANON_KEY` - Supabase Anon Key
- `SUPABASE_SERVICE_KEY` - Supabase Service Key
- `API_KEY_ENCRYPTION_SECRET` - API 키 암호화 비밀
- `VITE_API_BASE_URL` - API 베이스 URL

## 참고 자료

- [nginx 공식 문서](https://nginx.org/en/docs/)
- [PM2 공식 문서](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Vite 프로덕션 빌드](https://vitejs.dev/guide/build.html)

## 지원

배포 중 문제가 발생하면:

1. 로그 확인 (PM2, nginx)
2. 헬스체크 실행
3. 롤백 고려
4. DevOps Engineer에게 문의
