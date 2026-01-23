#!/bin/bash
# Deploy shipping fee feature to EC2

set -e

EC2_USER="ubuntu"
EC2_HOST="40.172.190.250"
EC2_KEY="$HOME/.ssh/thenilekart-key2.pem"
EC2_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

echo "🚀 Deploying Shipping Fee Feature to EC2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    echo "❌ SSH key not found at $EC2_KEY"
    exit 1
fi

echo ""
echo "📦 Copying backend utilities (codCalculations.js)..."
rsync -avz -e "ssh -i $EC2_KEY" \
  backend/utils/ "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/utils/" \
  --include="codCalculations.js" \
  --exclude="*"

echo ""
echo "📦 Copying backend routes (orders.js)..."
rsync -avz -e "ssh -i $EC2_KEY" \
  backend/routes/orders.js "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/routes/"

echo ""
echo "📦 Copying migration script..."
rsync -avz -e "ssh -i $EC2_KEY" \
  backend/run-shipping-fee-migration.js "$EC2_USER@$EC2_HOST:$EC2_PATH/backend/"

echo ""
echo "📦 Copying frontend build..."
rsync -avz -e "ssh -i $EC2_KEY" \
  --exclude='node_modules' \
  frontend/build/ "$EC2_USER@$EC2_HOST:$EC2_PATH/frontend/build/"

echo ""
echo "🔧 Running migration on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH/backend && node run-shipping-fee-migration.js"

echo ""
echo "♻️  Restarting PM2 services..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "cd $EC2_PATH && pm2 restart all"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "Summary of changes:"
echo "  ✓ Added calculateOnlineShippingFee() and calculateOrderWithOnlineShipping() functions"
echo "  ✓ Updated orders.js to apply shipping fees for online payments"
echo "  ✓ Added shipping_fee column to orders table"
echo "  ✓ Updated frontend to display shipping fee in checkout"
echo "  ✓ Frontend build deployed and services restarted"
