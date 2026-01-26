const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

const router = express.Router();

// Register user
router.post('/register', [
  body('email').isEmail().trim(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2 }),
  body('user_type').isIn(['customer', 'seller']),
  body('phone').optional({ checkFalsy: true }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, user_type, phone } = req.body;

    // SELLER RESTRICTION: Only allow maryam.zaidi2904@gmail.com to register as seller
    const ALLOWED_SELLER_EMAIL = 'maryam.zaidi2904@gmail.com';
    if (user_type === 'seller' && email.toLowerCase() !== ALLOWED_SELLER_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: "You can't register as a seller" });
    }

    // Check if email already exists
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: 'This email is already registered. Please login or use a different email.' });
    }

    // Check if phone already exists (if provided)
    if (phone && phone.trim()) {
      const existingPhone = await db.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone.trim()]
      );

      if (existingPhone.rows.length > 0) {
        return res.status(400).json({ message: 'This mobile number is already registered. Please login or use a different number.' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const newUser = await db.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, phone) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, user_type, created_at`,
      [email, hashedPassword, full_name, user_type, phone]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        full_name: newUser.rows[0].full_name,
        user_type: newUser.rows[0].user_type,
        created_at: newUser.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().trim(),
  body('password').exists(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('📧 LOGIN - Email received:', JSON.stringify(email));
    console.log('📧 LOGIN - Email type:', typeof email);
    console.log('📧 LOGIN - Email length:', email.length);
    console.log('📧 LOGIN - Password length:', password.length);

    // Find user by email
    const user = await db.query(
      'SELECT id, email, password_hash, full_name, user_type, created_at FROM users WHERE email = $1',
      [email]
    );
    console.log('🔍 User lookup result:', { found: user.rows.length > 0, email });

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userData = user.rows[0];

    // SELLER RESTRICTION: Only allow maryam.zaidi2904@gmail.com to login as seller
    // TEMPORARY: Commenting out seller restriction for debugging
    // const ALLOWED_SELLER_EMAIL = 'maryam.zaidi2904@gmail.com';
    // if (userData.user_type === 'seller' && userData.email.toLowerCase() !== ALLOWED_SELLER_EMAIL.toLowerCase()) {
    //   return res.status(403).json({ message: "You can't login as a seller" });
    // }

    // Check password
    console.log('🔐 Password check:', { 
      storedHashPrefix: userData.password_hash.substring(0, 20),
      passwordToCheckLen: password.length
    });
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    console.log('✅ Password match result:', isValidPassword);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userData.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        user_type: userData.user_type,
        created_at: userData.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userDetails = await db.query(
      'SELECT id, email, full_name, user_type, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userDetails.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: userDetails.rows[0] });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('full_name').optional().trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('phone').optional().trim().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { full_name, email, phone, password } = req.body;
    const userId = req.user.id;

    // Check if email is being changed and if it already exists for another user
    if (email) {
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Email address is already in use by another account' 
        });
      }
    }

    let updateQuery = `UPDATE users SET 
       full_name = COALESCE($1, full_name),
       email = COALESCE($2, email),
       phone = COALESCE($3, phone),`;
    let queryParams = [full_name, email, phone];
    let paramIndex = 4;

    // Hash password if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += `
       password_hash = $${paramIndex},`;
      queryParams.push(hashedPassword);
      paramIndex++;
    }

    updateQuery += `
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} 
       RETURNING id, email, full_name, user_type, phone, created_at`;
    queryParams.push(userId);

    const updatedUser = await db.query(updateQuery, queryParams);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.rows[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating profile' 
    });
  }
});

// Logout user (optional - for session cleanup)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // For JWT, we can't invalidate the token server-side without a blacklist
    // But we can log the logout event or perform cleanup
    console.log(`User ${req.user.id} logged out at ${new Date().toISOString()}`);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Get user's addresses
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await db.query(
      `SELECT id, type, full_name, address_line1, address_line2, city, state, 
       postal_code, country, phone, is_default, created_at 
       FROM user_addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      addresses: addresses.rows
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching addresses' 
    });
  }
});

// Create new address
router.post('/addresses', [
  authenticateToken,
  body('type').isIn(['shipping', 'billing']),
  body('full_name').trim().isLength({ min: 2 }),
  body('address_line1').trim().isLength({ min: 5 }),
  body('city').trim().isLength({ min: 2 }),
  body('state').trim().isLength({ min: 2 }),
  body('postal_code').trim().isLength({ min: 3 }),
  body('country').trim().isLength({ min: 2 }),
  body('is_default').optional().isBoolean(),
], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const userId = req.user.id;
    const {
      type, full_name, address_line1, address_line2,
      city, state, postal_code, country, phone, is_default
    } = req.body;

    await client.query('BEGIN');

    // If setting as default, remove default from other addresses of same type
    if (is_default) {
      await client.query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2',
        [userId, type]
      );
    }

    // Insert new address
    const newAddress = await client.query(
      `INSERT INTO user_addresses 
       (user_id, type, full_name, address_line1, address_line2, city, state, 
        postal_code, country, phone, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, type, full_name, address_line1, address_line2, city, state, 
       postal_code, country, phone, is_default, created_at`,
      [userId, type, full_name, address_line1, address_line2, city, state, 
       postal_code, country, phone, is_default || false]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address: newAddress.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create address error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error creating address' 
    });
  } finally {
    client.release();
  }
});

// Update address
router.put('/addresses/:id', [
  authenticateToken,
  body('type').optional().isIn(['shipping', 'billing']),
  body('full_name').optional().trim().isLength({ min: 2 }),
  body('address_line1').optional().trim().isLength({ min: 5 }),
  body('city').optional().trim().isLength({ min: 2 }),
  body('state').optional().trim().isLength({ min: 2 }),
  body('postal_code').optional().trim().isLength({ min: 3 }),
  body('country').optional().trim().isLength({ min: 2 }),
  body('is_default').optional().isBoolean(),
], async (req, res) => {
  const client = await db.getClient();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const userId = req.user.id;
    const addressId = req.params.id;
    const {
      type, full_name, address_line1, address_line2,
      city, state, postal_code, country, phone, is_default
    } = req.body;

    await client.query('BEGIN');

    // Check if address belongs to user
    const existingAddress = await client.query(
      'SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (existingAddress.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false,
        message: 'Address not found' 
      });
    }

    // If setting as default, remove default from other addresses of same type
    if (is_default) {
      const addressType = type || existingAddress.rows[0].type;
      await client.query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2',
        [userId, addressType]
      );
    }

    // Update address
    const updatedAddress = await client.query(
      `UPDATE user_addresses SET 
       type = COALESCE($1, type),
       full_name = COALESCE($2, full_name),
       address_line1 = COALESCE($3, address_line1),
       address_line2 = COALESCE($4, address_line2),
       city = COALESCE($5, city),
       state = COALESCE($6, state),
       postal_code = COALESCE($7, postal_code),
       country = COALESCE($8, country),
       phone = COALESCE($9, phone),
       is_default = COALESCE($10, is_default),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING id, type, full_name, address_line1, address_line2, city, state, 
       postal_code, country, phone, is_default, created_at, updated_at`,
      [type, full_name, address_line1, address_line2, city, state, 
       postal_code, country, phone, is_default, addressId, userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Address updated successfully',
      address: updatedAddress.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update address error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating address' 
    });
  } finally {
    client.release();
  }
});

// Delete address
router.delete('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const result = await db.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [addressId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Address not found' 
      });
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error deleting address' 
    });
  }
});

// Change password
router.patch('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Fix: use req.user.id instead of req.user.userId
    
    // Get current user data
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error changing password' 
    });
  }
});

// Forgot password - send verification code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal that email doesn't exist for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a verification code'
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store verification code in database
    await db.query(
      `INSERT INTO password_reset_codes (email, code, expires_at, reset_type) 
       VALUES ($1, $2, $3, 'email')
       ON CONFLICT (email, reset_type) 
       DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP`,
      [email, verificationCode, expiresAt]
    );

    // Send email with verification code
    try {
      const emailResult = await emailService.sendPasswordResetCode(email, verificationCode);
      
      if (emailResult.previewUrl) {
        console.log(`📧 Preview the email at: ${emailResult.previewUrl}`);
      }
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      // Still return success to the user for security, but log the error
      console.error('Failed to send password reset email to:', email);
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, you will receive a verification code'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Server error sending verification code'
    });
  }
});

// Forgot password via mobile phone - send OTP
router.post('/forgot-password-mobile', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate UAE phone number format
    if (!smsService.isValidUAEPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid UAE phone number (e.g., +971XXXXXXXXX or 05XXXXXXXX)'
      });
    }

    const formattedPhone = smsService.formatUAEPhoneNumber(phone);

    // Check if user exists with this phone number
    const userResult = await db.query(
      'SELECT id, email FROM users WHERE phone = $1 OR phone = $2',
      [phone, formattedPhone]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal that phone doesn't exist for security
      return res.json({
        success: true,
        message: 'If an account with this phone number exists, you will receive an OTP'
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store OTP in database
    await db.query(
      `INSERT INTO password_reset_codes (phone, code, expires_at, reset_type) 
       VALUES ($1, $2, $3, 'phone')
       ON CONFLICT (phone, reset_type) 
       DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP`,
      [formattedPhone, otpCode, expiresAt]
    );

    // Send SMS with OTP
    const smsResult = await smsService.sendOTP(formattedPhone, otpCode);
    
    if (smsResult.fallback) {
      console.log(`📱 SMS fallback used: ${smsResult.reason}`);
    }

    res.json({
      success: true,
      message: 'OTP sent to your mobile phone',
      ...(smsResult.fallback && process.env.NODE_ENV === 'development' && { debug: { code: otpCode } })
    });

  } catch (error) {
    console.error('Forgot password mobile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending OTP'
    });
  }
});

// Verify reset code (supports both email and mobile)
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, phone, code, resetType } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    if (!resetType || !['email', 'phone'].includes(resetType)) {
      return res.status(400).json({
        success: false,
        message: 'Reset type must be either "email" or "phone"'
      });
    }

    let codeResult;
    
    if (resetType === 'email') {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required for email verification'
        });
      }

      // Check if email code exists and is not expired
      codeResult = await db.query(
        'SELECT * FROM password_reset_codes WHERE email = $1 AND code = $2 AND reset_type = $3 AND expires_at > NOW()',
        [email, code, 'email']
      );
    } else {
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required for mobile verification'
        });
      }

      const formattedPhone = smsService.formatUAEPhoneNumber(phone);
      
      // Check if mobile OTP exists and is not expired
      codeResult = await db.query(
        'SELECT * FROM password_reset_codes WHERE phone = $1 AND code = $2 AND reset_type = $3 AND expires_at > NOW()',
        [formattedPhone, code, 'phone']
      );
    }

    if (codeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.json({
      success: true,
      message: 'Verification code is valid',
      resetType: resetType
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying code'
    });
  }
});

// Reset password (supports both email and mobile verification)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, code, newPassword, resetType } = req.body;

    if (!code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Verification code and new password are required'
      });
    }

    if (!resetType || !['email', 'phone'].includes(resetType)) {
      return res.status(400).json({
        success: false,
        message: 'Reset type must be either "email" or "phone"'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    let codeResult, userResult;

    if (resetType === 'email') {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required for email-based password reset'
        });
      }

      // Verify the email code one more time
      codeResult = await db.query(
        'SELECT * FROM password_reset_codes WHERE email = $1 AND code = $2 AND reset_type = $3 AND expires_at > CURRENT_TIMESTAMP',
        [email, code, 'email']
      );

      if (codeResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }

      // Check if user exists
      userResult = await db.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );

    } else {
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required for mobile-based password reset'
        });
      }

      const formattedPhone = smsService.formatUAEPhoneNumber(phone);

      // Verify the mobile OTP one more time
      codeResult = await db.query(
        'SELECT * FROM password_reset_codes WHERE phone = $1 AND code = $2 AND reset_type = $3 AND expires_at > CURRENT_TIMESTAMP',
        [formattedPhone, code, 'phone']
      );

      if (codeResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }

      // Check if user exists with this phone number
      userResult = await db.query(
        'SELECT id, email, phone FROM users WHERE phone = $1 OR phone = $2',
        [formattedPhone, phone]
      );
    }

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    if (resetType === 'email') {
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );

      // Delete the used email verification code
      await db.query(
        'DELETE FROM password_reset_codes WHERE email = $1 AND reset_type = $2',
        [email, 'email']
      );
    } else {
      const formattedPhone = smsService.formatUAEPhoneNumber(phone);
      
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE phone = $2 OR phone = $3',
        [hashedPassword, formattedPhone, phone]
      );

      // Delete the used mobile verification code
      await db.query(
        'DELETE FROM password_reset_codes WHERE phone = $1 AND reset_type = $2',
        [formattedPhone, 'phone']
      );
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error changing password' 
    });
  }
});

// Generate and send OTP for customer signup
router.post('/send-signup-otp', [
  body('email').isEmail().trim(),
  body('phone').optional({ checkFalsy: true }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone } = req.body;

    // Check if email already exists
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: 'This email is already registered. Please login or use a different email.' });
    }

    // Check if phone already exists (if provided)
    if (phone && phone.trim()) {
      const existingPhone = await db.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone.trim()]
      );

      if (existingPhone.rows.length > 0) {
        return res.status(400).json({ message: 'This mobile number is already registered. Please login or use a different number.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete any previous unused OTPs for this email
    await db.query(
      'DELETE FROM signup_otp_attempts WHERE email = $1 AND is_used = false',
      [email]
    );

    // Store the OTP
    await db.query(
      `INSERT INTO signup_otp_attempts (email, otp_code, expires_at, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [email, otp, expiresAt, req.ip || 'unknown']
    );

    // Send OTP via email
    console.log(`📧 Sending OTP to ${email}: ${otp}`);
    await emailService.sendOTPEmail(email, otp, 'signup');

    res.json({
      success: true,
      message: 'OTP sent to your email',
      expires_in: 300 // 5 minutes in seconds
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
});

// Verify OTP for customer signup
router.post('/verify-signup-otp', [
  body('email').isEmail().trim(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Check if OTP exists and is valid
    const otpRecord = await db.query(
      `SELECT id, is_used, expires_at FROM signup_otp_attempts
       WHERE email = $1 AND otp_code = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, otp]
    );

    if (otpRecord.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const record = otpRecord.rows[0];

    // Check if OTP is already used
    if (record.is_used) {
      return res.status(400).json({ message: 'OTP has already been used' });
    }

    // Check if OTP has expired
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Mark OTP as used
    await db.query(
      'UPDATE signup_otp_attempts SET is_used = true, used_at = NOW() WHERE id = $1',
      [record.id]
    );

    // Generate a temporary token that allows registration (valid for 10 minutes)
    const tempToken = jwt.sign(
      { email, verified_otp: true, type: 'signup_otp' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      temp_token: tempToken
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
});

// Register user with OTP verification token
router.post('/register-with-otp', [
  body('email').isEmail().trim(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2 }),
  body('user_type').isIn(['customer', 'seller']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, user_type, phone, temp_token } = req.body;

    // Verify the temporary OTP token
    if (!temp_token) {
      return res.status(400).json({ message: 'OTP verification required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification' });
    }

    if (!decoded.verified_otp || decoded.type !== 'signup_otp' || decoded.email !== email) {
      return res.status(400).json({ message: 'OTP verification mismatch' });
    }

    // SELLER RESTRICTION: Only allow maryam.zaidi2904@gmail.com to register as seller
    const ALLOWED_SELLER_EMAIL = 'maryam.zaidi2904@gmail.com';
    if (user_type === 'seller' && email.toLowerCase() !== ALLOWED_SELLER_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: "You can't register as a seller" });
    }

    // Check if email already exists
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: 'This email is already registered. Please login or use a different email.' });
    }

    // Check if phone already exists (if provided)
    if (phone && phone.trim()) {
      const existingPhone = await db.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone.trim()]
      );

      if (existingPhone.rows.length > 0) {
        return res.status(400).json({ message: 'This mobile number is already registered. Please login or use a different number.' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const newUser = await db.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, phone) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, user_type, created_at`,
      [email, hashedPassword, full_name, user_type, phone]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        full_name: newUser.rows[0].full_name,
        user_type: newUser.rows[0].user_type,
        created_at: newUser.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Registration with OTP error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

module.exports = router;