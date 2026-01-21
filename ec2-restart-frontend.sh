#!/bin/bash

# This script should be run on the EC2 instance to restart the frontend with the new build
# SSH into the EC2 instance and run this script

echo "🔄 Restarting frontend with new build..."

# Kill any existing frontend processes
pkill -f "serve.*build" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
sleep 2

# Navigate to the frontend directory
cd /home/ec2-user/thenilekart/frontend

# Serve the build on port 3000
echo "📂 Serving frontend from build directory..."
npx serve -s build -l 3000 &

echo "✅ Frontend restarted!"
echo "🌐 Access the app at: http://3.29.235.62:3000"
