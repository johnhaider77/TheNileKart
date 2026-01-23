#!/bin/bash

# 🚀 Full Stack Deployment Script
# Deploys both frontend and backend
# Usage: ./deploy-all.sh [frontend|backend|both]

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
FRONTEND_PATH="/var/www/thenilekart/frontend/build"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verify SSH key
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

# Determine what to deploy
DEPLOY_TYPE="${1:-both}"

deploy_frontend() {
    echo ""
    echo "🎨 Building & Deploying Frontend"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd "$LOCAL_PATH/frontend"
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    echo "🔨 Building..."
    npm run build
    
    echo "📤 Uploading to EC2..."
    rsync -avz --delete -e "ssh -i $EC2_KEY" \
        "build/" \
        "$EC2_USER@$EC2_HOST:$FRONTEND_PATH/" || {
        echo "❌ Frontend upload failed"
        return 1
    }
    
    echo "✅ Frontend deployed"
}

deploy_backend() {
    echo ""
    echo "⚙️  Deploying Backend"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo "📤 Syncing backend to EC2..."
    rsync -avz -e "ssh -i $EC2_KEY" \
        --exclude='node_modules' \
        --exclude='.env' \
        --exclude='uploads/' \
        "$LOCAL_PATH/backend/" \
        "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" || {
        echo "❌ Backend sync failed"
        return 1
    }
    
    echo "� Building backend on EC2..."
    ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
        "cd $EC2_PATH/backend && npm install" || {
        echo "❌ Failed to install dependencies on EC2"
        return 1
    }
    
    echo "📄 Syncing ecosystem config..."
    rsync -avz -e "ssh -i $EC2_KEY" \
        "$LOCAL_PATH/ecosystem.config.js" \
        "$EC2_USER@$EC2_HOST:$EC2_PATH/" || {
        echo "❌ Ecosystem config sync failed"
        return 1
    }
    
    echo "🔄 Restarting server with ecosystem config..."
    ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
        "cd $EC2_PATH && pm2 delete server 2>/dev/null || true && pm2 start ecosystem.config.js --only server --update-env" || {
        echo "❌ Failed to restart server"
        return 1
    }
    
    echo "✅ Backend deployed & restarted"
}

# Execute deployment
echo "🚀 Full Stack Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

case "$DEPLOY_TYPE" in
    frontend)
        deploy_frontend
        ;;
    backend)
        deploy_backend
        ;;
    both)
        deploy_frontend
        deploy_backend
        ;;
    *)
        echo "❌ Invalid option: $DEPLOY_TYPE"
        echo "Usage: $0 [frontend|backend|both]"
        exit 1
        ;;
esac

# Show final status
echo ""
echo "📊 Final Status:"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "pm2 status"

echo ""
echo "✅ Deployment complete!"
