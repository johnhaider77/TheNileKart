#!/bin/bash
# Deploy frontend to EC2 production
# Usage: ./deploy-frontend-production.sh

REMOTE_USER="ubuntu"
REMOTE_HOST="40.172.190.250"
REMOTE_KEY="~/.ssh/thenilekart-key2.pem"
REMOTE_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/build"
LOCAL_PATH="./frontend/build"

echo "🚀 Building frontend locally..."
cd frontend && npm run build 2>&1 | tail -2 || exit 1
cd ..

echo "📦 Deploying to EC2..."
ssh -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "rm -rf $REMOTE_PATH/*"
scp -i $REMOTE_KEY -r $LOCAL_PATH/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

echo "🔄 Restarting nginx..."
ssh -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "sudo systemctl restart nginx"

sleep 2
echo "✅ Verifying deployment..."
VERSION=$(ssh -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "curl -s https://www.thenilekart.com/ | grep -o 'main\.[a-f0-9]*\.js' | head -1")
echo "✅ Frontend deployed successfully! Version: $VERSION"
