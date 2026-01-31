#!/bin/bash

# Android App Sync to EC2 Script
# Syncs the android-app code to EC2 server at /home/ubuntu/var/www/thenilekartAndroid/TheNileKart

set -e

echo "=========================================="
echo "TheNileKart Android App - EC2 Sync Script"
echo "=========================================="
echo ""

# Configuration
EC2_USER=${EC2_USER:-ubuntu}
EC2_IP=${EC2_IP:-$1}
EC2_KEY=${EC2_KEY:-~/.ssh/thenilekart-key2.pem}
EC2_PATH="/home/ubuntu/var/www/thenilekartAndroid/TheNileKart"

if [ -z "$EC2_IP" ]; then
    echo "Error: EC2_IP not provided"
    echo "Usage: ./sync-android-to-ec2.sh <EC2_IP>"
    echo "   or: EC2_IP=1.2.3.4 ./sync-android-to-ec2.sh"
    exit 1
fi

echo "Target: ubuntu@$EC2_IP:$EC2_PATH"
echo "Key: $EC2_KEY"
echo ""

# Check if EC2 key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "Error: EC2 key not found at $EC2_KEY"
    exit 1
fi

# Check if we can reach EC2
echo "Checking EC2 connectivity..."
if ! ping -c 1 "$EC2_IP" > /dev/null 2>&1; then
    echo "Warning: Cannot ping EC2 instance at $EC2_IP"
fi

echo "Creating EC2 directory structure..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_IP" "mkdir -p $EC2_PATH && chmod 755 $EC2_PATH"

echo ""
echo "Syncing android-app to EC2..."
rsync -avz --exclude='node_modules' \
    --exclude='.gradle' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='.idea' \
    -e "ssh -i $EC2_KEY" \
    "android-app/" "$EC2_USER@$EC2_IP:$EC2_PATH/android-app/"

echo ""
echo "Syncing frontend to EC2..."
rsync -avz --exclude='node_modules' \
    --exclude='build' \
    --exclude='.git' \
    -e "ssh -i $EC2_KEY" \
    "frontend/" "$EC2_USER@$EC2_IP:$EC2_PATH/frontend/"

echo ""
echo "Syncing backend to EC2..."
rsync -avz --exclude='node_modules' \
    --exclude='.git' \
    -e "ssh -i $EC2_KEY" \
    "backend/" "$EC2_USER@$EC2_IP:$EC2_PATH/backend/"

echo ""
echo "Setting permissions..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_IP" "chmod -R 755 $EC2_PATH && chown -R $EC2_USER:$EC2_USER $EC2_PATH"

echo ""
echo "✅ Sync complete!"
echo ""
echo "Next steps on EC2:"
echo "1. SSH: ssh -i $EC2_KEY $EC2_USER@$EC2_IP"
echo "2. Navigate: cd $EC2_PATH"
echo "3. Start frontend: PORT=3001 npm start (from frontend/)"
echo "4. Start backend: PORT=5001 node server.js (from backend/)"
echo ""
