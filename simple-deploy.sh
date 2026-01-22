#!/bin/bash

# Simple deployment script
EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Deploying to EC2: $EC2_HOST"

# Kill existing processes
echo "Stopping existing processes..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pkill -f 'node server.js' 2>/dev/null || true; pkill -f 'npm start' 2>/dev/null || true; sleep 2"

# Install backend deps
echo "Installing backend dependencies..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && npm install --production"

# Start backend
echo "Starting backend..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &"
sleep 3

# Install frontend deps
echo "Installing frontend dependencies..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/frontend && npm install"

# Start frontend
echo "Starting frontend..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/frontend && BROWSER=none nohup npm start > /tmp/frontend.log 2>&1 &"
sleep 5

# Check status
echo ""
echo "Checking status..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "ps aux | grep -E 'node|npm' | grep -v grep"

echo ""
echo "✅ Deployment Complete!"
echo "Backend:  http://40.172.190.250:5000"
echo "Frontend: http://40.172.190.250:3000"
echo ""
echo "Logs:"
echo "  Backend:  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/backend.log'"
echo "  Frontend: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'tail -50 /tmp/frontend.log'"

