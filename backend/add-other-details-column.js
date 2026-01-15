const db = require('./config/database');

async function addOtherDetailsColumn() {
  try {
    console.log('🔧 Adding other_details column to products table...');
    
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS other_details TEXT;
    `);
    
    console.log('✅ Successfully added other_details column');
    
    await db.query(`
      COMMENT ON COLUMN products.other_details IS 'Additional product information, specifications, and features';
    `);
    
    console.log('✅ Added column comment');
    
    // Verify the column was added
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'other_details';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verification successful:', result.rows[0]);
    } else {
      console.log('❌ Column verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error adding column:', error);
  }
}

addOtherDetailsColumn();