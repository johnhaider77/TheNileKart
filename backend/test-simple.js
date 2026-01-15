const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testMarketAndBuyPrice() {
  try {
    console.log('🔐 Testing seller login...');
    
    // Step 1: Login
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const loginResult = await makeRequest(loginOptions, {
      email: 'seller@example.com',
      password: 'password123'
    });
    
    if (loginResult.status !== 200) {
      console.log('❌ Login failed:', loginResult);
      return;
    }
    
    const token = loginResult.data.token;
    console.log('✅ Login successful, got token');
    
    // Step 2: Test market price update
    console.log('💰 Testing market price update...');
    
    const marketPriceOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/seller/products/14/sizes/Small',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const marketPriceResult = await makeRequest(marketPriceOptions, {
      market_price: 399.99
    });
    
    console.log('Market price update result:', marketPriceResult);
    
    // Step 3: Test actual buy price update
    console.log('💰 Testing actual buy price update...');
    
    const buyPriceOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/seller/products/14/sizes/Medium',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const buyPriceResult = await makeRequest(buyPriceOptions, {
      actual_buy_price: 150.99
    });
    
    console.log('Actual buy price update result:', buyPriceResult);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testMarketAndBuyPrice();