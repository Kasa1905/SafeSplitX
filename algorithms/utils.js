/**
 * Mathematical Utility Functions for Split Algorithms
 * 
 * This module provides precise mathematical utilities for split calculations,
 * handling floating-point precision issues and ensuring accurate results.
 * 
 * @module algorithms/utils
 * @version 1.0.0
 * @author SafeSplitX Team
 */

/**
 * Currency decimal precision mapping
 */
const CURRENCY_PRECISION = {
  'USD': 2,
  'EUR': 2,
  'GBP': 2,
  'JPY': 0,
  'KRW': 0,
  'CAD': 2,
  'AUD': 2,
  'CNY': 2,
  'INR': 2,
  'BTC': 8,
  'ETH': 18
};

/**
 * Rounds a number to the appropriate currency precision
 * 
 * @param {number} amount - The amount to round
 * @param {string} currency - The currency code for precision
 * @returns {number} Rounded amount
 */
function roundToCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 0;
  }

  const precision = CURRENCY_PRECISION[currency.toUpperCase()] || 2;
  const multiplier = Math.pow(10, precision);
  
  // Use proper rounding to avoid floating point issues
  return Math.round((amount + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Distributes remainder amount among splits to ensure total matches exactly
 * 
 * Supports both number arrays and split objects with amount field.
 * Detects element type at runtime and branches logic accordingly.
 * 
 * @param {Array<number>|Array<Object>} shares - Array of numbers or split objects with amount property
 * @param {number} remainder - Remainder amount to distribute
 * @param {string} currency - Currency code for precision (default: 'USD')
 * @returns {Array<number>|Array<Object>} Adjusted shares array
 */
function distributeRemainder(shares, remainder, currency = 'USD') {
  if (!Array.isArray(shares) || shares.length === 0) {
    return Array.isArray(shares) ? [] : shares;
  }

  if (typeof remainder !== 'number' || isNaN(remainder) || !isFinite(remainder)) {
    return [...shares];
  }

  // Detect if we have numbers or objects
  const isNumberArray = typeof shares[0] === 'number';
  const precision = CURRENCY_PRECISION[currency.toUpperCase()] || 2;
  const minUnit = 1 / Math.pow(10, precision);
  
  // Create working copy
  let adjustedShares;
  if (isNumberArray) {
    adjustedShares = [...shares];
  } else {
    adjustedShares = shares.map(split => ({ ...split }));
  }
  
  // Convert remainder to minimum currency units to avoid floating point issues
  let remainderUnits = Math.round(remainder * Math.pow(10, precision));
  
  // For positive remainder, distribute to highest amounts first
  // For negative remainder, take from highest amounts first
  const indices = Array.from({ length: adjustedShares.length }, (_, i) => i);
  
  if (isNumberArray) {
    indices.sort((a, b) => adjustedShares[b] - adjustedShares[a]);
  } else {
    indices.sort((a, b) => adjustedShares[b].amount - adjustedShares[a].amount);
  }
  
  // Distribute remainder one minimum unit at a time
  let indexPointer = 0;
  while (remainderUnits !== 0 && indexPointer < adjustedShares.length * Math.abs(remainderUnits)) {
    const shareIndex = indices[indexPointer % adjustedShares.length];
    
    if (remainderUnits > 0) {
      if (isNumberArray) {
        adjustedShares[shareIndex] += minUnit;
        adjustedShares[shareIndex] = roundToPrecision(adjustedShares[shareIndex], precision);
      } else {
        adjustedShares[shareIndex].amount += minUnit;
        adjustedShares[shareIndex].amount = roundToPrecision(adjustedShares[shareIndex].amount, precision);
      }
      remainderUnits--;
    } else {
      // Prevent negative shares
      const currentAmount = isNumberArray ? adjustedShares[shareIndex] : adjustedShares[shareIndex].amount;
      if (currentAmount > minUnit) {
        if (isNumberArray) {
          adjustedShares[shareIndex] -= minUnit;
          adjustedShares[shareIndex] = roundToPrecision(adjustedShares[shareIndex], precision);
        } else {
          adjustedShares[shareIndex].amount -= minUnit;
          adjustedShares[shareIndex].amount = roundToPrecision(adjustedShares[shareIndex].amount, precision);
        }
      }
      remainderUnits++;
    }
    
    indexPointer++;
  }

  return adjustedShares;
}

/**
 * Normalizes weights to sum to 1.0 (converts to percentages)
 * 
 * @param {Array<number>} weights - Array of weight values
 * @returns {Array<number>} Normalized weights (percentages as decimals)
 */
function normalizeWeights(weights) {
  if (!Array.isArray(weights) || weights.length === 0) {
    return [];
  }

  const totalWeight = weights.reduce((sum, weight) => {
    const w = Number(weight) || 0;
    return sum + (w > 0 ? w : 0);
  }, 0);

  if (totalWeight <= 0) {
    // If all weights are zero or negative, distribute equally
    return weights.map(() => 1 / weights.length);
  }

  return weights.map(weight => {
    const w = Number(weight) || 0;
    return w > 0 ? w / totalWeight : 0;
  });
}

/**
 * Validates that the total of all splits matches the original amount
 * 
 * @param {Array} splits - Array of split objects with amount property
 * @param {number} expectedTotal - Expected total amount
 * @param {string} currency - Currency code for precision
 * @returns {Object} Validation result with valid flag and error message
 */
function validateTotal(splits, expectedTotal, currency = 'USD') {
  if (!Array.isArray(splits)) {
    return { valid: false, error: "Splits must be an array" };
  }

  if (typeof expectedTotal !== 'number' || isNaN(expectedTotal)) {
    return { valid: false, error: "Expected total must be a valid number" };
  }

  const actualTotal = splits.reduce((sum, split) => {
    const amount = Number(split.amount) || 0;
    return sum + amount;
  }, 0);

  const roundedActual = roundToCurrency(actualTotal, currency);
  const roundedExpected = roundToCurrency(expectedTotal, currency);

  if (roundedActual !== roundedExpected) {
    return { 
      valid: false, 
      error: `Total mismatch: expected ${roundedExpected}, got ${roundedActual}` 
    };
  }

  return { valid: true };
}

/**
 * Formats amount for display according to currency conventions
 * 
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code
 * @param {string} locale - The locale for formatting (default: 'en-US')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: CURRENCY_PRECISION[currency.toUpperCase()] || 2,
      maximumFractionDigits: CURRENCY_PRECISION[currency.toUpperCase()] || 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    const precision = CURRENCY_PRECISION[currency.toUpperCase()] || 2;
    return `${amount.toFixed(precision)} ${currency.toUpperCase()}`;
  }
}

/**
 * Calculates percentage with proper rounding
 * 
 * @param {number} part - The part value
 * @param {number} whole - The whole value
 * @param {number} precision - Number of decimal places (default: 2)
 * @returns {number} Calculated percentage
 */
function calculatePercentage(part, whole, precision = 2) {
  if (typeof part !== 'number' || typeof whole !== 'number' || 
      isNaN(part) || isNaN(whole) || whole === 0) {
    return 0;
  }

  const percentage = (part / whole) * 100;
  const multiplier = Math.pow(10, precision);
  
  return Math.round((percentage + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Rounds a number to a specified number of decimal places
 * 
 * @param {number} number - The number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
function roundToPrecision(number, decimals) {
  if (typeof number !== 'number' || isNaN(number) || !isFinite(number)) {
    return 0;
  }
  
  if (typeof decimals !== 'number' || decimals < 0) {
    return number;
  }
  
  // Handle the special case of 1.005 -> 1.01 by adding a tiny epsilon
  const multiplier = Math.pow(10, decimals);
  return Math.round((number + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Validates if an amount has the correct precision for a currency
 * 
 * @param {number} amount - The amount to validate
 * @param {string} currency - The currency code
 * @returns {boolean} True if precision is valid
 */
function validateCurrencyPrecision(amount, currency) {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return false;
  }
  
  const precision = CURRENCY_PRECISION[currency?.toUpperCase()] || 2;
  const multiplier = Math.pow(10, precision);
  const rounded = Math.round(amount * multiplier) / multiplier;
  
  return Math.abs(amount - rounded) < Number.EPSILON;
}

/**
 * Safely sums an array of numbers, handling NaN and Infinity
 * 
 * @param {Array} array - Array of numbers to sum
 * @returns {number} Total sum
 */
function calculateTotal(array) {
  if (!Array.isArray(array)) {
    return 0;
  }
  
  return array.reduce((sum, value) => {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return sum;
    }
    return sum + num;
  }, 0);
}

/**
 * Checks if two values are within a specified tolerance using dual-mode semantics
 * 
 * For small differences (diff < 1) or when expected is zero, tolerance is treated as absolute units.
 * For larger differences, tolerance is treated as a percentage fraction (e.g., 0.05 = 5%).
 * 
 * @param {number} expected - Expected value (can be negative)
 * @param {number} actual - Actual value (can be negative)
 * @param {number} tolerance - Tolerance value (absolute units or percentage fraction)
 * @returns {boolean} True if within tolerance
 * 
 * @example
 * // Absolute tolerance mode (small differences)
 * isWithinTolerance(100, 100.01, 0.05) // true (0.01 <= 0.05 absolute)
 * isWithinTolerance(100, 100.06, 0.05) // false (0.06 > 0.05 absolute)
 * isWithinTolerance(0, 0.01, 0.05) // true (absolute when expected is 0)
 * 
 * // Percentage tolerance mode (larger differences)  
 * isWithinTolerance(100, 105, 0.05) // true (5% <= 5% tolerance)
 * isWithinTolerance(100, 106, 0.05) // false (6% > 5% tolerance)
 * isWithinTolerance(1000, 1050, 0.05) // true (5% <= 5% tolerance)
 */
function isWithinTolerance(expected, actual, tolerance) {
  if (typeof expected !== 'number' || typeof actual !== 'number' || typeof tolerance !== 'number') {
    return false;
  }
  
  if (isNaN(expected) || isNaN(actual) || isNaN(tolerance) || 
      !isFinite(expected) || !isFinite(actual) || !isFinite(tolerance)) {
    return false;
  }
  
  if (tolerance < 0) {
    return false;
  }
  
  const diff = Math.abs(expected - actual);
  
  // Use absolute tolerance for small differences or when expected is zero
  if (diff < 1 || Math.abs(expected) === 0) {
    return diff <= tolerance;
  }
  
  // Use percentage tolerance for larger differences
  return diff <= Math.abs(expected) * tolerance;
}

/**
 * Performs safe decimal arithmetic to avoid floating-point precision issues
 * 
 * @param {number} a - First operand
 * @param {number} b - Second operand
 * @param {string} operation - Operation ('add', 'subtract', 'multiply', 'divide')
 * @param {number} precision - Result precision (default: 10)
 * @returns {number} Result of the operation
 */
function safeDecimalOperation(a, b, operation, precision = 10) {
  if (typeof a !== 'number' || typeof b !== 'number' || 
      isNaN(a) || isNaN(b)) {
    return 0;
  }

  const multiplier = Math.pow(10, precision);
  const aInt = Math.round(a * multiplier);
  const bInt = Math.round(b * multiplier);
  
  let result;
  switch (operation) {
    case 'add':
      result = (aInt + bInt) / multiplier;
      break;
    case 'subtract':
      result = (aInt - bInt) / multiplier;
      break;
    case 'multiply':
      result = (aInt * bInt) / (multiplier * multiplier);
      break;
    case 'divide':
      result = bInt !== 0 ? aInt / bInt : 0;
      break;
    default:
      result = 0;
  }

  return Number(result.toFixed(precision));
}

/**
 * Generates a summary of split calculation results
 * 
 * @param {Array} splits - Array of split objects
 * @param {string} currency - Currency code
 * @returns {Object} Summary object with statistics
 */
function generateSplitSummary(splits, currency = 'USD') {
  if (!Array.isArray(splits) || splits.length === 0) {
    return {
      participantCount: 0,
      totalAmount: 0,
      averageAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      currency: currency
    };
  }

  const amounts = splits.map(split => Number(split.amount) || 0);
  const totalAmount = roundToCurrency(
    amounts.reduce((sum, amount) => sum + amount, 0), 
    currency
  );

  return {
    participantCount: splits.length,
    totalAmount: totalAmount,
    averageAmount: roundToCurrency(totalAmount / splits.length, currency),
    minAmount: roundToCurrency(Math.min(...amounts), currency),
    maxAmount: roundToCurrency(Math.max(...amounts), currency),
    currency: currency,
    splits: splits.map(split => ({
      ...split,
      percentage: calculatePercentage(split.amount, totalAmount)
    }))
  };
}

module.exports = {
  roundToCurrency,
  roundToPrecision,
  distributeRemainder,
  normalizeWeights,
  validateTotal,
  formatCurrency,
  validateCurrencyPrecision,
  calculateTotal,
  isWithinTolerance,
  calculatePercentage,
  safeDecimalOperation,
  generateSplitSummary,
  CURRENCY_PRECISION
};