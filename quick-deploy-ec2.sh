#!/bin/bash
# Quick deployment to EC2 with built frontend

set -e

EC2_USER="ubuntu"
EC2_HOST="3.29.235.62"
EC2_KEY="$HOME/.ssh/thenilekart-key.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Quick Deploy to EC2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

echo ""
echo "📦 Copying backend code..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='uploads' \
  ./backend/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/"

echo ""
echo "📦 Copying frontend build..."
rsync -avz -e "ssh -i $EC2_KEY" \
  ./frontend/build/ "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/"

echo ""
echo "🛑 Stopping existing processes..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pkill -9 node 2>/dev/null || true && sleep 2"

echo ""
echo "🚀 Starting backend..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &"

sleep 3

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Testing backend..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "curl -s http://localhost:5000/api/health && echo ''"

echo ""
echo "✅ All servers are running!"
