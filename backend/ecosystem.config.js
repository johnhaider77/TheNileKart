module.exports = {
  apps: [
    {
      name: 'thenilekart-backend',
      script: './server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      // Maximum memory size (in MB)
      max_memory_restart: '500M',
      // Auto restart in case of error
      autorestart: true,
      // Watch mode - restart if files change (disable in production)
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      // Log files
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Merge logs from all instances
      merge_logs: true,
      // Kill timeout (ms)
      kill_timeout: 5000,
      // Graceful shutdown
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
