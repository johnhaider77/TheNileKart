#!/bin/bash

echo "🚨 Emergency Website Startup"
echo "============================="
echo ""

# Step 1: Check system requirements
echo "Step 1: Checking system requirements..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo "Please install npm"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Step 2: Clean up ports
echo "Step 2: Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 3

# Step 3: Start basic backend
echo "Step 3: Starting emergency backend..."
cat > emergency-backend.js << 'EOF'
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (parsedUrl.pathname === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Emergency backend is running!', status: 'OK' }));
  } else if (parsedUrl.pathname === '/api/products') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ products: [], pagination: { currentPage: 1, totalPages: 0 } }));
  } else if (parsedUrl.pathname === '/api/banners') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ banners: [] }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(5000, () => {
  console.log('🚀 Emergency backend running on http://localhost:5000');
});

server.on('error', (err) => {
  console.error('Backend error:', err.message);
});
EOF

node emergency-backend.js &
BACKEND_PID=$!
echo "✅ Emergency backend started (PID: $BACKEND_PID)"
sleep 3

# Step 4: Test backend
echo "Step 4: Testing backend..."
if curl -s http://localhost:5000/api > /dev/null 2>&1; then
    echo "✅ Backend is responding!"
else
    echo "❌ Backend is not responding"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Step 5: Start frontend
echo "Step 5: Starting frontend..."
echo "This may take a few minutes..."

cd frontend
npm start &
FRONTEND_PID=$!
echo "✅ Frontend starting (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Emergency startup complete!"
echo ""
echo "🌐 Website: http://localhost:3000"
echo "🔧 API: http://localhost:5000"
echo ""
echo "Wait 2-3 minutes for frontend to compile, then visit:"
echo "http://localhost:3000"
echo ""
echo "To stop servers:"
echo "kill $BACKEND_PID $FRONTEND_PID"