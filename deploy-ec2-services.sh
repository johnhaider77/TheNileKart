#!/bin/bash

# Complete deployment script
set -e

cd /home/ubuntu/var/www/thenilekart/TheNileKart

echo "🛑 Stopping existing processes..."
pkill -f 'node server.js' || true
pkill -f 'npm start' || true
sleep 2

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install --production 2>&1 | tail -10

echo ""
echo "🚀 Starting backend server..."
NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
sleep 3

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install 2>&1 | tail -10

echo ""
echo "🚀 Starting frontend server..."
BROWSER=none nohup npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
sleep 5

echo ""
echo "✅ Checking service status..."
ps aux | grep -E 'node server.js|npm start' | grep -v grep

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment Complete!"
echo ""
echo "🌐 Website URLs:"
echo "  Frontend: http://40.172.190.250:3000"
echo "  Backend:  http://40.172.190.250:5000"
echo ""
echo "📋 To monitor:"
echo "  Backend logs:  tail -f /tmp/backend.log"
echo "  Frontend logs: tail -f /tmp/frontend.log"
echo ""
