const AWS = require('aws-sdk');
require('dotenv').config();

async function testS3Connection() {
    try {
        console.log('🔧 Testing S3 connection...');
        
        // Configure AWS SDK
        AWS.config.update({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
        });

        // Create S3 instance
        const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1',
            signatureVersion: 'v4'
        });

        console.log('📋 AWS Configuration:');
        console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET');
        console.log('- Region:', process.env.AWS_REGION || 'us-east-1 (default)');
        console.log('- Bucket:', process.env.S3_BUCKET_NAME || 'NOT SET');

        // Test 1: List buckets (basic connectivity test)
        console.log('\n🧪 Test 1: Testing basic AWS connectivity...');
        const buckets = await s3.listBuckets().promise();
        console.log('✅ Successfully connected to AWS S3');
        console.log(`📂 Found ${buckets.Buckets.length} bucket(s)`);
        
        // Test 2: Check if our specific bucket exists and is accessible
        console.log('\n🧪 Test 2: Testing bucket access...');
        const bucketName = process.env.S3_BUCKET_NAME;
        if (bucketName) {
            try {
                await s3.headBucket({ Bucket: bucketName }).promise();
                console.log(`✅ Bucket '${bucketName}' is accessible`);
                
                // Test 3: Try to list objects in bucket
                console.log('\n🧪 Test 3: Testing bucket permissions...');
                const objects = await s3.listObjectsV2({ 
                    Bucket: bucketName,
                    MaxKeys: 1 
                }).promise();
                console.log(`✅ Can read from bucket (${objects.Contents.length} objects visible)`);
                
            } catch (bucketError) {
                console.log(`❌ Cannot access bucket '${bucketName}':`, bucketError.message);
            }
        } else {
            console.log('❌ S3_BUCKET_NAME not configured');
        }

        // Test 4: Test a small file upload to verify write permissions
        console.log('\n🧪 Test 4: Testing file upload...');
        if (bucketName) {
            try {
                const testKey = `test-uploads/test-${Date.now()}.txt`;
                const uploadParams = {
                    Bucket: bucketName,
                    Key: testKey,
                    Body: 'Test upload from Node.js',
                    ContentType: 'text/plain'
                };
                
                const uploadResult = await s3.upload(uploadParams).promise();
                console.log('✅ Test upload successful:', uploadResult.Location);
                
                // Clean up test file
                await s3.deleteObject({
                    Bucket: bucketName,
                    Key: testKey
                }).promise();
                console.log('✅ Test file cleaned up');
                
            } catch (uploadError) {
                console.log('❌ Upload test failed:', uploadError.message);
            }
        }

        console.log('\n🎉 S3 connection test completed!');

    } catch (error) {
        console.error('\n❌ S3 Connection Error:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'CredentialsError') {
            console.error('\n💡 This is a credentials issue. Please check:');
            console.error('1. AWS_ACCESS_KEY_ID is set correctly');
            console.error('2. AWS_SECRET_ACCESS_KEY is set correctly');
            console.error('3. The credentials have S3 access permissions');
        } else if (error.code === 'NetworkingError') {
            console.error('\n💡 This is a network connectivity issue. Please check:');
            console.error('1. Internet connection is working');
            console.error('2. Firewall/proxy settings');
            console.error('3. AWS region is accessible from your location');
        } else if (error.message.includes('certificate')) {
            console.error('\n💡 This is an SSL certificate issue. Solutions:');
            console.error('1. Update Node.js to latest version');
            console.error('2. Check corporate firewall/proxy settings');
            console.error('3. Try setting NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production)');
        }
    }
}

testS3Connection();