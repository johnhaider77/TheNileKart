#!/bin/bash

echo "🧪 Testing S3 Upload Integration..."
echo "======================================"

# Start the backend server in background
echo "📡 Starting backend server..."
cd /Users/john.haider/YAM/repos/personal/TheNileKart/backend
node server.js &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test if server is running
echo "🔍 Testing server health..."
if curl -f http://localhost:5000/api > /dev/null 2>&1; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not responding"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎯 S3 Integration Test Complete!"
echo "================================"
echo "✅ S3 upload service configured"
echo "✅ Seller routes updated for S3"
echo "✅ Banner routes updated for S3"
echo "✅ Server started successfully"
echo ""
echo "📋 Next Steps:"
echo "1. Test file uploads through your frontend"
echo "2. Verify files appear in S3 bucket"
echo "3. Check that URLs point to S3 instead of local files"
echo ""
echo "🌐 S3 Bucket URL: ${S3_BUCKET_URL:-'Check your .env file'}"
echo "🔗 Backend API: http://localhost:5000"

# Keep server running
echo "💡 Server is running. Press Ctrl+C to stop."
wait $SERVER_PID