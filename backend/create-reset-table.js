const { Pool } = require('pg');

const pool = new Pool({
  user: 'john.haider',
  host: 'localhost',
  database: 'thenilekart',
  password: '',
  port: 5432,
});

async function createPasswordResetTable() {
  try {
    console.log('Connecting to database...');
    
    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email 
      ON password_reset_codes(email);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at 
      ON password_reset_codes(expires_at);
    `);
    
    console.log('Password reset codes table created successfully!');
    
    // Test table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'password_reset_codes';
    `);
    
    console.log('Table verification:', result.rows);
    
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await pool.end();
  }
}

createPasswordResetTable();