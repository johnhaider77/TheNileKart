const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Check if we should force local storage
const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true' || 
                       !process.env.AWS_ACCESS_KEY_ID;

let s3;
let s3Available = false;

// Only try to configure AWS if not forced to use local storage
if (!useLocalStorage) {
  try {
    // Configure AWS SDK with SSL workaround for local development
    const https = require('https');
    const customAgent = new https.Agent({
      rejectUnauthorized: false, // Allow self-signed certificates (for corporate networks)
      secureProtocol: 'TLSv1_2_method',
      timeout: 30000
    });

    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      httpOptions: {
        agent: customAgent,
        timeout: 30000
      },
      maxRetries: 3,
      retryDelayOptions: {
        customBackoff: function(retryCount) {
          return Math.pow(2, retryCount) * 100;
        }
      }
    });

    s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      signatureVersion: 'v4',
      s3ForcePathStyle: false,
      httpOptions: {
        agent: customAgent,
        timeout: 30000
      }
    });
    
    s3Available = true;
    console.log('☁️ AWS S3 configured for file uploads (with SSL workaround)');
  } catch (error) {
    console.warn('⚠️ AWS S3 configuration failed, falling back to local storage:', error.message);
    s3Available = false;
  }
} else {
  console.log('📁 Using local file storage (forced or development mode)');
}

// Create uploads directory for local storage fallback
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories
['products', 'banners', 'products/images', 'products/videos'].forEach(dir => {
  const fullPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration function
const getStorageConfig = (folder) => {
  if (!s3Available || useLocalStorage) {
    console.log('📁 Using local storage for', folder);
    return multer.diskStorage({
      destination: function (req, file, cb) {
        const destPath = path.join(uploadsDir, folder);
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        cb(null, destPath);
      },
      filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      }
    });
  } else {
    console.log('☁️ Using AWS S3 for', folder);
    return multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKET_NAME,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const fileName = `${folder}/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE
    });
  }
};

// S3 upload configuration for products
const s3ProductsUpload = multer({
  storage: getStorageConfig('products'),
  limits: {
    fileSize: file => {
      return file.fieldname === 'videos' ? 200 * 1024 * 1024 : 50 * 1024 * 1024; // 200MB for videos, 50MB for images
    }
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'images') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for images'), false);
      }
    } else if (file.fieldname === 'videos') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for videos'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// S3 upload configuration for banners
const s3BannersUpload = multer({
  storage: getStorageConfig('banners'),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for banner images
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for banners'), false);
    }
  }
});

// Helper function to delete files from S3
const deleteFromS3 = async (key) => {
  try {
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }).promise();
    console.log(`Successfully deleted ${key} from S3`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

// Helper function to get S3 URL
const getS3Url = (key) => {
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

module.exports = {
  s3ProductsUpload,
  s3BannersUpload,
  deleteFromS3,
  getS3Url,
  s3
};