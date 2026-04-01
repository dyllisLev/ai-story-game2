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

## Deployment Commands

```bash
# SSH to server
ssh ai-game

# Pull latest code
cd /root/ai-story-game2
git pull origin main

# Restart services
./dev.sh restart

# Check status
./dev.sh status

# View logs
./dev.sh logs
```

## Domains

- **Production:** https://aistorygame.nuc.hmini.me
- **Database:** Supabase at supa.oci.hmini.me (schema: ai_story_game)

## Environment

- **Node.js:** >= 20
- **Package Manager:** pnpm (monorepo)
- **Git Repository:** https://github.com/dyllisLev/ai-story-game2
