const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { s3BannersUpload } = require('../config/s3Upload');

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
    const result = await db.query(
      'SELECT b.*, o.name as offer_name FROM banners b JOIN offers o ON b.offer_page_url = o.offer_code WHERE b.is_active = true AND o.is_active = true ORDER BY b.display_order ASC, b.created_at DESC'
    );
    res.json({ success: true, banners: result.rows });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
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
    const { title, subtitle, offer_page_url, display_order } = req.body;
    
    if (!title || !offer_page_url) {
      return res.status(400).json({ success: false, message: 'Title and offer page URL are required' });
    }

    const background_image = req.file ? req.file.location : null; // S3 URL from multer-s3

    const result = await db.query(
      'INSERT INTO banners (title, subtitle, background_image, offer_page_url, display_order, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, subtitle, background_image, offer_page_url, display_order || 0, req.user.id]
    );

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
    const { title, subtitle, offer_page_url, display_order, is_active } = req.body;

    let background_image = req.body.existing_background_image;
    if (req.file) {
      background_image = req.file.location; // S3 URL from multer-s3
      
      // Note: S3 file deletion would need to be implemented separately using deleteFromS3 function
      // if you want to clean up old files when replacing them
    }

    const result = await db.query(
      'UPDATE banners SET title = $1, subtitle = $2, background_image = $3, offer_page_url = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND created_by = $8 RETURNING *',
      [title, subtitle, background_image, offer_page_url, display_order || 0, is_active, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found or not authorized' });
    }

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

    // Delete associated image file
    if (result.rows[0].background_image) {
      const imagePath = path.join(__dirname, '..', result.rows[0].background_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
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
    
    const result = await db.query(`
      SELECT p.*, u.full_name as seller_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      JOIN product_offers po ON p.id = po.product_id
      WHERE po.offer_code = $1 AND p.is_active = true
      ORDER BY p.created_at DESC
    `, [offerCode]);

    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Error fetching products by offer:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

module.exports = router;