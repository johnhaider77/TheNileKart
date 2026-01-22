const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetSellerPassword() {
  try {
    const email = 'maryam.zaidi2904@gmail.com';
    const password = 'Maryam@123456';
    
    console.log('🔄 Resetting password for seller...');
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update the password
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, full_name',
      [passwordHash, email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ Password reset successfully!');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${password}`);
    console.log(`User: ${result.rows[0].full_name}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetSellerPassword();
