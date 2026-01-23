#!/bin/bash

# Comprehensive deployment script: sync code to EC2, build backend, and start services
# This script:
# 1. Syncs backend code to EC2
# 2. Syncs frontend build to EC2
# 3. Builds backend on EC2 (npm install)
# 4. Restarts PM2 services

set -e

# Configuration
EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}TheNileKart Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"

# Step 1: Sync backend code
echo -e "\n${YELLOW}[1/4] Syncing backend code to EC2...${NC}"
rsync -avz --exclude='node_modules' --exclude='.env*' \
  ./backend/ \
  "${EC2_USER}@${EC2_HOST}:${EC2_PATH}/backend/" \
  -e "ssh -i ${EC2_KEY}"
echo -e "${GREEN}✓ Backend synced${NC}"

# Step 2: Sync frontend build
echo -e "\n${YELLOW}[2/4] Syncing frontend build to EC2...${NC}"
rsync -avz --exclude='node_modules' \
  ./frontend/build/ \
  "${EC2_USER}@${EC2_HOST}:${EC2_PATH}/frontend/build/" \
  -e "ssh -i ${EC2_KEY}"
echo -e "${GREEN}✓ Frontend build synced${NC}"

# Step 3: Build backend on EC2 (npm ci)
echo -e "\n${YELLOW}[3/4] Building backend on EC2...${NC}"
ssh -i "${EC2_KEY}" "${EC2_USER}@${EC2_HOST}" << 'ENDSSH'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend
echo "Installing backend dependencies..."
npm ci --legacy-peer-deps 2>&1 | tail -5
echo "✓ Backend dependencies installed"
ENDSSH
echo -e "${GREEN}✓ Backend built${NC}"

# Step 4: Start services
echo -e "\n${YELLOW}[4/4] Starting services on EC2...${NC}"
ssh -i "${EC2_KEY}" "${EC2_USER}@${EC2_HOST}" << 'ENDSSH'
cd /home/ubuntu/var/www/thenilekart/TheNileKart

# Stop existing services
pm2 stop all 2>/dev/null || true
sleep 2

# Start services from ecosystem file
if [ -f "ecosystem.config.js" ]; then
  pm2 start ecosystem.config.js
  echo "✓ Services started from ecosystem config"
else
  echo "Warning: ecosystem.config.js not found"
  pm2 start backend/server.js --name "nile-server"
  echo "✓ Server started"
fi

# Show status
sleep 2
pm2 status
ENDSSH
echo -e "${GREEN}✓ Services started${NC}"

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\nFrontend: ${YELLOW}https://www.thenilekart.com${NC}"
echo -e "Backend API: ${YELLOW}https://www.thenilekart.com/api${NC}"
echo -e "\nTo check server logs: ${YELLOW}ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 'pm2 logs'${NC}"
