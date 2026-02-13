#!/bin/bash

# Push Notification Deployment Script
# This script deploys the push notification feature to EC2

set -e

echo "🚀 Starting Push Notification Deployment..."

# Configuration
EC2_HOST="40.172.190.250"
EC2_USER="ubuntu"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
LOCAL_FRONTEND_BUILD="./frontend/build"
LOCAL_DATABASE_MIGRATION="./database/add_push_notifications.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_step() {
  echo -e "${YELLOW}📍 $1${NC}"
}

# Step 1: Verify frontend build exists
print_step "Checking frontend build..."
if [ ! -d "$LOCAL_FRONTEND_BUILD" ]; then
  print_error "Frontend build directory not found. Please run 'npm run build' first."
  exit 1
fi
print_status "Frontend build found"

# Step 2: SSH connection test
print_step "Testing SSH connection to EC2..."
ssh -o ConnectTimeout=5 "$EC2_USER@$EC2_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  print_error "Cannot connect to EC2 server. Check SSH access and IP address."
  exit 1
fi
print_status "SSH connection successful"

# Step 3: Backup current EC2 deployment
print_step "Creating backup on EC2..."
ssh "$EC2_USER@$EC2_HOST" "
  if [ -d '$EC2_PATH' ]; then
    BACKUP_DIR='$EC2_PATH/../backup_'$(date +%Y%m%d_%H%M%S)
    cp -r '$EC2_PATH' \"\$BACKUP_DIR\"
    echo 'Backup created at '\"\$BACKUP_DIR\"
  fi
"
print_status "Backup created"

# Step 4: Sync backend code (excluding frontend build from old location)
print_step "Syncing backend code to EC2..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='build' \
  --exclude='.env' \
  --exclude='*.log' \
  --exclude='uploads/*' \
  --exclude='backend/node_modules' \
  ./backend/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/"
print_status "Backend code synced"

# Step 5: Sync database migrations
print_step "Syncing database migrations to EC2..."
rsync -avz \
  ./database/ "$EC2_USER@$EC2_HOST:$EC2_PATH/database/"
print_status "Database migrations synced"

# Step 6: Sync frontend build
print_step "Syncing built frontend to EC2..."
rsync -avz --delete \
  "$LOCAL_FRONTEND_BUILD/" "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/"
print_status "Frontend build synced"

# Step 7: Run database migration on EC2
print_step "Running database migration on EC2..."
ssh "$EC2_USER@$EC2_HOST" "
  cd $EC2_PATH
  psql -h \$RDS_HOSTNAME -U \$RDS_USERNAME -d \$RDS_DB_NAME -f database/add_push_notifications.sql
  if [ \$? -eq 0 ]; then
    echo 'Database migration completed successfully'
  else
    echo 'Database migration failed'
    exit 1
  fi
"
print_status "Database migration completed"

# Step 8: Build backend on EC2
print_step "Installing backend dependencies on EC2..."
ssh "$EC2_USER@$EC2_HOST" "
  cd $EC2_PATH/backend
  npm install --production 2>&1 | grep -E '(added|removed|audited|packages|found 0 vulnerabilities)'
"
print_status "Backend dependencies installed"

# Step 9: Restart backend service on EC2
print_step "Restarting backend service on EC2..."
ssh "$EC2_USER@$EC2_HOST" "
  # Stop existing service
  pm2 delete 'thenilekart-backend' 2>/dev/null || true
  
  # Start service
  cd $EC2_PATH/backend
  pm2 start server.js --name 'thenilekart-backend' --env production
  pm2 save
  
  # Wait for service to start
  sleep 3
  
  # Check if running
  if pm2 list | grep -q 'thenilekart-backend.*online'; then
    echo 'Backend service started successfully'
  else
    echo 'Failed to start backend service'
    exit 1
  fi
"
print_status "Backend service restarted"

# Step 10: Verify deployment
print_step "Verifying deployment..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_HOST:5000/api/health")
if [ "$HEALTH_CHECK" = "200" ]; then
  print_status "Backend health check passed"
else
  print_error "Backend health check failed (HTTP $HEALTH_CHECK)"
  exit 1
fi

# Final status
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
print_status "Push Notification Deployment Complete!"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "  - Backend code synced to EC2"
echo "  - Database migration executed"
echo "  - Frontend build deployed"
echo "  - Backend service restarted"
echo "  - Health check passed"
echo ""
echo "🔗 Access your app at: http://$EC2_HOST:3000"
echo "🔗 API endpoint: http://$EC2_HOST:5000/api"
echo ""
echo "📝 Next Steps:"
echo "  1. Set FIREBASE_SERVICE_ACCOUNT_KEY in EC2 .env.production"
echo "  2. Update iOS/Android apps with Firebase credentials"
echo "  3. Test push notifications"
echo ""
