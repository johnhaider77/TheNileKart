const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function testLogin() {
  try {
    console.log('Testing login for maryam.zaidi2904@gmail.com...');
    
    // Check if user exists
    const result = await db.query(
      'SELECT id, email, password_hash, full_name, user_type FROM users WHERE email = $1',
      ['maryam.zaidi2904@gmail.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✅ User found:', { 
      id: user.id, 
      email: user.email, 
      name: user.full_name, 
      type: user.user_type 
    });
    
    // Test password comparison
    const testPassword = 'Maryam@123456';
    console.log('Testing password:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log('Password match:', isValid);
    
    if (!isValid) {
      console.log('❌ Password does not match');
      // Reset password
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, 'maryam.zaidi2904@gmail.com']
      );
      console.log('✅ Password has been reset to: Maryam@123456');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
