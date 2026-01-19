#!/bin/bash

# Comprehensive EC2 Deployment Script
# Pulls latest code, rebuilds, and restarts services

set -e

EC2_USER="ubuntu"
EC2_HOST="3.29.235.62"
EC2_KEY="$HOME/.ssh/thenilekart-key.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Starting deployment to EC2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

# Step 1: Pull latest code from GitHub (stash any local changes first)
echo ""
echo "📥 Step 1: Pulling latest code from GitHub on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && git stash && git pull origin main" || {
    echo "⚠️  Git pull encountered an issue, but continuing..."
}

# Step 2: Install backend dependencies if needed
echo ""
echo "📦 Step 2: Installing backend dependencies..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && npm install --production 2>&1 | tail -5"

# Step 3: Install frontend dependencies
echo ""
echo "📦 Step 3: Installing frontend dependencies..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/frontend && npm install 2>&1 | tail -5"

# Step 4: Build frontend for production
echo ""
echo "🔨 Step 4: Building frontend for production..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/frontend && REACT_APP_API_URL=https://www.thenilekart.com npm run build 2>&1 | tail -10"

# Step 5: Stop existing processes
echo ""
echo "🛑 Step 5: Stopping existing processes..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pkill -f 'node server.js' 2>/dev/null || true && pkill -f 'npm start' 2>/dev/null || true && sleep 2"

# Step 6: Start backend
echo ""
echo "🚀 Step 6: Starting backend server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &"
sleep 3

# Step 7: Serve frontend
echo ""
echo "🚀 Step 7: Starting frontend server..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/frontend && BROWSER=none nohup npm start > /tmp/frontend.log 2>&1 &"
sleep 5

# Step 8: Verify services
echo ""
echo "✅ Step 8: Verifying services..."
echo ""

echo "Checking backend..."
if ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "curl -s http://localhost:5000/api/health | head -c 50" 2>/dev/null; then
    echo ""
    echo "✅ Backend is running"
else
    echo ""
    echo "⚠️  Backend may not be responding (check logs: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -20 /tmp/backend.log')"
fi

echo ""
echo "Checking frontend..."
if ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "curl -s http://localhost:3000 | head -c 50" 2>/dev/null | grep -q "<!DOCTYPE\|<html"; then
    echo ""
    echo "✅ Frontend is running"
else
    echo ""
    echo "⚠️  Frontend may not be responding (check logs: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -20 /tmp/frontend.log')"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment Complete!"
echo ""
echo "📋 Useful commands:"
echo "  View backend logs:  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/backend.log'"
echo "  View frontend logs: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/frontend.log'"
echo "  SSH to EC2:         ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo "  Check processes:    ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'ps aux | grep -E \"node|npm\" | grep -v grep'"
echo ""
