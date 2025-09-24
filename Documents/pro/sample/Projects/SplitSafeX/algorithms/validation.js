/**
 * Validation Utilities for Split Algorithms
 * 
 * This module provides comprehensive validation functions specifically designed
 * for fair-split algorithms, ensuring data integrity and proper error handling.
 * 
 * @module algorithms/validation
 * @version 1.0.0
 * @author SafeSplitX Team
 */

/**
 * Validates expense amount for split calculations
 * 
 * @param {*} amount - The amount to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validateAmount(amount) {
  if (amount === null || amount === undefined) {
    return { valid: false, error: "Amount is required" };
  }

  if (typeof amount !== 'number') {
    return { valid: false, error: "Amount must be a number" };
  }

  if (isNaN(amount)) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  if (!isFinite(amount)) {
    return { valid: false, error: "Amount must be a finite number" };
  }

  if (amount < 0) {
    return { valid: false, error: "Amount must be non-negative" };
  }

  if (amount === 0) {
    return { valid: false, error: "Amount must be greater than zero" };
  }

  // Check for reasonable upper limit (1 billion)
  if (amount > 1000000000) {
    return { valid: false, error: "Amount exceeds maximum allowed value" };
  }

  // Check for excessive decimal places (more than 4)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 4) {
    return { valid: false, error: "Amount cannot have more than 4 decimal places" };
  }

  return { valid: true };
}

/**
 * Validates participants array for split calculations
 * 
 * @param {*} participants - The participants array to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validateParticipants(participants) {
  if (!participants) {
    return { valid: false, error: "Participants array is required" };
  }

  if (!Array.isArray(participants)) {
    return { valid: false, error: "Participants must be an array" };
  }

  if (participants.length === 0) {
    return { valid: false, error: "At least one participant is required" };
  }

  // Check for maximum reasonable number of participants
  if (participants.length > 1000) {
    return { valid: false, error: "Too many participants (maximum 1000 allowed)" };
  }

  // Validate each participant
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    
    if (!participant || typeof participant !== 'object') {
      return { valid: false, error: `Participant at index ${i} must be an object` };
    }

    if (!participant.id) {
      return { valid: false, error: `Participant at index ${i} must have an id` };
    }

    if (typeof participant.id !== 'string' && typeof participant.id !== 'number') {
      return { valid: false, error: `Participant at index ${i} id must be a string or number` };
    }

    if (!participant.name) {
      return { valid: false, error: `Participant at index ${i} must have a name` };
    }

    if (typeof participant.name !== 'string') {
      return { valid: false, error: `Participant at index ${i} name must be a string` };
    }

    if (participant.name.trim().length === 0) {
      return { valid: false, error: `Participant at index ${i} name cannot be empty` };
    }
  }

  // Check for duplicate IDs
  const ids = participants.map(p => p.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    return { valid: false, error: "Participant IDs must be unique" };
  }

  return { valid: true };
}

/**
 * Validates weights array for weighted split calculations
 * 
 * @param {*} weights - The weights array to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validateWeights(weights) {
  if (!weights) {
    return { valid: false, error: "Weights array is required" };
  }

  if (!Array.isArray(weights)) {
    return { valid: false, error: "Weights must be an array" };
  }

  if (weights.length === 0) {
    return { valid: false, error: "At least one weight is required" };
  }

  // Validate each weight
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    
    if (weight === null || weight === undefined) {
      return { valid: false, error: `Weight at index ${i} is required` };
    }

    if (typeof weight !== 'number') {
      return { valid: false, error: `Weight at index ${i} must be a number` };
    }

    if (isNaN(weight)) {
      return { valid: false, error: `Weight at index ${i} must be a valid number` };
    }

    if (!isFinite(weight)) {
      return { valid: false, error: `Weight at index ${i} must be a finite number` };
    }

    if (weight <= 0) {
      return { valid: false, error: `Weight at index ${i} must be positive` };
    }

    // Check for reasonable upper limit
    if (weight > 1000000) {
      return { valid: false, error: `Weight at index ${i} exceeds maximum allowed value` };
    }
  }

  // Check that at least one weight is positive
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return { valid: false, error: "Total weight must be positive" };
  }

  return { valid: true };
}

/**
 * Validates percentages array for percentage split calculations
 * 
 * @param {*} percentages - The percentages array to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validatePercentages(percentages) {
  if (!percentages) {
    return { valid: false, error: "Percentages array is required" };
  }

  if (!Array.isArray(percentages)) {
    return { valid: false, error: "Percentages must be an array" };
  }

  if (percentages.length === 0) {
    return { valid: false, error: "At least one percentage is required" };
  }

  let totalPercentage = 0;

  // Validate each percentage
  for (let i = 0; i < percentages.length; i++) {
    const percentage = percentages[i];
    
    if (percentage === null || percentage === undefined) {
      return { valid: false, error: `Percentage at index ${i} is required` };
    }

    if (typeof percentage !== 'number') {
      return { valid: false, error: `Percentage at index ${i} must be a number` };
    }

    if (isNaN(percentage)) {
      return { valid: false, error: `Percentage at index ${i} must be a valid number` };
    }

    if (!isFinite(percentage)) {
      return { valid: false, error: `Percentage at index ${i} must be a finite number` };
    }

    if (percentage < 0) {
      return { valid: false, error: `Percentage at index ${i} cannot be negative` };
    }

    if (percentage > 100) {
      return { valid: false, error: `Percentage at index ${i} cannot exceed 100%` };
    }

    // Check for excessive decimal places (more than 2)
    const decimalPlaces = (percentage.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return { valid: false, error: `Percentage at index ${i} cannot have more than 2 decimal places` };
    }

    totalPercentage += percentage;
  }

  // Validate total percentage (strict total = 100 with epsilon handling)
  const epsilon = 1e-9;
  if (Math.abs(totalPercentage - 100) > epsilon) {
    return { 
      valid: false, 
      error: `Total percentage must equal 100% (current total: ${totalPercentage.toFixed(2)}%)` 
    };
  }

  return { valid: true };
}

/**
 * Sanitizes and normalizes input data
 * 
 * @param {*} value - The value to sanitize
 * @param {string} type - The expected type ('number', 'string', 'array')
 * @returns {*} Sanitized value or null if invalid
 */
function sanitizeInput(value, type) {
  if (value === null || value === undefined) {
    return null;
  }

  switch (type) {
    case 'number':
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return typeof value === 'number' ? value : null;

    case 'string':
      return typeof value === 'string' ? value.trim() : String(value);

    case 'array':
      return Array.isArray(value) ? value : null;

    default:
      return value;
  }
}

/**
 * Normalizes participant data to ensure consistent structure
 * 
 * @param {Array} participants - Raw participants array
 * @returns {Array} Normalized participants array
 */
function normalizeParticipants(participants) {
  if (!Array.isArray(participants)) {
    return [];
  }

  return participants.map((participant, index) => {
    if (!participant || typeof participant !== 'object') {
      return null;
    }

    return {
      id: sanitizeInput(participant.id, 'string') || `participant_${index}`,
      name: sanitizeInput(participant.name, 'string') || `Participant ${index + 1}`,
      weight: participant.weight ? sanitizeInput(participant.weight, 'number') : undefined,
      percentage: participant.percentage ? sanitizeInput(participant.percentage, 'number') : undefined
    };
  }).filter(p => p !== null);
}

module.exports = {
  validateAmount,
  validateParticipants,
  validateWeights,
  validatePercentages,
  sanitizeInput,
  normalizeParticipants
};