const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Enable CORS for all origins during testing
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Simple products endpoint without database for testing
app.get('/api/products', (req, res) => {
  console.log('Products endpoint called');
  res.json({
    products: [
      { id: 1, name: 'Test Product', price: 10.99 }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalProducts: 1
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});