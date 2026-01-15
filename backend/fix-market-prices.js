const db = require('./config/database');

async function fixMarketPrices() {
  try {
    console.log('🔧 Fixing market prices for existing products...');
    
    // Find products with market_price = 0 or NULL
    const query = `
      SELECT id, name, price, market_price, actual_buy_price, sizes
      FROM products 
      WHERE market_price IS NULL OR market_price = 0
    `;
    
    const result = await db.query(query);
    console.log(`Found ${result.rows.length} products to fix`);
    
    for (const product of result.rows) {
      let updatedMarketPrice = 0;
      let updatedSizes = product.sizes;
      
      // Fix product-level market price
      if (product.actual_buy_price && product.actual_buy_price > 0) {
        updatedMarketPrice = Math.max(product.price, product.actual_buy_price * 1.5);
      } else {
        updatedMarketPrice = product.price * 1.25;
      }
      
      // Fix sizes market prices if they exist
      if (product.sizes && Array.isArray(product.sizes)) {
        updatedSizes = product.sizes.map(size => {
          if (!size.market_price || size.market_price === 0 || size.market_price <= size.price) {
            if (size.actual_buy_price && size.actual_buy_price > 0) {
              size.market_price = Math.max(size.price, size.actual_buy_price * 1.5);
            } else {
              size.market_price = size.price * 1.25;
            }
          }
          return size;
        });
      }
      
      // Update the product
      const updateQuery = `
        UPDATE products 
        SET market_price = $1, sizes = $2 
        WHERE id = $3
      `;
      
      await db.query(updateQuery, [
        updatedMarketPrice, 
        JSON.stringify(updatedSizes), 
        product.id
      ]);
      
      console.log(`✅ Fixed product: ${product.name} - Market Price: ${updatedMarketPrice.toFixed(2)}`);
    }
    
    console.log('🎉 Market price fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing market prices:', error);
  } finally {
    process.exit(0);
  }
}

fixMarketPrices();