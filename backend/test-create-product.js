const axios = require('axios');
const FormData = require('form-data');

async function testProductCreation() {
  try {
    const formData = new FormData();
    
    // Add basic product data
    formData.append('name', 'Test Product');
    formData.append('description', 'This is a test product description with more than 10 characters');
    formData.append('price', '29.99');
    formData.append('category', 'TV, Appliances & Electronics');
    formData.append('stock_quantity', '10');
    
    // Add sizes data
    const sizes = [
      { size: 'Small', quantity: 3 },
      { size: 'Medium', quantity: 4 },
      { size: 'Large', quantity: 3 }
    ];
    formData.append('sizes', JSON.stringify(sizes));

    // You need a valid token - replace this with a real seller token
    const response = await axios.post('http://localhost:5000/api/seller/products', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer YOUR_SELLER_TOKEN_HERE'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testProductCreation();