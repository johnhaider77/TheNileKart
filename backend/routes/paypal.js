const express = require('express');
const { paypalClient, ordersController, generateClientToken } = require('../config/paypal');
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Generate client token for HostedFields (REQUIRED before rendering card fields)
router.get('/client-token', authenticateToken, async (req, res) => {
  try {
    console.log('Generating client token for HostedFields...');
    const token = await paypalClient.clientToken().generate();
    console.log('✅ Client token generated successfully');
    res.json({ clientToken: token });
  } catch (error) {
    console.error('❌ Error generating client token:', error);
    res.status(500).json({ error: 'Failed to generate client token', details: error.message });
  }
});

// Test PayPal connection (temporary debug route)
router.get('/test', async (req, res) => {
  try {
    console.log('Testing PayPal client initialization...');
    
    console.log('PayPal client:', paypalClient);
    console.log('Orders controller:', ordersController);
    
    // Test PayPal order creation with minimal data
    const orderRequest = {
      intent: 'CAPTURE',
      purchaseUnits: [{
        amount: {
          currencyCode: 'USD',
          value: '10.00'
        },
        description: 'Test TheNileKart Order'
      }],
      applicationContext: {
        brandName: 'TheNileKart',
        landingPage: 'BILLING',
        userAction: 'PAY_NOW',
        returnUrl: 'http://localhost:3000/checkout/success',
        cancelUrl: 'http://localhost:3000/checkout/cancel'
      }
    };

    console.log('Order request:', JSON.stringify(orderRequest, null, 2));

    // Try using the correct method name (createOrder)
    const result = await ordersController.createOrder({
      body: orderRequest
    });
    
    res.json({
      success: true,
      result,
      id: result.body?.id,
      status: result.body?.status,
      links: result.body?.links
    });

  } catch (error) {
    console.error('PayPal test error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'PayPal test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Create PayPal payment
router.post('/create', [authenticateToken, requireCustomer], async (req, res) => {
  try {
    const { items, shipping_address, total_amount, user_agent, device_type } = req.body;

    // Detect mobile device from user agent or device type
    const isMobileDevice = device_type === 'mobile' || 
                          (user_agent && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(user_agent));

    // Create PayPal order with mobile-optimized settings
    const orderRequest = {
      body: {
        intent: 'CAPTURE',
        purchaseUnits: [{
          amount: {
            currencyCode: 'USD',
            value: total_amount ? total_amount.toFixed(2) : items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
          },
          description: `TheNileKart Order - ${items.map(i => i.name).join(', ')}`,
          shipping: {
            name: {
              fullName: shipping_address.full_name
            },
            address: {
              addressLine1: shipping_address.address_line1,
              addressLine2: shipping_address.address_line2 || '',
              adminArea2: shipping_address.city,
              adminArea1: shipping_address.state,
              postalCode: shipping_address.postal_code,
              countryCode: 'US'
            }
          }
        }],
        applicationContext: {
          brandName: 'TheNileKart',
          landingPage: isMobileDevice ? 'LOGIN' : 'BILLING', // Mobile-optimized landing page
          userAction: 'PAY_NOW',
          paymentMethod: {
            payerSelected: 'PAYPAL',
            payeePreferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/success`,
          cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/cancel`,
          // Mobile-specific settings
          shippingPreference: 'SET_PROVIDED_ADDRESS',
          userExperienceFlow: isMobileDevice ? 'MOBILE_OPTIMIZED' : 'DESKTOP'
        }
      }
    };

    const response = await ordersController.createOrder(orderRequest);
    
    // Parse the response - the body might be a string that needs parsing
    let order;
    if (typeof response.body === 'string') {
      order = JSON.parse(response.body);
    } else {
      order = response.body;
    }
    
    res.json({
      id: order.id,
      status: order.status,
      links: order.links
    });

  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create PayPal order',
      error: error.message 
    });
  }
});

// Capture PayPal payment
router.post('/capture/:orderId', [authenticateToken, requireCustomer], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { orderId } = req.params;
    const { items, shipping_address } = req.body;
    const customer_id = req.user.id;

    // Capture PayPal payment
    const { body: capture } = await ordersController.captureOrder({
      id: orderId,
      body: {}
    });
    
    if (capture.status !== 'COMPLETED') {
      return res.status(400).json({ 
        message: 'PayPal payment not completed',
        status: capture.status 
      });
    }

    await client.query('BEGIN');

    // Validate products and calculate total (same as regular order)
    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await client.query(
        'SELECT id, name, price, stock_quantity, sizes FROM products WHERE id = $1 AND is_active = true',
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
          (size_data->>'quantity')::INTEGER as available_quantity
        FROM products p
        CROSS JOIN LATERAL jsonb_array_elements(p.sizes) AS size_data
        WHERE p.id = $1 
          AND size_data->>'size' = $2
          AND jsonb_typeof(size_data) = 'object'
          AND size_data ? 'size' 
          AND size_data ? 'quantity'
      `, [item.product_id, selectedSize]);

      if (sizeAvailability.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Size "${selectedSize}" not available for product ${productData.name}` 
        });
      }

      const availableQuantity = sizeAvailability.rows[0].available_quantity;

      if (availableQuantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Insufficient stock for product ${productData.name} in size ${selectedSize}. Available: ${availableQuantity}` 
        });
      }

      const item_total = productData.price * item.quantity;
      total_amount += item_total;

      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: productData.price,
        total: item_total,
        size: selectedSize
      });
    }

    // Create order with PayPal payment info
    const newOrder = await client.query(
      `INSERT INTO orders (customer_id, total_amount, status, shipping_address, payment_method, payment_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [
        customer_id, 
        total_amount, 
        'paid',  // PayPal orders are paid immediately
        JSON.stringify(shipping_address),
        'paypal',
        orderId
      ]
    );

    const order_id = newOrder.rows[0].id;

    // Create order items and update stock
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, total, selected_size)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order_id, item.product_id, item.quantity, item.price, item.total, item.size]
      );

      await client.query(
        'SELECT update_product_size_quantity($1, $2, $3)',
        [item.product_id, item.size, -item.quantity]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created and paid successfully',
      order: {
        id: order_id,
        total_amount,
        status: 'paid',
        payment_method: 'paypal',
        payment_id: orderId,
        created_at: newOrder.rows[0].created_at
      },
      paypal: {
        capture_id: capture.purchaseUnits[0].payments.captures[0].id,
        status: capture.status
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('PayPal capture error:', error);
    res.status(500).json({ 
      message: 'Failed to capture PayPal payment',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// Get PayPal order details
router.get('/order/:orderId', [authenticateToken, requireCustomer], async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { body: order } = await paypalClient.ordersController.ordersGet({ id: orderId });
    
    res.json({
      id: order.id,
      status: order.status,
      amount: order.purchaseUnits[0].amount,
      createTime: order.createTime,
      updateTime: order.updateTime
    });

  } catch (error) {
    console.error('PayPal order fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch PayPal order',
      error: error.message 
    });
  }
});

// Test route without authentication
router.post('/create-test', async (req, res) => {
  try {
    const { items, shipping_address, total_amount } = req.body;

    // Create PayPal order
    const orderRequest = {
      body: {
        intent: 'CAPTURE',
        purchaseUnits: [{
          amount: {
            currencyCode: 'USD',
            value: total_amount ? total_amount.toFixed(2) : items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
          },
          description: `TheNileKart Order - ${items.map(i => i.name).join(', ')}`,
          shipping: {
            name: {
              fullName: shipping_address.full_name
            },
            address: {
              addressLine1: shipping_address.address_line1,
              addressLine2: shipping_address.address_line2 || '',
              adminArea2: shipping_address.city,
              adminArea1: shipping_address.state,
              postalCode: shipping_address.postal_code,
              countryCode: 'US'
            }
          }
        }],
        applicationContext: {
          brandName: 'TheNileKart',
          landingPage: 'BILLING',
          userAction: 'PAY_NOW',
          returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/success`,
          cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/cancel`
        }
      }
    };

    const response = await ordersController.createOrder(orderRequest);
    
    // Parse the response - the body might be a string that needs parsing
    let order;
    if (typeof response.body === 'string') {
      order = JSON.parse(response.body);
    } else {
      order = response.body;
    }
    
    res.json({
      id: order.id,
      status: order.status,
      links: order.links
    });

  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create PayPal order',
      error: error.message 
    });
  }
});

module.exports = router;