#!/bin/bash
# Test database connection from EC2

cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend

# Create a simple Node script to test DB connection
cat > test-db-connection.js << 'DBTEST'
const dotenv = require('dotenv');
const path = require('path');

// Load production env
dotenv.config({ path: path.join(__dirname, '.env.production') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log('Testing database connection...');
console.log('Host:', process.env.DB_HOST);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);

pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database connection successful!');
    
    // Check if banners table exists
    pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'banners'
    `, (err2, res2) => {
      if (err2) {
        console.error('Error checking tables:', err2.message);
      } else if (res2.rows.length === 0) {
        console.error('❌ Banners table does not exist');
      } else {
        console.log('✅ Banners table exists');
        
        // Check if there's data
        pool.query('SELECT COUNT(*) FROM banners', (err3, res3) => {
          if (err3) {
            console.error('Error counting banners:', err3.message);
          } else {
            console.log('✅ Banner count:', res3.rows[0].count);
          }
          pool.end();
          process.exit(0);
        });
      }
    });
  }
});
DBTEST

# Run the test
NODE_ENV=production node test-db-connection.js
