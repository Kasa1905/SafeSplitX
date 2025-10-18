/**
 * Fair-Split Algorithms for SafeSplitX
 * 
 * This module provides comprehensive algorithms for splitting expenses fairly
 * among participants using different distribution methods: equal, weighted, and percentage-based.
 * 
 * @module algorithms/split
 * @version 1.0.0
 * @author SafeSplitX Team
 */

const { validateAmount, validateParticipants, validateWeights, validatePercentages } = require('./validation');
const { roundToCurrency, roundToPrecision, distributeRemainder, normalizeWeights, validateTotal, CURRENCY_PRECISION } = require('./utils');

/**
 * Splits an expense equally among all participants
 * 
 * @param {number} amount - The total expense amount to split
 * @param {Array<Object>} participants - Array of participant objects with id and name
 * @param {string} [currency='USD'] - Currency code for rounding precision
 * @returns {Object} Result object with success status and split data or error message
 * 
 * @example
 * const result = equalSplit(100, [
 *   { id: '1', name: 'Alice' },
 *   { id: '2', name: 'Bob' },
 *   { id: '3', name: 'Charlie' }
 * ]);
 * // Returns: { success: true, data: { splits: [...], total: 100, method: 'equal' } }
 */
function equalSplit(amount, participants, currency = 'USD') {
  // Input validation
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return { success: false, error: amountValidation.error };
  }

  const participantsValidation = validateParticipants(participants);
  if (!participantsValidation.valid) {
    return { success: false, error: participantsValidation.error };
  }

  if (participants.length === 0) {
    return { success: false, error: "At least one participant is required" };
  }

  try {
    const participantCount = participants.length;
    const precision = CURRENCY_PRECISION[currency] || 2;
    const unit = Math.pow(10, precision);
    const baseAmount = Math.floor((amount * unit) / participantCount) / unit;
    const remainder = roundToCurrency(amount - (baseAmount * participantCount), currency);
    
    // Create initial splits
    const splits = participants.map(participant => ({
      participantId: participant.id,
      participantName: participant.name,
      amount: roundToCurrency(baseAmount, currency),
      currency: currency
    }));

    // Distribute remainder to ensure total matches exactly
    const adjustedSplits = distributeRemainder(splits, remainder, currency);
    
    // Validate total
    const totalValidation = validateTotal(adjustedSplits, amount, currency);
    if (!totalValidation.valid) {
      return { success: false, error: totalValidation.error };
    }

    return {
      success: true,
      data: {
        splits: adjustedSplits,
        total: amount,
        currency: currency,
        method: 'equal',
        participantCount: participantCount,
        baseAmount: baseAmount,
        remainder: remainder
      }
    };
  } catch (error) {
    return { success: false, error: `Calculation error: ${error.message}` };
  }
}

/**
 * Splits an expense based on custom weights for each participant
 * 
 * @param {number} amount - The total expense amount to split
 * @param {Array<Object>} participants - Array of participant objects with id, name, and weight
 * @param {string} [currency='USD'] - Currency code for rounding precision
 * @returns {Object} Result object with success status and split data or error message
 * 
 * @example
 * const result = weightedSplit(100, [
 *   { id: '1', name: 'Alice', weight: 3 },
 *   { id: '2', name: 'Bob', weight: 2 },
 *   { id: '3', name: 'Charlie', weight: 1 }
 * ]);
 * // Returns: { success: true, data: { splits: [...], total: 100, method: 'weighted' } }
 */
function weightedSplit(amount, participants, currency = 'USD') {
  // Input validation
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return { success: false, error: amountValidation.error };
  }

  const participantsValidation = validateParticipants(participants);
  if (!participantsValidation.valid) {
    return { success: false, error: participantsValidation.error };
  }

  if (participants.length === 0) {
    return { success: false, error: "At least one participant is required" };
  }

  // Extract and validate weights
  const weights = participants.map(p => p.weight || 1);
  const weightsValidation = validateWeights(weights);
  if (!weightsValidation.valid) {
    return { success: false, error: weightsValidation.error };
  }

  try {
    // Normalize weights to get percentages
    const normalizedWeights = normalizeWeights(weights);
    
    // Calculate splits based on normalized weights
    let calculatedTotal = 0;
    const splits = participants.map((participant, index) => {
      const splitAmount = roundToCurrency(amount * normalizedWeights[index], currency);
      calculatedTotal += splitAmount;
      
      return {
        participantId: participant.id,
        participantName: participant.name,
        amount: splitAmount,
        weight: weights[index],
        percentage: roundToPrecision(normalizedWeights[index] * 100, 2),
        currency: currency
      };
    });

    // Handle rounding differences
    const difference = roundToCurrency(amount - calculatedTotal, currency);
    if (difference !== 0) {
      // Add/subtract difference to participant with largest weight
      const maxWeightIndex = weights.indexOf(Math.max(...weights));
      splits[maxWeightIndex].amount = roundToCurrency(
        splits[maxWeightIndex].amount + difference, 
        currency
      );
    }

    // Validate total
    const totalValidation = validateTotal(splits, amount, currency);
    if (!totalValidation.valid) {
      return { success: false, error: totalValidation.error };
    }

    return {
      success: true,
      data: {
        splits: splits,
        total: amount,
        currency: currency,
        method: 'weighted',
        participantCount: participants.length,
        totalWeight: weights.reduce((sum, w) => sum + w, 0),
        normalizedWeights: normalizedWeights
      }
    };
  } catch (error) {
    return { success: false, error: `Calculation error: ${error.message}` };
  }
}

/**
 * Splits an expense based on manual percentage allocation for each participant
 * 
 * @param {number} amount - The total expense amount to split
 * @param {Array<Object>} participants - Array of participant objects with id, name, and percentage
 * @param {string} [currency='USD'] - Currency code for rounding precision
 * @returns {Object} Result object with success status and split data or error message
 * 
 * @example
 * const result = percentageSplit(100, [
 *   { id: '1', name: 'Alice', percentage: 50 },
 *   { id: '2', name: 'Bob', percentage: 30 },
 *   { id: '3', name: 'Charlie', percentage: 20 }
 * ]);
 * // Returns: { success: true, data: { splits: [...], total: 100, method: 'percentage' } }
 */
function percentageSplit(amount, participants, currency = 'USD') {
  // Input validation
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return { success: false, error: amountValidation.error };
  }

  const participantsValidation = validateParticipants(participants);
  if (!participantsValidation.valid) {
    return { success: false, error: participantsValidation.error };
  }

  if (participants.length === 0) {
    return { success: false, error: "At least one participant is required" };
  }

  // Extract and validate percentages
  const percentages = participants.map(p => p.percentage || 0);
  const percentagesValidation = validatePercentages(percentages);
  if (!percentagesValidation.valid) {
    return { success: false, error: percentagesValidation.error };
  }

  try {
    // Calculate splits based on percentages
    let calculatedTotal = 0;
    const splits = participants.map((participant, index) => {
      const splitAmount = roundToCurrency((amount * percentages[index]) / 100, currency);
      calculatedTotal += splitAmount;
      
      return {
        participantId: participant.id,
        participantName: participant.name,
        amount: splitAmount,
        percentage: percentages[index],
        currency: currency
      };
    });

    // Handle rounding differences
    const difference = roundToCurrency(amount - calculatedTotal, currency);
    if (difference !== 0) {
      // Add/subtract difference to participant with largest percentage
      const maxPercentageIndex = percentages.indexOf(Math.max(...percentages));
      splits[maxPercentageIndex].amount = roundToCurrency(
        splits[maxPercentageIndex].amount + difference, 
        currency
      );
    }

    // Validate total
    const totalValidation = validateTotal(splits, amount, currency);
    if (!totalValidation.valid) {
      return { success: false, error: totalValidation.error };
    }

    return {
      success: true,
      data: {
        splits: splits,
        total: amount,
        currency: currency,
        method: 'percentage',
        participantCount: participants.length,
        totalPercentage: percentages.reduce((sum, p) => sum + p, 0)
      }
    };
  } catch (error) {
    return { success: false, error: `Calculation error: ${error.message}` };
  }
}

module.exports = {
  equalSplit,
  weightedSplit,
  percentageSplit
};