#!/bin/bash
# Start frontend server on port 3000

FRONTEND_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart/frontend"

echo "🧹 Stopping any existing frontend servers..."
pkill -f "serve -s build -l 3000" || true
sleep 2

echo "📂 Starting frontend server on port 3000..."
cd "$FRONTEND_PATH"

# Install serve globally if not present
npm list -g serve > /dev/null 2>&1 || npm install -g serve

# Start serve in background
nohup npx serve -s build -l 3000 > /tmp/frontend-3000.log 2>&1 &

sleep 2

# Check if it started
if pgrep -f "serve -s build -l 3000" > /dev/null; then
  echo "✅ Frontend server started on port 3000"
  echo "🌐 Access at: http://3.29.235.62:3000"
else
  echo "❌ Failed to start frontend server"
  echo "📋 Check logs: tail -f /tmp/frontend-3000.log"
fi
