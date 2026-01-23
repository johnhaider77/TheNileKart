#!/bin/bash
# Deploy image URL fix to EC2

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Deploying Image URL Fix to EC2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

echo ""
echo "📦 Syncing backend code..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='uploads' \
  ./backend/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/"

echo ""
echo "🔨 Building frontend locally..."
cd ./frontend
echo "Installing dependencies..."
npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -5
echo "Building..."
npm run build 2>&1 | tail -10
cd ..

echo ""
echo "📦 Copying frontend build..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  ./frontend/build/ "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/"

echo ""
echo "🔨 Building backend on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -3"

echo ""
echo "♻️  Restarting PM2 services..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && pm2 restart all"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "Summary of changes:"
echo "  ✓ Added getAbsoluteUrl() helper to convert relative URLs"
echo "  ✓ Fixed product creation to use absolute image URLs"
echo "  ✓ Fixed product updates to use absolute image URLs"
echo "  ✓ Fixed product retrieval to convert URLs"
echo "  ✓ Prevents mixed content warnings (http → https)"
echo "  ✓ Frontend rebuilt and deployed"
echo "  ✓ Backend restarted with new code"
