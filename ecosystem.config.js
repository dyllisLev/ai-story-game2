module.exports = {
  apps: [
    {
      name: 'aistorygame-backend',
      script: './backend/dist/server.js',
      interpreter: 'node',
      cwd: '/root/ai-story-game2',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-backend-error.log',
      out_file: './logs/pm2-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,
      // Health check
      listen_timeout: 10000,
    },
  ],
};
