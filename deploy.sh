#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
err() { echo -e "${RED}[deploy]${NC} $1"; }
info() { echo -e "${CYAN}[deploy]${NC} $1"; }

# 백업 생성
backup() {
  log "백업 생성 중..."

  # 프론트엔드 빌드 백업
  if [[ -d "$PROJECT_DIR/frontend/dist" ]]; then
    cp -r "$PROJECT_DIR/frontend/dist" "$BACKUP_DIR/frontend-$TIMESTAMP"
    log "프론트엔드 백업 완료: $BACKUP_DIR/frontend-$TIMESTAMP"
  fi

  # 백엔드 빌드 백업
  if [[ -d "$PROJECT_DIR/backend/dist" ]]; then
    cp -r "$PROJECT_DIR/backend/dist" "$BACKUP_DIR/backend-$TIMESTAMP"
    log "백엔드 백업 완료: $BACKUP_DIR/backend-$TIMESTAMP"
  fi

  # 최신 백업만 5개 보존
  ls -t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}"

  log "백업 생성 완료!"
}

# 롤백
rollback() {
  local backup_id="$1"

  if [[ -z "$backup_id" ]]; then
    err "백업 ID가 필요합니다."
    echo ""
    info "사용 가능한 백업 목록:"
    ls -1 "$BACKUP_DIR" | grep -E "frontend-|backend-" | sort -r
    exit 1
  fi

  log "백업 $backup_id(으)로 롤백 중..."

  # 프론트엔드 롤백
  if [[ -d "$BACKUP_DIR/frontend-$backup_id" ]]; then
    rm -rf "$PROJECT_DIR/frontend/dist"
    cp -r "$BACKUP_DIR/frontend-$backup_id" "$PROJECT_DIR/frontend/dist"

    # /var/www/aistorygame도 롤백
    sudo rm -rf /var/www/aistorygame/*
    sudo cp -r "$BACKUP_DIR/frontend-$backup_id"/* /var/www/aistorygame/

    log "프론트엔드 롤백 완료"
  fi

  # 백엔드 롤백
  if [[ -d "$BACKUP_DIR/backend-$backup_id" ]]; then
    rm -rf "$PROJECT_DIR/backend/dist"
    cp -r "$BACKUP_DIR/backend-$backup_id" "$PROJECT_DIR/backend/dist"
    log "백엔드 롤백 완료"
  fi

  # 서비스 재시작
  pm2 restart aistorygame-backend
  sudo systemctl reload nginx

  log "롤백 완료!"
}

# 빌드
build() {
  log "빌드 시작..."

  # 공유 타입 빌드
  log "공유 타입 빌드 중..."
  cd "$PROJECT_DIR/packages/shared"
  npx tsc

  # 프론트엔드 빌드
  log "프론트엔드 빌드 중..."
  cd "$PROJECT_DIR/frontend"
  pnpm run build

  # 백엔드 빌드
  log "백엔드 빌드 중..."
  cd "$PROJECT_DIR/backend"
  npx tsc

  log "빌드 완료!"
}

# 프론트엔드 정적 파일 배포
deploy_frontend_static() {
  log "프론트엔드 정적 파일 배포 중..."

  local FRONTEND_SOURCE="$PROJECT_DIR/frontend/dist"
  local FRONTEND_TARGET="/var/www/aistorygame"

  # 타겟 디렉토리 생성
  if [[ ! -d "$FRONTEND_TARGET" ]]; then
    log "타겟 디렉토리 생성 중: $FRONTEND_TARGET"
    sudo mkdir -p "$FRONTEND_TARGET"
  fi

  # 정적 파일 복사
  if [[ -d "$FRONTEND_SOURCE" ]]; then
    log "프론트엔드 파일 복사 중..."
    sudo cp -r "$FRONTEND_SOURCE"/* "$FRONTEND_TARGET/"
    log "프론트엔드 파일 복사 완료: $FRONTEND_TARGET"
  else
    err "프론트엔드 빌드 디렉토리를 찾을 수 없습니다: $FRONTEND_SOURCE"
    return 1
  fi

  # 권한 설정 (nginx가 읽을 수 있도록)
  sudo chown -R root:root "$FRONTEND_TARGET"
  sudo chmod -R 755 "$FRONTEND_TARGET"

  log "프론트엔드 정적 파일 배포 완료!"
}

# nginx 설정 배포
deploy_nginx_config() {
  log "nginx 설정 배포 중..."

  local NGINX_CONF_SOURCE="$PROJECT_DIR/deployment/nginx.conf"
  local NGINX_CONF_TARGET="/etc/nginx/sites-available/aistorygame"
  local NGINX_ENABLED_LINK="/etc/nginx/sites-enabled/aistorygame"

  # nginx 설정 파일 복사
  if [[ -f "$NGINX_CONF_SOURCE" ]]; then
    log "nginx 설정 파일 복사 중..."
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"
    log "nginx 설정 파일 복사 완료: $NGINX_CONF_TARGET"
  else
    err "nginx 설정 파일을 찾을 수 없습니다: $NGINX_CONF_SOURCE"
    return 1
  fi

  # symbolic link 생성 (이미 존재하면 재생성 안 함)
  if [[ ! -L "$NGINX_ENABLED_LINK" ]]; then
    log "nginx symbolic link 생성 중..."
    sudo ln -sf "$NGINX_CONF_TARGET" "$NGINX_ENABLED_LINK"
    log "nginx symbolic link 생성 완료: $NGINX_ENABLED_LINK"
  else
    log "nginx symbolic link 이미 존재함"
  fi

  # nginx 설정 테스트
  log "nginx 설정 테스트 중..."
  if sudo nginx -t; then
    log "✅ nginx 설정 테스트 통과"
  else
    err "❌ nginx 설정 테스트 실패"
    return 1
  fi

  log "nginx 설정 배포 완료!"
}

# 배포
deploy() {
  log "프로덕션 배포 중..."

  # 프론트엔드 정적 파일 배포
  deploy_frontend_static

  # nginx 설정 배포
  deploy_nginx_config

  # PM2로 백엔드 재시작
  log "백엔드 재시작 중 (PM2)..."
  if pm2 describe aistorygame-backend > /dev/null 2>&1; then
    pm2 restart aistorygame-backend
  else
    pm2 start backend/ecosystem.config.cjs
  fi

  # nginx 재로드
  log "nginx 재로드 중..."
  sudo systemctl reload nginx

  log "배포 완료!"
}

# 헬스체크
healthcheck() {
  log "헬스체크 실행 중..."

  local failed=0

  # 백엔드 헬스체크
  log "백엔드 헬스체크 중..."
  if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✅ 백엔드 헬스체크 통과"
  else
    err "❌ 백엔드 헬스체크 실패"
    failed=1
  fi

  # 프론트엔드 헬스체크
  log "프론트엔드 헬스체크 중..."
  if curl -f -s http://localhost:80/ > /dev/null 2>&1; then
    log "✅ 프론트엔드 헬스체크 통과"
  else
    err "❌ 프론트엔드 헬스체크 실패"
    failed=1
  fi

  if [[ $failed -eq 1 ]]; then
    err "헬스체크 실패! 롤백을 고려해주세요."
    return 1
  fi

  log "모든 헬스체크 통과!"
}

# 백업 목록
list_backups() {
  info "백업 목록:"
  echo ""
  ls -lh "$BACKUP_DIR" | grep -E "frontend-|backend-" | awk '{print $9, $5, $6, $7, $8}'
}

# PM2 상태
status() {
  info "PM2 상태:"
  pm2 status
  echo ""

  info "nginx 상태:"
  sudo systemctl status nginx --no-pager | head -n 5
}

# 메인 함수
main() {
  local command="${1:-deploy}"

  case "$command" in
    backup)
      backup
      ;;
    rollback)
      if [[ -z "${2:-}" ]]; then
        err "사용법: $0 rollback <backup_id>"
        echo ""
        list_backups
        exit 1
      fi
      rollback "$2"
      ;;
    build)
      build
      ;;
    deploy)
      backup
      build
      deploy
      healthcheck
      ;;
    healthcheck)
      healthcheck
      ;;
    list-backups)
      list_backups
      ;;
    status)
      status
      ;;
    *)
      echo "사용법: $0 {backup|rollback|build|deploy|healthcheck|list-backups|status}"
      echo ""
      echo "명령어:"
      echo "  backup       백업 생성"
      echo "  rollback     백업으로 롤백 (backup_id 필요)"
      echo "  build        모든 패키지 빌드"
      echo "  deploy       전체 배포 (백업 + 빌드 + 배포 + 헬스체크)"
      echo "  healthcheck  헬스체크 실행"
      echo "  list-backups 백업 목록 표시"
      echo "  status       PM2 및 nginx 상태 표시"
      echo ""
      echo "예시:"
      echo "  $0 deploy                    # 전체 배포"
      echo "  $0 rollback 20260401_120000  # 특정 백업으로 롤백"
      echo "  $0 healthcheck               # 헬스체크만 실행"
      exit 1
      ;;
  esac
}

main "$@"
