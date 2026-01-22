#!/bin/bash

# 🧹 Complete Database Reset Script
# Deletes ALL data: users, products, banners, offers, orders, addresses, cart items
# Fresh start - empty database ready for new data

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

echo "🧹 COMPLETE DATABASE RESET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  CRITICAL WARNING: This will DELETE EVERYTHING!"
echo ""
echo "The following will be PERMANENTLY DELETED:"
echo "  - ALL users (customers and sellers)"
echo "  - ALL products"
echo "  - ALL banners and offers"
echo "  - ALL orders and order history"
echo "  - ALL saved addresses"
echo "  - ALL shopping carts"
echo "  - ALL metrics data"
echo ""
echo "The database will be COMPLETELY EMPTY after this operation!"
echo ""

# Ask for confirmation twice
read -p "Are you absolutely sure? (type 'YES' to confirm): " confirm1
if [ "$confirm1" != "YES" ]; then
    echo "❌ Reset cancelled"
    exit 1
fi

read -p "This is your LAST chance to cancel. Type 'DELETE ALL' to proceed: " confirm2
if [ "$confirm2" != "DELETE ALL" ]; then
    echo "❌ Reset cancelled"
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
echo "🚀 Running COMPLETE DATABASE RESET on EC2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
    "cd $EC2_PATH/backend && node cleanup-database.js" || {
    echo "❌ Reset script failed on EC2"
    exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COMPLETE DATABASE RESET SUCCESSFUL!"
echo ""
echo "🗑️  Deleted:"
echo "  - All users (100%)"
echo "  - All products (100%)"
echo "  - All banners (100%)"
echo "  - All offers (100%)"
echo "  - All orders (100%)"
echo "  - All addresses (100%)"
echo "  - All cart items (100%)"
echo ""
echo "✨ Database is now completely empty and ready for fresh data!"
