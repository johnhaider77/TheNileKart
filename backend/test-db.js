const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'thenilekart',
  user: process.env.DB_USER || 'john.haider',
  password: process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully!', result.rows[0]);
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();