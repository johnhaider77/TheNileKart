const path = require('path');
const fs = require('fs');

// Load production environment variables from .env.production
const envPath = path.join(__dirname, '.env.production');
let envConfig = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        envConfig[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
  console.log('✅ Loaded .env.production for PM2');
} else {
  console.warn('⚠️ .env.production not found, using minimal configuration');
}

module.exports = {
  apps: [
    {
      name: 'thenilekart-backend',
      script: './backend/server.js',
      cwd: process.env.APP_ROOT || '/home/ubuntu/var/www/thenilekart/TheNileKart',
      instances: 1,
      exec_mode: 'fork',
      // Merge all environment variables from .env.production with PM2 overrides
      env: {
        // From .env.production
        ...envConfig,
        // PM2 explicit overrides (these take precedence)
        NODE_ENV: 'production',
        USE_LOCAL_STORAGE: 'false', // ENFORCE S3-ONLY uploads
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
