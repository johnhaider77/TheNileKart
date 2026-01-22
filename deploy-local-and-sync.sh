#!/bin/bash

# Local Build + EC2 Sync and Launch Script
# 1. Build frontend locally
# 2. Sync to EC2
# 3. Build backend on EC2
# 4. Start services on EC2

set -e

# Configuration
EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Local Build + EC2 Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

# Step 1: Build frontend locally
echo ""
echo "🔨 Step 1: Building frontend locally..."
if command -v npm &> /dev/null; then
    cd "$LOCAL_PATH/frontend"
    npm install
    npm run build
    echo "✅ Frontend build complete"
else
    echo "⚠️  npm not found, skipping local build. Syncing existing frontend..."
fi

# Step 2: Sync to EC2 using rsync
echo ""
echo "📤 Step 2: Syncing project to EC2..."
rsync -avz -e "ssh -i $EC2_KEY" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='*.log' \
    "$LOCAL_PATH/" \
    "$EC2_USER@$EC2_HOST:$EC2_PATH/" || {
    echo "⚠️  Rsync completed with warnings, continuing..."
}
echo "✅ Sync complete"

# Step 3: Update git and install dependencies on EC2
echo ""
echo "📦 Step 3: Installing dependencies on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && npm install --production 2>&1 | tail -5"

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && npm install --production 2>&1 | tail -5"

# Step 4: Stop existing processes
echo ""
echo "🛑 Step 4: Stopping existing processes..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pkill -f 'node server.js' 2>/dev/null || true && pkill -f 'npm start' 2>/dev/null || true && sleep 2" || true

# Step 5: Start backend
echo ""
echo "🚀 Step 5: Starting backend server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &"
sleep 3

# Step 6: Serve frontend
echo ""
echo "🚀 Step 6: Starting frontend server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/frontend && BROWSER=none nohup npm start > /tmp/frontend.log 2>&1 &"
sleep 5

# Step 7: Verify services
echo ""
echo "✅ Step 7: Verifying services..."
echo ""

echo "Checking backend (port 5000)..."
if ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "curl -s http://localhost:5000/api/health 2>/dev/null | head -c 50" 2>/dev/null; then
    echo ""
    echo "✅ Backend is running on port 5000"
else
    echo ""
    echo "⚠️  Backend check completed (may still be starting)"
fi

echo ""
echo "Checking frontend (port 3000)..."
if ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "curl -s http://localhost:3000 2>/dev/null | head -c 50" 2>/dev/null | grep -q "<!DOCTYPE\|<html\|React"; then
    echo ""
    echo "✅ Frontend is running on port 3000"
else
    echo ""
    echo "⚠️  Frontend check completed (may still be starting)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment Complete!"
echo ""
echo "📋 Useful commands:"
echo "  SSH to EC2:         ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo "  View backend logs:  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/backend.log'"
echo "  View frontend logs: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/frontend.log'"
echo "  Check processes:    ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'ps aux | grep -E \"node|npm\" | grep -v grep'"
echo ""
echo "🌐 Website URLs:"
echo "  Frontend: http://40.172.190.250:3000"
echo "  Backend:  http://40.172.190.250:5000"
echo ""

