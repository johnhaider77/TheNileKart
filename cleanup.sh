#!/bin/bash
# Simple cleanup script

echo "🧹 Cleaning up development environment..."

# Kill any existing Node.js processes on our ports
echo "Stopping existing processes..."
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true

# Free up ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

echo "✅ Cleanup completed!"
echo ""
echo "Now you can safely run:"
echo "  npm start        (for concurrent backend+frontend)"
echo "  ./start-dev.sh   (for managed startup with monitoring)"
echo ""
echo "Or run them separately:"
echo "  Backend: cd backend && npm start"
echo "  Frontend: cd frontend && npm start"