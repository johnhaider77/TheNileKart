const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files from uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple health check
app.get('/api', (req, res) => {
  res.json({ message: 'TheNileKart Backend is running!', status: 'OK' });
});

// Mock products endpoint
app.get('/api/products', (req, res) => {
  res.json({
    products: [
      {
        id: 1,
        name: 'Sample Product',
        price: 29.99,
        market_price: 39.99,
        stock_quantity: 10,
        category: 'Electronics',
        description: 'Sample product description',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
        sizes: []
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalProducts: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  });
});

// Mock trending products
app.get('/api/products/trending', (req, res) => {
  res.json({ products: [] });
});

// Mock preferred products
app.get('/api/products/preferred', (req, res) => {
  res.json({ products: [] });
});

// Mock banners
app.get('/api/banners', (req, res) => {
  res.json({ banners: [] });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simplified backend running on http://localhost:${PORT}`);
  console.log('✅ No database required for this version');
});