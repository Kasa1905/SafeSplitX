/**
 * Validation utilities for common data types and business logic
 * Framework-agnostic validation functions
 */

const validator = require('validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Validation result structure
 */
class ValidationResult {
  constructor(isValid = true, errors = [], value = null) {
    this.isValid = isValid;
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.value = value;
  }
  
  addError(field, message, code = 'VALIDATION_ERROR') {
    this.isValid = false;
    this.errors.push({ field, message, code });
    return this;
  }
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validateEmail(email, options = {}) {
  const config = {
    required: true,
    allowDisplayName: false,
    requireTld: true,
    ...options
  };
  
  const result = new ValidationResult();
  
  if (!email && config.required) {
    return result.addError('email', 'Email is required');
  }
  
  if (!email && !config.required) {
    return result;
  }
  
  if (typeof email !== 'string') {
    return result.addError('email', 'Email must be a string');
  }
  
  const trimmed = email.trim().toLowerCase();
  
  if (trimmed.length === 0 && config.required) {
    return result.addError('email', 'Email cannot be empty');
  }
  
  if (trimmed.length > 254) {
    return result.addError('email', 'Email is too long');
  }
  
  if (!validator.isEmail(trimmed, {
    allow_display_name: config.allowDisplayName,
    require_tld: config.requireTld
  })) {
    return result.addError('email', 'Please enter a valid email address');
  }
  
  result.value = validator.normalizeEmail(trimmed);
  return result;
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validatePhone(phone, options = {}) {
  const config = {
    required: true,
    defaultCountry: 'US',
    ...options
  };
  
  const result = new ValidationResult();
  
  if (!phone && config.required) {
    return result.addError('phone', 'Phone number is required');
  }
  
  if (!phone && !config.required) {
    return result;
  }
  
  if (typeof phone !== 'string') {
    return result.addError('phone', 'Phone number must be a string');
  }
  
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, config.defaultCountry);
    
    if (!phoneNumber || !phoneNumber.isValid()) {
      return result.addError('phone', 'Please enter a valid phone number');
    }
    
    result.value = {
      formatted: phoneNumber.formatInternational(),
      e164: phoneNumber.format('E.164'),
      national: phoneNumber.formatNational(),
      country: phoneNumber.country
    };
    
    return result;
  } catch (error) {
    return result.addError('phone', 'Invalid phone number format');
  }
}

/**
 * Validate currency code
 * @param {string} currency - Currency code to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validateCurrency(currency, options = {}) {
  const config = {
    required: true,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'],
    ...options
  };
  
  const result = new ValidationResult();
  
  if (!currency && config.required) {
    return result.addError('currency', 'Currency is required');
  }
  
  if (!currency && !config.required) {
    return result;
  }
  
  if (typeof currency !== 'string') {
    return result.addError('currency', 'Currency must be a string');
  }
  
  const normalized = currency.trim().toUpperCase();
  
  if (normalized.length !== 3) {
    return result.addError('currency', 'Currency code must be 3 characters');
  }
  
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return result.addError('currency', 'Currency code must contain only letters');
  }
  
  if (config.supportedCurrencies && !config.supportedCurrencies.includes(normalized)) {
    return result.addError('currency', `Currency ${normalized} is not supported`);
  }
  
  result.value = normalized;
  return result;
}

/**
 * Validate monetary amount
 * @param {number|string} amount - Amount to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validateAmount(amount, options = {}) {
  const config = {
    required: true,
    min: 0.01,
    max: 1000000,
    currency: 'USD',
    allowZero: false,
    decimalPlaces: 2,
    ...options
  };
  
  const result = new ValidationResult();
  
  if ((amount === null || amount === undefined) && config.required) {
    return result.addError('amount', 'Amount is required');
  }
  
  if ((amount === null || amount === undefined) && !config.required) {
    return result;
  }
  
  let numericAmount;
  
  if (typeof amount === 'string') {
    // Remove currency symbols and whitespace
    const cleaned = amount.replace(/[$€£¥₹\s,]/g, '');
    numericAmount = parseFloat(cleaned);
  } else if (typeof amount === 'number') {
    numericAmount = amount;
  } else {
    return result.addError('amount', 'Amount must be a number');
  }
  
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    return result.addError('amount', 'Amount must be a valid number');
  }
  
  if (numericAmount < 0) {
    return result.addError('amount', 'Amount cannot be negative');
  }
  
  if (numericAmount === 0 && !config.allowZero) {
    return result.addError('amount', 'Amount must be greater than zero');
  }
  
  if (numericAmount < config.min) {
    return result.addError('amount', `Amount must be at least ${config.min}`);
  }
  
  if (numericAmount > config.max) {
    return result.addError('amount', `Amount cannot exceed ${config.max}`);
  }
  
  // Round to specified decimal places
  const rounded = Math.round(numericAmount * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces);
  
  result.value = {
    amount: rounded,
    currency: config.currency,
    formatted: formatCurrency(rounded, config.currency)
  };
  
  return result;
}

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validateDate(date, options = {}) {
  const config = {
    required: true,
    allowPast: true,
    allowFuture: true,
    minDate: null,
    maxDate: null,
    format: null, // ISO format if string
    ...options
  };
  
  const result = new ValidationResult();
  
  if (!date && config.required) {
    return result.addError('date', 'Date is required');
  }
  
  if (!date && !config.required) {
    return result;
  }
  
  let dateObj;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    if (config.format) {
      // Custom format validation would go here
      dateObj = new Date(date);
    } else {
      dateObj = new Date(date);
    }
  } else {
    return result.addError('date', 'Date must be a Date object or string');
  }
  
  if (isNaN(dateObj.getTime())) {
    return result.addError('date', 'Invalid date format');
  }
  
  const now = new Date();
  
  if (!config.allowPast && dateObj < now) {
    return result.addError('date', 'Date cannot be in the past');
  }
  
  if (!config.allowFuture && dateObj > now) {
    return result.addError('date', 'Date cannot be in the future');
  }
  
  if (config.minDate && dateObj < config.minDate) {
    return result.addError('date', `Date must be after ${config.minDate.toISOString()}`);
  }
  
  if (config.maxDate && dateObj > config.maxDate) {
    return result.addError('date', `Date must be before ${config.maxDate.toISOString()}`);
  }
  
  result.value = dateObj;
  return result;
}

/**
 * Validate ID (MongoDB ObjectId, UUID, etc.)
 * @param {string} id - ID to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validateId(id, options = {}) {
  const config = {
    required: true,
    type: 'mongodb', // 'mongodb', 'uuid', 'custom'
    customPattern: null,
    ...options
  };
  
  const result = new ValidationResult();
  
  if (!id && config.required) {
    return result.addError('id', 'ID is required');
  }
  
  if (!id && !config.required) {
    return result;
  }
  
  if (typeof id !== 'string') {
    return result.addError('id', 'ID must be a string');
  }
  
  const trimmed = id.trim();
  
  switch (config.type) {
    case 'mongodb':
      if (!validator.isMongoId(trimmed)) {
        return result.addError('id', 'Invalid MongoDB ObjectId format');
      }
      break;
    case 'uuid':
      if (!validator.isUUID(trimmed)) {
        return result.addError('id', 'Invalid UUID format');
      }
      break;
    case 'custom':
      if (config.customPattern && !config.customPattern.test(trimmed)) {
        return result.addError('id', 'Invalid ID format');
      }
      break;
    default:
      return result.addError('id', 'Unknown ID type');
  }
  
  result.value = trimmed;
  return result;
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
function validatePassword(password, options = {}) {
  const config = {
    required: true,
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    ...options
  };
  
  const result = new ValidationResult();
  
  if (!password && config.required) {
    return result.addError('password', 'Password is required');
  }
  
  if (!password && !config.required) {
    return result;
  }
  
  if (typeof password !== 'string') {
    return result.addError('password', 'Password must be a string');
  }
  
  if (password.length < config.minLength) {
    return result.addError('password', `Password must be at least ${config.minLength} characters long`);
  }
  
  if (password.length > config.maxLength) {
    return result.addError('password', `Password cannot exceed ${config.maxLength} characters`);
  }
  
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    return result.addError('password', 'Password must contain at least one uppercase letter');
  }
  
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    return result.addError('password', 'Password must contain at least one lowercase letter');
  }
  
  if (config.requireNumbers && !/\d/.test(password)) {
    return result.addError('password', 'Password must contain at least one number');
  }
  
  if (config.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return result.addError('password', 'Password must contain at least one symbol');
  }
  
  result.value = password;
  return result;
}

/**
 * Schema-based validation
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @returns {ValidationResult} Validation result
 */
function validateSchema(data, schema) {
  const result = new ValidationResult();
  const validatedData = {};
  
  // Validate each field in schema
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (value === null || value === undefined || value === '')) {
      result.addError(field, `${field} is required`);
      continue;
    }
    
    if (value === null || value === undefined) {
      if (rules.default !== undefined) {
        validatedData[field] = rules.default;
      }
      continue;
    }
    
    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          const emailResult = validateEmail(value, rules);
          if (!emailResult.isValid) {
            result.errors.push(...emailResult.errors);
          } else {
            validatedData[field] = emailResult.value;
          }
          break;
        case 'phone':
          const phoneResult = validatePhone(value, rules);
          if (!phoneResult.isValid) {
            result.errors.push(...phoneResult.errors);
          } else {
            validatedData[field] = phoneResult.value;
          }
          break;
        case 'currency':
          const currencyResult = validateCurrency(value, rules);
          if (!currencyResult.isValid) {
            result.errors.push(...currencyResult.errors);
          } else {
            validatedData[field] = currencyResult.value;
          }
          break;
        case 'amount':
          const amountResult = validateAmount(value, rules);
          if (!amountResult.isValid) {
            result.errors.push(...amountResult.errors);
          } else {
            validatedData[field] = amountResult.value;
          }
          break;
        case 'date':
          const dateResult = validateDate(value, rules);
          if (!dateResult.isValid) {
            result.errors.push(...dateResult.errors);
          } else {
            validatedData[field] = dateResult.value;
          }
          break;
        case 'id':
          const idResult = validateId(value, rules);
          if (!idResult.isValid) {
            result.errors.push(...idResult.errors);
          } else {
            validatedData[field] = idResult.value;
          }
          break;
        case 'password':
          const passwordResult = validatePassword(value, rules);
          if (!passwordResult.isValid) {
            result.errors.push(...passwordResult.errors);
          } else {
            validatedData[field] = passwordResult.value;
          }
          break;
        default:
          validatedData[field] = value;
      }
    } else {
      validatedData[field] = value;
    }
    
    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      const customResult = rules.validate(value);
      if (customResult !== true) {
        result.addError(field, customResult || `${field} validation failed`);
      }
    }
  }
  
  result.isValid = result.errors.length === 0;
  if (result.isValid) {
    result.value = validatedData;
  }
  
  return result;
}

/**
 * Helper function to format currency (used in validateAmount)
 */
function formatCurrency(amount, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

module.exports = {
  ValidationResult,
  validateEmail,
  validatePhone,
  validateCurrency,
  validateAmount,
  validateDate,
  validateId,
  validatePassword,
  validateSchema
};