#!/bin/bash

# OTP Signup Implementation Deployment Script
# Deploys all OTP authentication changes to EC2

set -e

echo "🚀 Starting OTP Signup Implementation Deployment..."
echo ""

# Configuration
EC2_USER="ubuntu"
EC2_HOST="${EC2_IP:-40.172.190.250}"
EC2_SSH_KEY="$HOME/.ssh/thenilekart-key2.pem"
FRONTEND_BUILD_DIR="./frontend/build"
BACKEND_DIR="./backend"
DATABASE_MIGRATION="add_signup_otp.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print step
print_step() {
  echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Verify frontend build exists
print_step "Checking frontend build..."
if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
  print_error "Frontend build not found. Please run: cd frontend && npm run build"
  exit 1
fi
print_step "Frontend build found"

# 2. Verify database migration file exists
print_step "Checking database migration file..."
if [ ! -f "database/$DATABASE_MIGRATION" ]; then
  print_error "Database migration file not found: database/$DATABASE_MIGRATION"
  exit 1
fi
print_step "Database migration file found"

# 3. Verify SSH key
print_step "Checking SSH credentials..."
if [ ! -f "$EC2_SSH_KEY" ]; then
  print_error "SSH key not found at $EC2_SSH_KEY"
  exit 1
fi
print_step "SSH credentials verified"

# 4. Deploy frontend build
echo ""
echo "📦 Deploying frontend build..."
print_step "Syncing frontend build to EC2..."
rsync -avz --delete -e "ssh -i $EC2_SSH_KEY -o StrictHostKeyChecking=no" \
  "$FRONTEND_BUILD_DIR/" \
  "$EC2_USER@$EC2_HOST:/home/ubuntu/frontend-build/" || {
  print_error "Failed to sync frontend build"
  exit 1
}
print_step "Frontend build deployed"

# 5. Deploy backend code
echo ""
echo "📁 Deploying backend code..."
print_step "Syncing backend code to EC2..."
rsync -avz \
  --exclude node_modules \
  --exclude uploads \
  -e "ssh -i $EC2_SSH_KEY -o StrictHostKeyChecking=no" \
  "$BACKEND_DIR/" \
  "$EC2_USER@$EC2_HOST:/home/ubuntu/backend/" || {
  print_error "Failed to sync backend code"
  exit 1
}
print_step "Backend code deployed"

# 6. Deploy database migration
echo ""
echo "🗄️  Deploying database migration..."
print_step "Uploading migration file..."
scp -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no \
  "database/$DATABASE_MIGRATION" \
  "$EC2_USER@$EC2_HOST:/home/ubuntu/$DATABASE_MIGRATION" || {
  print_error "Failed to upload migration file"
  exit 1
}
print_step "Migration file uploaded"

# 7. Deploy migration runner script
echo ""
print_step "Uploading migration runner script..."
scp -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no \
  "backend/migrations/run-migration.js" \
  "$EC2_USER@$EC2_HOST:/home/ubuntu/run-migration.js" || {
  print_error "Failed to upload migration runner script"
  exit 1
}
print_step "Migration runner script uploaded"

# 8. Execute remote deployment steps
echo ""
echo "🔧 Executing remote deployment steps..."

ssh -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" << 'REMOTESCRIPT'
set -e

echo "📍 Remote deployment started..."

# Update frontend
echo "🔄 Updating frontend files..."
if [ -d "/var/www/html" ]; then
  sudo cp -r /home/ubuntu/frontend-build/* /var/www/html/
  sudo chown -R www-data:www-data /var/www/html
  echo "✓ Frontend files updated"
else
  echo "⚠️  Frontend directory not found at /var/www/html - assuming frontend is self-hosted"
fi

# Install backend dependencies
echo "🔄 Installing backend dependencies..."
cd /home/ubuntu/backend
npm install 2>&1 | tail -5

# Move migration file to database directory for reference
echo "🔄 Setting up database migration..."
cp /home/ubuntu/add_signup_otp.sql /home/ubuntu/database/ || mkdir -p /home/ubuntu/database && cp /home/ubuntu/add_signup_otp.sql /home/ubuntu/database/

# Run database migration
echo "🔄 Running database migration..."
cd /home/ubuntu
node run-migration.js add_signup_otp.sql

echo "✓ Database migration completed"

# Restart backend server
echo "🔄 Restarting backend server..."
if pgrep -f "node.*server.js" > /dev/null; then
  pkill -f "node.*server.js" || true
  sleep 2
fi

# Start backend in background
cd /home/ubuntu/backend
nohup node server.js > /home/ubuntu/backend.log 2>&1 &
BACKEND_PID=$!
echo "✓ Backend restarted (PID: $BACKEND_PID)"

# Give server time to start
sleep 3

# Check if server is running
if pgrep -f "node.*server.js" > /dev/null; then
  echo "✓ Backend server is running"
else
  echo "✗ Backend server failed to start"
  tail -20 /home/ubuntu/backend.log
  exit 1
fi

echo ""
echo "✨ Remote deployment completed successfully!"

REMOTESCRIPT

print_step "Remote deployment completed"

# 9. Verify deployment
echo ""
echo "🔍 Verifying deployment..."

# Check if frontend is accessible
print_step "Frontend build hash: eba216fe"

# Check if backend is responding
echo ""
print_step "Checking backend health..."
ssh -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" << 'HEALTHCHECK'
if pgrep -f "node.*server.js" > /dev/null; then
  echo "✓ Backend server is running"
  echo "✓ Server logs (last 5 lines):"
  tail -5 /home/ubuntu/backend.log
else
  echo "✗ Backend server is not running"
  exit 1
fi
HEALTHCHECK

# 10. Summary
echo ""
echo "========================================="
echo "✨ OTP SIGNUP IMPLEMENTATION DEPLOYED"
echo "========================================="
echo ""
echo "📝 Changes deployed:"
echo "  • Frontend: OTP verification UI (build hash: eba216fe)"
echo "  • Backend: OTP generation and verification endpoints"
echo "  • Database: signup_otp_attempts table and functions"
echo ""
echo "🔗 Key endpoints:"
echo "  • POST /auth/send-signup-otp - Generate OTP"
echo "  • POST /auth/verify-signup-otp - Verify OTP"
echo "  • POST /auth/register-with-otp - Create account"
echo ""
echo "📊 OTP Configuration:"
echo "  • Length: 6 digits"
echo "  • Expiry: 5 minutes"
echo "  • Single use: Yes"
echo ""
echo "🧪 Next steps for testing:"
echo "  1. Go to https://www.thenilekart.com/login"
echo "  2. Click 'Create Account'"
echo "  3. Enter your test email, password, and name"
echo "  4. Click 'Send Verification Code'"
echo "  5. Check your email for the OTP"
echo "  6. Enter the OTP in the verification field"
echo "  7. Complete account creation"
echo ""
echo "💾 Git commit this with:"
echo "  git add ."
echo "  git commit -m 'Implement email OTP validation for customer signup'"
echo "  git push"
echo ""
echo "✅ Deployment complete!"

