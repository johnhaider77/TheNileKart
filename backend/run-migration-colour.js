const db = require('./config/database');

async function runMigration() {
  try {
    console.log('Starting migration: add selected_colour to order_items...');
    
    // Add the column
    await db.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS selected_colour VARCHAR(100) DEFAULT 'Default'
    `);
    console.log('✅ Added selected_colour column');
    
    // Update existing rows
    await db.query(`
      UPDATE order_items
      SET selected_colour = 'Default'
      WHERE selected_colour IS NULL
    `);
    console.log('✅ Updated existing order items');
    
    // Create index
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_selected_colour ON order_items(selected_colour)
    `);
    console.log('✅ Created index');
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
