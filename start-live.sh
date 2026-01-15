#!/bin/bash

# TheNileKart Live Deployment Script
echo "🚀 Starting TheNileKart Live on www.thenilekart.com..."

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Function to kill processes on exit
cleanup() {
    echo "🛑 Stopping all services..."
    pkill -f "node server.js"
    pkill -f "react-scripts start"
    pkill -f "cloudflared tunnel"
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start backend
echo "📡 Starting backend server..."
cd "$DIR/backend"
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🖥️ Starting frontend..."
cd "$DIR/frontend"
BROWSER=none npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 10

# Start CloudFlare tunnel
echo "🌐 Starting CloudFlare tunnel..."
echo "⚠️  Make sure you've set up CloudFlare tunnel first:"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create thenilekart"
echo ""

# Option 1: If tunnel configured
# cloudflared tunnel run thenilekart &

# Option 2: Quick tunnel (for testing)
cloudflared tunnel --url http://localhost:3000 --hostname www.thenilekart.com &

echo "✅ All services started!"
echo "🌍 Website should be live at: https://www.thenilekart.com"
echo "📊 Backend API at: http://localhost:5000"
echo "🖥️ Local frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait