const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const { calculateOrderWithCOD } = require('../utils/codCalculations');

const router = express.Router();

// Calculate COD fee and eligibility for cart items
router.post('/calculate-cod', [
  authenticateToken,
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isInt(),
  body('items.*.selectedSize').isString(),
  body('items.*.quantity').isInt({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items } = req.body;
    const cartItems = [];

    // Fetch product details for all items including size-specific pricing
    for (const item of items) {
      const product = await db.query(
        'SELECT id, name, price, sizes, cod_eligible FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );

      if (product.rows.length === 0) {
        return res.status(400).json({ 
          message: `Product with ID ${item.product_id} not found` 
        });
      }

      const productData = product.rows[0];
      let itemPrice = productData.price;
      let codEligible = productData.cod_eligible; // Fallback to product-level
      
      // Check if product has sizes and find size-specific pricing and COD eligibility
      if (productData.sizes && Array.isArray(productData.sizes) && item.selectedSize) {
        const sizeData = productData.sizes.find(size => size.size === item.selectedSize);
        if (sizeData) {
          itemPrice = sizeData.price || productData.price || 0;
          codEligible = sizeData.cod_eligible !== undefined ? sizeData.cod_eligible : productData.cod_eligible;
        }
      }

      cartItems.push({
        product: {
          id: productData.id,
          name: productData.name,
          sizes: productData.sizes,
          cod_eligible: productData.cod_eligible
        },
        product_id: item.product_id,
        name: productData.name,
        price: itemPrice,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        cod_eligible: codEligible
      });
    }

    // Calculate COD details
    const codCalculation = calculateOrderWithCOD(cartItems);

    res.json({
      subtotal: codCalculation.subtotal,
      codFee: codCalculation.codFee,
      total: codCalculation.total,
      codEligible: codCalculation.codEligible,
      nonCodItems: codCalculation.nonCodItems.map(item => ({
        id: item.product_id,
        name: item.name
      })),
      message: codCalculation.codEligible ? 
        (codCalculation.codFee === 0 ? 'Free COD (order value ≥ 100 AED)' : `COD fee: ${codCalculation.codFee} AED`) :
        'Some items are not eligible for Cash on Delivery'
    });

  } catch (error) {
    console.error('COD calculation error:', error);
    res.status(500).json({ message: 'Server error calculating COD' });
  }
});

// Create new order
router.post('/', [
  authenticateToken,
  requireCustomer,
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.size').optional().trim(),
  body('shipping_address.full_name').trim().isLength({ min: 2 }),
  body('shipping_address.address_line1').trim().isLength({ min: 5 }),
  body('shipping_address.address_line2').optional().trim(),
  body('shipping_address.city').trim().isLength({ min: 2 }),
  body('shipping_address.state').optional().trim(),
  body('shipping_address.postal_code').trim().isLength({ min: 1 }),
  body('shipping_address.phone').trim().isLength({ min: 8 }),
  body('payment_method').optional().isIn(['cod', 'paypal', 'card', 'ziina']),
], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shipping_address, payment_method = 'cod' } = req.body;
    const customer_id = req.user.id;

    await client.query('BEGIN');

    // Validate products and calculate total
    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await client.query(
        'SELECT id, name, price, stock_quantity, sizes, cod_eligible FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );

      if (product.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Product with ID ${item.product_id} not found` 
        });
      }

      const productData = product.rows[0];
      const selectedSize = item.size || 'One Size';

      // Check size-specific availability
      const sizeAvailability = await client.query(`
        SELECT 
          size_data->>'size' as size,
          (size_data->>'quantity')::INTEGER as available_quantity,
          COALESCE((size_data->>'price')::NUMERIC, $3) as item_price,
          COALESCE((size_data->>'cod_eligible')::BOOLEAN, $4) as cod_eligible
        FROM products p
        CROSS JOIN LATERAL jsonb_array_elements(p.sizes) AS size_data
        WHERE p.id = $1 
          AND size_data->>'size' = $2
          AND jsonb_typeof(size_data) = 'object'
          AND size_data ? 'size' 
          AND size_data ? 'quantity'
      `, [item.product_id, selectedSize, productData.price, productData.cod_eligible]);

      if (sizeAvailability.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Size "${selectedSize}" not available for product ${productData.name}` 
        });
      }

      const sizeData = sizeAvailability.rows[0];
      const availableQuantity = sizeData.available_quantity;
      const itemPrice = sizeData.item_price;
      const codEligible = sizeData.cod_eligible;

      if (availableQuantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Insufficient stock for product ${productData.name} in size ${selectedSize}. Available: ${availableQuantity}` 
        });
      }

      const item_total = itemPrice * item.quantity;
      total_amount += item_total;

      orderItems.push({
        product: {
          id: productData.id,
          name: productData.name,
          sizes: productData.sizes,
          cod_eligible: productData.cod_eligible
        },
        product_id: item.product_id,
        quantity: item.quantity,
        price: itemPrice,
        total: item_total,
        selectedSize: selectedSize,
        cod_eligible: codEligible,
        name: productData.name
      });
    }

    // Calculate order totals with COD if applicable
    const orderCalculation = calculateOrderWithCOD(orderItems);
    
    // Check if COD is requested but not all items are eligible
    if (payment_method === 'cod' && !orderCalculation.codEligible) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Cash on Delivery is not available for some items in your cart',
        nonCodItems: orderCalculation.nonCodItems.map(item => ({
          id: item.product_id,
          name: item.name
        }))
      });
    }

    // Use calculated total including COD fee
    const final_total = payment_method === 'cod' ? orderCalculation.total : total_amount;
    const cod_fee = payment_method === 'cod' ? orderCalculation.codFee : 0;

    // Create order
    const newOrder = await client.query(
      `INSERT INTO orders (customer_id, total_amount, cod_fee, status, shipping_address, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [customer_id, final_total, cod_fee, 'pending', JSON.stringify(shipping_address), payment_method]
    );

    const order_id = newOrder.rows[0].id;

    // Create order items and update stock
    for (const item of orderItems) {
      // Insert order item with size
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, total, selected_size)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order_id, item.product_id, item.quantity, item.price, item.total, item.selectedSize]
      );

      // Update product size-specific stock using the database function
      await client.query(
        'SELECT update_product_size_quantity($1, $2, $3)',
        [item.product_id, item.selectedSize, -item.quantity]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order_id,
        total_amount,
        status: 'pending',
        created_at: newOrder.rows[0].created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  } finally {
    client.release();
  }
});

// Get customer orders
router.get('/', [authenticateToken, requireCustomer], async (req, res) => {
  try {
    const customer_id = req.user.id;

    const orders = await db.query(
      `SELECT 
        o.id, 
        CONCAT('ORD-', LPAD(o.id::text, 8, '0')) as order_number,
        o.total_amount, 
        o.status, 
        o.shipping_address, 
        o.created_at,
        json_agg(
          json_build_object(
            'id', oi.id,
            'quantity', oi.quantity,
            'price', oi.price,
            'selected_size', COALESCE(oi.selected_size, 'One Size'),
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'image_url', p.image_url,
              'category', p.category
            )
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.customer_id = $1
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at
      ORDER BY o.created_at DESC`,
      [customer_id]
    );

    res.json({ orders: orders.rows });

  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Get order by ID
router.get('/:id', [authenticateToken, requireCustomer], async (req, res) => {
  try {
    const order_id = req.params.id;
    
    // Validate that id is a number
    if (!/^\d+$/.test(order_id)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }
    
    const customer_id = req.user.id;

    const order = await db.query(
      `SELECT 
        o.id, o.total_amount, o.status, o.shipping_address, o.created_at,
        json_agg(
          json_build_object(
            'product_id', p.id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'price', oi.price,
            'total', oi.total,
            'selected_size', COALESCE(oi.selected_size, 'One Size')
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1 AND o.customer_id = $2
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at`,
      [order_id, customer_id]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order: order.rows[0] });

  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ message: 'Server error fetching order' });
  }
});

module.exports = router;