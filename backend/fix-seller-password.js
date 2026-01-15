const db = require('./config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('🔍 Checking password for seller@example.com...');
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', ['seller@example.com']);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User found, verifying password...');
      const isValid = await bcrypt.compare('password123', user.password_hash);
      console.log(`🔐 Password 'password123' is ${isValid ? 'VALID' : 'INVALID'}`);
      
      if (!isValid) {
        console.log('🔧 Updating password hash...');
        const newHash = await bcrypt.hash('password123', 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
        console.log('✅ Password updated successfully! You can now login.');
      } else {
        console.log('✅ Password is already correct. Check for other auth issues.');
      }
    } else {
      console.log('❌ User not found!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
})();