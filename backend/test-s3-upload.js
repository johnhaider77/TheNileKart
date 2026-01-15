const { s3ProductsUpload, s3BannersUpload, getS3Url, deleteFromS3 } = require('./config/s3Upload');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Test S3 configuration
const testS3Config = () => {
  console.log('🔧 Testing S3 Configuration...');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
  console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1');
  console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || '❌ Missing');
  console.log('');
};

// Test product image upload
app.post('/test-product-upload', s3ProductsUpload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'videos', maxCount: 3 }
]), (req, res) => {
  try {
    console.log('📸 Testing Product Upload...');
    
    const uploadedFiles = {
      images: [],
      videos: []
    };

    // Process uploaded images
    if (req.files.images) {
      req.files.images.forEach(file => {
        console.log('✅ Image uploaded:', file.location);
        uploadedFiles.images.push({
          original_name: file.originalname,
          s3_key: file.key,
          url: file.location,
          size: file.size
        });
      });
    }

    // Process uploaded videos
    if (req.files.videos) {
      req.files.videos.forEach(file => {
        console.log('✅ Video uploaded:', file.location);
        uploadedFiles.videos.push({
          original_name: file.originalname,
          s3_key: file.key,
          url: file.location,
          size: file.size
        });
      });
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully to S3',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Test banner upload
app.post('/test-banner-upload', s3BannersUpload.single('banner'), (req, res) => {
  try {
    console.log('🎨 Testing Banner Upload...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No banner file uploaded'
      });
    }

    console.log('✅ Banner uploaded:', req.file.location);
    
    res.json({
      success: true,
      message: 'Banner uploaded successfully to S3',
      file: {
        original_name: req.file.originalname,
        s3_key: req.file.key,
        url: req.file.location,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('❌ Banner upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Banner upload failed',
      error: error.message
    });
  }
});

// Start test server
const PORT = 5001;

app.listen(PORT, () => {
  console.log('🧪 S3 Upload Test Server Started');
  console.log('='.repeat(50));
  testS3Config();
  console.log('🚀 Server running on http://localhost:' + PORT);
  console.log('');
  console.log('📋 Test Endpoints:');
  console.log('POST /test-product-upload - Upload product images/videos');
  console.log('POST /test-banner-upload - Upload banner image');
  console.log('');
  console.log('💡 Use tools like Postman or curl to test uploads');
  console.log('='.repeat(50));
});

module.exports = app;