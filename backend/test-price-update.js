const axios = require('axios');

async function testPriceUpdate() {
  try {
    console.log('🔐 Step 1: Logging in as seller...');
    
    // Step 1: Login as seller
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'seller@example.com',
      password: 'seller123' // Assuming this is the password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Step 2: Test the price update endpoint
    console.log('💰 Step 2: Updating price for size Small...');
    
    const updateResponse = await axios.patch(
      'http://localhost:5000/api/seller/products/13/sizes/Small',
      { price: 199.99 },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Price update successful!');
    console.log('Response:', updateResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full error:', error.code, error.errno);
    if (error.request) {
      console.error('Request made but no response:', error.request.path);
    }
  }
}

testPriceUpdate();