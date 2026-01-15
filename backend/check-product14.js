const db = require('./config/database');

async function checkProduct14Data() {
  try {
    console.log('🔍 Checking product 14 sizes data...');
    
    const result = await db.query(`
      SELECT id, name, sizes 
      FROM products 
      WHERE id = 14;
    `);
    
    if (result.rows.length > 0) {
      console.log(`\nProduct ${result.rows[0].id}: ${result.rows[0].name}`);
      console.log('Sizes:', JSON.stringify(result.rows[0].sizes, null, 2));
    } else {
      console.log('Product 14 not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking product data:', error);
  }
}

checkProduct14Data();