#!/usr/bin/env node

/**
 * Migration Runner Script
 * Runs SQL migration files against the RDS database
 * Usage: node run-migration.js [migration-file-name]
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

// Database configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST || process.env.RDS_ENDPOINT || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.RDS_PORT || '5432'),
  database: process.env.DB_NAME || process.env.RDS_DATABASE || 'thenilekart',
  user: process.env.DB_USER || process.env.RDS_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  }
});

// Get migration file name from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Please provide a migration file name');
  console.error('Usage: node run-migration.js <migration-file-name>');
  console.error('Example: node run-migration.js add_signup_otp.sql');
  process.exit(1);
}

// Resolve the migration file path
const migrationPath = path.join(__dirname, '..', '..', 'database', migrationFile);

// Check if file exists
if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Error: Migration file not found: ${migrationPath}`);
  process.exit(1);
}

// Read the migration file
let sql;
try {
  sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📄 Loaded migration: ${migrationFile}`);
} catch (error) {
  console.error(`❌ Error reading file: ${error.message}`);
  process.exit(1);
}

// Run the migration
async function runMigration() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Start transaction
    await client.query('BEGIN');
    console.log('🔄 Started transaction');
    
    // Execute the migration SQL
    await client.query(sql);
    console.log('✅ Migration executed successfully');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Migration committed');
    
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    
    // Try to rollback
    try {
      if (client) {
        await client.query('ROLLBACK');
        console.log('🔄 Transaction rolled back');
      }
    } catch (rollbackError) {
      console.error(`⚠️  Rollback error: ${rollbackError.message}`);
    }
    
    process.exit(1);
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the migration
runMigration();
