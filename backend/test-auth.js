const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function testAuth() {
  try {
    console.log('🔍 Testing seller authentication...');
    
    // Check seller
    const result = await db.query('SELECT * FROM users WHERE email = $1', ['seller@example.com']);
    
    if (result.rows.length === 0) {
      console.log('❌ No seller found');
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('👤 Seller:', {
      id: user.id,
      email: user.email,
      user_type: user.user_type
    });
    
    // Test password
    const isValid = await bcrypt.compare('password123', user.password_hash);
    console.log('🔐 Password valid:', isValid);
    
    if (!isValid) {
      console.log('⚠️ Fixing password...');
      const newHash = await bcrypt.hash('password123', 12);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      console.log('✅ Password fixed');
    } else {
      console.log('✅ Authentication should work');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAuth();