#!/bin/bash

REMOTE_USER="ubuntu"
REMOTE_HOST="3.29.235.62"
KEY_PATH="$HOME/.ssh/thenilekart-key.pem"
REMOTE_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🔄 Syncing backend code to EC2..."
rsync -avz -e "ssh -i $KEY_PATH" \
  --exclude='node_modules' \
  --exclude='uploads' \
  --exclude='*.log' \
  backend/ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/backend/"

echo "✅ Backend sync complete!"

echo "🔄 Syncing frontend code to EC2..."
rsync -avz -e "ssh -i $KEY_PATH" \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='.git' \
  frontend/src/ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/frontend/src/"

echo "✅ Frontend sync complete!"

echo "🔄 Restarting services..."
ssh -i "$KEY_PATH" "${REMOTE_USER}@${REMOTE_HOST}" << 'SSHEOF'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/frontend
npm run build
pm2 restart thenilekart-backend thenilekart-frontend
sleep 2
pm2 status
SSHEOF

echo "✅ All done!"
