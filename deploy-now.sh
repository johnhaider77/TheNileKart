#!/bin/bash
set -e

echo "🚀 Starting deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill existing processes
echo "🛑 Stopping existing servers..."
pkill -f "node server.js" || true
pkill -f "npm start" || true
pkill -f "react-scripts" || true
sleep 3

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production 2>&1 | tail -5

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --production 2>&1 | tail -5

# Build frontend
echo "🔨 Building frontend..."
cd ..
SKIP_PREFLIGHT_CHECK=true npm run build --prefix frontend 2>&1 | tail -20

echo "✅ Frontend build complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Deployment successful!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
