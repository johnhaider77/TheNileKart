#!/bin/bash

# Script to sync iOS app code to EC2
# Usage: ./sync-ios-to-ec2.sh <EC2_IP> [Port number]

EC2_IP=${1:-"40.172.190.250"}
SSH_KEY="~/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekartIOS/TheNileKart"
LOCAL_IOS_PATH="./ios-app"

echo "🔄 Syncing iOS app to EC2..."
echo "Target: $EC2_PATH"
echo "Server: ubuntu@$EC2_IP"

# Create the target directory if it doesn't exist
ssh -i $SSH_KEY ubuntu@$EC2_IP "mkdir -p $EC2_PATH" || {
    echo "❌ Failed to create remote directory"
    exit 1
}

# Sync the iOS app folder
rsync -avz --delete -e "ssh -i $SSH_KEY" "$LOCAL_IOS_PATH/" ubuntu@$EC2_IP:"$EC2_PATH/" || {
    echo "❌ Failed to sync iOS app"
    exit 1
}

echo "✅ iOS app synced successfully!"

# Verify the sync
ssh -i $SSH_KEY ubuntu@$EC2_IP "ls -lh $EC2_PATH" && echo "✅ Verification successful!"

exit 0
