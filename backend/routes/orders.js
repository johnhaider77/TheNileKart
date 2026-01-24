const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const { calculateOrderWithCOD, calculateOrderWithOnlineShipping } = require('../utils/codCalculations');

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
      
      console.log(`📦 [CALCULATE-COD] Processing item - Product: ${productData.id} (${productData.name}), Selected Size: ${item.selectedSize}, Product COD Eligible: ${productData.cod_eligible}`);
      
      // Check if product has sizes and find size-specific pricing and COD eligibility
      if (productData.sizes && Array.isArray(productData.sizes) && item.selectedSize) {
        const sizeData = productData.sizes.find(size => size.size === item.selectedSize);
        if (sizeData) {
          itemPrice = sizeData.price || productData.price || 0;
          codEligible = sizeData.cod_eligible !== undefined ? sizeData.cod_eligible : productData.cod_eligible;
          console.log(`  ✓ Size ${item.selectedSize} found - Price: ${sizeData.price}, Size COD Eligible: ${sizeData.cod_eligible}, Using: ${codEligible}`);
        } else {
          console.log(`  ⚠️ Size ${item.selectedSize} NOT found in sizes array. Available sizes: ${productData.sizes.map(s => s.size).join(', ')}`);
        }
      } else {
        console.log(`  ℹ️ No sizes or selectedSize provided. Sizes array: ${productData.sizes ? 'present' : 'missing'}, Selected Size: ${item.selectedSize}`);
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

// Calculate shipping fee for online (pre-paid) payments
router.post('/calculate-shipping', [
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
        'SELECT id, name, price, sizes FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );

      if (product.rows.length === 0) {
        return res.status(400).json({ 
          message: `Product with ID ${item.product_id} not found` 
        });
      }

      const productData = product.rows[0];
      let itemPrice = productData.price;
      
      // Check if product has sizes and find size-specific pricing
      if (productData.sizes && Array.isArray(productData.sizes) && item.selectedSize) {
        const sizeData = productData.sizes.find(size => size.size === item.selectedSize);
        if (sizeData) {
          itemPrice = sizeData.price || productData.price || 0;
        }
      }

      cartItems.push({
        product_id: item.product_id,
        name: productData.name,
        price: itemPrice,
        quantity: item.quantity,
        selectedSize: item.selectedSize
      });
    }

    // Calculate shipping fee for online payment
    const shippingCalculation = calculateOrderWithOnlineShipping(cartItems);

    res.json({
      subtotal: shippingCalculation.subtotal,
      shippingFee: shippingCalculation.shippingFee,
      total: shippingCalculation.total,
      message: shippingCalculation.shippingFee === 0 ? 
        'Free shipping (order value > 50 AED)' : 
        `Shipping fee: ${shippingCalculation.shippingFee} AED`
    });

  } catch (error) {
    console.error('Shipping fee calculation error:', error);
    res.status(500).json({ message: 'Server error calculating shipping fee' });
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
  body('shipping_address').isObject(),
  body('payment_method').optional().isIn(['cod', 'paypal', 'card', 'ziina']),
  body('status').optional().isIn(['pending', 'pending_payment', 'payment_failed', 'confirmed', 'cancelled']),
], async (req, res) => {
  const client = await db.getClient();
  
  console.log('📥 [POST /orders] Received order creation request');
  console.log('   User ID:', req.user?.id);
  console.log('   Payment method:', req.body?.payment_method);
  console.log('   Items count:', req.body?.items?.length);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('🔴 Order validation errors:', errors.array());
      console.error('Request body received:', JSON.stringify(req.body, null, 2));
      console.error('Shipping address from request:', JSON.stringify(req.body.shipping_address, null, 2));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Manual validation for shipping address fields
    const addr = req.body.shipping_address;
    const addressErrors = [];
    
    if (!addr || typeof addr !== 'object') {
      addressErrors.push('Shipping address is required');
    } else {
      if (!addr.full_name || String(addr.full_name).trim().length < 2) {
        addressErrors.push('Full name must be at least 2 characters');
      }
      if (!addr.address_line1 || String(addr.address_line1).trim().length < 5) {
        addressErrors.push('Address line 1 must be at least 5 characters');
      }
      if (!addr.city || String(addr.city).trim().length < 2) {
        addressErrors.push('City must be at least 2 characters');
      }
      if (!addr.state || String(addr.state).trim().length < 1) {
        addressErrors.push('State is required');
      }
      if (!addr.postal_code || String(addr.postal_code).trim().length < 4) {
        addressErrors.push('Postal code must be at least 4 characters');
      }
      if (!addr.phone || String(addr.phone).trim().length < 8) {
        addressErrors.push('Phone number must be at least 8 digits');
      }
    }

    if (addressErrors.length > 0) {
      console.error('🔴 Address validation failed:', addressErrors);
      return res.status(400).json({ 
        message: 'Address validation failed',
        errors: addressErrors 
      });
    }

    const { items, shipping_address, payment_method = 'cod', status = 'pending' } = req.body;
    const customer_id = req.user.id;

    console.log('📋 Order creation details:', {
      payment_method,
      status,
      items_count: items?.length,
      shipping_address_keys: Object.keys(shipping_address || {}),
      customer_id
    });

    await client.query('BEGIN');
    console.log('✅ Transaction started');

    // Validate products and calculate total
    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      console.log(`📦 Processing item: product_id=${item.product_id}, quantity=${item.quantity}, size=${item.size}`);
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
      console.error('❌ COD not available - non-COD items:', orderCalculation.nonCodItems);
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Cash on Delivery is not available for some items in your cart',
        nonCodItems: orderCalculation.nonCodItems.map(item => ({
          id: item.product_id,
          name: item.name
        }))
      });
    }

    // Calculate shipping fee for online payments
    let shippingFee = 0;
    let final_total = total_amount;
    let cod_fee = 0;

    if (payment_method === 'cod') {
      // COD: use calculated total with COD fee
      final_total = orderCalculation.total;
      cod_fee = orderCalculation.codFee;
      console.log('✅ COD payment:', {
        codEligible: orderCalculation.codEligible,
        total_amount,
        cod_fee,
        final_total
      });
    } else {
      // Online payment (ziina, paypal, card): apply flat 5 AED shipping fee for orders <= 50 AED
      const onlineCalc = calculateOrderWithOnlineShipping(orderItems);
      shippingFee = onlineCalc.shippingFee;
      final_total = onlineCalc.total;
      console.log('✅ Online payment:', {
        payment_method,
        total_amount,
        shipping_fee: shippingFee,
        final_total
      });
    }

    // Create order
    const newOrder = await client.query(
      `INSERT INTO orders (customer_id, total_amount, cod_fee, shipping_fee, status, shipping_address, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [customer_id, final_total, cod_fee, shippingFee, status, JSON.stringify(shipping_address), payment_method]
    );

    const order_id = newOrder.rows[0].id;
    console.log(`✅ Order created: id=${order_id}, total=${final_total} AED, payment_method=${payment_method}`);

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

    // Save shipping address to user's saved addresses (if not already saved)
    // Check if this exact address already exists for the user
    const addressCheckResult = await client.query(
      `SELECT id FROM user_addresses 
       WHERE user_id = $1 
       AND address_line1 = $2 
       AND city = $3 
       AND state = $4 
       AND postal_code = $5`,
      [customer_id, shipping_address.address_line1, shipping_address.city, shipping_address.state, shipping_address.postal_code]
    );

    // Only save if address doesn't already exist
    if (addressCheckResult.rows.length === 0) {
      // Count existing addresses for this user
      const addressCountResult = await client.query(
        `SELECT COUNT(*) as count FROM user_addresses WHERE user_id = $1`,
        [customer_id]
      );
      
      const addressCount = parseInt(addressCountResult.rows[0].count);
      
      // Only save if user has fewer than 6 addresses
      if (addressCount < 6) {
        try {
          await client.query(
            `INSERT INTO user_addresses 
             (user_id, type, full_name, address_line1, address_line2, city, state, postal_code, country, phone, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              customer_id,
              'shipping',
              shipping_address.full_name || 'Unnamed Address',
              shipping_address.address_line1,
              shipping_address.address_line2 || null,
              shipping_address.city,
              shipping_address.state,
              shipping_address.postal_code,
              shipping_address.country || 'UAE',
              shipping_address.phone || null,
              false // Don't set as default automatically
            ]
          );
          console.log(`✅ Saved shipping address for customer ${customer_id}`);
        } catch (addrError) {
          // Log but don't fail the order if address save fails
          console.warn('⚠️ Failed to save shipping address:', addrError.message);
        }
      } else {
        console.log(`ℹ️ Customer ${customer_id} has reached max addresses limit (6)`);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order_id,
        total_amount,
        status: status,
        created_at: newOrder.rows[0].created_at
      }
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('⚠️ Rollback error:', rollbackError.message);
    }
    console.error('❌ Order creation error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      context: error.context,
      hint: error.hint,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Server error creating order',
      debug: error.message 
    });
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

// Update order status
router.patch('/:id/status', [authenticateToken, requireCustomer], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const customer_id = req.user.id;

    if (!status || !['pending', 'payment_failed', 'pending_payment', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Verify order belongs to the customer
    const orderCheck = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, customer_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    const updateResult = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND customer_id = $3 RETURNING *',
      [status, orderId, customer_id]
    );

    console.log(`✅ Order ${orderId} status updated to: ${status}`);

    res.json({
      message: 'Order status updated successfully',
      order: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

module.exports = router;