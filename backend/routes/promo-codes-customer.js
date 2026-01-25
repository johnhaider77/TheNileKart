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
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const user_id = req.user.id;
    const { code, cartItems, cartTotal } = req.body;

    console.log('🔍 Validating promo code:', { code, cartTotal, itemsCount: cartItems.length, user_id });

    // Ensure tables exist and have correct schema
    try {
      // Get promo code details - using CAST to ensure proper type handling
      const promoResult = await db.query(
        `SELECT id, code, description, start_date_time, expiry_date_time, 
                eligible_users, eligible_categories, 
                COALESCE(percent_off, 0) as percent_off,
                COALESCE(flat_off, 0) as flat_off,
                max_off,
                COALESCE(min_purchase_value, 0) as min_purchase_value,
                max_uses_per_user,
                is_active
         FROM promo_codes 
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

      // Parse eligible_users if it's a string (comma-separated)
      let eligibleUsers = [];
      if (promoCode.eligible_users) {
        if (Array.isArray(promoCode.eligible_users)) {
          eligibleUsers = promoCode.eligible_users;
        } else if (typeof promoCode.eligible_users === 'string') {
          eligibleUsers = promoCode.eligible_users.split(',').map(e => e.trim()).filter(Boolean);
        }
      }

      // Check user eligibility
      if (eligibleUsers.length > 0) {
        if (!eligibleUsers.includes(userEmail)) {
          console.log('❌ User not eligible for this promo code:', userEmail);
          return res.status(403).json({ message: 'This promo code is not available for your account' });
        }
      }

      // Check minimum purchase value
      const minPurchaseValue = parseFloat(promoCode.min_purchase_value) || 0;
      if (cartTotal < minPurchaseValue) {
        console.log('❌ Cart total below minimum:', { cartTotal, minRequired: minPurchaseValue });
        return res.status(400).json({ 
          message: `Minimum purchase value of ${minPurchaseValue} AED required`,
          minRequired: minPurchaseValue
        });
      }

      // Parse eligible_categories if it's a string (comma-separated)
      let eligibleCategories = [];
      if (promoCode.eligible_categories) {
        if (Array.isArray(promoCode.eligible_categories)) {
          eligibleCategories = promoCode.eligible_categories;
        } else if (typeof promoCode.eligible_categories === 'string') {
          eligibleCategories = promoCode.eligible_categories.split(',').map(e => e.trim()).filter(Boolean);
        }
      }

      // Check category eligibility
      if (eligibleCategories.length > 0) {
        const cartCategories = cartItems.map(item => item.category).filter(Boolean);
        const hasEligibleCategory = cartCategories.some(cat => 
          eligibleCategories.includes(cat)
        );
        
        if (!hasEligibleCategory) {
          console.log('❌ Cart contains no eligible categories');
          return res.status(400).json({ message: 'This promo code cannot be applied to items in your cart' });
        }
      }

      // Check usage limit
      if (promoCode.max_uses_per_user) {
        const usageResult = await db.query(
          `SELECT COUNT(*) as usage_count FROM promo_code_usage pcu
           JOIN orders o ON pcu.order_id = o.id
           WHERE pcu.promo_code_id = $1 AND pcu.user_id = $2 AND o.status = 'confirmed'`,
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

      const percentOff = parseFloat(promoCode.percent_off) || 0;
      const flatOff = parseFloat(promoCode.flat_off) || 0;

      if (percentOff > 0) {
        discountAmount = (cartTotal * percentOff) / 100;
        discountType = 'percent';

        // Apply max off limit
        if (promoCode.max_off) {
          const maxOff = parseFloat(promoCode.max_off);
          if (discountAmount > maxOff) {
            discountAmount = maxOff;
          }
        }
      } else if (flatOff > 0) {
        discountAmount = flatOff;
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
    } catch (dbError) {
      console.error('❌ Database error in promo validation:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('❌ Error validating promo code:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to validate promo code', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
      let eligibleUsers = [];
      if (promo.eligible_users) {
        if (Array.isArray(promo.eligible_users)) {
          eligibleUsers = promo.eligible_users;
        } else if (typeof promo.eligible_users === 'string') {
          eligibleUsers = promo.eligible_users.split(',').map(e => e.trim()).filter(Boolean);
        }
      }
      
      if (eligibleUsers.length > 0) {
        return eligibleUsers.includes(userEmail);
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
