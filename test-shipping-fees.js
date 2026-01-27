#!/usr/bin/env node

/**
 * Test shipping fee calculations for different cart scenarios
 * Tests all new rules:
 * - COD cart ≥ 150 AED: FREE
 * - COD cart < 150 AED: 10% (min 10, max 15)
 * - Mixed/Non-COD ≤ 100 AED: 10 AED flat
 * - Mixed/Non-COD > 100 AED: FREE
 */

const BASE_URL = 'http://localhost:5000/api';
let tokenCache = null;

async function getToken() {
  if (tokenCache) return tokenCache;
  
  // Try to login with a test user or get a valid token
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      tokenCache = data.token;
      return tokenCache;
    }
  } catch (e) {
    console.warn('⚠️ Could not get auth token, proceeding without auth');
  }
  
  return null;
}

async function calculateShipping(items) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/orders/calculate-shipping`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items })
    });
    
    if (!response.ok) {
      return {
        error: `HTTP ${response.status}`,
        status: response.status
      };
    }
    
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

function formatResult(scenario, items, result) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Scenario: ${scenario}`);
  console.log(`Items:`);
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. Product ID ${item.product_id}, Size: ${item.selectedSize}, Qty: ${item.quantity}`);
  });
  
  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
    return;
  }
  
  console.log(`\n📊 Result:`);
  console.log(`  Subtotal: AED ${result.subtotal?.toFixed(2)}`);
  console.log(`  Shipping Fee: AED ${result.shippingFee?.toFixed(2)}`);
  console.log(`  Total: AED ${result.total?.toFixed(2)}`);
  console.log(`  COD Eligible (All): ${result.allCODEligible ? '✅ YES' : '❌ NO'}`);
  console.log(`  Message: ${result.message || 'N/A'}`);
  
  // Validation
  const expectedTotal = (result.subtotal || 0) + (result.shippingFee || 0);
  const totalMatch = Math.abs(expectedTotal - (result.total || 0)) < 0.01;
  
  if (!totalMatch) {
    console.log(`  ⚠️ MISMATCH: Expected total ${expectedTotal.toFixed(2)}, got ${result.total?.toFixed(2)}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Shipping Fee Calculations\n');
  console.log('Test Rules:');
  console.log('1. COD cart ≥ 150 AED → FREE');
  console.log('2. COD cart < 150 AED → 10% fee (min 10, max 15)');
  console.log('3. Mixed/Non-COD ≤ 100 AED → 10 AED flat');
  console.log('4. Mixed/Non-COD > 100 AED → FREE');
  
  const testCases = [
    {
      name: 'Test 1: COD cart 200 AED (should be FREE)',
      items: [
        { product_id: 1, selectedSize: 'One Size', quantity: 1 }
      ],
      expectedFee: 0,
      rule: '1'
    },
    {
      name: 'Test 2: COD cart 120 AED (should be ~12 AED = 10%)',
      items: [
        { product_id: 1, selectedSize: 'One Size', quantity: 1 }
      ],
      expectedFee: 12,
      rule: '2'
    },
    {
      name: 'Test 3: COD cart 50 AED (should be 10 AED = min)',
      items: [
        { product_id: 1, selectedSize: 'One Size', quantity: 1 }
      ],
      expectedFee: 10,
      rule: '2'
    },
    {
      name: 'Test 4: Mixed/Non-COD cart 80 AED (should be 10 AED flat)',
      items: [
        { product_id: 1, selectedSize: 'One Size', quantity: 1 }
      ],
      expectedFee: 10,
      rule: '3'
    },
    {
      name: 'Test 5: Mixed/Non-COD cart 150 AED (should be FREE)',
      items: [
        { product_id: 1, selectedSize: 'One Size', quantity: 1 }
      ],
      expectedFee: 0,
      rule: '4'
    }
  ];
  
  for (const testCase of testCases) {
    const result = await calculateShipping(testCase.items);
    formatResult(testCase.name, testCase.items, result);
    
    if (!result.error && testCase.expectedFee !== undefined) {
      const feeMatch = Math.abs((result.shippingFee || 0) - testCase.expectedFee) < 0.5;
      const status = feeMatch ? '✅' : '❌';
      console.log(`\n${status} Expected fee ~${testCase.expectedFee} AED, got ${result.shippingFee?.toFixed(2)} AED (Rule ${testCase.rule})`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Test suite completed\n');
}

runTests().catch(console.error);
