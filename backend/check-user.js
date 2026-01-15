const db = require('./config/database');

async function checkUser() {
  try {
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', ['seller@example.com']);
    if (result.rows.length > 0) {
      console.log('User found:', {
        id: result.rows[0].id,
        email: result.rows[0].email,
        hasPassword: !!result.rows[0].password_hash,
        passwordLength: result.rows[0].password_hash?.length || 0
      });
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUser();