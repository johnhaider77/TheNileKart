#!/bin/bash

# Emergency Port Cleanup Script
# Usage: ./fix-port-5000.sh
# This script forcefully cleans up stale node processes on port 5000

echo "🔧 Cleaning up port 5000..."

# Kill all node processes
pkill -9 node

# Wait for processes to fully terminate
sleep 2

# Restart the server with PM2
pm2 restart server --force

# Show status
pm2 status

echo "✅ Port 5000 cleaned up and server restarted"
