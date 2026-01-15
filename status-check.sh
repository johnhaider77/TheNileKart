#!/bin/bash

echo "🔍 TheNileKart Service Status Check"
echo "=================================="

# Check backend
if nc -z localhost 5000 2>/dev/null; then
    echo "✅ Backend: RUNNING on http://localhost:5000"
else
    echo "❌ Backend: NOT RUNNING"
fi

# Check frontend  
if nc -z localhost 3000 2>/dev/null; then
    echo "✅ Frontend: RUNNING on http://localhost:3000"
else
    echo "❌ Frontend: NOT RUNNING"
fi

echo "=================================="
echo "🌐 Website: http://localhost:3000"
echo "📊 API: http://localhost:5000"
echo ""
echo "📝 If both services are running, you can access:"
echo "   • Main website at http://localhost:3000"
echo "   • Seller login by navigating to the appropriate page"
echo "   • Use credentials: seller@example.com / password123"