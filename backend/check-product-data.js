const db = require('./config/database');

async function checkProductData() {
  try {
    // Get recent products to check their data structure
    const query = `
      SELECT 
        id, name, price, market_price, sizes, stock_quantity, created_at
      FROM products 
      WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const result = await db.query(query);
    
    console.log('Recent products:');
    console.log('================');
    
    for (const product of result.rows) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`Price: $${product.price}`);
      console.log(`Market Price: $${product.market_price}`);
      console.log(`Stock Quantity: ${product.stock_quantity}`);
      console.log(`Sizes:`, JSON.stringify(product.sizes, null, 2));
      console.log(`Created: ${product.created_at}`);
      
      // Calculate percentage off
      const percentOff = product.market_price > product.price 
        ? ((product.market_price - product.price) / product.market_price) * 100
        : 0;
      console.log(`Calculated % OFF: ${percentOff.toFixed(2)}%`);
      
      // Check sizes data
      if (product.sizes && Array.isArray(product.sizes)) {
        console.log('Sizes analysis:');
        for (const size of product.sizes) {
          const sizePercentOff = size.market_price > size.price 
            ? ((size.market_price - size.price) / size.market_price) * 100
            : 0;
          console.log(`  - ${size.size}: Price $${size.price}, Market $${size.market_price}, Stock ${size.quantity}, % OFF: ${sizePercentOff.toFixed(2)}%`);
        }
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkProductData();