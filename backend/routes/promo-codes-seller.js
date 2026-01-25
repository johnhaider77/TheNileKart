const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireSeller } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * POST /seller/promo-codes
 * Create a new promo code
 */
router.post('/', [
  authenticateToken,
  requireSeller,
  body('code').trim().toUpperCase().matches(/^[A-Z0-9]+$/).withMessage('Code must be alphanumeric'),
  body('description').trim().isLength({ min: 5 }),
  body('start_date_time').isISO8601().toDate(),
  body('expiry_date_time').isISO8601().toDate(),
  body('percent_off').isFloat({ min: 0, max: 100 }).optional(),
  body('flat_off').isFloat({ min: 0 }).optional(),
  body('max_off').isFloat({ min: 0 }).optional(),
  body('min_purchase_value').isFloat({ min: 0 }).optional(),
  body('max_uses_per_user').isInt({ min: 1 }).optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const seller_id = req.user.id;
    const {
      code,
      description,
      start_date_time,
      expiry_date_time,
      eligible_users, // Array of emails
      eligible_categories, // Array of categories
      percent_off = 0,
      flat_off = 0,
      max_off,
      min_purchase_value = 0,
      max_uses_per_user
    } = req.body;

    // Validate dates
    const startDate = new Date(start_date_time);
    const expiryDate = new Date(expiry_date_time);
    
    if (expiryDate <= startDate) {
      return res.status(400).json({ message: 'Expiry date must be after start date' });
    }

    // Validate at least one discount type is provided
    if (percent_off === 0 && flat_off === 0) {
      return res.status(400).json({ message: 'Either percent_off or flat_off must be greater than 0' });
    }

    const result = await db.query(
      `INSERT INTO promo_codes (
        seller_id, code, description, start_date_time, expiry_date_time,
        eligible_users, eligible_categories, percent_off, flat_off, max_off,
        min_purchase_value, max_uses_per_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, code, description, start_date_time, expiry_date_time,
                eligible_users, eligible_categories, percent_off, flat_off, max_off,
                min_purchase_value, max_uses_per_user, created_at`,
      [
        seller_id, code, description, startDate, expiryDate,
        eligible_users ? JSON.stringify(eligible_users) : null,
        eligible_categories ? JSON.stringify(eligible_categories) : null,
        percent_off, flat_off, max_off, min_purchase_value, max_uses_per_user
      ]
    );

    console.log('✅ Promo code created:', result.rows[0]);
    res.status(201).json({
      success: true,
      promoCode: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating promo code:', error);
    res.status(500).json({ message: 'Failed to create promo code', error: error.message });
  }
});

/**
 * GET /seller/promo-codes
 * Get all promo codes for the seller
 */
router.get('/', [authenticateToken, requireSeller], async (req, res) => {
  try {
    const seller_id = req.user.id;
    const { active_only = false } = req.query;

    let query = 'SELECT * FROM promo_codes WHERE seller_id = $1';
    const params = [seller_id];

    if (active_only === 'true') {
      query += ` AND expiry_date_time > NOW()`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      promoCodes: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching promo codes:', error);
    res.status(500).json({ message: 'Failed to fetch promo codes', error: error.message });
  }
});

/**
 * PATCH /seller/promo-codes/:id
 * Update a promo code
 */
router.patch('/:id', [
  authenticateToken,
  requireSeller,
  body('description').trim().isLength({ min: 5 }).optional(),
  body('start_date_time').isISO8601().toDate().optional(),
  body('expiry_date_time').isISO8601().toDate().optional(),
  body('percent_off').isFloat({ min: 0, max: 100 }).optional(),
  body('flat_off').isFloat({ min: 0 }).optional(),
  body('max_off').isFloat({ min: 0 }).optional(),
  body('min_purchase_value').isFloat({ min: 0 }).optional(),
  body('max_uses_per_user').isInt({ min: 1 }).optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const promo_code_id = req.params.id;
    const seller_id = req.user.id;
    const updates = req.body;

    // Verify ownership
    const check = await db.query(
      'SELECT id FROM promo_codes WHERE id = $1 AND seller_id = $2',
      [promo_code_id, seller_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    // Validate dates if provided
    if (updates.start_date_time && updates.expiry_date_time) {
      const startDate = new Date(updates.start_date_time);
      const expiryDate = new Date(updates.expiry_date_time);
      if (expiryDate <= startDate) {
        return res.status(400).json({ message: 'Expiry date must be after start date' });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (['description', 'start_date_time', 'expiry_date_time', 'percent_off', 'flat_off', 'max_off', 'min_purchase_value', 'max_uses_per_user'].includes(key)) {
        if (key === 'start_date_time' || key === 'expiry_date_time') {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(new Date(value));
        } else if (key === 'eligible_users' || key === 'eligible_categories') {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
        }
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateValues.push(promo_code_id);

    const result = await db.query(
      `UPDATE promo_codes SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    console.log('✅ Promo code updated:', result.rows[0]);
    res.json({
      success: true,
      promoCode: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating promo code:', error);
    res.status(500).json({ message: 'Failed to update promo code', error: error.message });
  }
});

/**
 * DELETE /seller/promo-codes/:id
 * Delete a promo code
 */
router.delete('/:id', [authenticateToken, requireSeller], async (req, res) => {
  try {
    const promo_code_id = req.params.id;
    const seller_id = req.user.id;

    const result = await db.query(
      'DELETE FROM promo_codes WHERE id = $1 AND seller_id = $2 RETURNING id',
      [promo_code_id, seller_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    console.log('✅ Promo code deleted:', promo_code_id);
    res.json({
      success: true,
      message: 'Promo code deleted'
    });
  } catch (error) {
    console.error('❌ Error deleting promo code:', error);
    res.status(500).json({ message: 'Failed to delete promo code', error: error.message });
  }
});

module.exports = router;
