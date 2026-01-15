const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user details from database
    const userQuery = await db.query(
      'SELECT id, email, user_type, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = userQuery.rows[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is a seller
const requireSeller = (req, res, next) => {
  if (req.user.user_type !== 'seller') {
    return res.status(403).json({ message: 'Seller access required' });
  }
  next();
};

// Middleware to check if user is a customer
const requireCustomer = (req, res, next) => {
  if (req.user.user_type !== 'customer') {
    return res.status(403).json({ message: 'Customer access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireSeller,
  requireCustomer
};