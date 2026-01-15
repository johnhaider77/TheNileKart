const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'thenilekart',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: process.env.NODE_ENV === 'production' ? 30 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // SSL configuration for RDS
  ssl: process.env.NODE_ENV === 'production' ? {
    require: true,
    rejectUnauthorized: false
  } : false
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = () => {
  return pool.connect();
};

module.exports = {
  query,
  getClient,
  pool
};