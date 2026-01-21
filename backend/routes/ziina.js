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
    const userId = req.userId;

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
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = encodeURI(`${baseUrl}/payment-success?orderId=${orderId}`);
    const cancelUrl = encodeURI(`${baseUrl}/payment-cancel?orderId=${orderId}`);
    const failureUrl = encodeURI(`${baseUrl}/payment-failure?orderId=${orderId}`);

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
      test: true
    });

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amountInFils,
      'AED',
      message,
      successUrl,
      cancelUrl,
      failureUrl,
      true // Always use test mode for now
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

    console.log('Checking payment intent status:', {
      paymentIntentId,
      orderId,
      userId
    });

    // Get payment intent from Ziina
    const paymentIntent = await getPaymentIntent(paymentIntentId);

    // Update payment status in database
    await db.query(
      `UPDATE payments 
       SET status = $1, updated_at = NOW()
       WHERE payment_intent_id = $2 AND user_id = $3`,
      [paymentIntent.status, paymentIntentId, userId]
    );

    // Check if payment is successful
    if (paymentIntent.status === 'completed' || paymentIntent.status === 'succeeded') {
      // Update order status to paid
      await db.query(
        `UPDATE orders 
         SET payment_status = 'paid', status = 'confirmed'
         WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
      );

      console.log('Order marked as paid:', orderId);
    }

    res.json({
      paymentIntentId,
      status: paymentIntent.status,
      amount: filsToAed(paymentIntent.amount),
      tipAmount: paymentIntent.tip_amount ? filsToAed(paymentIntent.tip_amount) : 0,
      feeAmount: paymentIntent.fee_amount ? filsToAed(paymentIntent.fee_amount) : 0,
      message: paymentIntent.message,
      error: paymentIntent.latest_error || null
    });

  } catch (error) {
    console.error('Error checking payment intent:', error);
    res.status(500).json({ 
      message: 'Failed to check payment status',
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
