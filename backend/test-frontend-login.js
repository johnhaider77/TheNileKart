// Test script to debug frontend login issue
const axios = require('axios');

async function testFrontendLogin() {
  try {
    console.log('🔍 Testing frontend login simulation...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'johnhaider77@gmail.com',
      password: 'testpass123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      timeout: 5000
    });
    
    console.log('✅ Login successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Error details:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);
    console.error('- Data:', error.response?.data);
    console.error('- Message:', error.message);
    console.error('- Code:', error.code);
  }
}

testFrontendLogin();