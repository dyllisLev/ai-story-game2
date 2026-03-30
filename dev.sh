#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

mkdir -p "$LOG_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[dev]${NC} $1"; }
ok()  { echo -e "${GREEN}[dev]${NC} $1"; }
warn(){ echo -e "${YELLOW}[dev]${NC} $1"; }
err() { echo -e "${RED}[dev]${NC} $1"; }

is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$pid_file"
  fi
  return 1
}

kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    warn "Port $port in use — killing PIDs: $pids"
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    # Force kill remaining
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi
}

build_shared() {
  log "Building shared types..."
  cd "$PROJECT_DIR/packages/shared"
  npx tsc
  ok "Shared types built"
}

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    warn "Backend already running (PID $(cat "$BACKEND_PID_FILE"))"
    return
  fi
  kill_port 3000
  log "Starting backend (port 3000)..."
  cd "$PROJECT_DIR"
  nohup npx tsx backend/src/server.ts > "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  ok "Backend started (PID $!) → logs: $BACKEND_LOG"
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    warn "Frontend already running (PID $(cat "$FRONTEND_PID_FILE"))"
    return
  fi
  kill_port 5173
  log "Starting frontend (port 5173)..."
  cd "$PROJECT_DIR/frontend"
  nohup npx vite --port 5173 --host 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  ok "Frontend started (PID $!) → logs: $FRONTEND_LOG"
}

stop_process() {
  local name="$1"
  local pid_file="$2"
  if is_running "$pid_file"; then
    local pid
    pid=$(cat "$pid_file")
    log "Stopping $name (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    # Wait up to 5 seconds for graceful shutdown
    for i in {1..10}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
    ok "$name stopped"
  else
    warn "$name is not running"
  fi
}

do_start() {
  build_shared
  start_backend
  start_frontend
  echo ""
  ok "All services started!"
  echo -e "  Backend:  http://localhost:3000"
  echo -e "  Frontend: http://localhost:5173"
  echo ""
  echo -e "  Logs: ${CYAN}tail -f $BACKEND_LOG${NC}"
  echo -e "        ${CYAN}tail -f $FRONTEND_LOG${NC}"
}

do_stop() {
  stop_process "frontend" "$FRONTEND_PID_FILE"
  stop_process "backend" "$BACKEND_PID_FILE"
  ok "All services stopped"
}

do_restart() {
  log "Restarting services..."
  do_stop
  do_start
}

do_status() {
  echo ""
  if is_running "$BACKEND_PID_FILE"; then
    ok "Backend:  running (PID $(cat "$BACKEND_PID_FILE"))"
  else
    err "Backend:  stopped"
  fi
  if is_running "$FRONTEND_PID_FILE"; then
    ok "Frontend: running (PID $(cat "$FRONTEND_PID_FILE"))"
  else
    err "Frontend: stopped"
  fi
  echo ""
}

do_logs() {
  local target="${1:-all}"
  case "$target" in
    backend)  tail -f "$BACKEND_LOG" ;;
    frontend) tail -f "$FRONTEND_LOG" ;;
    all)      tail -f "$BACKEND_LOG" "$FRONTEND_LOG" ;;
    *)        err "Unknown log target: $target (use: backend, frontend, all)" ;;
  esac
}

usage() {
  echo ""
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  start     Build shared types and start backend + frontend"
  echo "  stop      Stop all running services"
  echo "  restart   Stop then start all services"
  echo "  status    Show running status of services"
  echo "  logs      Tail logs (default: all). Options: backend, frontend, all"
  echo ""
  echo "Examples:"
  echo "  $0 start"
  echo "  $0 restart"
  echo "  $0 logs backend"
  echo ""
}

case "${1:-}" in
  start)   do_start ;;
  stop)    do_stop ;;
  restart) do_restart ;;
  status)  do_status ;;
  logs)    do_logs "${2:-all}" ;;
  *)       usage ;;
esac
