const axios = require('axios');
const FormData = require('form-data');

// Test product creation with the new backend
async function testProductCreation() {
    try {
        console.log('🧪 Testing product creation with new S3 fallback...');
        
        // Login first
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'seller@example.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Create test files
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        // Create form data
        const form = new FormData();
        form.append('name', 'S3_Test_Product');
        form.append('description', 'Testing S3 upload functionality');
        form.append('category', "Men's Fashion");
        form.append('price', '300');
        form.append('stock_quantity', '80');
        form.append('sizes', JSON.stringify([
            {"size": "U", "quantity": 50, "price": 300, "market_price": 379.97, "actual_buy_price": 199.96},
            {"size": "L", "quantity": 30, "price": 400, "market_price": 420, "actual_buy_price": 250}
        ]));
        
        // Add test images
        form.append('images', testImageBuffer, 'test1.png');
        form.append('images', testImageBuffer, 'test2.png');
        form.append('images', testImageBuffer, 'test3.png');
        form.append('images', testImageBuffer, 'test4.png');
        
        // Add image metadata
        form.append('imageData_0', JSON.stringify({alt: 'Test image 1', isPrimary: true}));
        form.append('imageData_1', JSON.stringify({alt: 'Test image 2', isPrimary: false}));
        form.append('imageData_2', JSON.stringify({alt: 'Test image 3', isPrimary: false}));
        form.append('imageData_3', JSON.stringify({alt: 'Test image 4', isPrimary: false}));
        
        // Add test video
        const testVideoBuffer = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
        form.append('videos', testVideoBuffer, 'test_video.mp4');
        form.append('videoData_0', JSON.stringify({title: 'Test video'}));
        
        console.log('📤 Sending product creation request...');
        
        const response = await axios.post('http://localhost:5000/api/seller/products', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            },
            timeout: 30000
        });
        
        console.log('✅ Product created successfully!');
        console.log('📊 Response:', {
            id: response.data.product.id,
            name: response.data.product.name,
            images: response.data.product.images.map(img => img.url),
            videos: response.data.product.videos.map(vid => vid.url),
            storage: response.data.product.images[0]?.url?.includes('amazonaws') ? 'S3' : 'Local'
        });
        
    } catch (error) {
        console.error('❌ Test failed:');
        console.error('Status:', error.response?.status);
        console.error('Message:', error.response?.data?.message || error.message);
        console.error('Error:', error.response?.data?.error);
    }
}

testProductCreation();