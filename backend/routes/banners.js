const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { s3BannersUpload, deleteS3File, renameS3File } = require('../config/s3Upload');

const router = express.Router();

// Get all offers (for dropdown in forms)
router.get('/offers', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT offer_code, name, description, is_active FROM offers WHERE is_active = true ORDER BY name'
    );
    res.json({ success: true, offers: result.rows });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
});

// Get all offers for seller (including inactive ones)
router.get('/offers/seller', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM offers WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, offers: result.rows });
  } catch (error) {
    console.error('Error fetching seller offers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
});

// Create a new offer
router.post('/offers', authenticateToken, async (req, res) => {
  try {
    const { offer_code, name, description } = req.body;
    
    if (!offer_code || !name) {
      return res.status(400).json({ success: false, message: 'Offer code and name are required' });
    }

    const result = await db.query(
      'INSERT INTO offers (offer_code, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [offer_code, name, description, req.user.id]
    );

    res.status(201).json({ success: true, offer: result.rows[0] });
  } catch (error) {
    console.error('Error creating offer:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, message: 'Offer code already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create offer' });
    }
  }
});

// Update an offer
router.put('/offers/:offerCode', authenticateToken, async (req, res) => {
  try {
    const { offerCode } = req.params;
    const { name, description, is_active } = req.body;

    const result = await db.query(
      'UPDATE offers SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE offer_code = $4 AND created_by = $5 RETURNING *',
      [name, description, is_active, offerCode, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Offer not found or not authorized' });
    }

    res.json({ success: true, offer: result.rows[0] });
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ success: false, message: 'Failed to update offer' });
  }
});

// Delete an offer
router.delete('/offers/:offerCode', authenticateToken, async (req, res) => {
  try {
    const { offerCode } = req.params;

    const result = await db.query(
      'DELETE FROM offers WHERE offer_code = $1 AND created_by = $2 RETURNING *',
      [offerCode, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Offer not found or not authorized' });
    }

    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ success: false, message: 'Failed to delete offer' });
  }
});

// Get all banners (public endpoint for displaying on product listing)
router.get('/banners', async (req, res) => {
  try {
    console.log('📍 /api/banners endpoint called');
    const result = await db.query(
      'SELECT b.*, o.name as offer_name FROM banners b JOIN offers o ON b.offer_page_url = o.offer_code WHERE b.is_active = true AND o.is_active = true ORDER BY b.display_order ASC, b.created_at DESC'
    );
    console.log('✅ Banners fetched successfully:', result.rows.length);
    res.json({ success: true, banners: result.rows });
  } catch (error) {
    console.error('❌ Error fetching banners:', error.message);
    console.error('📊 Error details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners', error: error.message });
  }
});

// Get seller's banners
router.get('/banners/seller', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT b.*, o.name as offer_name FROM banners b JOIN offers o ON b.offer_page_url = o.offer_code WHERE b.created_by = $1 ORDER BY b.display_order ASC, b.created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, banners: result.rows });
  } catch (error) {
    console.error('Error fetching seller banners:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

// Create a new banner
router.post('/banners', authenticateToken, s3BannersUpload.single('background_image'), async (req, res) => {
  try {
    const { title, subtitle, offer_page_url, display_order, imageName } = req.body;
    
    if (!title || !offer_page_url) {
      return res.status(400).json({ success: false, message: 'Title and offer page URL are required' });
    }

    let background_image_data = null;
    if (req.file) {
      let finalFileLocation = req.file.location;
      
      // If imageName provided, rename the S3 file to use custom name instead of timestamp-based name
      if (imageName && imageName.trim()) {
        try {
          const currentS3Key = req.file.location.split('.amazonaws.com/')[1]; // e.g., "banners/1769138947068-original.jpg"
          const fileExtension = imageName.includes('.') ? '' : req.file.originalname.split('.').pop();
          const customFileName = fileExtension ? `${imageName}.${fileExtension}` : imageName;
          const newS3Key = `banners/${customFileName}`;
          
          console.log('🔄 [CREATE] Renaming S3 file for custom imageName:', {
            oldKey: currentS3Key,
            newKey: newS3Key,
            customImageName: imageName
          });
          
          // Rename in S3 (copy + delete)
          await renameS3File(currentS3Key, newS3Key);
          
          // Update final location to new S3 URL
          finalFileLocation = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'me-central-1'}.amazonaws.com/${newS3Key}`;
          
          console.log('✅ [CREATE] S3 file renamed successfully:', {
            newUrl: finalFileLocation.substring(0, 80)
          });
        } catch (renameError) {
          console.error('⚠️ [CREATE] Could not rename S3 file, proceeding with auto-generated name:', renameError.message);
          // Continue with original file location if rename fails
        }
      }
      
      background_image_data = JSON.stringify({
        url: finalFileLocation,
        name: imageName || req.file.originalname
      });
      
      console.log('📸 [CREATE] New S3 file uploaded:', {
        location: finalFileLocation.substring(0, 80),
        usedImageName: imageName ? 'YES (custom)' : 'NO (using originalname)',
        finalName: imageName || req.file.originalname
      });
    }

    const result = await db.query(
      'INSERT INTO banners (title, subtitle, background_image, offer_page_url, display_order, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, subtitle, background_image_data, offer_page_url, display_order || 0, req.user.id]
    );

    console.log('✅ [CREATE] Banner created successfully:', {
      bannerId: result.rows[0]?.id,
      backgroundImageStored: result.rows[0]?.background_image?.substring(0, 100)
    });

    res.status(201).json({ success: true, banner: result.rows[0] });
  } catch (error) {
    console.error('Error creating banner:', error);
    if (error.code === '23503') {
      res.status(400).json({ success: false, message: 'Invalid offer page URL' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create banner' });
    }
  }
});

// Update a banner
router.put('/banners/:id', authenticateToken, s3BannersUpload.single('background_image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, offer_page_url, display_order, is_active, imageName } = req.body;

    console.log('🔵 Banner PUT request received:', {
      id,
      title,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileLocation: req.file?.location?.substring(0, 80),
      imageName,
      imageNameLength: imageName?.length,
      imageNameTrimmed: imageName?.trim()
    });
    const currentBanner = await db.query(
      'SELECT background_image FROM banners WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (currentBanner.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found or not authorized' });
    }

    let background_image_data = currentBanner.rows[0].background_image;
    
    if (req.file) {
      // Delete old image from S3 if it exists and is an S3 URL
      if (background_image_data && typeof background_image_data === 'string') {
        try {
          const oldData = JSON.parse(background_image_data);
          if (oldData.url && oldData.url.includes('s3')) {
            const s3Key = oldData.url.split('.amazonaws.com/')[1];
            if (s3Key) {
              deleteS3File(s3Key).catch(err => console.warn('Warning: Could not delete old S3 file:', err));
            }
          }
        } catch (e) {
          // If not JSON, try to parse as URL directly
          if (background_image_data && background_image_data.includes('s3')) {
            const s3Key = background_image_data.split('.amazonaws.com/')[1];
            if (s3Key) {
              deleteS3File(s3Key).catch(err => console.warn('Warning: Could not delete old S3 file:', err));
            }
          }
        }
      }

      let finalFileLocation = req.file.location;
      
      // If imageName provided, rename the S3 file to use custom name instead of timestamp-based name
      if (imageName && imageName.trim()) {
        try {
          const currentS3Key = req.file.location.split('.amazonaws.com/')[1]; // e.g., "banners/1769138947068-original.jpg"
          const fileExtension = imageName.includes('.') ? '' : req.file.originalname.split('.').pop();
          const customFileName = fileExtension ? `${imageName}.${fileExtension}` : imageName;
          const newS3Key = `banners/${customFileName}`;
          
          console.log('🔄 Renaming S3 file for custom imageName:', {
            oldKey: currentS3Key,
            newKey: newS3Key,
            customImageName: imageName
          });
          
          // Rename in S3 (copy + delete)
          await renameS3File(currentS3Key, newS3Key);
          
          // Update final location to new S3 URL
          finalFileLocation = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'me-central-1'}.amazonaws.com/${newS3Key}`;
          
          console.log('✅ S3 file renamed successfully:', {
            newUrl: finalFileLocation.substring(0, 80)
          });
        } catch (renameError) {
          console.error('⚠️ Could not rename S3 file, proceeding with auto-generated name:', renameError.message);
          // Continue with original file location if rename fails
        }
      }

      // Update with new image (as JSON object)
      background_image_data = JSON.stringify({
        url: finalFileLocation,
        name: imageName || req.file.originalname
      });
      
      console.log('📸 New S3 file uploaded:', {
        location: finalFileLocation.substring(0, 80),
        usedImageName: imageName ? 'YES (custom)' : 'NO (using originalname)',
        finalName: imageName || req.file.originalname,
        stored: background_image_data
      });
    }
    // If no new file, keep existing background_image_data as-is (already in DB format)

    const result = await db.query(
      'UPDATE banners SET title = $1, subtitle = $2, background_image = $3, offer_page_url = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND created_by = $8 RETURNING *',
      [title, subtitle, background_image_data, offer_page_url, display_order || 0, is_active, id, req.user.id]
    );

    console.log('✅ Banner updated successfully:', {
      bannerId: result.rows[0]?.id,
      backgroundImageStored: result.rows[0]?.background_image?.substring(0, 100)
    });

    res.json({ success: true, banner: result.rows[0] });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
});

// Delete a banner
router.delete('/banners/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM banners WHERE id = $1 AND created_by = $2 RETURNING background_image',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found or not authorized' });
    }

    // Delete associated image from S3 if it exists
    const background_image = result.rows[0].background_image;
    if (background_image) {
      try {
        let imageUrl = background_image;
        
        // If stored as JSON with metadata
        if (typeof background_image === 'string' && background_image.startsWith('{')) {
          try {
            const imageData = JSON.parse(background_image);
            imageUrl = imageData.url;
          } catch (e) {
            imageUrl = background_image;
          }
        }
        
        // Delete from S3 if it's an S3 URL
        if (imageUrl && imageUrl.includes('s3')) {
          const s3Key = imageUrl.split('.amazonaws.com/')[1];
          if (s3Key) {
            deleteS3File(s3Key).catch(err => console.warn('Warning: Could not delete S3 file:', err));
          }
        }
      } catch (err) {
        console.warn('Warning: Error deleting banner image from S3:', err);
      }
    }

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

// Get products by offer
router.get('/offers/:offerCode/products', async (req, res) => {
  try {
    const { offerCode } = req.params;
    
    console.log('🔍 Fetching products for offer:', {
      offerCode,
      timestamp: new Date().toISOString()
    });

    // First, get all products linked to this offer (regardless of active status)
    const allLinkedResult = await db.query(`
      SELECT COUNT(*) as total_linked
      FROM product_offers po
      WHERE po.offer_code = $1
    `, [offerCode]);

    // Then get only active products
    const result = await db.query(`
      SELECT p.*, u.full_name as seller_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      JOIN product_offers po ON p.id = po.product_id
      WHERE po.offer_code = $1 AND p.is_active = true
      ORDER BY p.created_at DESC
    `, [offerCode]);

    console.log('📦 Products found for offer:', {
      offerCode,
      totalLinked: allLinkedResult.rows[0]?.total_linked || 0,
      activeCount: result.rows.length,
      activeProductIds: result.rows.map(p => p.id),
      inactiveCount: (allLinkedResult.rows[0]?.total_linked || 0) - result.rows.length
    });
      productIds: result.rows.map(p => p.id)
    });

    if (result.rows.length === 0) {
      console.log('⚠️ No active products found for this offer. Checking product_offers table:');
      
      // Debug query to see what's in product_offers
      const debugResult = await db.query(`
        SELECT po.product_id, po.offer_code, p.name, p.is_active, o.is_active as offer_is_active
        FROM product_offers po
        LEFT JOIN products p ON po.product_id = p.id
        LEFT JOIN offers o ON po.offer_code = o.offer_code
        WHERE po.offer_code = $1
      `, [offerCode]);
      
      console.log('🐛 Debug - product_offers entries:', debugResult.rows);
    }

    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Error fetching products by offer:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

module.exports = router;