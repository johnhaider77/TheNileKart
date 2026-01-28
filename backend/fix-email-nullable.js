const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function fixEmailColumn() {
  const client = await pool.connect();
  try {
    console.log('🔄 Making email column nullable...');
    
    await client.query(`
      ALTER TABLE password_reset_codes
      ALTER COLUMN email DROP NOT NULL;
    `);
    
    console.log('✅ Email column is now nullable');
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'password_reset_codes' AND column_name = 'email';
    `);
    
    console.log('✅ Verification:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixEmailColumn();
