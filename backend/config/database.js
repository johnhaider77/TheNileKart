const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment-specific config - ensure NODE_ENV is set
const env = process.env.NODE_ENV || 'development';
console.log('🔧 Loading database config for environment:', env);

if (env === 'production') {
  dotenv.config({ path: path.join(__dirname, '..', '.env.production') });
} else {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Verify credentials are loaded
console.log('🔍 DB Config - Host:', process.env.DB_HOST);
console.log('🔍 DB Config - Database:', process.env.DB_NAME);
console.log('🔍 DB Config - User:', process.env.DB_USER);
console.log('🔍 DB Config - Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET');
console.log('🔍 DB Config - Port:', process.env.DB_PORT);
// Check if using RDS (has .rds.amazonaws.com in hostname)
// ALWAYS enable SSL for RDS connections, regardless of NODE_ENV
const isRDS = (process.env.DB_HOST || '').includes('rds.amazonaws.com') || (process.env.DB_HOST || '').includes('rds');
const useSSL = isRDS || env === 'production';
console.log('🔍 RDS Detected:', isRDS ? 'YES' : 'NO');
console.log('🔍 SSL Enabled:', useSSL ? 'YES' : 'NO');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'thenilekart',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: env === 'production' ? 30 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // SSL configuration for RDS - always enable if using RDS
  ssl: useSSL ? {
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