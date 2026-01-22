#!/bin/bash

# 🧹 Database Cleanup Script
# Removes all products, banners, offers created by sellers other than specified users
# Keeps only: johnhader77@gmail.com and maryam.zaidi2904@gmail.com

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verify SSH key
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

echo "🧹 Database Cleanup - Fresh Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WARNING: This will delete ALL products, banners, and offers created by other sellers!"
echo "Users to keep:"
echo "  - johnhader77@gmail.com"
echo "  - maryam.zaidi2904@gmail.com"
echo ""

# Ask for confirmation
read -p "Are you sure you want to proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "📤 Syncing cleanup script to EC2..."
scp -i "$EC2_KEY" \
    "$LOCAL_PATH/backend/cleanup-database.js" \
    "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/" || {
    echo "❌ Failed to sync cleanup script"
    exit 1
}

echo "✅ Cleanup script synced"
echo ""
echo "🚀 Running cleanup on EC2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
    "cd $EC2_PATH/backend && node cleanup-database.js" || {
    echo "❌ Cleanup script failed on EC2"
    exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Database cleanup completed successfully!"
echo ""
echo "📝 Summary:"
echo "  - All products created by other sellers: DELETED ✓"
echo "  - All orders related to deleted products: DELETED ✓"
echo "  - All cart items for deleted products: DELETED ✓"
echo "  - All banners created by other sellers: DELETED ✓"
echo "  - All offers created by other sellers: DELETED ✓"
echo "  - All seller accounts (except 2): DELETED ✓"
echo ""
echo "✨ Database is now fresh and ready for new content!"
