const { Pool } = require('pg');

const pool = new Pool({
  host: 'thenilekart-postgres.cr808sek6c09.me-central-1.rds.amazonaws.com',
  port: 5432,
  database: 'thenilekart',
  user: 'thenilekart_admn',
  password: 'YAm786123',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    
    const sql = `
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0;
      
      COMMENT ON COLUMN orders.shipping_fee IS 'Shipping fee charged for online (pre-paid) payment orders. Flat 5 AED for orders <= 50 AED, else free';
    `;
    
    const result = await pool.query(sql);
    console.log('✅ Migration completed successfully');
    console.log('Shipping fee column added to orders table');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
