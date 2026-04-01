# Production Server Information

**Last Updated:** 2026-04-01

## Server Details

- **Name:** ai-game
- **IP:** 10.0.0.17
- **User:** root
- **SSH Command:** `ssh ai-game`

## Application Paths

- **Project Root:** `/root/ai-story-game2/`
- **Backend:** Fastify 5 on port 3000
- **Frontend:** Vite + React 19 on port 5173

## Service Management

- **Control Script:** `./dev.sh {start|stop|restart|status|logs}`
- **Process Management:** Manual (no PM2/systemd)
- **Logs:** `logs/backend.log`, `logs/frontend.log`

## Observability & Monitoring

### Metrics Endpoint
- **Endpoint:** `GET /metrics`
- **Format:** Prometheus text format
- **Metrics tracked:**
  - HTTP request counts by route
  - Response times (p50, p95, p99)
  - Error rates by status code
  - Active requests gauge

### Correlation Tracking
- **Header:** `x-correlation-id`
- **Purpose:** Track requests across distributed logs
- **Behavior:** Auto-generated UUID if not provided in request header
- **Response:** Included in all response headers and log entries

### Error Tracking (Sentry)
- **Provider:** Sentry.io
- **Features:**
  - Automatic error capturing
  - Performance monitoring (10% sampling in production)
  - User context tracking
  - Sensitive data filtering (auth headers, tokens)
- **Environment Variable:** `SENTRY_DSN` (optional - disabled if not set)

## Infrastructure

### Redis (Optional)
- **Purpose:** Distributed rate limiting and caching
- **Environment Variable:** `REDIS_URL` (optional - falls back to in-memory)
- **Behavior:** Graceful degradation to memory-based storage if not configured
- **Status:** Not configured (using in-memory fallback)

## Deployment Commands

```bash
# SSH to server
ssh ai-game

# Pull latest code
cd /root/ai-story-game2
git pull origin main

# Install dependencies (if package.json changed)
pnpm install

# Build shared types
cd packages/shared && npx tsc && cd ../..

# Restart services
./dev.sh restart

# Check status
./dev.sh status

# View logs (safe - last 50 lines)
tail -n 50 logs/backend.log
tail -n 50 logs/frontend.log

# View metrics
curl http://localhost:3000/metrics
```

## Domains

- **Production:** https://aistorygame.nuc.hmini.me
- **Database:** Supabase at supa.oci.hmini.me (schema: ai_story_game)

## Environment Variables

### Required
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `API_KEY_ENCRYPTION_SECRET` - AES-256 encryption secret for user API keys
- `ADMIN_BASIC_AUTH_PASSWORD` - Admin panel authentication

### Optional (Observability)
- `SENTRY_DSN` - Sentry error tracking DSN (disabled if not set)
- `SENTRY_ENVIRONMENT` - Sentry environment name (defaults to NODE_ENV)
- `REDIS_URL` - Redis connection URL (falls back to in-memory)

## Environment

- **Node.js:** >= 20
- **Package Manager:** pnpm (monorepo)
- **Git Repository:** https://github.com/dyllisLev/ai-story-game2
