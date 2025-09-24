/**
 * SafeSplitX Algorithms Package
 * Fair-split calculation algorithms and expense processing logic
 * 
 * @module algorithms
 * @version 1.0.0
 * @author SafeSplitX Team
 */

const { equalSplit, weightedSplit, percentageSplit } = require('./split');
const { 
  validateAmount, 
  validateParticipants, 
  validateWeights, 
  validatePercentages,
  sanitizeInput,
  normalizeParticipants 
} = require('./validation');
const { 
  roundToCurrency, 
  distributeRemainder, 
  normalizeWeights, 
  validateTotal,
  formatCurrency,
  calculatePercentage,
  safeDecimalOperation,
  generateSplitSummary,
  CURRENCY_PRECISION 
} = require('./utils');

module.exports = {
  // Split Algorithm Functions
  equalSplit,
  weightedSplit,
  percentageSplit,
  
  // Validation Functions
  validateAmount,
  validateParticipants,
  validateWeights,
  validatePercentages,
  sanitizeInput,
  normalizeParticipants,
  
  // Utility Functions
  roundToCurrency,
  distributeRemainder,
  normalizeWeights,
  validateTotal,
  formatCurrency,
  calculatePercentage,
  safeDecimalOperation,
  generateSplitSummary,
  
  // Constants
  CURRENCY_PRECISION,
  
  // Module Information
  version: '1.0.0',
  description: 'Fair-split algorithms for expense management'
};