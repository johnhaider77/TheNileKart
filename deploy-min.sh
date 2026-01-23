#!/bin/bash
# Minimal deployment script

EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "Starting deployment..."

# Sync backend
echo "Syncing backend..."
rsync -az --exclude='node_modules' --exclude='.git' --exclude='uploads' \
  ./backend/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" 2>&1 | grep -E "^[a-z]|sent|received"

# Sync frontend
echo "Syncing frontend build..."
rsync -az ./frontend/build/ "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/" 2>&1 | grep -E "^[a-z]|sent|received"

# Build backend on EC2
echo "Building backend on EC2..."
ssh "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -2"

# Restart services
echo "Restarting services..."
ssh "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && pm2 restart all && sleep 2 && pm2 status | grep -E 'id|server'"

echo "Deployment complete!"
