const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables - use .env.production in production
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

// Import database connection
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const sellerRoutes = require('./routes/seller');
const bannerRoutes = require('./routes/banners');
const ziinaRoutes = require('./routes/ziina');
const metricsRoutes = require('./routes/metrics');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Trust proxy - required for rate limiting and X-Forwarded headers behind Nginx
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http://localhost:*", "http://127.0.0.1:*"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.137:3000',
    'http://40.172.190.250:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://192.168.1.137:3000',
      'http://40.172.190.250:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io instance available to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Handle seller dashboard connection
  socket.on('join-seller-dashboard', (sellerId) => {
    socket.join(`seller-${sellerId}`);
    console.log(`📊 Seller ${sellerId} joined dashboard`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Periodic metrics update (every 15 seconds)
setInterval(async () => {
  try {
    await db.query('SELECT cleanup_inactive_sessions()');
    // Emit updated metrics to all connected sellers
    io.emit('metrics-heartbeat', { timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in metrics heartbeat:', error);
  }
}, 15000);

// Body parsing middleware - increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files from build directory
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
try {
  if (require('fs').existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    console.log('📦 Serving frontend from:', frontendBuildPath);
  }
} catch (err) {
  console.log('⚠️  Frontend build directory not found, API-only mode');
}

// Static files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// API Routes - More specific routes first, then general routes at the end
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/ziina', ziinaRoutes);
app.use('/api/metrics', metricsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// General banner routes at the end (catches /api/banners, /api/offers, etc.)
app.use('/api', bannerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Serve index.html for React Router (must be after API routes)
const frontendIndexPath = path.join(__dirname, '..', 'frontend', 'build', 'index.html');
app.get('*', (req, res) => {
  // If it's not an API route and frontend exists, serve index.html
  if (!req.path.startsWith('/api') && require('fs').existsSync(frontendIndexPath)) {
    res.sendFile(frontendIndexPath);
  } else {
    res.status(404).json({ message: 'Endpoint not found' });
  }
});

// Start server on port 5000 for API
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API accessible at http://0.0.0.0:${PORT}`);
  console.log(`🔌 Socket.IO enabled for real-time metrics`);
});

module.exports = app;