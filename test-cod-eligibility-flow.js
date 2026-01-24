/**
 * Test script to verify COD eligibility update flow
 * Tests: Seller updates COD eligibility → Customer sees updated value
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials
const SELLER_EMAIL = 'maryam.zaidi2904@gmail.com';
const SELLER_PASSWORD = 'Maryam@123456';

let sellerToken = '';
let customerToken = '';
let testProductId = '';
let testSize = 'M';

// Helper function for API calls
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

async function sellerLogin() {
  console.log('\n🔐 [STEP 1] Seller Login...');
  try {
    const response = await api.post('/auth/login', {
      email: SELLER_EMAIL,
      password: SELLER_PASSWORD
    });
    sellerToken = response.data.token;
    console.log('✅ Seller logged in. Token:', sellerToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Seller login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getSellerProducts() {
  console.log('\n📦 [STEP 2] Fetching seller products...');
  try {
    const response = await api.get('/seller/products', {
      headers: { Authorization: `Bearer ${sellerToken}` },
      params: { page: 1, limit: 5 }
    });
    
    const products = response.data.products || [];
    if (products.length === 0) {
      console.log('❌ No products found for seller');
      return false;
    }
    
    // Find a product with sizes
    const productWithSizes = products.find(p => p.sizes && p.sizes.length > 0);
    if (!productWithSizes) {
      console.log('❌ No products with sizes found');
      return false;
    }
    
    testProductId = productWithSizes.id;
    testSize = productWithSizes.sizes[0].size;
    
    console.log(`✅ Found product: ${productWithSizes.name} (ID: ${testProductId})`);
    console.log(`   Sizes: ${productWithSizes.sizes.map(s => `${s.size}(COD:${s.cod_eligible})`).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch products:', error.response?.data || error.message);
    return false;
  }
}

async function getCurrentCODEligibility() {
  console.log(`\n🔍 [STEP 3] Checking current COD eligibility for product ${testProductId}, size ${testSize}...`);
  try {
    const response = await api.get(`/seller/products/${testProductId}/cod-eligibility`, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    
    const currentEligibility = response.data.cod_eligibility[testSize];
    console.log(`✅ Current COD eligibility: ${currentEligibility}`);
    
    return currentEligibility;
  } catch (error) {
    console.error('❌ Failed to fetch COD eligibility:', error.response?.data || error.message);
    return null;
  }
}

async function updateCODEligibility(newValue) {
  console.log(`\n✏️ [STEP 4] Updating COD eligibility for size ${testSize} to ${newValue}...`);
  try {
    const response = await api.put(
      `/seller/products/${testProductId}/sizes/${encodeURIComponent(testSize)}/cod-eligibility`,
      { cod_eligible: newValue },
      { headers: { Authorization: `Bearer ${sellerToken}` } }
    );
    
    console.log('✅ COD eligibility updated:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to update COD eligibility:', error.response?.data || error.message);
    return false;
  }
}

async function verifyUpdateInDatabase() {
  console.log(`\n🔎 [STEP 5] Verifying update in database...`);
  try {
    const response = await api.get(`/seller/products/${testProductId}/cod-eligibility`, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    
    const updatedEligibility = response.data.cod_eligibility[testSize];
    console.log(`✅ Database check - COD eligibility: ${updatedEligibility}`);
    
    return updatedEligibility;
  } catch (error) {
    console.error('❌ Failed to verify in database:', error.response?.data || error.message);
    return null;
  }
}

async function customerLogin() {
  console.log('\n🔐 [STEP 6] Customer Login...');
  try {
    const response = await api.post('/auth/login', {
      email: 'test@example.com',
      password: 'Test@123'
    });
    customerToken = response.data.token;
    console.log('✅ Customer logged in');
    return true;
  } catch (error) {
    console.log('⚠️ Customer login failed (this is OK for testing):', error.response?.data?.message);
    // Continue anyway as calculateCOD requires auth but we can still test
    customerToken = sellerToken; // Use seller token as fallback
    return true;
  }
}

async function testCalculateCOD(expectedCODEligibility) {
  console.log(`\n💰 [STEP 7] Testing /orders/calculate-cod endpoint with product ${testProductId}...`);
  try {
    const response = await api.post(
      '/orders/calculate-cod',
      {
        items: [{
          product_id: testProductId,
          selectedSize: testSize,
          quantity: 1
        }]
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    
    const codEligible = response.data.codEligible;
    console.log(`✅ API Response - COD Eligible: ${codEligible}`);
    console.log(`   Expected: ${expectedCODEligibility}, Actual: ${codEligible}`);
    
    if (codEligible === expectedCODEligibility) {
      console.log('✅ ✅ ✅ DATA IS BEING RETURNED CORRECTLY!');
      return true;
    } else {
      console.log('❌ ❌ ❌ DATA MISMATCH - Update not being reflected!');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to calculate COD:', error.response?.data || error.message);
    return false;
  }
}

async function testProductDetailsEndpoint() {
  console.log(`\n📄 [STEP 8] Testing /products/:id endpoint...`);
  try {
    const response = await api.get(`/products/${testProductId}`);
    
    const product = response.data.product;
    const size = product.sizes.find(s => s.size === testSize);
    
    if (size) {
      console.log(`✅ Product details endpoint - Size ${testSize} COD eligibility: ${size.cod_eligible}`);
      return size.cod_eligible;
    } else {
      console.log('❌ Size not found in product details');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to fetch product details:', error.response?.data || error.message);
    return null;
  }
}

async function runFullTest() {
  console.log('=====================================');
  console.log('🧪 COD ELIGIBILITY UPDATE FLOW TEST');
  console.log('=====================================');
  
  // Step 1: Login as seller
  if (!await sellerLogin()) return;
  
  // Step 2: Get seller products
  if (!await getSellerProducts()) return;
  
  // Step 3: Get current COD eligibility
  const currentValue = await getCurrentCODEligibility();
  if (currentValue === null) return;
  
  // Step 4: Toggle COD eligibility (flip the value)
  const newValue = !currentValue;
  if (!await updateCODEligibility(newValue)) return;
  
  // Step 5: Verify in database
  const dbValue = await verifyUpdateInDatabase();
  if (dbValue !== newValue) {
    console.log('❌ Database update failed!');
    return;
  }
  
  // Step 6: Login as customer (or use test account)
  if (!await customerLogin()) return;
  
  // Step 7: Test calculate-cod endpoint
  const calculateCodWorking = await testCalculateCOD(newValue);
  
  // Step 8: Test product details endpoint
  const productDetailsValue = await testProductDetailsEndpoint();
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 TEST SUMMARY');
  console.log('=====================================');
  console.log(`Product ID: ${testProductId}`);
  console.log(`Size: ${testSize}`);
  console.log(`Original COD Eligibility: ${currentValue}`);
  console.log(`Updated COD Eligibility: ${newValue}`);
  console.log(`Database confirms update: ${dbValue === newValue ? '✅' : '❌'}`);
  console.log(`calculateCOD endpoint returns updated value: ${calculateCodWorking ? '✅' : '❌'}`);
  console.log(`Product details endpoint shows updated value: ${productDetailsValue === newValue ? '✅' : '❌'}`);
  
  if (calculateCodWorking && productDetailsValue === newValue && dbValue === newValue) {
    console.log('\n✅ ✅ ✅ ALL TESTS PASSED - System is working correctly!');
  } else {
    console.log('\n❌ ❌ ❌ TESTS FAILED - There is an issue with the update flow');
  }
}

// Run the test
runFullTest().catch(console.error);
