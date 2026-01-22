#!/bin/bash

# 🚀 Clean Backend Deployment Script
# Syncs backend to EC2 and restarts the server

set -e

# Configuration
EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Backend Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

# Step 1: Sync backend to EC2
echo ""
echo "📤 Syncing backend to EC2..."
rsync -avz -e "ssh -i $EC2_KEY" \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='uploads/' \
    "$LOCAL_PATH/backend/" \
    "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" || {
    echo "❌ Rsync failed"
    exit 1
}
echo "✅ Backend synced"

# Step 2: Restart backend via PM2
echo ""
echo "🔄 Restarting backend server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && pm2 restart server --update-env" || {
    echo "❌ Failed to restart server"
    exit 1
}

echo "✅ Server restarted"

# Step 3: Verify server is running
echo ""
echo "📊 Server Status:"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pm2 status"

echo ""
echo "✅ Backend deployment complete!"
