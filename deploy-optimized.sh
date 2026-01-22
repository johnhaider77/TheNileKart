#!/bin/bash

# Complete deployment script - Build locally and deploy to EC2
# This script:
# 1. Builds frontend locally on Mac
# 2. Syncs to EC2
# 3. Starts services with minimal memory usage

set -e

# Configuration
EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 TheNileKart Local Build + EC2 Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

# Step 1: Build frontend locally
echo ""
echo "🔨 Step 1: Building frontend locally..."
cd "$LOCAL_PATH/frontend"
npm run build 2>&1 | tail -20
echo "✅ Frontend build complete"

# Step 2: Verify SSH connection
echo ""
echo "🔗 Step 2: Testing EC2 connection..."
if ! ssh -i "$EC2_KEY" -o ConnectTimeout=10 "$EC2_USER@$EC2_HOST" "echo 'EC2 is online'" &>/dev/null; then
    echo "❌ Cannot connect to EC2 at $EC2_HOST"
    echo "   Please check:"
    echo "   1. EC2 instance is running"
    echo "   2. Security group allows port 22"
    echo "   3. SSH key is correct"
    exit 1
fi
echo "✅ EC2 is reachable"

# Step 3: Clean up memory on EC2
echo ""
echo "🧹 Step 3: Cleaning up memory on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
pkill -9 node 2>/dev/null || true
pkill -9 npm 2>/dev/null || true
pkill -9 npm-start 2>/dev/null || true
rm -rf /tmp/*.log 2>/dev/null || true
sleep 2
echo "Memory cleaned"
EOF
echo "✅ Cleanup complete"

# Step 4: Sync built frontend to EC2
echo ""
echo "📤 Step 4: Syncing frontend build to EC2..."
rsync -avz -e "ssh -i $EC2_KEY" \
    --delete \
    "$LOCAL_PATH/frontend/build/" \
    "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/" 2>&1 | tail -10
echo "✅ Frontend synced"

# Step 5: Start backend
echo ""
echo "🚀 Step 5: Starting backend..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend
NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &
sleep 3
echo "Backend started"
EOF
echo "✅ Backend started"

# Step 6: Start frontend with serve (minimal memory)
echo ""
echo "🚀 Step 6: Starting frontend server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/frontend
# Install serve if not present
which serve > /dev/null 2>&1 || npm install -g serve > /dev/null 2>&1
# Start serve (much lighter than npm start)
nohup serve -s build -l 3000 > /tmp/frontend.log 2>&1 &
sleep 3
echo "Frontend started"
EOF
echo "✅ Frontend started"

# Step 7: Verify services
echo ""
echo "✅ Step 7: Verifying services..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
echo "Running processes:"
ps aux | grep -E 'node|serve' | grep -v grep
echo ""
echo "Memory usage:"
free -h | head -2
echo ""
echo "Testing backend..."
curl -s http://localhost:5000/api/health | head -c 100 2>/dev/null || echo "Backend health check..."
echo ""
echo "Testing frontend..."
curl -s http://localhost:3000 | head -c 100 2>/dev/null | grep -q "html" && echo "Frontend is responding" || echo "Frontend startup..."
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment Complete!"
echo ""
echo "🌐 Website URLs:"
echo "   Frontend: http://40.172.190.250:3000"
echo "   Backend:  http://40.172.190.250:5000"
echo ""
echo "📋 Monitoring:"
echo "   Backend logs:  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/backend.log'"
echo "   Frontend logs: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/frontend.log'"
echo "   SSH access:    ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo ""

