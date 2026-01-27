// Script to fix existing products with incorrect COD defaults
// This sets all existing products with cod_eligible = true to false
// Run this once on production database

const db = require('./config/database');

async function fixCODDefaults() {
  try {
    console.log('🔧 Starting COD eligibility fix...');
    
    // Update all products with cod_eligible = true to false
    // These were created with the old incorrect default
    const productResult = await db.query(
      `UPDATE products 
       SET cod_eligible = false 
       WHERE cod_eligible = true
       RETURNING id, name, cod_eligible`
    );
    
    console.log(`✅ Updated ${productResult.rows.length} products to cod_eligible = false`);
    
    // Also fix sizes - set all sizes with cod_eligible = true to false
    const sizesResult = await db.query(
      `UPDATE products
       SET sizes = jsonb_set(
         sizes,
         '{0,cod_eligible}',
         'false'
       )
       WHERE sizes @> '[{"cod_eligible": true}]'
       RETURNING id, name`
    );
    
    console.log(`✅ Updated sizes in products with old COD defaults`);
    
    // Get updated products to verify
    const verifyResult = await db.query(
      `SELECT id, name, cod_eligible, sizes 
       FROM products 
       LIMIT 3`
    );
    
    console.log('📋 Sample of updated products:');
    verifyResult.rows.forEach(product => {
      console.log(`  - ${product.name}: cod_eligible=${product.cod_eligible}`);
      if (product.sizes && product.sizes[0]) {
        console.log(`    Size: ${product.sizes[0].size}, cod_eligible=${product.sizes[0].cod_eligible}`);
      }
    });
    
    console.log('✅ COD eligibility fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing COD defaults:', error);
    process.exit(1);
  }
}

fixCODDefaults();
