module.exports = {
  apps: [
    {
      name: 'server',
      script: './backend/server.js',
      cwd: process.env.APP_ROOT || '/home/ubuntu/var/www/thenilekart/TheNileKart',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '5000'
      },
      error_file: '/home/ubuntu/.pm2/logs/server-error.log',
      out_file: '/home/ubuntu/.pm2/logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: false,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      max_memory_restart: '500M',
      restart_delay: 4000,
      listen_timeout: 10000,
      shutdown_with_message: true
    }
  ]
};
