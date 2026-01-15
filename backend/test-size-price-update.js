const axios = require('axios');

async function testSizePriceUpdate() {
  try {
    console.log('🔐 Step 1: Logging in as seller...');
    
    // Step 1: Login as seller
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'seller@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Step 2: Test the correct size price update endpoint
    console.log('💰 Step 2: Testing PATCH /products/14/sizes/Small...');
    
    const updateResponse = await axios.patch(
      'http://localhost:5000/api/seller/products/14/sizes/Small',
      { price: 299.99 },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Price update successful!');
    console.log('Response:', updateResponse.data);
    
    // Step 3: Test the general product update endpoint that might be causing issues
    console.log('💰 Step 3: Testing PUT /products/14 (general update)...');
    
    const generalUpdateResponse = await axios.put(
      'http://localhost:5000/api/seller/products/14',
      { 
        name: 'Test Product Update',
        description: 'Testing general product update'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ General update successful!');
    console.log('Response:', generalUpdateResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full error object:', error.toJSON?.() || error);
  }
}

testSizePriceUpdate();