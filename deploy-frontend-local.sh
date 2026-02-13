#!/bin/bash
# Deploy locally built frontend to EC2

echo "🚀 Frontend Deployment to EC2"
echo "========================================="
echo

TARGET_HOST="ubuntu@40.172.190.250"
TARGET_PATH="/home/ubuntu/var/www/thenilekart/TheNileKart"

if [ ! -d "frontend/build" ]; then
    echo "❌ Error: frontend/build not found"
    echo "Run 'npm run build' in frontend directory first"
    exit 1
fi

echo "📦 Build Size:"
du -sh frontend/build/

echo
echo "🔄 Transferring frontend build to EC2..."
echo "From: $(pwd)/frontend/build/"
echo "To: $TARGET_HOST:$TARGET_PATH/frontend/dist/"
echo

# Create tar file for faster transfer
echo "📦 Creating archive..."
cd frontend
tar -czf build.tar.gz build/
cd ..

# Transfer
echo "📡 Uploading to EC2..."
scp frontend/build.tar.gz "$TARGET_HOST:$TARGET_PATH/"

if [ $? -eq 0 ]; then
    echo "✅ Upload successful"
    echo
    echo "📝 Next steps o#!/bin/bash
# Deploy locally built frontend to EC2

echo "🚀 Frontend Deployment to EC2"
echo "======================f # Deploy lis
echo "🚀 Frontend Deployment to ECfroecho "=============================== fecho

TARGET_HOST="ubuntu@40.172.190.250"
TARGEgz
TAho TARGET_PATH="/houp done"

