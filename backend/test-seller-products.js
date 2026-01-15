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

async function testSellerProductsAPI() {
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
    
    // Step 2: Fetch seller's products
    console.log('📦 Fetching seller products...');
    
    const productsOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/seller/products',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const productsResult = await makeRequest(productsOptions);
    console.log('Products API result status:', productsResult.status);
    
    if (productsResult.status === 200) {
      const products = productsResult.data.products;
      console.log(`\n📊 Found ${products.length} products:`);
      
      // Look for product 14 specifically and show its sizes data
      const product14 = products.find(p => p.id === 14);
      if (product14) {
        console.log('\n🎯 Product 14 data from API:');
        console.log('Name:', product14.name);
        console.log('Sizes:', JSON.stringify(product14.sizes, null, 2));
      } else {
        console.log('❌ Product 14 not found in seller products');
      }
      
      // Also show any other products with sizes that have market_price or actual_buy_price
      products.forEach(product => {
        if (product.sizes && product.sizes.length > 0) {
          product.sizes.forEach(size => {
            if (size.market_price || size.actual_buy_price) {
              console.log(`\n📈 Product ${product.id} (${product.name}) - Size ${size.size}:`);
              if (size.market_price) console.log(`  Market Price: $${size.market_price}`);
              if (size.actual_buy_price) console.log(`  Actual Buy Price: $${size.actual_buy_price}`);
              console.log(`  Selling Price: $${size.price}`);
            }
          });
        }
      });
      
    } else {
      console.log('❌ Failed to fetch products:', productsResult);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testSellerProductsAPI();