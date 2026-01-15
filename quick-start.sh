#!/bin/bash

echo "🧹 Cleaning up existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 2

echo "🔧 Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
cd ..

sleep 3

echo "⚛️ Starting frontend server..."
cd frontend  
BROWSER=none npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
cd ..

echo ""
echo "🎉 Servers are starting up!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"