/**
 * Comprehensive input sanitization utilities for SafeSplitX
 * Provides XSS protection, injection prevention, and data cleaning
 */

const validator = require('validator');
const xss = require('xss');

/**
 * Configuration for sanitization rules
 */
const SANITIZATION_CONFIG = {
  strings: {
    maxLength: 10000,
    trimWhitespace: true,
    removeControlChars: true
  },
  html: {
    whiteList: {
      a: ['href', 'title'],
      p: [],
      br: [],
      strong: [],
      em: [],
      span: ['class'],
      div: ['class'],
      ul: [],
      ol: [],
      li: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  },
  objects: {
    maxDepth: 10,
    maxKeys: 100
  }
};

/**
 * Sanitize a string input with XSS protection
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  const config = { 
    ...SANITIZATION_CONFIG.strings, 
    encodeHtmlEntities: false, // Default false to avoid over-escaping
    ...options 
  };
  
  // Trim whitespace if enabled
  let sanitized = config.trimWhitespace ? input.trim() : input;
  
  // Remove control characters
  if (config.removeControlChars) {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }
  
  // Check length limit
  if (sanitized.length > config.maxLength) {
    sanitized = sanitized.substring(0, config.maxLength);
  }
  
  // XSS protection (this handles most sanitization needs)
  sanitized = xss(sanitized);
  
  // Only apply additional HTML entity encoding if explicitly requested
  if (config.encodeHtmlEntities) {
    sanitized = validator.escape(sanitized);
  }
  
  return sanitized;
}

/**
 * Sanitize email address
 * @param {string} email - Email to sanitize
 * @returns {string|null} Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation
  if (!validator.isEmail(trimmed)) {
    return null;
  }
  
  // Additional sanitization
  const sanitized = validator.normalizeEmail(trimmed, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false
  });
  
  return sanitized;
}

/**
 * Sanitize numeric input
 * @param {any} input - Input to convert to number
 * @param {Object} options - Sanitization options
 * @returns {number|null} Sanitized number or null if invalid
 */
function sanitizeNumber(input, options = {}) {
  const config = {
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
    allowFloat: true,
    defaultValue: 0, // Default value for invalid inputs
    ...options
  };
  
  let num;
  
  if (typeof input === 'number') {
    num = input;
  } else if (typeof input === 'string') {
    // Remove non-numeric characters except decimal point and minus sign
    const cleaned = input.replace(/[^\d.-]/g, '');
    num = config.allowFloat ? parseFloat(cleaned) : parseInt(cleaned, 10);
  } else {
    return config.defaultValue;
  }
  
  // Check if it's a valid number
  if (isNaN(num) || !isFinite(num)) {
    return config.defaultValue;
  }
  
  // Check bounds
  if (num < config.min || num > config.max) {
    return config.defaultValue;
  }
  
  return num;
}

/**
 * Sanitize HTML content
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html, options = {}) {
  if (typeof html !== 'string') {
    return '';
  }
  
  const config = { ...SANITIZATION_CONFIG.html, ...options };
  
  // Use xss library with custom whitelist
  return xss(html, {
    whiteList: config.whiteList,
    stripIgnoreTag: config.stripIgnoreTag,
    stripIgnoreTagBody: config.stripIgnoreTagBody,
    onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
      // Allow data-* attributes
      if (name.substr(0, 5) === 'data-') {
        return name + '="' + xss.escapeAttrValue(value) + '"';
      }
    }
  });
}

/**
 * Sanitize object with field-level sanitization rules
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} depth - Current recursion depth
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, options = {}, depth = 0) {
  const config = { 
    ...SANITIZATION_CONFIG.objects, 
    sanitizeKeys: false, // Don't sanitize keys by default
    fieldSanitizers: {
      email: sanitizeEmail,
      phone: sanitizeString,
      ...options.fieldSanitizers
    },
    ...options 
  };
  
  if (depth > config.maxDepth) {
    // Keep original subtree instead of returning null
    console.warn(`Maximum depth exceeded (${config.maxDepth}), keeping original data`);
    return obj;
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return sanitizeArray(obj, options, depth);
  }
  
  if (typeof obj !== 'object') {
    // Sanitize primitive values
    if (typeof obj === 'string') {
      return sanitizeString(obj, options.stringOptions);
    }
    if (typeof obj === 'number') {
      return sanitizeNumber(obj, options.numberOptions);
    }
    return obj;
  }
  
  const sanitized = {};
  const keys = Object.keys(obj);
  
  if (keys.length > config.maxKeys) {
    throw new Error(`Object has too many keys (${keys.length}), maximum allowed is ${config.maxKeys}`);
  }
  
  for (const key of keys) {
    // Preserve original keys unless explicitly requested to sanitize
    const sanitizedKey = config.sanitizeKeys ? sanitizeString(key) : key;
    
    if (sanitizedKey) {
      // Apply field-specific sanitization if available
      const fieldSanitizer = config.fieldSanitizers[key.toLowerCase()];
      if (fieldSanitizer && typeof fieldSanitizer === 'function') {
        try {
          sanitized[sanitizedKey] = fieldSanitizer(obj[key]);
        } catch (error) {
          // Fallback to regular sanitization if field sanitizer fails
          sanitized[sanitizedKey] = sanitizeObject(obj[key], options, depth + 1);
        }
      } else {
        sanitized[sanitizedKey] = sanitizeObject(obj[key], options, depth + 1);
      }
    }
  }
  
  return sanitized;
}

/**
 * Sanitize array elements
 * @param {Array} arr - Array to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} depth - Current recursion depth
 * @returns {Array} Sanitized array
 */
function sanitizeArray(arr, options = {}, depth = 0) {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  return arr.map(item => sanitizeObject(item, options, depth + 1)).filter(item => item !== null);
}

/**
 * Whitelist-based field filtering
 * @param {Object} obj - Object to filter
 * @param {Array} allowedFields - Array of allowed field names
 * @returns {Object} Filtered object
 */
function whitelistFields(obj, allowedFields) {
  if (typeof obj !== 'object' || obj === null) {
    return {};
  }
  
  const filtered = {};
  for (const field of allowedFields) {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  }
  
  return filtered;
}

/**
 * Remove potentially dangerous patterns
 * @param {string} input - Input string
 * @returns {string} Cleaned string
 */
function removeDangerousPatterns(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  const dangerousPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    // NoSQL injection patterns
    /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$regex)/gi,
    // JavaScript execution patterns
    /(javascript:|data:|vbscript:|on\w+\s*=)/gi,
    // File path traversal
    /(\.\.[\/\\]|\.\.%2f|\.\.%5c)/gi
  ];
  
  let cleaned = input;
  for (const pattern of dangerousPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned;
}

/**
 * Comprehensive input sanitization
 * @param {any} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {any} Sanitized input
 */
function sanitizeInput(input, options = {}) {
  if (typeof input === 'string') {
    let sanitized = sanitizeString(input, options.stringOptions);
    sanitized = removeDangerousPatterns(sanitized);
    return sanitized;
  }
  
  if (typeof input === 'number') {
    return sanitizeNumber(input, options.numberOptions);
  }
  
  if (typeof input === 'object') {
    return sanitizeObject(input, options);
  }
  
  return input;
}

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeHtml,
  sanitizeObject,
  sanitizeArray,
  sanitizeInput,
  whitelistFields,
  removeDangerousPatterns,
  SANITIZATION_CONFIG
};