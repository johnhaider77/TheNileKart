const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * POST /promo-codes/validate
 * Validate and calculate discount for a promo code
 * Body: { code, cartItems, cartTotal }
 */
router.post('/validate', [
  authenticateToken,
  body('code').trim().toUpperCase(),
  body('cartItems').isArray({ min: 1 }),
  body('cartTotal').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user_id = req.user.id;
    const { code, cartItems, cartTotal } = req.body;

    console.log('🔍 Validating promo code:', { code, cartTotal, itemsCount: cartItems.length });

    // Get promo code details
    const promoResult = await db.query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 AND is_active = true 
       AND start_date_time <= NOW() 
       AND expiry_date_time > NOW()`,
      [code]
    );

    if (promoResult.rows.length === 0) {
      console.log('❌ Promo code not found or expired:', code);
      return res.status(404).json({ message: 'Promo code not found or expired' });
    }

    const promoCode = promoResult.rows[0];
    const userEmail = req.user.email;

    // Check user eligibility
    if (promoCode.eligible_users && Array.isArray(promoCode.eligible_users)) {
      if (!promoCode.eligible_users.includes(userEmail)) {
        console.log('❌ User not eligible for this promo code:', userEmail);
        return res.status(403).json({ message: 'This promo code is not available for your account' });
      }
    }

    // Check minimum purchase value
    if (cartTotal < promoCode.min_purchase_value) {
      console.log('❌ Cart total below minimum:', { cartTotal, minRequired: promoCode.min_purchase_value });
      return res.status(400).json({ 
        message: `Minimum purchase value of ${promoCode.min_purchase_value} AED required`,
        minRequired: promoCode.min_purchase_value
      });
    }

    // Check category eligibility
    if (promoCode.eligible_categories && Array.isArray(promoCode.eligible_categories)) {
      const cartCategories = cartItems.map(item => item.category).filter(Boolean);
      const hasEligibleCategory = cartCategories.some(cat => 
        promoCode.eligible_categories.includes(cat)
      );
      
      if (!hasEligibleCategory) {
        console.log('❌ Cart contains no eligible categories');
        return res.status(400).json({ message: 'This promo code cannot be applied to items in your cart' });
      }
    }

    // Check usage limit
    if (promoCode.max_uses_per_user) {
      const usageResult = await db.query(
        `SELECT COUNT(*) as usage_count FROM promo_code_usage 
         WHERE promo_code_id = $1 AND user_id = $2`,
        [promoCode.id, user_id]
      );

      const usageCount = parseInt(usageResult.rows[0].usage_count);
      if (usageCount >= promoCode.max_uses_per_user) {
        console.log('❌ User exceeded max uses:', { usageCount, maxAllowed: promoCode.max_uses_per_user });
        return res.status(400).json({ 
          message: `You have already used this promo code ${promoCode.max_uses_per_user} times`,
          maxUsesExceeded: true
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    let discountType = '';

    if (promoCode.percent_off > 0) {
      discountAmount = (cartTotal * promoCode.percent_off) / 100;
      discountType = 'percent';

      // Apply max off limit
      if (promoCode.max_off && discountAmount > promoCode.max_off) {
        discountAmount = promoCode.max_off;
      }
    } else if (promoCode.flat_off > 0) {
      discountAmount = promoCode.flat_off;
      discountType = 'flat';
    }

    const finalTotal = Math.max(0, cartTotal - discountAmount);

    console.log('✅ Promo code validated:', {
      code,
      discountType,
      discountAmount,
      originalTotal: cartTotal,
      finalTotal
    });

    res.json({
      success: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        description: promoCode.description,
        discountType,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        originalTotal: cartTotal,
        finalTotal: parseFloat(finalTotal.toFixed(2))
      }
    });
  } catch (error) {
    console.error('❌ Error validating promo code:', error);
    res.status(500).json({ message: 'Failed to validate promo code', error: error.message });
  }
});

/**
 * GET /promo-codes/available
 * Get available promo codes for the customer based on cart
 */
router.get('/available', [authenticateToken], async (req, res) => {
  try {
    const user_id = req.user.id;
    const userEmail = req.user.email;

    // Get all active promo codes
    const result = await db.query(
      `SELECT id, code, description, percent_off, flat_off, max_off, min_purchase_value, max_uses_per_user
       FROM promo_codes 
       WHERE is_active = true 
       AND start_date_time <= NOW() 
       AND expiry_date_time > NOW()
       ORDER BY created_at DESC`,
      []
    );

    // Filter based on user eligibility
    const availableCodes = result.rows.filter(promo => {
      // Check user eligibility
      if (promo.eligible_users && Array.isArray(promo.eligible_users)) {
        return promo.eligible_users.includes(userEmail);
      }
      return true; // Available for all users if no restriction
    });

    console.log('✅ Available promo codes retrieved:', availableCodes.length);
    res.json({
      success: true,
      promoCodes: availableCodes
    });
  } catch (error) {
    console.error('❌ Error fetching available promo codes:', error);
    res.status(500).json({ message: 'Failed to fetch promo codes', error: error.message });
  }
});

module.exports = router;
