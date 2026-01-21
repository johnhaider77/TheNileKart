const db = require('./config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('🔍 Checking password for maryam.zaidi2904@gmail.com...');
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', ['maryam.zaidi2904@gmail.com']);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User found, setting new password...');
      const newPassword = 'Maryam@123456';
      const newHash = await bcrypt.hash(newPassword, 12);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      console.log('✅ Password updated successfully!');
      console.log('Email:', user.email);
      console.log('New Password:', newPassword);
    } else {
      console.log('❌ User not found!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
})();
