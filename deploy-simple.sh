#!/bin/bash
# Simple deploy - sync and build on EC2

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Deploying Image URL Fix to EC2 (Simple Version)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

echo ""
echo "📦 Syncing backend code..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='uploads' \
  ./backend/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" | tail -20

echo ""
echo "📦 Syncing frontend code..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='.git' \
  ./frontend/src ./frontend/public ./frontend/package.json "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/" | tail -20

echo ""
echo "🔨 Building on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "
  cd $EC2_PATH/frontend
  echo '📦 Installing frontend dependencies...'
  npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -3
  echo '🔨 Building frontend...'
  npm run build 2>&1 | tail -5
  
  cd $EC2_PATH/backend
  echo '📦 Installing backend dependencies...'
  npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -3
"

echo ""
echo "♻️  Restarting services..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && pm2 restart all && sleep 2 && pm2 status"

echo ""
echo "✅ Deployment completed successfully!"
