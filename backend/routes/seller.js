const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireSeller } = require('../middleware/auth');
const { s3ProductsUpload, deleteS3File, renameS3File } = require('../config/s3Upload');

const router = express.Router();

// Helper function to convert relative URLs to absolute URLs
const getAbsoluteUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Convert relative path to absolute URL using server domain
  const serverUrl = process.env.BACKEND_URL || process.env.SERVER_URL || `https://${process.env.DOMAIN_NAME || 'thenilekart.com'}`;
  return `${serverUrl}${url}`;
};

// Helper function to validate and filter image URLs
// Returns only valid S3 URLs or absolute URLs
const isValidImageUrl = (url) => {
  if (!url) return false;
  
  // Reject ANY local path (both relative and absolute) by checking for path patterns
  if (url.includes('/uploads/') || url.includes('/videos/') || url.includes('/banners/')) {
    console.warn('⚠️ Filtering out old local path URL:', url.substring(0, 80));
    return false;
  }
  
  // Accept S3 URLs
  if (url.includes('.s3.') && url.includes('.amazonaws.com')) {
    return true;
  }
  
  // Accept other HTTPS URLs (but they must not be local paths - already checked above)
  if (url.startsWith('https://')) {
    return true;
  }
  
  return false;
};

// Helper function to filter and clean images array
const cleanImageArray = (images) => {
  if (!Array.isArray(images)) return [];
  return images.filter(img => {
    if (!img || !img.url) return false;
    return isValidImageUrl(img.url);
  });
};

// Helper function to parse size_chart if it's a string
const parseSizeChart = (product) => {
  if (!product) return product;
  if (product.size_chart) {
    console.log(`[SIZE-CHART] Product ${product.id}: size_chart type=${typeof product.size_chart}, value=${typeof product.size_chart === 'string' ? product.size_chart.substring(0, 80) : 'object'}`);
    if (typeof product.size_chart === 'string') {
      try {
        product.size_chart = JSON.parse(product.size_chart);
        console.log(`[SIZE-CHART] Successfully parsed size_chart for product ${product.id}`);
      } catch (err) {
        console.warn(`[SIZE-CHART] Failed to parse size_chart for product ${product.id}:`, err.message);
        product.size_chart = null;
      }
    } else {
      console.log(`[SIZE-CHART] size_chart is already an object for product ${product.id}`);
    }
  } else {
    console.log(`[SIZE-CHART] Product ${product.id}: size_chart is null/undefined`);
  }
  return product;
};

// Create new product
router.post('/products', [
  authenticateToken,
  requireSeller,
  s3ProductsUpload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 2 }
  ]),
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('price').notEmpty().withMessage('Price is required').custom((value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Price must be a valid number');
    }
    if (numValue < 0.01) {
      throw new Error('Price must be at least 0.01');
    }
    return true;
  }),
  body('actual_buy_price').optional({ checkFalsy: true }).custom((value) => {
    if (value === undefined || value === null || value === '') {
      return true; // Optional field, skip validation if empty
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Buy price must be a valid number');
    }
    if (numValue < 0) {
      throw new Error('Buy price must be non-negative');
    }
    return true;
  }),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ min: 2 }).withMessage('Category must be at least 2 characters'),
  body('stock_quantity').notEmpty().withMessage('Stock quantity is required').custom((value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error('Stock quantity must be a valid integer');
    }
    if (numValue < 0) {
      throw new Error('Stock quantity must be non-negative');
    }
    return true;
  }),
  body('sizes').optional({ checkFalsy: true }).custom((value) => {
    if (!value) return true; // Optional field
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) {
        throw new Error('Sizes must be an array');
      }
      return true;
    } catch (error) {
      throw new Error('Invalid sizes format');
    }
  }),
  body('product_id').optional({ checkFalsy: true }).trim(),
  body('other_details').optional({ checkFalsy: true }).trim(),
  body('cod_eligible').optional({ checkFalsy: true }).custom((value) => {
    if (value === undefined || value === null || value === '') {
      return true; // Optional field, skip validation if empty
    }
    // Handle boolean values that come as strings from FormData
    if (value === 'true' || value === 'false' || value === true || value === false) {
      return true;
    }
    throw new Error('COD eligible must be a boolean value');
  }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      description, 
      price, 
      actual_buy_price, 
      category, 
      stock_quantity, 
      sizes,
      product_id,
      other_details,
      cod_eligible = false 
    } = req.body;
    
    const files = req.files;
    const seller_id = req.user.id;

    // Process uploaded images
    const images = [];
    if (files && files.images) {
      for (let i = 0; i < files.images.length; i++) {
        const imageFile = files.images[i];
        const imageDataKey = `imageData_${i}`;
        let imageData = {};
        
        try {
          imageData = req.body[imageDataKey] ? JSON.parse(req.body[imageDataKey]) : {};
        } catch (e) {
          imageData = {};
        }

        // ENFORCE S3-ONLY UPLOADS - No local storage fallback
        if (!imageFile.location) {
          throw new Error(`Image upload to S3 failed for image: ${imageFile.originalname}. Images MUST be uploaded to S3.`);
        }
        
        let fileUrl = imageFile.location;
        
        // Convert relative URLs to absolute
        fileUrl = getAbsoluteUrl(fileUrl);
        
        // Use customName if provided, otherwise use original filename
        const displayName = imageData.customName || imageFile.originalname;
        
        // Always rename S3 files to use clean custom names (without timestamps)
        if (imageFile.location && imageFile.location.includes('s3')) {
          try {
            const currentS3Key = imageFile.location.split('.amazonaws.com/')[1];
            const fileExtension = displayName.includes('.') ? '' : imageFile.originalname.split('.').pop();
            const customFileName = fileExtension ? `${displayName}.${fileExtension}` : displayName;
            const newS3Key = `products/${customFileName}`;
            
            console.log('🔄 [PRODUCT-CREATE] Renaming S3 image to custom name:', {
              oldKey: currentS3Key,
              newKey: newS3Key,
              customName: displayName,
              fileExtension: fileExtension
            });
            
            // Rename in S3 (copy + delete)
            await renameS3File(currentS3Key, newS3Key);
            
            // Update file URL to new location
            fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'me-central-1'}.amazonaws.com/${newS3Key}`;
            
            console.log('✅ [PRODUCT-CREATE] S3 image renamed successfully:', {
              newUrl: fileUrl.substring(0, 80)
            });
          } catch (renameError) {
            console.error('⚠️ [PRODUCT-CREATE] Could not rename S3 image, proceeding with auto-generated name:', renameError.message);
            // Continue with original file location if rename fails
          }
        }

        images.push({
          id: Date.now() + '_' + i,
          url: fileUrl,
          alt: imageData.alt || imageFile.originalname,
          displayName: displayName,
          isPrimary: imageData.isPrimary || false
        });
      }
    }

    // Process uploaded videos
    const videos = [];
    if (files && files.videos) {
      for (let i = 0; i < files.videos.length; i++) {
        const videoFile = files.videos[i];
        const videoDataKey = `videoData_${i}`;
        let videoData = {};
        
        try {
          videoData = req.body[videoDataKey] ? JSON.parse(req.body[videoDataKey]) : {};
        } catch (e) {
          videoData = {};
        }

        // ENFORCE S3-ONLY UPLOADS - No local storage fallback
        if (!videoFile.location) {
          throw new Error(`Video upload to S3 failed for video: ${videoFile.originalname}. Videos MUST be uploaded to S3.`);
        }
        
        let fileUrl = videoFile.location;
        
        // Convert relative URLs to absolute
        fileUrl = getAbsoluteUrl(fileUrl);
        
        // Use customName if provided, otherwise use original filename
        const displayName = videoData.customName || videoFile.originalname;
        
        // Always rename S3 files to use clean custom names (without timestamps)
        if (videoFile.location && videoFile.location.includes('s3')) {
          try {
            const currentS3Key = videoFile.location.split('.amazonaws.com/')[1];
            const fileExtension = displayName.includes('.') ? '' : videoFile.originalname.split('.').pop();
            const customFileName = fileExtension ? `${displayName}.${fileExtension}` : displayName;
            const newS3Key = `products/${customFileName}`;
            
            console.log('🔄 [PRODUCT-CREATE] Renaming S3 video to custom name:', {
              oldKey: currentS3Key,
              newKey: newS3Key,
              customName: displayName,
              fileExtension: fileExtension
            });
            
            // Rename in S3 (copy + delete)
            await renameS3File(currentS3Key, newS3Key);
            
            // Update file URL to new location
            fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'me-central-1'}.amazonaws.com/${newS3Key}`;
            
            console.log('✅ [PRODUCT-CREATE] S3 video renamed successfully:', {
              newUrl: fileUrl.substring(0, 80)
            });
          } catch (renameError) {
            console.error('⚠️ [PRODUCT-CREATE] Could not rename S3 video, proceeding with auto-generated name:', renameError.message);
            // Continue with original file location if rename fails
          }
        }

        videos.push({
          id: Date.now() + '_video_' + i,
          url: fileUrl,
          title: videoData.title || videoFile.originalname,
          displayName: displayName
        });
      }
    }

    // Ensure at least one image is marked as primary
    if (images.length > 0 && !images.some(img => img.isPrimary)) {
      images[0].isPrimary = true;
    }

    // Legacy image_url for backward compatibility (use primary image)
    const primaryImage = images.find(img => img.isPrimary);
    const image_url = primaryImage ? primaryImage.url : null;

    // Auto-generate product_id if not provided
    let finalProductId = product_id;
    if (!finalProductId) {
      // We'll update this after getting the product ID from database
      finalProductId = null;
    }

    // Process sizes - if no sizes provided, create default "One Size" entry
    let finalSizes = [];
    let productMarketPrice = 0;
    
    // Parse sizes if it's a JSON string (from FormData)
    let parsedSizes = sizes;
    if (typeof sizes === 'string') {
      try {
        parsedSizes = JSON.parse(sizes);
      } catch (error) {
        console.error('Error parsing sizes JSON:', error);
        parsedSizes = [];
      }
    }
    
    if (parsedSizes && Array.isArray(parsedSizes) && parsedSizes.length > 0) {
      finalSizes = parsedSizes.filter(size => size.size && size.size.trim()).map(size => {
        const sizePrice = parseFloat(size.price) || 0;
        const providedMarketPrice = parseFloat(size.market_price) || 0;
        const sizeBuyPrice = parseFloat(size.actual_buy_price) || 0;
        
        // Calculate a reasonable market price if not provided or is 0
        let calculatedMarketPrice = providedMarketPrice;
        if (calculatedMarketPrice <= 0 || calculatedMarketPrice <= sizePrice) {
          if (sizeBuyPrice > 0) {
            // Use buy price + 50% markup as market price
            calculatedMarketPrice = Math.max(sizePrice, sizeBuyPrice * 1.5);
          } else {
            // Default to 25% markup over selling price for discount display
            calculatedMarketPrice = sizePrice * 1.25;
          }
        }
        
        return {
          size: size.size.trim(),
          colour: size.colour || 'Default',
          quantity: parseInt(size.quantity) || 0,
          price: sizePrice,
          market_price: calculatedMarketPrice,
          actual_buy_price: sizeBuyPrice,
          cod_eligible: size.cod_eligible !== undefined ? size.cod_eligible : false
        };
      });
      
      // For products with sizes, set product-level market price to the highest market price among sizes
      if (finalSizes.length > 0) {
        const marketPrices = finalSizes.map(size => size.market_price || 0).filter(mp => mp > 0);
        if (marketPrices.length > 0) {
          productMarketPrice = Math.max(...marketPrices);
        } else {
          // Fallback if no valid market prices (shouldn't happen with new logic)
          productMarketPrice = Math.max(...finalSizes.map(size => size.price)) * 1.25;
        }
      }
    }
    
    // If no valid sizes provided, create default size with total stock quantity
    if (finalSizes.length === 0) {
      // For products without custom sizes, use a reasonable market price if not provided
      const defaultMarketPrice = actual_buy_price && actual_buy_price > 0 
        ? Math.max(parseFloat(price), parseFloat(actual_buy_price) * 1.5)  // At least 50% markup over buy price
        : parseFloat(price) * 1.25; // Default to 25% markup for discount display
        
      finalSizes = [{
        size: 'One Size',
        colour: 'Default',
        quantity: parseInt(stock_quantity) || 0,
        price: parseFloat(price) || 0,
        market_price: defaultMarketPrice,
        actual_buy_price: parseFloat(actual_buy_price) || 0,
        cod_eligible: cod_eligible === true
      }];
      // Set product market price to the same as the default size market price
      productMarketPrice = finalSizes[0].market_price;
    }
    
    // Extract size chart if provided
    let sizeChart = null;
    if (req.body.sizeChart) {
      try {
        sizeChart = typeof req.body.sizeChart === 'string' 
          ? JSON.parse(req.body.sizeChart) 
          : req.body.sizeChart;
      } catch (error) {
        console.error('Error parsing size chart:', error);
        sizeChart = null;
      }
    }
    
    // Calculate total stock from sizes
    const totalStock = finalSizes.reduce((total, size) => total + size.quantity, 0);

    const newProduct = await db.query(
      `INSERT INTO products (
        name, description, price, actual_buy_price, category, 
        stock_quantity, sizes, seller_id, image_url, images, videos, 
        product_id, is_active, cod_eligible, market_price, size_chart
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       RETURNING id, name, description, price, actual_buy_price, category, 
                 stock_quantity, sizes, image_url, images, videos, product_id, 
                 is_active, created_at, cod_eligible, market_price, size_chart`,
      [
        name, 
        description, 
        price, 
        actual_buy_price || null,
        category, 
        totalStock, // Use calculated total stock
        JSON.stringify(finalSizes), // Store sizes as JSONB
        seller_id, 
        image_url,
        JSON.stringify(images),
        JSON.stringify(videos),
        finalProductId,
        true, // Always set active when created (sellers can toggle status if needed)
        cod_eligible,
        productMarketPrice,
        sizeChart ? JSON.stringify(sizeChart) : null
      ]
    );

    // If product_id was auto-generated, update the record
    if (!product_id) {
      const autoProductId = `PROD-${String(newProduct.rows[0].id).padStart(6, '0')}`;
      await db.query(
        'UPDATE products SET product_id = $1 WHERE id = $2',
        [autoProductId, newProduct.rows[0].id]
      );
      newProduct.rows[0].product_id = autoProductId;
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        ...newProduct.rows[0],
        other_details: other_details || null
      }
    });

  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ 
      message: 'Server error creating product', 
      error: error.message 
    });
  }
});

// Get seller's products
router.get('/products', [
  authenticateToken,
  requireSeller,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const seller_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const products = await db.query(
      `SELECT id, name, description, price, category, stock_quantity, sizes,
              image_url, images, product_id, is_active, created_at, updated_at, cod_eligible, market_price
       FROM products 
       WHERE seller_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [seller_id, limit, offset]
    );

    // Get total count
    const totalCount = await db.query(
      'SELECT COUNT(*) as total FROM products WHERE seller_id = $1',
      [seller_id]
    );

    // Process products to ensure proper JSON parsing
    const processedProducts = products.rows.map(product => {
      let parsedSizes = product.sizes;
      let parsedImages = product.images;
      
      // Parse sizes if it's a string
      if (typeof product.sizes === 'string' && product.sizes) {
        try {
          parsedSizes = JSON.parse(product.sizes);
        } catch (e) {
          console.error('Error parsing sizes for product', product.id, ':', e);
          parsedSizes = [];
        }
      }
      
      // Parse images if it's a string
      if (typeof product.images === 'string' && product.images) {
        try {
          parsedImages = JSON.parse(product.images);
        } catch (e) {
          console.error('Error parsing images for product', product.id, ':', e);
          parsedImages = [];
        }
      }
      
      return {
        ...product,
        sizes: parsedSizes,
        images: parsedImages
      };
    });

    res.json({
      products: processedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalProducts: parseInt(totalCount.rows[0].total),
        hasNextPage: page < Math.ceil(totalCount.rows[0].total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// Update product with images support
router.put('/products/:id', [
  authenticateToken,
  requireSeller,
  s3ProductsUpload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 2 }
  ]),
  body('name').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('price').optional().custom((value) => {
    if (value === undefined || value === null || value === '') {
      return true; // Optional field, skip validation if empty
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Price must be a valid number');
    }
    if (numValue < 0.01) {
      throw new Error('Price must be at least 0.01');
    }
    return true;
  }),
  body('category').optional().trim().isLength({ min: 2 }),
  body('stock_quantity').optional().custom((value) => {
    if (value === undefined || value === null || value === '') {
      return true; // Optional field, skip validation if empty
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error('Stock quantity must be a valid integer');
    }
    if (numValue < 0) {
      throw new Error('Stock quantity must be non-negative');
    }
    return true;
  }),
  body('product_id').optional().trim(),
  body('actual_buy_price').optional().custom((value) => {
    if (value === undefined || value === null || value === '') {
      return true; // Optional field, skip validation if empty
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error('Buy price must be a valid number');
    }
    if (numValue < 0) {
      throw new Error('Buy price must be non-negative');
    }
    return true;
  }),
  body('other_details').optional().trim(),
  body('image_url').optional().trim(),
  body('existingImages').optional(),
  body('deletedImages').optional(),
  body('cod_eligible').optional().custom((value) => {
    if (value === undefined || value === null || value === '') {
      return true; // Optional field, skip validation if empty
    }
    // Handle boolean values that come as strings from FormData
    if (value === 'true' || value === 'false' || value === true || value === false) {
      return true;
    }
    throw new Error('COD eligible must be a boolean value');
  }),
], async (req, res) => {
  try {
    // Log incoming data for debugging
    console.log('🔍 Product update request received:', {
      productId: req.params.id,
      priceValue: req.body.price,
      priceType: typeof req.body.price,
      priceAsFloat: parseFloat(req.body.price),
      isNaN: isNaN(parseFloat(req.body.price)),
      contentType: req.headers['content-type'],
      allFields: Object.keys(req.body),
      bodyLength: Object.keys(req.body).length
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🚨 Validation errors for product update:', {
        errors: errors.array(),
        errorDetails: errors.array().map(e => ({ param: e.param, msg: e.msg, value: e.value })),
        requestBody: req.body,
        contentType: req.headers['content-type'],
        hasFiles: !!req.files,
        filesInfo: req.files ? Object.keys(req.files) : []
      });
      return res.status(400).json({ 
        errors: errors.array(),
        debug: { allFields: Object.keys(req.body) }
      });
    }

    const product_id = req.params.id;
    const seller_id = req.user.id;
    const { 
      name, 
      description, 
      price, 
      category, 
      stock_quantity,
      product_id: productIdField,
      actual_buy_price,
      other_details,
      image_url: imageUrlField,
      existingImages,
      deletedImages,
      cod_eligible,
      sizeChart,
      deleteSizeChart
    } = req.body;

    // Check if product belongs to seller
    const productCheck = await db.query(
      'SELECT id, images FROM products WHERE id = $1 AND seller_id = $2',
      [product_id, seller_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const currentProduct = productCheck.rows[0];

    // Handle image management
    let updatedImages = [];
    
    // Start with existing images (if any)
    let existingImagesArray = [];
    try {
      existingImagesArray = existingImages ? JSON.parse(existingImages) : [];
      // Filter out old local image URLs - only keep S3 URLs
      existingImagesArray = existingImagesArray.filter(img => {
        if (isValidImageUrl(img.url)) {
          return true;
        }
        console.log('⚠️ [PRODUCT-UPDATE] Filtering out old local image URL:', img.url);
        return false;
      });
    } catch (e) {
      console.log('Error parsing existing images:', e);
    }

    // Filter out deleted images
    let deletedImagesArray = [];
    try {
      deletedImagesArray = deletedImages ? JSON.parse(deletedImages) : [];
    } catch (e) {
      console.log('Error parsing deleted images:', e);
    }

    console.log('Processing image deletions and renames:', { deletedImagesArray, existingImagesLength: existingImagesArray.length });

    // Handle renamed existing images (alt text changes requiring S3 renames)
    let renamedExistingImagesArray = [];
    try {
      renamedExistingImagesArray = req.body.renamedExistingImages ? JSON.parse(req.body.renamedExistingImages) : [];
    } catch (e) {
      console.log('Error parsing renamed existing images:', e);
    }

    if (renamedExistingImagesArray.length > 0) {
      console.log('🔄 [PRODUCT-UPDATE] Processing renamed existing images:', renamedExistingImagesArray);
      
      for (const renamedImage of renamedExistingImagesArray) {
        try {
          if (renamedImage.url && renamedImage.url.includes('s3')) {
            const currentS3Key = renamedImage.url.split('.amazonaws.com/')[1];
            const newAlt = renamedImage.newAlt || renamedImage.displayName;
            const fileExtension = newAlt.includes('.') ? '' : currentS3Key.split('.').pop();
            const customFileName = fileExtension ? `${newAlt}.${fileExtension}` : newAlt;
            const newS3Key = `products/${customFileName}`;

            console.log('🔄 [PRODUCT-UPDATE] Renaming existing S3 image:', {
              oldKey: currentS3Key,
              newKey: newS3Key,
              oldAlt: renamedImage.oldAlt,
              newAlt: newAlt
            });

            // Only rename if the new name is different from current S3 key
            if (currentS3Key !== newS3Key) {
              await renameS3File(currentS3Key, newS3Key);
              
              const newUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'me-central-1'}.amazonaws.com/${newS3Key}`;
              
              console.log('✅ [PRODUCT-UPDATE] Existing S3 image renamed successfully:', {
                newUrl: newUrl.substring(0, 80)
              });

              // Update the URL and alt in existingImagesArray
              existingImagesArray = existingImagesArray.map(img => 
                img.id === renamedImage.id ? { ...img, url: newUrl, alt: newAlt } : img
              );
            } else {
              console.log('ℹ️ [PRODUCT-UPDATE] S3 image name unchanged, skipping rename');
              // Just update the alt text without renaming
              existingImagesArray = existingImagesArray.map(img => 
                img.id === renamedImage.id ? { ...img, alt: newAlt } : img
              );
            }
          }
        } catch (renameError) {
          console.error('⚠️ [PRODUCT-UPDATE] Could not rename existing S3 image:', renameError.message);
          // Continue processing other images if one fails
        }
      }
    }

    // Keep existing images that weren't deleted
    updatedImages = existingImagesArray.filter((img, index) => {
      // Check deletion by ID (exact match only)
      const deletedById = img.id && deletedImagesArray.includes(img.id.toString());
      // Check deletion by index
      const deletedByIndex = deletedImagesArray.includes(`index_${index}`);
      // Check deletion by index as string (for backward compatibility)
      const deletedByIndexString = deletedImagesArray.includes(index.toString());
      
      const shouldKeep = !deletedById && !deletedByIndex && !deletedByIndexString;
      
      if (!shouldKeep) {
        console.log('Deleting image:', { 
          img: { id: img.id, url: img.url }, 
          index, 
          deletedById, 
          deletedByIndex, 
          deletedByIndexString,
          deletedImagesArray 
        });
        
        // Delete from S3 if URL is S3 URL
        if (img.url && img.url.includes('s3')) {
          try {
            const s3Key = img.url.split('.amazonaws.com/')[1];
            if (s3Key) {
              deleteS3File(s3Key).catch(err => console.warn('Warning: Could not delete S3 file:', err));
            }
          } catch (err) {
            console.warn('Warning: Error extracting S3 key for deletion:', err);
          }
        }
      }
      
      return shouldKeep;
    });

    // Add new uploaded images
    if (req.files && req.files.images) {
      for (let index = 0; index < req.files.images.length; index++) {
        const file = req.files.images[index];
        const imageDataKey = `imageData_${index}`;
        let imageData = {};
        
        try {
          imageData = req.body[imageDataKey] ? JSON.parse(req.body[imageDataKey]) : {};
        } catch (e) {
          imageData = {};
        }
        
        // ENFORCE S3-ONLY UPLOADS - No local storage fallback
        if (!file.location) {
          throw new Error(`Image upload to S3 failed for image: ${file.originalname}. Images MUST be uploaded to S3.`);
        }
        
        let fileUrl = file.location;
        const displayName = imageData.customName || file.originalname;
        
        // Convert relative URLs to absolute
        fileUrl = getAbsoluteUrl(fileUrl);
        
        // Always rename S3 files to use clean custom names (without timestamps)
        if (file.location && file.location.includes('s3')) {
          try {
            const currentS3Key = file.location.split('.amazonaws.com/')[1];
            const fileExtension = displayName.includes('.') ? '' : file.originalname.split('.').pop();
            const customFileName = fileExtension ? `${displayName}.${fileExtension}` : displayName;
            const newS3Key = `products/${customFileName}`;
            
            console.log('🔄 [PRODUCT-UPDATE] Renaming S3 image to custom name:', {
              oldKey: currentS3Key,
              newKey: newS3Key,
              customName: displayName,
              fileExtension: fileExtension
            });
            
            // Rename in S3 (copy + delete)
            await renameS3File(currentS3Key, newS3Key);
            
            // Update file URL to new location
            fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'me-central-1'}.amazonaws.com/${newS3Key}`;
            
            console.log('✅ [PRODUCT-UPDATE] S3 image renamed successfully:', {
              newUrl: fileUrl.substring(0, 80)
            });
          } catch (renameError) {
            console.error('⚠️ [PRODUCT-UPDATE] Could not rename S3 image, proceeding with auto-generated name:', renameError.message);
            // Continue with original file location if rename fails
          }
        }
        
        updatedImages.push({
          id: Date.now() + '_' + index,
          url: fileUrl,
          alt: imageData.alt || file.originalname,
          displayName: displayName,
          isPrimary: imageData.isPrimary || false
        });
      }
    }

    // Build dynamic update query
    let updateFields = [];
    let queryParams = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      queryParams.push(name);
    }
    if (description) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      queryParams.push(description);
    }
    if (price) {
      paramCount++;
      updateFields.push(`price = $${paramCount}`);
      queryParams.push(price);
    }
    if (category) {
      paramCount++;
      updateFields.push(`category = $${paramCount}`);
      queryParams.push(category);
    }
    if (stock_quantity !== undefined) {
      paramCount++;
      updateFields.push(`stock_quantity = $${paramCount}`);
      queryParams.push(stock_quantity);
    }
    if (productIdField) {
      paramCount++;
      updateFields.push(`product_id = $${paramCount}`);
      queryParams.push(productIdField);
    }
    if (actual_buy_price !== undefined) {
      paramCount++;
      updateFields.push(`actual_buy_price = $${paramCount}`);
      queryParams.push(actual_buy_price);
    }
    if (other_details) {
      paramCount++;
      updateFields.push(`other_details = $${paramCount}`);
      queryParams.push(other_details);
    }
    if (cod_eligible !== undefined) {
      paramCount++;
      updateFields.push(`cod_eligible = $${paramCount}`);
      queryParams.push(cod_eligible);
    }
    
    // Update images array
    if (updatedImages.length > 0 || deletedImagesArray.length > 0) {
      paramCount++;
      updateFields.push(`images = $${paramCount}`);
      queryParams.push(JSON.stringify(updatedImages));
      console.log('Updating images in database:', { 
        originalLength: currentProduct.images?.length || 0, 
        finalLength: updatedImages.length,
        deletedCount: deletedImagesArray.length 
      });
    }
    
    // Handle legacy image_url if provided
    if (imageUrlField) {
      paramCount++;
      updateFields.push(`image_url = $${paramCount}`);
      queryParams.push(imageUrlField);
    }

    // Handle size chart if provided or marked for deletion
    if (sizeChart !== undefined || deleteSizeChart === 'true') {
      paramCount++;
      let parsedSizeChart = null;
      
      if (sizeChart !== undefined && deleteSizeChart !== 'true') {
        // Parse and save the size chart
        parsedSizeChart = sizeChart;
        if (typeof sizeChart === 'string') {
          try {
            parsedSizeChart = JSON.parse(sizeChart);
          } catch (error) {
            console.error('Error parsing size chart:', error);
            parsedSizeChart = null;
          }
        }
        console.log('[SIZE-CHART-UPDATE] Saving size chart:', { rows: parsedSizeChart?.rows, columns: parsedSizeChart?.columns });
      } else if (deleteSizeChart === 'true') {
        // Delete the size chart
        parsedSizeChart = null;
        console.log('[SIZE-CHART-UPDATE] Deleting size chart for product:', product_id);
      }
      
      updateFields.push(`size_chart = $${paramCount}`);
      queryParams.push(parsedSizeChart ? JSON.stringify(parsedSizeChart) : null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    queryParams.push(product_id, seller_id);

    const updateQuery = `
      UPDATE products SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND seller_id = $${paramCount + 2}
      RETURNING id, name, description, price, category, stock_quantity, product_id, 
                actual_buy_price, other_details, image_url, images, updated_at, cod_eligible, size_chart
    `;

    const updatedProduct = await db.query(updateQuery, queryParams);
    
    // Clean images array before sending response
    let responseProduct = updatedProduct.rows[0];
    if (responseProduct && responseProduct.images) {
      const cleanedImages = cleanImageArray(responseProduct.images);
      if (cleanedImages.length !== responseProduct.images.length) {
        console.log(`✅ [PRODUCT-UPDATE] Filtered images: ${responseProduct.images.length} → ${cleanedImages.length} valid images`);
        responseProduct.images = cleanedImages;
      }
    }

    res.json({
      message: 'Product updated successfully',
      product: parseSizeChart(responseProduct)
    });

  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// Toggle product active status
router.patch('/products/:id/toggle', [
  authenticateToken,
  requireSeller
], async (req, res) => {
  try {
    const product_id = req.params.id;
    const seller_id = req.user.id;

    const updatedProduct = await db.query(
      `UPDATE products SET 
       is_active = NOT is_active, 
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND seller_id = $2
       RETURNING id, name, is_active`,
      [product_id, seller_id]
    );

    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    res.json({
      message: 'Product status updated successfully',
      product: updatedProduct.rows[0]
    });

  } catch (error) {
    console.error('Product status update error:', error);
    res.status(500).json({ message: 'Server error updating product status' });
  }
});

// Get orders for seller's products
router.get('/orders', [
  authenticateToken,
  requireSeller,
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const seller_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let whereClause = 'WHERE p.seller_id = $1';
    let queryParams = [seller_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
    }

    queryParams.push(limit, offset);

    const ordersQuery = `
      SELECT 
        o.id as order_id, o.total_amount, o.status, o.shipping_address::text as shipping_address, o.created_at,
        u.full_name as customer_name, u.email as customer_email,
        json_agg(
          json_build_object(
            'product_id', p.product_id,
            'product_name', p.name,
            'image_url', p.image_url,
            'images', p.images,
            'quantity', oi.quantity,
            'price', oi.price,
            'total', oi.total,
            'selected_size', COALESCE(oi.selected_size, 'One Size'),
            'selected_colour', COALESCE(oi.selected_colour, 'Default'),
            'price_edited_by_seller', COALESCE(oi.price_edited_by_seller, false),
            'quantity_edited_by_seller', COALESCE(oi.quantity_edited_by_seller, false),
            'buy_price_edited_by_seller', COALESCE(oi.buy_price_edited_by_seller, false),
            'other_profit_loss', COALESCE(oi.other_profit_loss, 0),
            'other_profit_loss_edited_by_seller', COALESCE(oi.other_profit_loss_edited_by_seller, false),
            'edited_at', oi.edited_at
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.customer_id = u.id
      ${whereClause}
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at, u.full_name, u.email
      ORDER BY o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const orders = await db.query(ordersQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      ${whereClause}
    `;

    const totalCount = await db.query(countQuery, queryParams.slice(0, paramCount));

    res.json({
      orders: orders.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalOrders: parseInt(totalCount.rows[0].total),
        hasNextPage: page < Math.ceil(totalCount.rows[0].total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Seller orders fetch error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Update order status
router.patch('/orders/:id/status', [
  authenticateToken,
  requireSeller,
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_failed']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order_id = req.params.id;
    const seller_id = req.user.id;
    const { status } = req.body;

    // Check if order contains seller's products
    const orderCheck = await db.query(
      `SELECT DISTINCT o.id
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND p.seller_id = $2`,
      [order_id, seller_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    const updatedOrder = await db.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status',
      [status, order_id]
    );

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder.rows[0]
    });

  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// Update order details (price, quantity, etc.) with edit tracking
router.patch('/orders/:id/details', [
  authenticateToken,
  requireSeller,
  body('product_price').optional().isFloat({ min: 0 }),
  body('actual_buy_price').optional().isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 1 }),
  body('other_profit_loss').optional().isFloat(),
  body('edited_by_seller').isBoolean(),
  body('edited_at').isISO8601(),
], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await client.query('BEGIN');

    const order_id = req.params.id;
    const seller_id = req.user.id;
    const { product_price, actual_buy_price, quantity, other_profit_loss, edited_by_seller, edited_at } = req.body;

    // Check if order contains seller's products
    const orderCheck = await client.query(
      `SELECT DISTINCT o.id, oi.id as item_id, oi.product_id, p.id as product_id
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND p.seller_id = $2`,
      [order_id, seller_id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    // Update order item details
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (product_price !== undefined) {
      paramCount++;
      updates.push(`price = $${paramCount}`);
      params.push(product_price);
      
      paramCount++;
      updates.push(`price_edited_by_seller = $${paramCount}`);
      params.push(edited_by_seller);
    }

    if (quantity !== undefined) {
      paramCount++;
      updates.push(`quantity = $${paramCount}`);
      params.push(quantity);
      
      paramCount++;
      updates.push(`quantity_edited_by_seller = $${paramCount}`);
      params.push(edited_by_seller);
    }

    if (actual_buy_price !== undefined) {
      // Update product's actual buy price in sizes
      await client.query(
        `UPDATE products SET sizes = jsonb_set(sizes, '{0,actual_buy_price}', $1::text::jsonb)
         WHERE id = $2 AND seller_id = $3`,
        [actual_buy_price, orderCheck.rows[0].product_id, seller_id]
      );
      
      paramCount++;
      updates.push(`buy_price_edited_by_seller = $${paramCount}`);
      params.push(edited_by_seller);
    }

    if (other_profit_loss !== undefined) {
      paramCount++;
      updates.push(`other_profit_loss = $${paramCount}`);
      params.push(other_profit_loss);
      
      paramCount++;
      updates.push(`other_profit_loss_edited_by_seller = $${paramCount}`);
      params.push(edited_by_seller);
    }

    if (updates.length > 0) {
      paramCount++;
      updates.push(`edited_at = $${paramCount}`);
      params.push(edited_at);
      
      paramCount++;
      params.push(order_id);

      const updateQuery = `
        UPDATE order_items 
        SET ${updates.join(', ')}, total = price * quantity
        WHERE order_id = $${paramCount}
        RETURNING *`;

      await client.query(updateQuery, params);

      // Recalculate order total
      await client.query(
        `UPDATE orders 
         SET total_amount = (
           SELECT SUM(oi.price * oi.quantity) 
           FROM order_items oi 
           WHERE oi.order_id = $1
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [order_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Order details updated successfully',
      order_id: order_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order details update error:', error);
    res.status(500).json({ message: 'Server error updating order details' });
  } finally {
    client.release();
  }
});

// Bulk update products
router.patch('/products/bulk', [
  authenticateToken,
  requireSeller,
  body('productIds').isArray().notEmpty(),
  body('updates').isObject().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productIds, updates } = req.body;
    const seller_id = req.user.id;

    // Validate that all products belong to seller
    const productCheck = await db.query(
      'SELECT id FROM products WHERE id = ANY($1) AND seller_id = $2',
      [productIds, seller_id]
    );

    if (productCheck.rows.length !== productIds.length) {
      return res.status(404).json({ message: 'Some products not found or unauthorized' });
    }

    // Build dynamic update query
    let updateFields = [];
    let queryParams = [];
    let paramCount = 0;

    if (updates.stock_quantity !== undefined) {
      paramCount++;
      updateFields.push(`stock_quantity = $${paramCount}`);
      queryParams.push(updates.stock_quantity);
    }
    if (updates.price !== undefined) {
      paramCount++;
      updateFields.push(`price = $${paramCount}`);
      queryParams.push(updates.price);
    }
    if (updates.category !== undefined) {
      paramCount++;
      updateFields.push(`category = $${paramCount}`);
      queryParams.push(updates.category);
    }
    if (updates.is_active !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      queryParams.push(updates.is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    queryParams.push(productIds, seller_id);

    const updateQuery = `
      UPDATE products SET ${updateFields.join(', ')}
      WHERE id = ANY($${paramCount + 1}) AND seller_id = $${paramCount + 2}
      RETURNING id, name, price, category, stock_quantity, is_active, updated_at
    `;

    const updatedProducts = await db.query(updateQuery, queryParams);

    res.json({
      message: 'Products updated successfully',
      products: updatedProducts.rows,
      updatedCount: updatedProducts.rows.length
    });

  } catch (error) {
    console.error('Bulk products update error:', error);
    res.status(500).json({ message: 'Server error updating products' });
  }
});

// Get products with advanced filtering
router.get('/products/search', [
  authenticateToken,
  requireSeller,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('product_id').optional().trim(),
  query('name').optional().trim(),
  query('category').optional().trim(),
  query('is_active').optional().isBoolean(),
  query('min_stock').optional().isInt({ min: 0 }),
  query('max_stock').optional().isInt({ min: 0 }),
], async (req, res) => {
  try {
    const seller_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE seller_id = $1';
    let queryParams = [seller_id];
    let paramCount = 1;

    // Add filters
    if (req.query.product_id) {
      paramCount++;
      whereClause += ` AND product_id ILIKE $${paramCount}`;
      queryParams.push(`%${req.query.product_id}%`);
    }
    if (req.query.name) {
      paramCount++;
      whereClause += ` AND name ILIKE $${paramCount}`;
      queryParams.push(`%${req.query.name}%`);
    }
    if (req.query.category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      queryParams.push(req.query.category);
    }
    if (req.query.is_active !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      queryParams.push(req.query.is_active === 'true');
    }
    if (req.query.min_stock !== undefined) {
      paramCount++;
      whereClause += ` AND stock_quantity >= $${paramCount}`;
      queryParams.push(parseInt(req.query.min_stock));
    }
    if (req.query.max_stock !== undefined) {
      paramCount++;
      whereClause += ` AND stock_quantity <= $${paramCount}`;
      queryParams.push(parseInt(req.query.max_stock));
    }

    const products = await db.query(
      `SELECT id, product_id, name, description, price, actual_buy_price, 
              category, stock_quantity, sizes, image_url, images, is_active, 
              created_at, updated_at, cod_eligible, size_chart
       FROM products 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, limit, offset]
    );

    // Get total count with same filters
    const totalCount = await db.query(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      queryParams
    );

    res.json({
      products: products.rows.map(parseSizeChart),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalProducts: parseInt(totalCount.rows[0].total),
        hasNextPage: page < Math.ceil(totalCount.rows[0].total / limit),
        hasPrevPage: page > 1
      },
      filters: req.query
    });

  } catch (error) {
    console.error('Products search error:', error);
    res.status(500).json({ message: 'Server error searching products' });
  }
});

// Update product sizes
router.put('/products/:id/sizes', [
  authenticateToken,
  requireSeller,
  body('sizes').isArray().withMessage('Sizes must be an array'),
  body('sizes.*.size').trim().notEmpty().withMessage('Size name is required'),
  body('sizes.*.quantity').isInt({ min: 0 }).withMessage('Size quantity must be non-negative'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = req.params.id;
    const { sizes } = req.body;
    const seller_id = req.user.id;

    // Verify product belongs to seller
    const productCheck = await db.query(
      'SELECT id FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // Process and validate sizes
    const validSizes = sizes.filter(size => size.size && size.size.trim()).map(size => ({
      size: size.size.trim(),
      quantity: parseInt(size.quantity) || 0
    }));

    if (validSizes.length === 0) {
      return res.status(400).json({ message: 'At least one valid size is required' });
    }

    // Calculate total stock
    const totalStock = validSizes.reduce((total, size) => total + size.quantity, 0);

    // Update product sizes and stock
    await db.query(
      `UPDATE products 
       SET sizes = $1, stock_quantity = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [JSON.stringify(validSizes), totalStock, totalStock > 0, productId]
    );

    res.json({
      message: 'Product sizes updated successfully',
      sizes: validSizes,
      total_stock: totalStock
    });

  } catch (error) {
    console.error('Size update error:', error);
    res.status(500).json({ message: 'Server error updating product sizes' });
  }
});

// Update specific size quantity (for quick inventory adjustments)
router.patch('/products/:id/sizes/:size', [
  authenticateToken,
  requireSeller
], async (req, res) => {
  try {
    console.log('=== PATCH /products/:id/sizes/:size ===');
    console.log('Product ID:', req.params.id);
    console.log('Size:', req.params.size);
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    // Manual validation
    const { quantity, price, market_price, actual_buy_price } = req.body;
    
    if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'quantity', 
          message: 'Quantity must be a non-negative number' 
        }] 
      });
    }
    
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'price', 
          message: 'Price must be a non-negative number' 
        }] 
      });
    }
    
    if (market_price !== undefined && (isNaN(market_price) || market_price < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'market_price', 
          message: 'Market price must be a non-negative number' 
        }] 
      });
    }
    
    if (actual_buy_price !== undefined && (isNaN(actual_buy_price) || actual_buy_price < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'actual_buy_price', 
          message: 'Actual buy price must be a non-negative number' 
        }] 
      });
    }

    const productId = req.params.id;
    const sizeName = decodeURIComponent(req.params.size);
    const seller_id = req.user.id;

    // Verify product belongs to seller
    const productCheck = await db.query(
      'SELECT id, sizes FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    const currentSizes = productCheck.rows[0].sizes || [];
    
    // Update the sizes array with new quantity, price, market_price, and/or actual_buy_price
    let updated = false;
    const updatedSizes = currentSizes.map(sizeData => {
      if (sizeData.size === sizeName) {
        updated = true;
        const updatedSize = { ...sizeData };
        if (quantity !== undefined) {
          updatedSize.quantity = quantity;
        }
        if (price !== undefined) {
          updatedSize.price = price;
        }
        if (market_price !== undefined) {
          updatedSize.market_price = market_price;
        }
        if (actual_buy_price !== undefined) {
          updatedSize.actual_buy_price = actual_buy_price;
        }
        return updatedSize;
      }
      return sizeData;
    });

    if (!updated) {
      return res.status(404).json({ message: 'Size not found for this product' });
    }

    // Calculate new total stock
    const totalStock = updatedSizes.reduce((sum, size) => sum + (size.quantity || 0), 0);

    // Update the product in database
    await db.query(
      'UPDATE products SET sizes = $1, stock_quantity = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [JSON.stringify(updatedSizes), totalStock, productId]
    );

    res.json({
      message: 'Size updated successfully',
      sizes: updatedSizes,
      total_stock: totalStock
    });

  } catch (error) {
    console.error('Size update error:', error);
    res.status(500).json({ message: 'Server error updating size' });
  }
});

// PATCH route for size+colour updates (NEW)
router.patch('/products/:id/sizes/:size/:colour', [
  authenticateToken,
  requireSeller
], async (req, res) => {
  try {
    console.log('=== PATCH /products/:id/sizes/:size/:colour ===');
    console.log('Product ID:', req.params.id);
    console.log('Size:', req.params.size);
    console.log('Colour:', req.params.colour);
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    // Manual validation
    const { quantity, price, market_price, actual_buy_price } = req.body;
    
    if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'quantity', 
          message: 'Quantity must be a non-negative number' 
        }] 
      });
    }
    
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'price', 
          message: 'Price must be a non-negative number' 
        }] 
      });
    }
    
    if (market_price !== undefined && (isNaN(market_price) || market_price < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'market_price', 
          message: 'Market price must be a non-negative number' 
        }] 
      });
    }
    
    if (actual_buy_price !== undefined && (isNaN(actual_buy_price) || actual_buy_price < 0)) {
      return res.status(400).json({ 
        errors: [{ 
          field: 'actual_buy_price', 
          message: 'Actual buy price must be a non-negative number' 
        }] 
      });
    }

    const productId = req.params.id;
    const sizeName = decodeURIComponent(req.params.size);
    const colourName = decodeURIComponent(req.params.colour);
    const seller_id = req.user.id;

    // Verify product belongs to seller
    const productCheck = await db.query(
      'SELECT id, sizes FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    const currentSizes = productCheck.rows[0].sizes || [];
    
    // Update the sizes array with new quantity, price, market_price, and/or actual_buy_price
    let updated = false;
    const updatedSizes = currentSizes.map(sizeData => {
      if (sizeData.size === sizeName && (sizeData.colour || 'Default') === colourName) {
        updated = true;
        const updatedSize = { ...sizeData };
        if (quantity !== undefined) {
          updatedSize.quantity = quantity;
        }
        if (price !== undefined) {
          updatedSize.price = price;
        }
        if (market_price !== undefined) {
          updatedSize.market_price = market_price;
        }
        if (actual_buy_price !== undefined) {
          updatedSize.actual_buy_price = actual_buy_price;
        }
        return updatedSize;
      }
      return sizeData;
    });

    if (!updated) {
      return res.status(404).json({ message: `Size+Colour combination (${sizeName}/${colourName}) not found for this product` });
    }

    // Calculate new total stock
    const totalStock = updatedSizes.reduce((sum, size) => sum + (size.quantity || 0), 0);

    // Update the product in database
    await db.query(
      'UPDATE products SET sizes = $1, stock_quantity = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [JSON.stringify(updatedSizes), totalStock, productId]
    );

    res.json({
      message: 'Size+Colour combination updated successfully',
      sizes: updatedSizes,
      total_stock: totalStock
    });

  } catch (error) {
    console.error('Size+Colour update error:', error);
    res.status(500).json({ message: 'Server error updating size+colour combination' });
  }
});

// Get product sizes for seller
router.get('/products/:id/sizes', [
  authenticateToken,
  requireSeller
], async (req, res) => {
  try {
    const productId = req.params.id;
    const seller_id = req.user.id;

    const result = await db.query(
      'SELECT sizes FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    res.json({ sizes: result.rows[0].sizes || [] });

  } catch (error) {
    console.error('Product sizes fetch error:', error);
    res.status(500).json({ message: 'Server error fetching product sizes' });
  }
});

// Get product offers for a specific product
router.get('/products/:id/offers', [
  authenticateToken,
  requireSeller,
], async (req, res) => {
  try {
    const product_id = req.params.id;
    const seller_id = req.user.id;

    // Check if product belongs to seller
    const productCheck = await db.query(
      'SELECT id FROM products WHERE id = $1 AND seller_id = $2',
      [product_id, seller_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const result = await db.query(`
      SELECT o.offer_code, o.name, o.description
      FROM product_offers po
      JOIN offers o ON po.offer_code = o.offer_code
      WHERE po.product_id = $1 AND o.is_active = true
      ORDER BY o.name
    `, [product_id]);

    res.json({ success: true, offers: result.rows });
  } catch (error) {
    console.error('Error fetching product offers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching product offers' });
  }
});

// Update product offers
router.put('/products/:id/offers', [
  authenticateToken,
  requireSeller,
  body('offers').isArray().withMessage('Offers must be an array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🚨 Validation errors for product offers update:', {
        errors: errors.array(),
        receivedBody: req.body,
        receivedOffers: req.body.offers,
        offersType: typeof req.body.offers
      });
      return res.status(400).json({ errors: errors.array() });
    }

    const product_id = req.params.id;
    const seller_id = req.user.id;
    const { offers } = req.body;

    console.log('🔄 Updating product offers:', {
      productId: product_id,
      sellerId: seller_id,
      offers,
      offersCount: offers?.length || 0
    });

    // Check if product belongs to seller
    const productCheck = await db.query(
      'SELECT id, is_active FROM products WHERE id = $1 AND seller_id = $2',
      [product_id, seller_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const productIsActive = productCheck.rows[0].is_active;
    console.log('ℹ️ Product status before offer assignment:', {
      productId: product_id,
      isActive: productIsActive
    });

    // Start transaction
    await db.query('BEGIN');

    try {
      // Remove existing offers for this product
      const deleteResult = await db.query('DELETE FROM product_offers WHERE product_id = $1', [product_id]);
      console.log('🗑️ Deleted existing offers:', { 
        productId: product_id, 
        deletedCount: deleteResult.rowCount 
      });

      // Add new offers
      if (offers && offers.length > 0) {
        // FIRST: Validate that all offer codes exist and are active
        const offerValidation = await db.query(
          'SELECT offer_code, is_active FROM offers WHERE offer_code = ANY($1)',
          [offers]
        );
        
        const validOfferCodes = offerValidation.rows.filter(o => o.is_active).map(o => o.offer_code);
        console.log('🔍 Offer validation:', { 
          requestedOffers: offers,
          foundOffers: offerValidation.rows.map(o => ({ code: o.offer_code, active: o.is_active })),
          validOffers: validOfferCodes
        });
        
        if (validOfferCodes.length === 0) {
          console.warn('⚠️ WARNING: No valid/active offers found for:', offers);
        }
        
        // Now insert with validated codes only
        if (validOfferCodes.length > 0) {
          const values = validOfferCodes.map((offer, index) => `($1, $${index + 2})`).join(', ');
          const params = [product_id, ...validOfferCodes];
          
          console.log('📝 Inserting validated offers:', { 
            productId: product_id, 
            offerCodes: validOfferCodes,
            query: `INSERT INTO product_offers (product_id, offer_code) VALUES ${values}`,
            params
          });
          
          const insertResult = await db.query(
            `INSERT INTO product_offers (product_id, offer_code) VALUES ${values}`,
            params
          );
          
          console.log('✔️ Offers inserted:', { 
            productId: product_id, 
            insertedCount: insertResult.rowCount,
            offersInserted: validOfferCodes
          });
        }
      }

      // CRITICAL: Ensure product is active when offers are assigned
      // This ensures products are visible to customers when they click banners
      // Only activate if offers are actually being assigned (>0 offers)
      if (offers && offers.length > 0) {
        console.log('🔧 Ensuring product is active for offer visibility:', { 
          productId: product_id, 
          offerCount: offers.length,
          wasActive: productIsActive
        });
        const updateResult = await db.query(
          'UPDATE products SET is_active = true, updated_at = NOW() WHERE id = $1',
          [product_id]
        );
        console.log('✅ Product activated:', { 
          productId: product_id, 
          updatedCount: updateResult.rowCount 
        });
      } else {
        console.log('ℹ️ No offers to assign - product state unchanged', { productId: product_id });
      }

      await db.query('COMMIT');

      // Fetch updated offers
      const result = await db.query(`
        SELECT o.offer_code, o.name, o.description
        FROM product_offers po
        JOIN offers o ON po.offer_code = o.offer_code
        WHERE po.product_id = $1 AND o.is_active = true
        ORDER BY o.name
      `, [product_id]);

      console.log('✅ Product offers updated successfully:', {
        productId: product_id,
        offersAssigned: result.rows.length,
        offerCodes: result.rows.map(o => o.offer_code),
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Product offers updated successfully',
        offers: result.rows
      });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Error in transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating product offers:', error);
    res.status(500).json({ success: false, message: 'Server error updating product offers' });
  }
});

// Update COD eligibility for a specific size
router.put('/products/:productId/sizes/:size/cod-eligibility', [
  authenticateToken,
  requireSeller,
  body('cod_eligible').isBoolean(),
], async (req, res) => {
  try {
    const { productId, size } = req.params;
    const { cod_eligible } = req.body;
    const seller_id = req.user.id;

    console.log(`🔄 [COD-ELIGIBILITY-UPDATE] Product ${productId}, Size: ${size}, New COD Eligible: ${cod_eligible}, Seller: ${seller_id}`);

    // Verify product belongs to seller
    const product = await db.query(
      'SELECT id, sizes, name FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (product.rows.length === 0) {
      console.log(`❌ [COD-ELIGIBILITY-UPDATE] Product not found or access denied`);
      return res.status(404).json({ success: false, message: 'Product not found or access denied' });
    }

    const sizes = product.rows[0].sizes || [];
    console.log(`📋 [COD-ELIGIBILITY-UPDATE] Current sizes before update:`, JSON.stringify(sizes));

    const updatedSizes = sizes.map(sizeData => {
      if (sizeData.size === size) {
        console.log(`  ✏️ Updating size ${size}: cod_eligible ${sizeData.cod_eligible} → ${cod_eligible}`);
        return { ...sizeData, cod_eligible };
      }
      return sizeData;
    });

    // Check if any size was actually updated
    const wasUpdated = sizes.some((s, idx) => s.size === size && s.cod_eligible !== updatedSizes[idx].cod_eligible);
    console.log(`  Update found: ${wasUpdated}, sizes modified: ${JSON.stringify(updatedSizes).substring(0, 100)}...`);

    // Update the product with new sizes array
    const updateResult = await db.query(
      'UPDATE products SET sizes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING sizes',
      [JSON.stringify(updatedSizes), productId, seller_id]
    );

    if (updateResult.rows.length === 0) {
      console.log(`❌ [COD-ELIGIBILITY-UPDATE] Update failed - no rows returned`);
      return res.status(500).json({ success: false, message: 'Failed to update product' });
    }

    const returnedSizes = updateResult.rows[0].sizes;
    console.log(`✅ [COD-ELIGIBILITY-UPDATE] Update successful. Returned sizes:`, JSON.stringify(returnedSizes).substring(0, 150));
    
    // Verify the update actually took effect
    const verifyProduct = await db.query(
      'SELECT sizes FROM products WHERE id = $1',
      [productId]
    );
    const verifiedSize = verifyProduct.rows[0].sizes.find(s => s.size === size);
    console.log(`🔍 [COD-ELIGIBILITY-UPDATE] Verification - Size ${size} cod_eligible in DB: ${verifiedSize?.cod_eligible}`);

    res.json({ 
      success: true, 
      message: `COD eligibility for size ${size} updated successfully`,
      cod_eligible,
      verified_in_db: verifiedSize?.cod_eligible === cod_eligible
    });

  } catch (error) {
    console.error('❌ [COD-ELIGIBILITY-UPDATE] Error updating size COD eligibility:', error);
    res.status(500).json({ success: false, message: 'Server error updating COD eligibility' });
  }
});

// Update COD eligibility for a specific size+colour combination (NEW)
router.put('/products/:productId/sizes/:size/:colour/cod-eligibility', [
  authenticateToken,
  requireSeller,
  body('cod_eligible').isBoolean(),
], async (req, res) => {
  try {
    const { productId, size, colour } = req.params;
    const { cod_eligible } = req.body;
    const seller_id = req.user.id;
    const decodedSize = decodeURIComponent(size);
    const decodedColour = decodeURIComponent(colour);

    console.log(`🔄 [COD-ELIGIBILITY-UPDATE] Product ${productId}, Size+Colour: ${decodedSize}/${decodedColour}, New COD Eligible: ${cod_eligible}, Seller: ${seller_id}`);

    // Verify product belongs to seller
    const product = await db.query(
      'SELECT id, sizes, name FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (product.rows.length === 0) {
      console.log(`❌ [COD-ELIGIBILITY-UPDATE] Product not found or access denied`);
      return res.status(404).json({ success: false, message: 'Product not found or access denied' });
    }

    const sizes = product.rows[0].sizes || [];
    console.log(`📋 [COD-ELIGIBILITY-UPDATE] Current sizes before update:`, JSON.stringify(sizes));

    const updatedSizes = sizes.map(sizeData => {
      if (sizeData.size === decodedSize && (sizeData.colour || 'Default') === decodedColour) {
        console.log(`  ✏️ Updating ${decodedSize}/${decodedColour}: cod_eligible ${sizeData.cod_eligible} → ${cod_eligible}`);
        return { ...sizeData, cod_eligible };
      }
      return sizeData;
    });

    // Check if any size was actually updated
    const wasUpdated = sizes.some((s, idx) => s.size === decodedSize && (s.colour || 'Default') === decodedColour && s.cod_eligible !== updatedSizes[idx].cod_eligible);
    console.log(`  Update found: ${wasUpdated}, sizes modified: ${JSON.stringify(updatedSizes).substring(0, 100)}...`);

    // Update the product with new sizes array
    const updateResult = await db.query(
      'UPDATE products SET sizes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING sizes',
      [JSON.stringify(updatedSizes), productId, seller_id]
    );

    if (updateResult.rows.length === 0) {
      console.log(`❌ [COD-ELIGIBILITY-UPDATE] Update failed - no rows returned`);
      return res.status(500).json({ success: false, message: 'Failed to update product' });
    }

    const returnedSizes = updateResult.rows[0].sizes;
    console.log(`✅ [COD-ELIGIBILITY-UPDATE] Update successful. Returned sizes:`, JSON.stringify(returnedSizes).substring(0, 150));
    
    // Verify the update actually took effect
    const verifyProduct = await db.query(
      'SELECT sizes FROM products WHERE id = $1',
      [productId]
    );
    const verifiedSize = verifyProduct.rows[0].sizes.find(s => s.size === decodedSize && (s.colour || 'Default') === decodedColour);
    console.log(`🔍 [COD-ELIGIBILITY-UPDATE] Verification - Size+Colour ${decodedSize}/${decodedColour} cod_eligible in DB: ${verifiedSize?.cod_eligible}`);

    res.json({ 
      success: true, 
      message: `COD eligibility for ${decodedSize} (${decodedColour}) updated successfully`,
      cod_eligible,
      verified_in_db: verifiedSize?.cod_eligible === cod_eligible
    });

  } catch (error) {
    console.error('❌ [COD-ELIGIBILITY-UPDATE] Error updating size+colour COD eligibility:', error);
    res.status(500).json({ success: false, message: 'Server error updating COD eligibility' });
  }
});

// Get COD eligibility for all sizes of a product
router.get('/products/:productId/cod-eligibility', [
  authenticateToken,
  requireSeller,
], async (req, res) => {
  try {
    const { productId } = req.params;
    const seller_id = req.user.id;

    const product = await db.query(
      'SELECT sizes FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or access denied' });
    }

    const sizes = product.rows[0].sizes || [];
    const codEligibility = sizes.reduce((acc, sizeData) => {
      acc[sizeData.size] = sizeData.cod_eligible || false;
      return acc;
    }, {});

    res.json({ success: true, cod_eligibility: codEligibility });

  } catch (error) {
    console.error('Error fetching COD eligibility:', error);
    res.status(500).json({ success: false, message: 'Server error fetching COD eligibility' });
  }
});

// Update colour for a specific size-colour combination
router.patch('/products/:productId/sizes/:size/:colour/colour', [
  authenticateToken,
  requireSeller,
  body('colour').isString().trim().notEmpty(),
], async (req, res) => {
  try {
    const { productId, size, colour } = req.params;
    const { colour: newColour } = req.body;
    const seller_id = req.user.id;
    const decodedSize = decodeURIComponent(size);
    const decodedColour = decodeURIComponent(colour);

    console.log(`🔄 [COLOUR-UPDATE] Product ${productId}, Size+Colour: ${decodedSize}/${decodedColour}, New Colour: ${newColour}, Seller: ${seller_id}`);

    // Verify product belongs to seller
    const product = await db.query(
      'SELECT id, sizes, name FROM products WHERE id = $1 AND seller_id = $2',
      [productId, seller_id]
    );

    if (product.rows.length === 0) {
      console.log(`❌ [COLOUR-UPDATE] Product not found or access denied`);
      return res.status(404).json({ success: false, message: 'Product not found or access denied' });
    }

    const sizes = product.rows[0].sizes || [];
    console.log(`📋 [COLOUR-UPDATE] Current sizes before update:`, JSON.stringify(sizes));

    const updatedSizes = sizes.map(sizeData => {
      if (sizeData.size === decodedSize && (sizeData.colour || 'Default') === decodedColour) {
        console.log(`  ✏️ Updating ${decodedSize}/${decodedColour}: colour ${decodedColour} → ${newColour}`);
        return { ...sizeData, colour: newColour };
      }
      return sizeData;
    });

    // Check if any size was actually updated
    const wasUpdated = sizes.some((s, idx) => s.size === decodedSize && (s.colour || 'Default') === decodedColour && s.colour !== updatedSizes[idx].colour);
    console.log(`  Update found: ${wasUpdated}, sizes modified: ${JSON.stringify(updatedSizes).substring(0, 100)}...`);

    // Update the product with new sizes array
    const updateResult = await db.query(
      'UPDATE products SET sizes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING sizes',
      [JSON.stringify(updatedSizes), productId, seller_id]
    );

    if (updateResult.rows.length === 0) {
      console.log(`❌ [COLOUR-UPDATE] Update failed - no rows returned`);
      return res.status(500).json({ success: false, message: 'Failed to update product' });
    }

    const returnedSizes = updateResult.rows[0].sizes;
    console.log(`✅ [COLOUR-UPDATE] Update successful. Returned sizes:`, JSON.stringify(returnedSizes).substring(0, 150));
    
    // Verify the update actually took effect
    const verifyProduct = await db.query(
      'SELECT sizes FROM products WHERE id = $1',
      [productId]
    );
    const verifiedSize = verifyProduct.rows[0].sizes.find(s => s.size === decodedSize && (s.colour || 'Default') === newColour);
    console.log(`🔍 [COLOUR-UPDATE] Verification - Size+Colour ${decodedSize}/${newColour} in DB:`, verifiedSize);

    res.json({ 
      success: true, 
      message: `Colour for ${decodedSize} updated to ${newColour} successfully`,
      colour: newColour,
      verified_in_db: verifiedSize?.colour === newColour
    });

  } catch (error) {
    console.error('❌ [COLOUR-UPDATE] Error updating size+colour:', error);
    res.status(500).json({ success: false, message: 'Server error updating colour' });
  }
});

module.exports = router;

