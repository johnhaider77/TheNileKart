const db = require('./config/database');

async function checkProductsTable() {

  try {
    console.log('🔍 Checking products table structure...');
    
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Products table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} | ${row.data_type} | nullable: ${row.is_nullable} | default: ${row.column_default || 'none'}`);
    });
    
    console.log(`\n✅ Total columns: ${result.rows.length}`);
    
    // Check if other_details exists
    const hasOtherDetails = result.rows.some(row => row.column_name === 'other_details');
    console.log(`\n🔍 other_details column exists: ${hasOtherDetails ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  }
}

checkProductsTable();