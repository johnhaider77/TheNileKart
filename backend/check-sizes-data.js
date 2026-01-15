const db = require('./config/database');

async function checkSizesData() {
  try {
    console.log('🔍 Checking current sizes data structure...');
    
    const result = await db.query(`
      SELECT id, name, sizes 
      FROM products 
      WHERE sizes IS NOT NULL AND sizes != '[]'::jsonb 
      LIMIT 3;
    `);
    
    console.log('\n📊 Current products with sizes:');
    result.rows.forEach(row => {
      console.log(`\nProduct ${row.id}: ${row.name}`);
      console.log('Sizes:', JSON.stringify(row.sizes, null, 2));
    });
    
  } catch (error) {
    console.error('❌ Error checking sizes data:', error);
  }
}

checkSizesData();