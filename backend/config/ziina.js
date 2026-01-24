// Ziina Payment Gateway Configuration
// API Reference: https://docs.ziina.com/api-reference

const axios = require('axios');

// Initialize Ziina client
const ziinaClient = axios.create({
  baseURL: 'https://api-v2.ziina.com/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZIINA_API_KEY}`
  }
});

// Log Ziina configuration on startup
console.log('🔐 Ziina Configuration:');
console.log(`   - API Key Present: ${!!process.env.ZIINA_API_KEY ? '✅ YES' : '❌ NO'}`);
console.log(`   - API Key Length: ${process.env.ZIINA_API_KEY ? process.env.ZIINA_API_KEY.length : 0}`);
console.log(`   - First 10 chars: ${process.env.ZIINA_API_KEY ? process.env.ZIINA_API_KEY.substring(0, 10) : 'NOT SET'}`);
if (!process.env.ZIINA_API_KEY) {
  console.error('❌ CRITICAL: ZIINA_API_KEY is not set in environment variables!');
}

/**
 * Create a Payment Intent
 * @param {number} amount - Amount in fils (100 AED = 10000 fils)
 * @param {string} currency - Currency code (e.g., 'AED')
 * @param {string} message - Payment message/description
 * @param {string} successUrl - URL to redirect on success
 * @param {string} cancelUrl - URL to redirect on cancel
 * @param {string} failureUrl - URL to redirect on failure
 * @param {boolean} test - Whether this is a test payment (default: true for development)
 * @returns {Promise<Object>} Payment intent response
 */
async function createPaymentIntent(amount, currency = 'AED', message = '', successUrl, cancelUrl, failureUrl, test = false) {
  try {
    console.log('🔄 Creating Ziina payment intent:', {
      amount,
      currency,
      message: message.substring(0, 50),
      test,
      urlsValid: { successUrl: !!successUrl, cancelUrl: !!cancelUrl, failureUrl: !!failureUrl }
    });

    const payloadBody = {
      amount,
      currency_code: currency,
      message,
      success_url: successUrl,
      cancel_url: cancelUrl,
      failure_url: failureUrl,
      test: test,
      allow_tips: false
    };

    console.log('📤 Sending to Ziina API:', {
      endpoint: '/payment_intent',
      hasApiKey: !!process.env.ZIINA_API_KEY,
      payload: {
        amount: payloadBody.amount,
        currency_code: payloadBody.currency_code,
        message: payloadBody.message.substring(0, 30),
        test: payloadBody.test
      }
    });

    const response = await ziinaClient.post('/payment_intent', payloadBody);

    console.log('✅ Ziina payment intent created successfully:', {
      id: response.data.id,
      status: response.data.status,
      has_redirect_url: !!response.data.redirect_url
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error creating payment intent with Ziina:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code
    });
    throw new Error(`Failed to create payment intent: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get Payment Intent Status
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Payment intent details
 */
async function getPaymentIntent(paymentIntentId) {
  try {
    console.log('Fetching payment intent:', paymentIntentId);

    const response = await ziinaClient.get(`/payment_intent/${paymentIntentId}`);
    
    console.log('Payment intent fetched:', {
      id: response.data.id,
      status: response.data.status,
      amount: response.data.amount,
      feeAmount: response.data.fee_amount
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching payment intent:', error.response?.data || error.message);
    throw new Error(`Failed to fetch payment intent: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get Ziina Account Information
 * @returns {Promise<Object>} Account details
 */
async function getAccount() {
  try {
    console.log('Fetching Ziina account information');

    const response = await ziinaClient.get('/account');
    
    console.log('Account information retrieved:', {
      accountId: response.data.account_id,
      ziiname: response.data.ziiname,
      displayName: response.data.display_name
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching account:', error.response?.data || error.message);
    throw new Error(`Failed to fetch account information: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Transfer Money (for settlements)
 * @param {string} operationId - Operation ID (order ID)
 * @param {string[]} toAccountIds - Recipient account IDs
 * @param {number} amount - Transfer amount in fils
 * @param {string} currency - Currency code
 * @param {string} message - Transfer message
 * @returns {Promise<Object>} Transfer response
 */
async function transferMoney(operationId, toAccountIds, amount, currency = 'AED', message = '') {
  try {
    console.log('Creating transfer:', {
      operationId,
      toAccountIds,
      amount,
      currency,
      message
    });

    const response = await ziinaClient.post('/transfer', {
      operation_id: operationId,
      to_account_ids: toAccountIds,
      amount,
      currency_code: currency,
      message
    });

    console.log('Transfer created successfully:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Error creating transfer:', error.response?.data || error.message);
    throw new Error(`Failed to create transfer: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get Transfer Status
 * @param {string} transferId - Transfer ID
 * @returns {Promise<Object>} Transfer details
 */
async function getTransfer(transferId) {
  try {
    console.log('Fetching transfer:', transferId);

    const response = await ziinaClient.get(`/transfer/${transferId}`);
    
    console.log('Transfer fetched:', {
      id: response.data.id,
      status: response.data.status,
      amount: response.data.amount
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching transfer:', error.response?.data || error.message);
    throw new Error(`Failed to fetch transfer: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Convert AED to Fils
 * @param {number} aed - Amount in AED
 * @returns {number} Amount in fils
 */
function aedToFils(aed) {
  return Math.round(aed * 100);
}

/**
 * Convert Fils to AED
 * @param {number} fils - Amount in fils
 * @returns {number} Amount in AED
 */
function filsToAed(fils) {
  return fils / 100;
}

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  getAccount,
  transferMoney,
  getTransfer,
  aedToFils,
  filsToAed,
  ziinaClient
};
