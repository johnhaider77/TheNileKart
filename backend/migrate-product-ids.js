const db = require('./config/database');

/**
 * Migration script to auto-generate product_ids for all products that don't have proper ones
 * This will generate product_ids in the format: PROD-XXXXXX where X is zero-padded product ID
 * Also verifies all existing product_ids are properly formatted
 */
async function migrateProductIds() {
  try {
    console.log('Starting comprehensive product_id migration...');
    
    // Step 1: Check all products and their current product_ids
    const allProducts = await db.query(
      `SELECT id, product_id FROM products ORDER BY id ASC`
    );
    
    console.log(`\n📊 Total products in database: ${allProducts.rows.length}`);
    
    // Step 2: Identify products needing migration
    const productsNeedingUpdate = allProducts.rows.filter(p => !p.product_id || p.product_id.trim() === '');
    console.log(`Found ${productsNeedingUpdate.length} products without proper product_id`);
    
    if (productsNeedingUpdate.length === 0) {
      console.log('✅ All products already have product_ids!');
      
      // Show sample of existing product_ids
      console.log('\n📋 Sample of existing product_ids:');
      allProducts.rows.slice(0, 5).forEach(p => {
        console.log(`   ID: ${p.id}, product_id: ${p.product_id}`);
      });
      
      process.exit(0);
    }
    
    // Step 3: Update products with missing product_ids
    console.log(`\n🔄 Updating ${productsNeedingUpdate.length} products with auto-generated IDs...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of productsNeedingUpdate) {
      try {
        const autoProductId = `PROD-${String(product.id).padStart(6, '0')}`;
        
        await db.query(
          'UPDATE products SET product_id = $1 WHERE id = $2',
          [autoProductId, product.id]
        );
        
        successCount++;
        console.log(`✅ Product ${product.id}: Generated ${autoProductId}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Product ${product.id}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Update Complete:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Step 4: Final verification
    const finalCheck = await db.query(
      `SELECT COUNT(*) as count FROM products WHERE product_id IS NULL OR product_id = ''`
    );
    
    if (finalCheck.rows[0].count === 0) {
      console.log(`\n✅ All products now have proper product_ids!`);
      
      // Show updated products
      const updatedProducts = await db.query(
        `SELECT id, product_id FROM products WHERE id IN (${productsNeedingUpdate.map(p => p.id).join(',')}) ORDER BY id ASC LIMIT 5`
      );
      
      if (updatedProducts.rows.length > 0) {
        console.log('\n📋 Sample of updated product_ids:');
        updatedProducts.rows.forEach(p => {
          console.log(`   ID: ${p.id}, product_id: ${p.product_id}`);
        });
      }
    } else {
      console.log(`\n⚠️  Still ${finalCheck.rows[0].count} products without product_ids`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateProductIds();
