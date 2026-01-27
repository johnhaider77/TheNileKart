// COD (Cash On Delivery) calculation utilities

/**
 * Calculate COD fee based on order value
 * @param {number} orderValue - Total order value in AED
 * @returns {number} COD fee in AED
 */
const calculateCODFee = (orderValue) => {
  if (orderValue >= 150) {
    return 0; // Free COD for orders >= 150 AED
  }
  
  const feeRate = 0.10; // 10% fee
  const maxFee = 15; // Maximum 15 AED
  const minFee = 10; // Minimum 10 AED
  
  const calculatedFee = orderValue * feeRate;
  return Math.max(minFee, Math.min(calculatedFee, maxFee));
};

/**
 * Check if all items in cart are COD eligible (considering size-specific COD eligibility)
 * @param {Array} items - Array of cart items with product info and selected size
 * @returns {boolean} True if all items are COD eligible for their selected sizes
 */
const areAllItemsCODEligible = (items) => {
  if (!items || items.length === 0) {
    return false;
  }
  
  return items.every(item => {
    // Check size-specific COD eligibility
    if (item.product && item.product.sizes && item.selectedSize) {
      const sizeData = item.product.sizes.find(size => size.size === item.selectedSize);
      return sizeData && sizeData.cod_eligible === true;
    }
    
    // Fallback to product-level COD eligibility for backward compatibility
    return item.cod_eligible === true || (item.product && item.product.cod_eligible === true);
  });
};

/**
 * Get non-COD eligible items from cart (considering size-specific COD eligibility)
 * @param {Array} items - Array of cart items with product info and selected size
 * @returns {Array} Array of non-COD eligible items with reason
 */
const getNonCODEligibleItems = (items) => {
  if (!items || items.length === 0) {
    return [];
  }
  
  return items.filter(item => {
    // Check size-specific COD eligibility
    if (item.product && item.product.sizes && item.selectedSize) {
      const sizeData = item.product.sizes.find(size => size.size === item.selectedSize);
      return !sizeData || sizeData.cod_eligible !== true;
    }
    
    // Fallback to product-level COD eligibility
    return item.cod_eligible !== true && !(item.product && item.product.cod_eligible === true);
  }).map(item => ({
    ...item,
    reason: item.selectedSize ? `Size "${item.selectedSize}" is not COD eligible` : 'Product is not COD eligible'
  }));
};

/**
 * Calculate order totals with COD fee
 * @param {Array} items - Array of cart items
 * @param {number} shippingFee - Shipping fee
 * @returns {Object} Order calculations including COD fee
 */
const calculateOrderWithCOD = (items, shippingFee = 0) => {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      shippingFee: 0,
      codFee: 0,
      total: 0,
      codEligible: false,
      nonCodItems: []
    };
  }
  
  const subtotal = items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const codEligible = areAllItemsCODEligible(items);
  const nonCodItems = getNonCODEligibleItems(items);
  
  let codFee = 0;
  if (codEligible) {
    codFee = calculateCODFee(subtotal);
  }
  
  const total = subtotal + shippingFee + codFee;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingFee: parseFloat(shippingFee.toFixed(2)),
    codFee: parseFloat(codFee.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    codEligible,
    nonCodItems
  };
};

/**
 * Calculate shipping fee for online (pre-paid) payments
 * Rule: 10% for orders <= 100 AED, else free
 * @param {number} orderValue - Total order value in AED
 * @returns {number} Shipping fee in AED
 */
const calculateOnlineShippingFee = (orderValue) => {
  if (orderValue <= 100) {
    return parseFloat((orderValue * 0.10).toFixed(2)); // 10% fee for orders <= 100 AED
  }
  return 0; // Free shipping for orders > 100 AED
};

/**
 * Calculate order totals with online payment shipping fee
 * @param {Array} items - Array of cart items
 * @returns {Object} Order calculations including online shipping fee
 */
const calculateOrderWithOnlineShipping = (items) => {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      shippingFee: 0,
      total: 0
    };
  }
  
  const subtotal = items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const shippingFee = calculateOnlineShippingFee(subtotal);
  const total = subtotal + shippingFee;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingFee: parseFloat(shippingFee.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

module.exports = {
  calculateCODFee,
  areAllItemsCODEligible,
  getNonCODEligibleItems,
  calculateOrderWithCOD,
  calculateOnlineShippingFee,
  calculateOrderWithOnlineShipping
};