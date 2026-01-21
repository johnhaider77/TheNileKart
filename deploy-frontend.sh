#!/bin/bash

# Frontend Deployment Script for EC2
# Deploys the production build to the EC2 instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_USER="ubuntu"
EC2_HOST="3.29.235.62"
EC2_KEY="$HOME/.ssh/thenilekart-key.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "📦 Deploying frontend to EC2 instance..."
echo "Target: $EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build"

# Check if build directory exists
if [ ! -d "$SCRIPT_DIR/frontend/build" ]; then
    echo "❌ Frontend build not found at $SCRIPT_DIR/frontend/build"
    echo "Run 'npm run build' in frontend directory first."
    exit 1
fi

# Create remote directory if needed
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "mkdir -p $EC2_PATH/frontend" 2>/dev/null

# Sync the build folder to EC2
echo "🔄 Syncing build files to EC2..."
rsync -avz --delete \
    -e "ssh -i $EC2_KEY" \
    "$SCRIPT_DIR/frontend/build/" \
    "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/"

if [ $? -eq 0 ]; then
    echo "✅ Frontend deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. SSH into EC2: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
    echo "2. Restart the frontend service (if using PM2):"
    echo "   cd $EC2_PATH && pm2 restart frontend"
    echo "3. Or manually serve the build with:"
    echo "   cd $EC2_PATH/frontend && npx serve -s build -l 3000"
else
    echo "❌ Deployment failed"
    exit 1
fi
