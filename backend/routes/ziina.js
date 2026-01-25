// Ziina Payment Gateway Routes
// Handles payment intent creation, status checking, and settlements

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const {
  createPaymentIntent,
  getPaymentIntent,
  getAccount,
  transferMoney,
  aedToFils,
  filsToAed
} = require('../config/ziina');

/**
 * POST /ziina/payment-intent
 * Create a payment intent for the customer order
 * Body: { paymentId, amount, orderId, items, shippingAddress }
 */
router.post('/payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, orderId, items, shippingAddress } = req.body;
    const userId = req.user.id;

    console.log('📥 [POST /ziina/payment-intent] Request received');
    console.log('Creating payment intent:', {
      amount,
      orderId,
      userId,
      itemCount: items?.length || 0
    });

    // Validate amount
    if (!amount || amount < 2) {
      return res.status(400).json({ 
        message: 'Minimum order amount is 2 AED' 
      });
    }

    // Validate required fields
    if (!orderId) {
      return res.status(400).json({ 
        message: 'Order ID is required' 
      });
    }

    // Convert AED to fils (required by Ziina API)
    const amountInFils = aedToFils(amount);
    console.log('Amount conversion:', { aed: amount, fils: amountInFils });

    // Prepare URLs with proper encoding
    // In production, use FRONTEND_URL or fallback to derived URL from request
    let baseUrl = process.env.FRONTEND_URL;
    if (!baseUrl) {
      // Fallback: derive from request origin or use https as safe default
      const protocol = req.protocol || 'https';
      const host = process.env.DOMAIN || 'www.thenilekart.com';
      baseUrl = `${protocol}://${host}`;
    }
    const successUrl = encodeURI(`${baseUrl}/checkout?payment_status=success&orderId=${orderId}`);
    const cancelUrl = encodeURI(`${baseUrl}/checkout?payment_status=cancelled&orderId=${orderId}`);
    const failureUrl = encodeURI(`${baseUrl}/checkout?payment_status=failure&orderId=${orderId}`);

    console.log('Payment URLs:', {
      successUrl,
      cancelUrl,
      failureUrl
    });

    // Create order message (keep short to avoid pattern matching issues)
    const itemCount = items ? items.length : 0;
    const message = `TheNileKart - ${itemCount} item${itemCount !== 1 ? 's' : ''}`;

    console.log('Calling Ziina createPaymentIntent with:', {
      amountInFils,
      currency: 'AED',
      message,
      successUrl: successUrl.substring(0, 50) + '...',
      cancelUrl: cancelUrl.substring(0, 50) + '...',
      failureUrl: failureUrl.substring(0, 50) + '...',
      test: false
    });

    // Create payment intent (using PRODUCTION mode for real payments)
    const paymentIntent = await createPaymentIntent(
      amountInFils,
      'AED',
      message,
      successUrl,
      cancelUrl,
      failureUrl,
      false // Use production mode for real payments (not test mode)
    );

    console.log('✅ Payment intent created successfully from Ziina:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      redirect_url: paymentIntent.redirect_url ? 'present' : 'missing'
    });

    // Try to store payment intent in database for tracking
    try {
      console.log('💾 Attempting to store payment in database...');
      const paymentRecord = await db.query(
        `INSERT INTO payments (
          user_id, 
          order_id, 
          payment_gateway, 
          payment_intent_id, 
          amount, 
          status, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [
          userId,
          orderId,
          'ziina',
          paymentIntent.id,
          amount,
          paymentIntent.status
        ]
      );
      console.log('✅ Payment record stored successfully');
    } catch (dbError) {
      console.warn('⚠️ Warning: Could not store payment in database, but continuing:', {
        message: dbError.message,
        code: dbError.code
      });
      // Don't fail the entire request if database storage fails
      // The important thing is that Ziina has the payment intent
    }

    res.json({
      paymentIntentId: paymentIntent.id,
      redirectUrl: paymentIntent.redirect_url,
      amount,
      status: paymentIntent.status
    });

  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Failed to create payment intent',
      error: error.response?.data?.message || error.message,
      details: {
        errorCode: error.code,
        errorName: error.name,
        apiStatus: error.response?.status
      }
    });
  }
});

/**
 * GET /ziina/payment-intent/:paymentIntentId
 * Check the status of a payment intent
 * Query: { orderId }
 */
router.get('/payment-intent/:paymentIntentId', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { orderId } = req.query;
    const userId = req.userId;

    console.log('🔍 Checking payment intent status:', {
      paymentIntentId,
      orderId,
      userId
    });

    if (!orderId) {
      return res.status(400).json({ 
        message: 'Order ID is required' 
      });
    }

    // Get payment intent from Ziina
    const paymentIntent = await getPaymentIntent(paymentIntentId);
    console.log('💳 Ziina payment intent status:', paymentIntent.status);
    console.log('💳 Full payment intent response:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      latest_error: paymentIntent.latest_error
    });

    // Update payment status in database
    const paymentUpdateResult = await db.query(
      `UPDATE payments 
       SET status = $1, updated_at = NOW()
       WHERE payment_intent_id = $2 AND user_id = $3
       RETURNING *`,
      [paymentIntent.status, paymentIntentId, userId]
    );
    
    console.log('📊 Payment record updated:', paymentUpdateResult.rowCount);

    // Check if payment is successful (Ziina returns 'succeeded' for successful payments)
    const isPaymentSuccessful = paymentIntent.status === 'completed' || paymentIntent.status === 'succeeded';
    console.log('🔍 Payment status verification - Is successful?', isPaymentSuccessful, '- Actual status:', paymentIntent.status);
    
    if (isPaymentSuccessful) {
      // Update order status to paid and confirmed
      const orderUpdateResult = await db.query(
        `UPDATE orders 
         SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [orderId, userId]
      );

      console.log('✅ Order marked as paid:', {
        orderId,
        paymentStatus: 'paid',
        status: 'confirmed',
        rowsAffected: orderUpdateResult.rowCount
      });

      if (orderUpdateResult.rowCount === 0) {
        console.warn('⚠️ Order not found or not owned by user:', { orderId, userId });
      }
    } else {
      console.log('⏳ Payment still pending or failed:', paymentIntent.status);
    }

    res.json({
      success: isPaymentSuccessful,
      paymentIntentId,
      status: paymentIntent.status,
      orderId,
      paid: isPaymentSuccessful,
      amount: filsToAed(paymentIntent.amount),
      tipAmount: paymentIntent.tip_amount ? filsToAed(paymentIntent.tip_amount) : 0,
      feeAmount: paymentIntent.fee_amount ? filsToAed(paymentIntent.fee_amount) : 0,
      message: paymentIntent.message,
      error: paymentIntent.latest_error || null
    });

  } catch (error) {
    console.error('❌ Error checking payment intent:', error);
    res.status(500).json({ 
      message: 'Failed to check payment status',
      error: error.message 
    });
  }
});

/**
 * POST /ziina/payment-status/:orderId
 * Update order status based on payment result (cancelled/failed)
 * Body: { paymentStatus: 'cancelled' | 'failed' }
 */
router.post('/payment-status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;
    const userId = req.user.id;

    console.log('🔄 Updating payment status for order:', {
      orderId,
      paymentStatus,
      userId
    });

    if (!['cancelled', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({ 
        message: 'Invalid payment status' 
      });
    }

    // Map both cancelled and failed to unified PAYMENT_FAILED status
    const orderStatus = 'payment_failed';

    // Update order status
    const orderUpdate = await db.query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND customer_id = $3
       RETURNING id, status, total_amount`,
      [orderStatus, orderId, userId]
    );

    if (orderUpdate.rowCount === 0) {
      console.warn('⚠️ Order not found or unauthorized:', { orderId, userId });
      return res.status(404).json({ 
        message: 'Order not found' 
      });
    }

    console.log('✅ Order status updated:', orderUpdate.rows[0]);

    res.json({
      success: true,
      order: orderUpdate.rows[0],
      message: `Order marked as ${orderStatus}`
    });

  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({ 
      message: 'Failed to update payment status',
      error: error.message 
    });
  }
});

/**
 * POST /ziina/settlement
 * Transfer money from payment to seller account (settlement)
 * Body: { operationId, sellerAccountId, amount }
 * Note: This endpoint should only be accessible by admin/system
 */
router.post('/settlement', authenticateToken, async (req, res) => {
  try {
    const { operationId, sellerAccountId, amount } = req.body;
    const adminUserId = req.userId;

    console.log('Creating settlement transfer:', {
      operationId,
      sellerAccountId,
      amount,
      adminUserId
    });

    // In production, verify this is an admin user
    // For now, just ensure amount is valid
    if (!amount || amount < 0) {
      return res.status(400).json({ 
        message: 'Invalid settlement amount' 
      });
    }

    // Convert AED to fils
    const amountInFils = aedToFils(amount);

    // Create transfer
    const transfer = await transferMoney(
      operationId,
      [sellerAccountId],
      amountInFils,
      'AED',
      `Settlement for order: ${operationId}`
    );

    // Store transfer in database
    const transferRecord = await db.query(
      `INSERT INTO transfers (
        operation_id,
        to_account_id,
        amount,
        status,
        transfer_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [
        operationId,
        sellerAccountId,
        amount,
        transfer.status,
        transfer.id
      ]
    );

    console.log('Settlement transfer recorded:', transferRecord.rows[0]);

    res.json({
      transferId: transfer.id,
      status: transfer.status,
      amount,
      operationId
    });

  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({ 
      message: 'Failed to create settlement',
      error: error.message 
    });
  }
});

/**
 * GET /ziina/account
 * Get Ziina account information (for admin/dashboard)
 */
router.get('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    console.log('Fetching Ziina account information for user:', userId);

    // Only allow this for admin users in production
    // For now, just return the account info
    const account = await getAccount();

    res.json({
      accountId: account.account_id,
      accountType: account.account_type,
      status: account.status,
      ziiname: account.ziiname,
      displayName: account.display_name,
      profilePictureUrl: account.profile_picture_url
    });

  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ 
      message: 'Failed to fetch account information',
      error: error.message 
    });
  }
});

/**
 * GET /ziina/webhook
 * Handle Ziina webhooks for payment confirmations
 * This would be called by Ziina servers to notify about payment status changes
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log('Received Ziina webhook:', {
      event,
      paymentIntentId: data?.id,
      status: data?.status
    });

    // Validate webhook signature (should implement in production)
    // For now, just process the event

    if (event === 'payment_intent.completed' || event === 'payment_intent.succeeded') {
      // Update payment status in database
      await db.query(
        `UPDATE payments 
         SET status = 'completed', updated_at = NOW()
         WHERE payment_intent_id = $1`,
        [data.id]
      );

      console.log('Payment marked as completed via webhook:', data.id);
    } else if (event === 'payment_intent.failed') {
      // Mark payment as failed
      await db.query(
        `UPDATE payments 
         SET status = 'failed', updated_at = NOW()
         WHERE payment_intent_id = $1`,
        [data.id]
      );

      console.log('Payment marked as failed via webhook:', data.id);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to Ziina to avoid retries
    res.status(200).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;
