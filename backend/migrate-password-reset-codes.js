const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting migration: Add phone support to password_reset_codes...');

    // Add phone column
    await client.query(`
      ALTER TABLE password_reset_codes
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('✅ Added phone column');

    // Add reset_type column
    await client.query(`
      ALTER TABLE password_reset_codes
      ADD COLUMN IF NOT EXISTS reset_type VARCHAR(10) DEFAULT 'email';
    `);
    console.log('✅ Added reset_type column');

    // Drop old unique constraint if it exists
    try {
      await client.query(`
        ALTER TABLE password_reset_codes
        DROP CONSTRAINT IF EXISTS password_reset_codes_email_key;
      `);
      console.log('✅ Dropped old email unique constraint');
    } catch (e) {
      console.log('ℹ️  No old unique constraint to drop');
    }

    // Add composite unique constraint
    try {
      await client.query(`
        ALTER TABLE password_reset_codes
        ADD CONSTRAINT unique_email_reset_type UNIQUE (email, reset_type) WHERE email IS NOT NULL;
      `);
      console.log('✅ Added composite unique constraint (email, reset_type)');
    } catch (e) {
      console.log('ℹ️  Composite unique constraint already exists');
    }

    // Create phone index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_phone 
      ON password_reset_codes(phone, reset_type) 
      WHERE phone IS NOT NULL;
    `);
    console.log('✅ Created phone index');

    // Create reset_type index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_codes_reset_type 
      ON password_reset_codes(reset_type);
    `);
    console.log('✅ Created reset_type index');

    // Verify the table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'password_reset_codes'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Updated table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
