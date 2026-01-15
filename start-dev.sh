#!/bin/bash

# TheNileKart Development Server Startup Script
# This script ensures clean startup by killing existing processes

echo "🚀 Starting TheNileKart Development Environment..."

# Function to cleanup processes
cleanup() {
    echo "🧹 Cleaning up existing processes..."
    pkill -f "react-scripts start" 2>/dev/null || true
    pkill -f "node server.js" 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "✅ Cleanup completed"
}

# Function to check if ports are available
check_ports() {
    if lsof -i :3000 >/dev/null 2>&1; then
        echo "❌ Port 3000 is still in use"
        return 1
    fi
    if lsof -i :5000 >/dev/null 2>&1; then
        echo "❌ Port 5000 is still in use"
        return 1
    fi
    echo "✅ Ports 3000 and 5000 are available"
    return 0
}

# Function to start backend
start_backend() {
    echo "🔧 Starting backend server..."
    cd backend
    node server.js &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend started with PID: $BACKEND_PID"
}

# Function to start frontend
start_frontend() {
    echo "⚛️ Starting frontend development server..."
    cd frontend
    BROWSER=none npm start &
    FRONTEND_PID=$!
    cd ..
    echo "✅ Frontend started with PID: $FRONTEND_PID"
}

# Function to handle script termination
handle_exit() {
    echo ""
    echo "🛑 Shutting down development servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    cleanup
    echo "👋 Development servers stopped"
    exit 0
}

# Set up signal handlers
trap handle_exit SIGINT SIGTERM

# Main execution
cleanup

if ! check_ports; then
    echo "❌ Failed to free up ports. Please check for running processes."
    exit 1
fi

# Start services
start_backend
sleep 3  # Give backend time to start

start_frontend
sleep 5  # Give frontend time to start

echo ""
echo "🎉 TheNileKart is starting up!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait