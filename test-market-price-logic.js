// Test script to verify the market price logic works correctly
// This simulates the backend processing logic

function testMarketPriceLogic() {
  console.log('Testing Market Price Calculation Logic');
  console.log('=====================================\n');

  // Test case 1: Product with sizes, no market_price provided
  const testSizes1 = [
    { size: 'Small', quantity: 3, price: 45, market_price: 0, actual_buy_price: 30 },
    { size: 'Medium', quantity: 4, price: 50, market_price: 0, actual_buy_price: 0 },
    { size: 'Large', quantity: 3, price: 55, market_price: 0, actual_buy_price: 35 }
  ];

  console.log('Test Case 1: Product with sizes, market_price = 0');
  console.log('Input sizes:', JSON.stringify(testSizes1, null, 2));

  const finalSizes1 = testSizes1.map(size => {
    const sizePrice = parseFloat(size.price) || 0;
    const providedMarketPrice = parseFloat(size.market_price) || 0;
    const sizeBuyPrice = parseFloat(size.actual_buy_price) || 0;
    
    // Calculate a reasonable market price if not provided or is 0
    let calculatedMarketPrice = providedMarketPrice;
    if (calculatedMarketPrice <= 0 || calculatedMarketPrice <= sizePrice) {
      if (sizeBuyPrice > 0) {
        // Use buy price + 50% markup as market price
        calculatedMarketPrice = Math.max(sizePrice, sizeBuyPrice * 1.5);
      } else {
        // Default to 25% markup over selling price for discount display
        calculatedMarketPrice = sizePrice * 1.25;
      }
    }
    
    return {
      size: size.size.trim(),
      quantity: parseInt(size.quantity) || 0,
      price: sizePrice,
      market_price: calculatedMarketPrice,
      actual_buy_price: sizeBuyPrice
    };
  });

  console.log('Output sizes:', JSON.stringify(finalSizes1, null, 2));

  // Calculate product-level market price
  const marketPrices1 = finalSizes1.map(size => size.market_price || 0).filter(mp => mp > 0);
  const productMarketPrice1 = marketPrices1.length > 0 ? Math.max(...marketPrices1) : Math.max(...finalSizes1.map(size => size.price)) * 1.25;
  
  console.log(`Product-level market price: ${productMarketPrice1}`);

  // Test percentage calculations for each size
  console.log('Percentage OFF calculations:');
  finalSizes1.forEach(size => {
    const percentOff = size.market_price > size.price ? ((size.market_price - size.price) / size.market_price) * 100 : 0;
    console.log(`  ${size.size}: ${percentOff.toFixed(1)}% OFF (${size.price} was ${size.market_price})`);
  });

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 2: Product with sizes, some market_price provided
  const testSizes2 = [
    { size: 'Small', quantity: 3, price: 45, market_price: 60, actual_buy_price: 30 },
    { size: 'Medium', quantity: 4, price: 50, market_price: 0, actual_buy_price: 0 },
    { size: 'Large', quantity: 3, price: 55, market_price: 0, actual_buy_price: 35 }
  ];

  console.log('Test Case 2: Product with sizes, mixed market_price values');
  console.log('Input sizes:', JSON.stringify(testSizes2, null, 2));

  const finalSizes2 = testSizes2.map(size => {
    const sizePrice = parseFloat(size.price) || 0;
    const providedMarketPrice = parseFloat(size.market_price) || 0;
    const sizeBuyPrice = parseFloat(size.actual_buy_price) || 0;
    
    let calculatedMarketPrice = providedMarketPrice;
    if (calculatedMarketPrice <= 0 || calculatedMarketPrice <= sizePrice) {
      if (sizeBuyPrice > 0) {
        calculatedMarketPrice = Math.max(sizePrice, sizeBuyPrice * 1.5);
      } else {
        calculatedMarketPrice = sizePrice * 1.25;
      }
    }
    
    return {
      size: size.size.trim(),
      quantity: parseInt(size.quantity) || 0,
      price: sizePrice,
      market_price: calculatedMarketPrice,
      actual_buy_price: sizeBuyPrice
    };
  });

  console.log('Output sizes:', JSON.stringify(finalSizes2, null, 2));

  console.log('Percentage OFF calculations:');
  finalSizes2.forEach(size => {
    const percentOff = size.market_price > size.price ? ((size.market_price - size.price) / size.market_price) * 100 : 0;
    console.log(`  ${size.size}: ${percentOff.toFixed(1)}% OFF (${size.price} was ${size.market_price})`);
  });
}

testMarketPriceLogic();