#!/bin/bash

# Deploy built frontend to EC2
echo "📤 Deploying frontend build to EC2..."

REMOTE_USER="ubuntu"
REMOTE_HOST="40.172.190.250"
REMOTE_PATH="/home/ubuntu/var/www/thenilekart"

# Sync frontend build (exclude node_modules, src, etc.)
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='src' \
  --exclude='public' \
  --exclude='.env*' \
  --exclude='package*' \
  --exclude='tsconfig.json' \
  --exclude='eslintrc' \
  --exclude='.git' \
  frontend/build/ \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/build/"

echo "✅ Frontend deployed successfully!"
echo "🔄 Restart frontend service..."
ssh "$REMOTE_USER@$REMOTE_HOST" "pm2 restart thenilekart-frontend || pm2 start 'serve -s /home/ubuntu/var/www/thenilekart/build -l 5000' --name thenilekart-frontend"

echo "✅ Done!"
