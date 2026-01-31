#!/bin/bash

# iOS App Deployment Script for EC2
# Starts services on ports 3002 (frontend) and 5002 (backend)
# Location: /home/ubuntu/var/www/thenilekartIOS/TheNileKart

set -e

APP_DIR="/home/ubuntu/var/www/thenilekartIOS/TheNileKart"
BACKEND_PORT=5002
FRONTEND_PORT=3002

echo "🚀 Starting TheNileKart iOS App Services..."

# Change to app directory
cd "$APP_DIR"

# Start backend on port 5002 (if backend directory exists)
if [ -d "$APP_DIR/backend" ]; then
    echo "📡 Starting Backend on port $BACKEND_PORT..."
    cd "$APP_DIR/backend"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
    fi
    
    # Start backend with pm2 or node
    PORT=$BACKEND_PORT npm start > /tmp/ios-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID) on port $BACKEND_PORT"
    echo $BACKEND_PID > /tmp/ios-backend.pid
    sleep 2
fi

# Start frontend on port 3002 (if frontend/build exists)
if [ -d "$APP_DIR/frontend/build" ]; then
    echo "🌐 Starting Frontend on port $FRONTEND_PORT..."
    cd "$APP_DIR/frontend"
    
    # Use serve to run the build
    npx serve -s build -l $FRONTEND_PORT > /tmp/ios-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID) on port $FRONTEND_PORT"
    echo $FRONTEND_PID > /tmp/ios-frontend.pid
    sleep 2
fi

# Display status
echo ""
echo "📊 Service Status:"
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://localhost:$BACKEND_PORT"
echo ""
echo "✅ iOS App services are running!"
echo ""
echo "📝 Logs:"
echo "  Frontend: tail -f /tmp/ios-frontend.log"
echo "  Backend:  tail -f /tmp/ios-backend.log"
