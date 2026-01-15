// Test script for debugging percent off calculation
// This tests the exact same logic used in HomePage.tsx

// Sample product data structure that matches the issue
const testProducts = [
  {
    id: 1,
    name: "J1",
    price: 50.00,
    market_price: 75.00,
    stock_quantity: 10,
    sizes: [
      { size: "Small", quantity: 3, price: 45, market_price: 70 },
      { size: "Medium", quantity: 4, price: 50, market_price: 75 },
      { size: "Large", quantity: 3, price: 55, market_price: 80 }
    ]
  },
  {
    id: 2,
    name: "Product Without Sizes",
    price: 29.99,
    market_price: 39.99,
    stock_quantity: 5,
    sizes: []
  },
  {
    id: 3,
    name: "Product Without Market Price",
    price: 25.00,
    market_price: 0,
    stock_quantity: 2,
    sizes: []
  },
  {
    id: 4,
    name: "Product With Equal Prices",
    price: 30.00,
    market_price: 30.00,
    stock_quantity: 1,
    sizes: []
  }
];

// Utility function to calculate actual available stock for products with sizes
const getActualStock = (product) => {
  // If product has sizes, sum up quantities from all sizes
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes.reduce((total, size) => total + size.quantity, 0);
  }
  // Otherwise use the stock_quantity field
  return product.stock_quantity || 0;
};

// Utility function to calculate % OFF for a product
const calculatePercentOff = (product) => {
  // For products with sizes, calculate the maximum % OFF among all sizes that have stock
  if (product.sizes && product.sizes.length > 0) {
    const availableSizes = product.sizes.filter(size => 
      size.price !== undefined && 
      size.price > 0 && 
      size.quantity > 0  // Only consider sizes with stock
    );
    
    if (availableSizes.length > 0) {
      const discountPercentages = availableSizes.map(size => {
        const sizePrice = Number(size.price);
        const sizeMarketPrice = size.market_price ? Number(size.market_price) : 0;
        
        if (sizeMarketPrice > 0 && sizePrice < sizeMarketPrice) {
          const percentOff = ((sizeMarketPrice - sizePrice) / sizeMarketPrice) * 100;
          return percentOff;
        }
        return 0;
      });
      
      const maxDiscount = Math.max(...discountPercentages);
      return maxDiscount;
    }
  }
  
  // For products without sizes, calculate based on base price and product market price
  const productMarketPrice = product.market_price ? Number(product.market_price) : 0;
  if (!productMarketPrice || productMarketPrice <= 0) {
    return 0;
  }
  
  const productPrice = product.price;
  if (productPrice >= productMarketPrice) {
    return 0;
  }
  
  return ((productMarketPrice - productPrice) / productMarketPrice) * 100;
};

// Format percentage off display
const formatPercentOff = (percentOff) => {
  if (percentOff <= 0 || isNaN(percentOff)) {
    return null;
  }
  return `${Math.round(percentOff)}% OFF`;
};

// Test each product
console.log('Testing Percent Off Calculation:');
console.log('================================');

testProducts.forEach(product => {
  const stock = getActualStock(product);
  const percentOff = calculatePercentOff(product);
  const formattedPercentOff = formatPercentOff(percentOff);
  
  console.log(`\nProduct: ${product.name}`);
  console.log(`Price: $${product.price}`);
  console.log(`Market Price: $${product.market_price || 0}`);
  console.log(`Stock: ${stock}`);
  console.log(`Calculated % Off: ${percentOff.toFixed(2)}%`);
  console.log(`Formatted: ${formattedPercentOff || 'No discount'}`);
  console.log(`Should show stock warning: ${stock > 0 && stock <= 5 ? 'YES' : 'NO'}`);
  
  if (product.sizes && product.sizes.length > 0) {
    console.log('Size breakdown:');
    product.sizes.forEach(size => {
      const sizePercentOff = size.market_price > size.price 
        ? ((size.market_price - size.price) / size.market_price) * 100
        : 0;
      console.log(`  - ${size.size}: $${size.price} (was $${size.market_price}) - ${sizePercentOff.toFixed(2)}% off - Stock: ${size.quantity}`);
    });
  }
});