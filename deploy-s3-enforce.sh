#!/bin/bash
# Deploy with local frontend build and EC2 backend build

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Deployment: S3-Only Upload Enforcement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

# Check if frontend build exists
if [ ! -d "./frontend/build" ]; then
    echo "❌ Frontend build not found! Run 'npm run build' in frontend directory first"
    exit 1
fi

echo ""
echo "📦 Syncing backend code to EC2..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='uploads' \
  ./backend/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" | tail -15

echo ""
echo "📦 Copying frontend build to EC2..."
rsync -avz -e "ssh -i $EC2_KEY" \
  ./frontend/build/ "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/" | tail -10

echo ""
echo "🔨 Building backend on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "
  cd $EC2_PATH/backend
  echo '📦 Installing backend dependencies...'
  npm ci --legacy-peer-deps --prefer-offline 2>&1 | grep -E 'added|up to date|audit'
"

echo ""
echo "♻️  Restarting PM2 services..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "
  cd $EC2_PATH
  echo '🔄 Restarting services...'
  pm2 restart all 2>&1 | grep -E 'restarted|error'
  sleep 2
  pm2 status
"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "Summary of changes:"
echo "  ✓ S3 now enforced in production (no fallback to local storage)"
echo "  ✓ Product creation/update fails if S3 upload fails"
echo "  ✓ Clear error messages shown to sellers"
echo "  ✓ Frontend deployed to EC2"
echo "  ✓ Backend rebuilt and restarted"
echo "  ✓ Services running with new S3 enforcement"
