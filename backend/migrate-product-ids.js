const db = require('./config/database');

/**
 * Migration script to auto-generate product_ids for all products that don't have them
 * This will generate product_ids in the format: PROD-XXXXXX where X is zero-padded product ID
 */
async function migrateProductIds() {
  try {
    console.log('Starting product_id migration...');
    
    // Get all products without product_id
    const productsWithoutId = await db.query(
      `SELECT id FROM products WHERE product_id IS NULL OR product_id = '' ORDER BY id ASC`
    );
    
    console.log(`Found ${productsWithoutId.rows.length} products without product_id`);
    
    if (productsWithoutId.rows.length === 0) {
      console.log('✅ All products already have product_ids!');
      process.exit(0);
    }
    
    // Update each product with auto-generated product_id
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of productsWithoutId.rows) {
      try {
        const autoProductId = `PROD-${String(product.id).padStart(6, '0')}`;
        
        await db.query(
          'UPDATE products SET product_id = $1 WHERE id = $2',
          [autoProductId, product.id]
        );
        
        successCount++;
        console.log(`✅ Product ${product.id}: ${autoProductId}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Product ${product.id}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Migration Complete:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Verify all products now have product_ids
    const stillMissing = await db.query(
      `SELECT COUNT(*) as count FROM products WHERE product_id IS NULL OR product_id = ''`
    );
    
    if (stillMissing.rows[0].count === 0) {
      console.log(`\n✅ All products now have product_ids!`);
    } else {
      console.log(`\n⚠️  Still ${stillMissing.rows[0].count} products without product_ids`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateProductIds();
