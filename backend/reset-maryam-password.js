const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function resetMaryamPassword() {
  try {
    const email = 'maryam.zaidi2904@gmail.com';
    const password = 'password123';
    
    console.log('🔄 Resetting password for maryam.zaidi2904@gmail.com...');
    
    // Hash the password using 12 salt rounds (matching auth.js)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Password hash generated');
    
    // Update the password
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, full_name',
      [passwordHash, email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✅ Password reset successfully!');
    console.log(`\nUser Details:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.full_name}`);
    console.log(`  New Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetMaryamPassword();
