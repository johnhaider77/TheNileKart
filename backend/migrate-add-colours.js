const db = require('./config/database');

/**
 * Migration script to add Colour support to product sizes
 * Updates sizes structure from: [{size, quantity, price, ...}]
 * To: [{size, colour, quantity, price, ...}]
 */
async function migrateProductSizes() {
  try {
    console.log('Starting product sizes migration to add colour support...\n');
    
    // Step 1: Get all products with sizes
    const products = await db.query(
      `SELECT id, name, sizes FROM products WHERE sizes IS NOT NULL AND sizes != '[]' LIMIT 10`
    );
    
    console.log(`Found ${products.rows.length} products with sizes\n`);
    
    if (products.rows.length === 0) {
      console.log('✅ No products with sizes to migrate');
      process.exit(0);
    }
    
    // Step 2: Migrate each product's sizes to include colour
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of products.rows) {
      try {
        let sizes = product.sizes;
        
        // Parse if string
        if (typeof sizes === 'string') {
          sizes = JSON.parse(sizes);
        }
        
        // Check if already migrated (has colour field)
        const isAlreadyMigrated = sizes.length > 0 && sizes[0].colour !== undefined;
        
        if (isAlreadyMigrated) {
          console.log(`⏭️  Product ${product.id} (${product.name}): Already migrated`);
          successCount++;
          continue;
        }
        
        // Migrate: Add colour field to each size
        // Default colour is 'Default' for existing sizes
        const migratedSizes = sizes.map(size => ({
          ...size,
          colour: size.colour || 'Default'  // Add colour field with default value
        }));
        
        // Update product with migrated sizes
        await db.query(
          'UPDATE products SET sizes = $1 WHERE id = $2',
          [JSON.stringify(migratedSizes), product.id]
        );
        
        successCount++;
        console.log(`✅ Product ${product.id} (${product.name}): Migrated ${migratedSizes.length} size entries`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Product ${product.id} (${product.name}): ${error.message}`);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    console.log(`\n✅ Product sizes migration complete!`);
    console.log(`All sizes now include colour field (defaulted to 'Default' for existing products)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateProductSizes();
