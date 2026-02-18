#!/bin/bash

# Comprehensive deployment script with Firebase diagnostics

set -e

PROJECT_ROOT="/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart"
EC2_USER="ubuntu"
EC2_HOST="18.220.118.203"
EC2_PATH="/home/ubuntu/thenilekart"

echo "======================================"
echo "🚀 TheNileKart Full Deployment"
echo "======================================"

# Step 1: Build frontend
echo ""
echo "📦 Step 1: Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm run build 2>&1 | tail -20
echo "✅ Frontend built successfully"

# Step 2: Sync to EC2
echo ""
echo "🔄 Step 2: Syncing to EC2..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.env' \
  --exclude='.env*' \
  --exclude='firebase-service-account-key.json' \
  --exclude='build' \
  --exclude='dist' \
  "$PROJECT_ROOT/" "ubuntu@18.220.118.203:$EC2_PATH/"
echo "✅ Synced to EC2"

# Step 3: Check Firebase status on EC2
echo ""
echo "🔐 Step 3: Checking Firebase configuration on EC2..."
ssh -i ~/.ssh/thenilekart.pem "ubuntu@18.220.118.203" << 'EOF'
  cd /home/ubuntu/thenilekart/backend
  
  echo ""
  echo "=== Firebase Configuration Check ==="
  echo ""
  
  # Check environment variable
  if [ -z "$FIREBASE_SERVICE_ACCOUNT_KEY" ]; then
    echo "❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable NOT set"
    echo ""
    echo "📝 To fix on EC2:"
    echo "  1. Get your Firebase service account JSON from Google Cloud Console"
    echo "  2. SSH into EC2 and run:"
    echo "     export FIREBASE_SERVICE_ACCOUNT_KEY='{\"type\":\"service_account\",...}'"
    echo "  3. Add to ~/.bashrc or /etc/environment for persistence"
    echo "  4. Restart PM2: pm2 restart all"
  else
    echo "✅ FIREBASE_SERVICE_ACCOUNT_KEY is set"
  fi
  
  # Check file
  if [ -f "firebase-service-account-key.json" ]; then
    echo "✅ firebase-service-account-key.json file exists"
  else
    echo "❌ firebase-service-account-key.json file NOT found"
  fi
EOF

# Step 4: Restart backend services
echo ""
echo "🔄 Step 4: Restarting backend services..."
ssh -i ~/.ssh/thenilekart.pem "ubuntu@18.220.118.203" << 'EOF'
  cd /home/ubuntu/thenilekart/backend
  npm install --production 2>&1 | tail -5
  pm2 delete all 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  echo "✅ Backend restarted"
EOF

# Step 5: Deploy frontend to S3/Nginx
echo ""
echo "🌐 Step 5: Deploying frontend to web server..."
ssh -i ~/.ssh/thenilekart.pem "ubuntu@18.220.118.203" << 'EOF'
  cd /home/ubuntu/thenilekart/frontend
  
  # If using nginx
  if [ -d "/var/www/html/thenilekart" ]; then
    sudo cp -r build/* /var/www/html/thenilekart/
    sudo systemctl reload nginx
    echo "✅ Frontend deployed to nginx"
  else
    echo "⚠️  Nginx directory not found. Check deployment path."
  fi
EOF

# Step 6: Test the Firebase endpoint
echo ""
echo "🧪 Step 6: Testing Firebase status endpoint..."
sleep 3

FIREBASE_STATUS=$(curl -s http://18.220.118.203:5000/api/push-notifications/firebase-status)
echo "Firebase Status Response:"
echo "$FIREBASE_STATUS" | jq '.' 2>/dev/null || echo "$FIREBASE_STATUS"

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo "  1. If Firebase is NOT configured on EC2:"
echo "     - Get service account key from Google Cloud Console"
echo "     - SSH to EC2 and set FIREBASE_SERVICE_ACCOUNT_KEY environment variable"
echo "     - Restart PM2: pm2 restart all"
echo "  2. Test push notifications:"
echo "     - POST /api/push-notifications/send with valid recipient and message"
echo "  3. Check website: https://www.thenilekart.com"
echo ""
