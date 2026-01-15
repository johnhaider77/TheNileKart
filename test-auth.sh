#!/bin/bash

echo "🚀 Testing TheNileKart Authentication"
echo "====================================="

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 8

# Test backend health
echo "🔍 Testing backend health..."
HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not responding"
    exit 1
fi

# Test authentication
echo "🔐 Testing seller authentication..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seller@example.com", "password": "password123"}' 2>/dev/null)

if echo "$AUTH_RESPONSE" | grep -q "token"; then
    echo "✅ Authentication SUCCESSFUL"
    echo "📝 Response: $AUTH_RESPONSE"
else
    echo "❌ Authentication FAILED"
    echo "📝 Response: $AUTH_RESPONSE"
fi

echo "====================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"