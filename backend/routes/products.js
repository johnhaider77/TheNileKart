const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to convert relative URLs to absolute URLs
const getAbsoluteUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Convert relative path to absolute URL using server domain
  const serverUrl = process.env.BACKEND_URL || process.env.SERVER_URL || `https://${process.env.DOMAIN_NAME || 'thenilekart.com'}`;
  return `${serverUrl}${url}`;
};

// Helper function to convert image URLs in product object
const convertProductImageUrls = (product) => {
  if (!product) return product;
  if (product.image_url) {
    product.image_url = getAbsoluteUrl(product.image_url);
  }
  if (product.images && Array.isArray(product.images)) {
    product.images = product.images.map(img => ({
      ...img,
      url: getAbsoluteUrl(img.url)
    }));
  }
  if (product.videos && Array.isArray(product.videos)) {
    product.videos = product.videos.map(video => ({
      ...video,
      url: getAbsoluteUrl(video.url)
    }));
  }
  return product;
};

// Get all products with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().trim(),
  query('search').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { category, search, minPrice, maxPrice } = req.query;

    let whereClause = 'WHERE p.is_active = true';
    let queryParams = [];
    let paramCount = 0;

    // Add filters
    if (category) {
      paramCount++;
      whereClause += ` AND p.category = $${paramCount}`;
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (minPrice) {
      paramCount++;
      whereClause += ` AND p.price >= $${paramCount}`;
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      whereClause += ` AND p.price <= $${paramCount}`;
      queryParams.push(maxPrice);
    }

    // Add pagination parameters
    queryParams.push(limit, offset);

    const productsQuery = `
      SELECT 
        p.id, p.name, p.description, p.price, p.category, 
        p.image_url, p.images, p.videos, p.stock_quantity, p.sizes, p.market_price, p.created_at, p.cod_eligible,
        u.full_name as seller_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const products = await db.query(productsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      JOIN users u ON p.seller_id = u.id
      ${whereClause}
    `;

    const totalCount = await db.query(countQuery, queryParams.slice(0, paramCount));

    res.json({
      products: products.rows.map(convertProductImageUrls),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalProducts: parseInt(totalCount.rows[0].total),
        hasNextPage: page < Math.ceil(totalCount.rows[0].total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// Get trending products
router.get('/trending', async (req, res) => {
  try {
    const query = `
      SELECT p.*, tp.order_count,
             COALESCE(p.images, '[]'::jsonb) as images
      FROM trending_products tp
      JOIN products p ON tp.product_id = p.id
      WHERE p.is_active = true
      ORDER BY tp.order_count DESC, tp.last_updated DESC
      LIMIT 10
    `;
    
    const result = await db.query(query);
    
    // If no trending products, fallback to recent products
    if (result.rows.length === 0) {
      const fallbackQuery = `
        SELECT p.*,
               COALESCE(p.images, '[]'::jsonb) as images
        FROM products p
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 10
      `;
      
      const fallbackResult = await db.query(fallbackQuery);
      return res.json({ products: fallbackResult.rows.map(convertProductImageUrls) });
    }
    
    res.json({ products: result.rows.map(convertProductImageUrls) });
  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ message: 'Server error fetching trending products' });
  }
});

// Get preferred products for a user based on their history
router.get('/preferred', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's purchase history and browsing patterns
    const userHistoryQuery = `
      SELECT DISTINCT p.category, COUNT(*) as category_count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.customer_id = $1 AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.category
      ORDER BY category_count DESC
      LIMIT 3
    `;
    
    const historyResult = await db.query(userHistoryQuery, [userId]);
    const preferredCategories = historyResult.rows.map(row => row.category);
    
    let query;
    let queryParams = [userId];
    
    if (preferredCategories.length > 0) {
      // Get products from preferred categories, excluding already purchased items
      const categoryPlaceholders = preferredCategories.map((_, index) => `$${index + 2}`).join(',');
      query = `
        SELECT p.*,
               COALESCE(p.images, '[]'::jsonb) as images
        FROM products p
        WHERE p.is_active = true
        AND p.category IN (${categoryPlaceholders})
        AND p.id NOT IN (
          SELECT DISTINCT oi.product_id
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE o.customer_id = $1
        )
        ORDER BY p.created_at DESC, RANDOM()
        LIMIT 10
      `;
      queryParams = [userId, ...preferredCategories];
    } else {
      // No purchase history, return popular/recent products
      query = `
        SELECT p.*,
               COALESCE(p.images, '[]'::jsonb) as images
        FROM products p
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 10
      `;
      queryParams = [];
    }
    
    const result = await db.query(query, queryParams);
    res.json({ products: result.rows.map(convertProductImageUrls) });
    
  } catch (error) {
    console.error('Error fetching preferred products:', error);
    res.status(500).json({ message: 'Server error fetching preferred products' });
  }
});

// Update trending products (this should be called hourly via cron job)
router.post('/update-trending', async (req, res) => {
  try {
    // Clear existing trending products
    await db.query('DELETE FROM trending_products');
    
    // Insert new trending products based on recent orders (last 5 days)
    const updateQuery = `
      INSERT INTO trending_products (product_id, order_count)
      SELECT 
          p.id as product_id,
          COUNT(oi.id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '5 days'
      AND p.is_active = true
      GROUP BY p.id
      HAVING COUNT(oi.id) > 0
      ORDER BY order_count DESC
      LIMIT 10
    `;
    
    const result = await db.query(updateQuery);
    
    res.json({ 
      success: true, 
      message: 'Trending products updated successfully',
      updated_count: result.rowCount
    });
    
  } catch (error) {
    console.error('Error updating trending products:', error);
    res.status(500).json({ message: 'Server error updating trending products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await db.query(
      `SELECT 
        p.id, p.name, p.description, p.price, p.category, 
        p.image_url, p.images, p.videos, p.stock_quantity, p.sizes, p.created_at, p.updated_at,
        u.full_name as seller_name, u.email as seller_email
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.id = $1 AND p.is_active = true`,
      [productId]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: convertProductImageUrls(product.rows[0]) });

  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ message: 'Server error fetching product' });
  }
});

// Get product categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await db.query(
      `SELECT DISTINCT category 
       FROM products 
       WHERE is_active = true AND category IS NOT NULL
       ORDER BY category`
    );

    res.json({ categories: categories.rows.map(row => row.category) });

  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// Get available sizes for a product
router.get('/:id/sizes', async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await db.query(
      'SELECT * FROM get_product_available_sizes($1)',
      [productId]
    );

    res.json({ sizes: result.rows });

  } catch (error) {
    console.error('Product sizes fetch error:', error);
    res.status(500).json({ message: 'Server error fetching product sizes' });
  }
});

// Check size availability for a product
router.post('/:id/check-size', [
  body('size').trim().notEmpty().withMessage('Size is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = req.params.id;
    const { size, quantity = 1 } = req.body;

    const result = await db.query(`
      SELECT 
        size_data->>'size' as size,
        (size_data->>'quantity')::INTEGER as available_quantity,
        (size_data->>'quantity')::INTEGER >= $2 as is_available
      FROM products p
      CROSS JOIN LATERAL jsonb_array_elements(p.sizes) AS size_data
      WHERE p.id = $1 
        AND size_data->>'size' = $3
        AND jsonb_typeof(size_data) = 'object'
        AND size_data ? 'size' 
        AND size_data ? 'quantity'
    `, [productId, quantity, size]);

    if (result.rows.length === 0) {
      return res.json({ 
        available: false, 
        message: 'Size not available for this product',
        available_quantity: 0
      });
    }

    const sizeInfo = result.rows[0];
    res.json({
      available: sizeInfo.is_available,
      available_quantity: sizeInfo.available_quantity,
      message: sizeInfo.is_available 
        ? `${sizeInfo.available_quantity} items available in size ${size}`
        : `Size ${size} is out of stock`
    });

  } catch (error) {
    console.error('Size availability check error:', error);
    res.status(500).json({ message: 'Server error checking size availability' });
  }
});

// Search suggestions endpoint
router.get('/search-suggestions', [
  query('q').notEmpty().trim().withMessage('Search query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchQuery = req.query.q;

    const suggestionsQuery = `
      (
        SELECT DISTINCT p.name as suggestion, 'product' as type, 1 as priority
        FROM products p
        WHERE p.is_active = true AND p.name ILIKE $1
        LIMIT 3
      )
      UNION ALL
      (
        SELECT DISTINCT p.category as suggestion, 'category' as type, 2 as priority
        FROM products p
        WHERE p.is_active = true AND p.category ILIKE $1
        LIMIT 3
      )
      ORDER BY priority, suggestion
      LIMIT 8
    `;

    const searchTerm = `%${searchQuery}%`;
    const result = await db.query(suggestionsQuery, [searchTerm]);

    const suggestions = result.rows.map(row => row.suggestion);

    res.json({ suggestions });

  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;