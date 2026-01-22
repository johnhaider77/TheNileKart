#!/bin/bash

# Recreate missing tables after database reset

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Recreating Missing Database Tables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📤 Syncing recreate script to EC2..."
scp -i "$EC2_KEY" \
    "$LOCAL_PATH/backend/recreate-missing-tables.js" \
    "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" || {
    echo "❌ Failed to sync script"
    exit 1
}

echo "✅ Script synced"
echo ""
echo "🚀 Running table creation on EC2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
    "cd $EC2_PATH/backend && node recreate-missing-tables.js" || {
    echo "❌ Failed to create tables"
    exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Missing tables recreated!"
echo ""
echo "Recreated tables:"
echo "  - user_sessions"
echo "  - metrics_tracking"
