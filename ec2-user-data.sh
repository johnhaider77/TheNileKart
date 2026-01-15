#!/bin/bash
# EC2 User Data Script for TheNileKart Setup
# This script runs automatically when the instance starts

# Update system
apt-get update && apt-get upgrade -y

# Install essential packages
apt-get install -y curl wget git unzip

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL client (for database connections)
apt-get install -y postgresql-client

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
apt-get install -y nginx

# Create application directory
mkdir -p /var/www/thenilekart
chown -R ubuntu:ubuntu /var/www/thenilekart

# Configure UFW firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3000/tcp
ufw allow 5000/tcp
ufw --force enable

# Set up log directory
mkdir -p /var/log/thenilekart
chown -R ubuntu:ubuntu /var/log/thenilekart

# Create environment file template
cat > /var/www/thenilekart/.env.template << EOF
# Environment Variables Template for TheNileKart
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=thenilekart
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# AWS Configuration
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket

# Other configurations...
EOF

echo "✅ EC2 instance setup completed successfully!"
echo "📝 Configure environment variables in /var/www/thenilekart/.env"