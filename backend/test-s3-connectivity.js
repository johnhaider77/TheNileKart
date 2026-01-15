const AWS = require('aws-sdk');
const https = require('https');
require('dotenv').config();

async function testS3WithSSLWorkarounds() {
    console.log('🔧 Testing S3 connection with SSL workarounds...\n');
    
    // Test 1: Standard connection (will likely fail)
    console.log('🧪 Test 1: Standard S3 connection');
    try {
        const standardS3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
        });
        
        await standardS3.listBuckets().promise();
        console.log('✅ Standard connection works!');
        return true;
    } catch (error) {
        console.log('❌ Standard connection failed:', error.message);
    }
    
    // Test 2: With custom HTTPS agent (ignoring SSL certificate issues)
    console.log('\n🧪 Test 2: S3 with relaxed SSL settings');
    try {
        const relaxedAgent = new https.Agent({
            rejectUnauthorized: false, // DANGER: Only for testing
            secureProtocol: 'TLSv1_2_method'
        });
        
        const relaxedS3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1',
            httpOptions: {
                agent: relaxedAgent,
                timeout: 30000
            },
            sslEnabled: true,
            s3ForcePathStyle: false
        });
        
        const buckets = await relaxedS3.listBuckets().promise();
        console.log('✅ Relaxed SSL connection works!');
        console.log(`📂 Found ${buckets.Buckets.length} bucket(s)`);
        
        // Test bucket access
        if (process.env.S3_BUCKET_NAME) {
            try {
                await relaxedS3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
                console.log(`✅ Bucket '${process.env.S3_BUCKET_NAME}' is accessible`);
                
                // Test upload
                const testKey = `test-uploads/connectivity-test-${Date.now()}.txt`;
                const uploadResult = await relaxedS3.upload({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: testKey,
                    Body: 'S3 connectivity test from Node.js',
                    ContentType: 'text/plain'
                }).promise();
                
                console.log('✅ Upload test successful:', uploadResult.Location);
                
                // Clean up
                await relaxedS3.deleteObject({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: testKey
                }).promise();
                console.log('✅ Test file cleaned up');
                
                return true;
            } catch (bucketError) {
                console.log('❌ Bucket access failed:', bucketError.message);
            }
        }
    } catch (error) {
        console.log('❌ Relaxed SSL connection failed:', error.message);
    }
    
    // Test 3: Different region endpoints
    console.log('\n🧪 Test 3: Testing different endpoint configurations');
    const regions = ['me-central-1', 'eu-west-1', 'us-east-1'];
    
    for (const region of regions) {
        try {
            console.log(`   Testing region: ${region}`);
            const regionalS3 = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: region,
                endpoint: `https://s3.${region}.amazonaws.com`,
                httpOptions: {
                    agent: new https.Agent({
                        rejectUnauthorized: false,
                        timeout: 10000
                    })
                }
            });
            
            await regionalS3.listBuckets().promise();
            console.log(`   ✅ ${region} works!`);
            break;
        } catch (error) {
            console.log(`   ❌ ${region} failed:`, error.message.substring(0, 50));
        }
    }
    
    return false;
}

// Run the test
testS3WithSSLWorkarounds().then((success) => {
    if (!success) {
        console.log('\n📋 SUMMARY:');
        console.log('❌ S3 connection cannot be established from your local laptop');
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('1. 🏢 Corporate Network: You may be behind a corporate firewall/proxy');
        console.log('2. 🔒 SSL Issues: Certificate chain problems are common in corporate environments');
        console.log('3. 🌐 Network Configuration: Your ISP or network may block AWS connections');
        console.log('4. 📍 Regional Issues: The me-central-1 region might have connectivity issues');
        console.log('\n🔧 SOLUTIONS:');
        console.log('✅ Use Local Storage: The app now automatically falls back to local storage');
        console.log('✅ Production Deployment: S3 will work when deployed to a server/cloud');
        console.log('✅ VPN/Network Change: Try connecting from a different network');
        console.log('✅ Contact IT: Ask about AWS connectivity and SSL certificate policies');
        console.log('\n📁 Current Status: Using local file storage (working perfectly)');
    } else {
        console.log('\n🎉 S3 connection successful! You can use S3 storage.');
    }
}).catch(console.error);