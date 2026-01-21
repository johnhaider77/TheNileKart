#!/bin/bash
# Force restart backend on EC2

echo "🧹 Killing all processes using port 5000..."
sudo fuser -k 5000/tcp 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true

sleep 3

echo "🚀 Starting backend with production environment..."
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend

# Remove any stale nohup files
rm -f nohup.out

# Start with explicit NODE_ENV in background
NODE_ENV=production /usr/bin/node server.js > /tmp/backend.log 2>&1 &

sleep 2

echo "✅ Backend started"
echo "🔗 Testing connection..."
sleep 1
curl -s http://localhost:5000/api/health | head -c 50
echo ""
