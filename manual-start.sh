#!/bin/bash

echo "🔧 Manual Server Startup"
echo "========================"

# Kill any existing processes
echo "1. Killing existing processes..."
pkill -f "node" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
sleep 2

# Check if ports are free
echo "2. Checking ports..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Port 5000 still in use"
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Port 3000 still in use"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start test server first
echo "3. Starting test server..."
cd "$(dirname "$0")"
node test-basic.js &
TEST_PID=$!
echo "Test server PID: $TEST_PID"

sleep 5

# Test if it's working
echo "4. Testing server..."
if curl -s http://localhost:5000 >/dev/null; then
    echo "✅ Test server is working!"
    
    # Kill test server and start real backend
    kill $TEST_PID 2>/dev/null
    sleep 2
    
    echo "5. Starting backend..."
    cd backend
    node simple-server.js &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
    
    sleep 5
    
    echo "6. Starting frontend..."
    cd frontend
    BROWSER=none npm start &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
    
    echo ""
    echo "🎉 Servers started!"
    echo "Backend: http://localhost:5000"
    echo "Frontend: http://localhost:3000"
    echo ""
    echo "PIDs: Backend=$BACKEND_PID Frontend=$FRONTEND_PID"
    
else
    echo "❌ Test server failed to start"
    kill $TEST_PID 2>/dev/null
fi