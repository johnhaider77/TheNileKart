#!/bin/bash
# Quick Deployment Script for TheNileKart Frontend Update
# This script should be run on the EC2 instance

set -e

echo "🚀 TheNileKart Frontend Deployment Script"
echo "=========================================="
echo ""

# Check if running on EC2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Make sure this script is run on the EC2 instance."
    exit 1
fi

# Navigate to project directory
cd /var/www/thenilekart || cd ~/TheNileKart

echo "📁 Working directory: $(pwd)"
echo ""

# Option 1: If git repo exists
if [ -d ".git" ]; then
    echo "📝 Git repository detected. Pulling latest changes..."
    git fetch origin
    git pull origin main
    echo "✅ Git pull complete"
else
    echo "⚠️  Git repository not found. Skipping git pull."
fi

# Build frontend
echo ""
echo "🔨 Building frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Build with source maps disabled
echo "🏗️  Building React app (GENERATE_SOURCEMAP=false)..."
GENERATE_SOURCEMAP=false npm run build

echo "✅ Frontend build complete"
echo ""

# Copy build to web root
echo "📂 Copying build to /var/www/thenilekart/build/"
if [ -d "/var/www/thenilekart/build" ]; then
    sudo rm -rf /var/www/thenilekart/build/*
else
    sudo mkdir -p /var/www/thenilekart/build
fi

sudo cp -r build/* /var/www/thenilekart/build/

echo "✅ Build files copied"
echo ""

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R ubuntu:ubuntu /var/www/thenilekart/build

echo "✅ Permissions set"
echo ""

# Restart backend
echo "🔄 Restarting backend..."
cd ..
pm2 restart thenilekart-backend || pm2 start npm --name thenilekart-backend -- start

echo "✅ Backend restarted"
echo ""

# Verify
echo "🔍 Verifying deployment..."
sleep 2

curl -s http://localhost:5000/ | tail -c 200 | grep -q "sourceMappingURL" && {
    echo "❌ WARNING: Source maps still present in the build!"
    echo "Please rebuild with: GENERATE_SOURCEMAP=false npm run build"
} || {
    echo "✅ Build verified - no source map references found"
}

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps on Android device:"
echo "1. Uninstall app: adb uninstall com.example.thenilekart"
echo "2. Reinstall APK: adb install app-debug.apk"
echo "3. Check logs: adb logcat | grep -i 'react\|aggressive\|error'"
echo ""
