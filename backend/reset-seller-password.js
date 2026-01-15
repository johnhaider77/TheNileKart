const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetSellerPassword() {
  try {
    const email = 'seller@example.com';
    const password = 'seller123';
    
    console.log('🔄 Resetting password for seller...');
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update the password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [passwordHash, email]
    );
    
    console.log('✅ Password reset successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

resetSellerPassword();