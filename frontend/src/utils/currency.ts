// Currency utility functions for AED formatting

/**
 * Format a number as AED currency
 * @param amount - The amount to format
 * @returns Formatted currency string with AED text
 */
export const formatCurrency = (amount: number): string => {
  return `AED ${amount.toFixed(2)}`;
};

/**
 * Convert USD amounts to AED (assuming 1 USD = 3.67 AED as of common rate)
 * @param usdAmount - Amount in USD
 * @returns Amount in AED
 */
export const convertUSDToAED = (usdAmount: number): number => {
  return usdAmount * 3.67;
};

/**
 * Format amount directly in AED without conversion
 * @param aedAmount - Amount already in AED
 * @returns Formatted AED string
 */
export const formatAED = (aedAmount: number): string => {
  return `AED ${aedAmount.toFixed(2)}`;
};