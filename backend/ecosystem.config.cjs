module.exports = {
  apps: [
    {
      name: 'story-game-backend',
      script: './dist/server.js',
      cwd: '/root/ai-story-game2/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/ai-story-game2/logs/pm2-backend-error.log',
      out_file: '/root/ai-story-game2/logs/pm2-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
