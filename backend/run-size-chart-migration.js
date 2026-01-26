const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const db = require('./config/database');

async function runMigration() {
  console.log('🔄 Running size_chart migration...');
  
  try {
    // Add size_chart column if it doesn't exist
    await db.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS size_chart JSONB DEFAULT NULL;
    `);
    console.log('✅ size_chart column added successfully');

    // Create index on size_chart for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_products_size_chart ON products USING GIN(size_chart);
    `);
    console.log('✅ Index created successfully');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
