const axios = require('axios');

async function testMarketAndBuyPriceUpdates() {
  try {
    console.log('🔐 Step 1: Logging in as seller...');
    
    // Step 1: Login as seller
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'seller@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Step 2: Test market price update
    console.log('💰 Step 2: Testing market price update for size Small...');
    
    const marketPriceResponse = await axios.patch(
      'http://localhost:5000/api/seller/products/14/sizes/Small',
      { market_price: 399.99 },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Market price update successful!');
    console.log('Response:', marketPriceResponse.data);
    
    // Step 3: Test actual buy price update
    console.log('💰 Step 3: Testing actual buy price update for size Small...');
    
    const actualBuyPriceResponse = await axios.patch(
      'http://localhost:5000/api/seller/products/14/sizes/Small',
      { actual_buy_price: 150.99 },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Actual buy price update successful!');
    console.log('Response:', actualBuyPriceResponse.data);
    
    // Step 4: Update multiple fields at once
    console.log('💰 Step 4: Testing combined update (price, market_price, actual_buy_price)...');
    
    const combinedResponse = await axios.patch(
      'http://localhost:5000/api/seller/products/14/sizes/Medium',
      { 
        price: 249.99,
        market_price: 349.99,
        actual_buy_price: 125.50
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Combined update successful!');
    console.log('Response:', combinedResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testMarketAndBuyPriceUpdates();