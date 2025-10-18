/**
 * Helper utilities for common operations
 * Date formatting, string manipulation, number formatting, and data transformation
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Generate unique ID
 * @param {string} type - Type of ID to generate ('uuid', 'short', 'numeric')
 * @returns {string} Generated ID
 */
function generateId(type = 'uuid') {
  switch (type) {
    case 'uuid':
      return uuidv4();
    case 'short':
      return Math.random().toString(36).substring(2, 15);
    case 'numeric':
      return Date.now().toString() + Math.random().toString().substring(2, 6);
    case 'crypto':
      return crypto.randomBytes(16).toString('hex');
    default:
      return uuidv4();
  }
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }
  
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

/**
 * Format date with various options
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
  const config = {
    format: 'full', // 'full', 'short', 'long', 'medium', 'iso', 'relative'
    locale: 'en-US',
    timezone: 'UTC',
    includeTime: false,
    ...options
  };
  
  let dateObj;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return 'Invalid Date';
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  switch (config.format) {
    case 'iso':
      return dateObj.toISOString();
    case 'relative':
      return formatRelativeTime(dateObj);
    case 'short':
      return dateObj.toLocaleDateString(config.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: config.timezone
      });
    case 'long':
      return dateObj.toLocaleDateString(config.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        timeZone: config.timezone
      });
    case 'medium':
      return dateObj.toLocaleDateString(config.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: config.timezone
      });
    case 'full':
    default:
      const dateOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        timeZone: config.timezone
      };
      
      if (config.includeTime) {
        dateOptions.hour = 'numeric';
        dateOptions.minute = 'numeric';
        dateOptions.second = 'numeric';
      }
      
      return dateObj.toLocaleDateString(config.locale, dateOptions);
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format number with thousands separator
 * @param {number} number - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 */
function formatNumber(number, options = {}) {
  const config = {
    locale: 'en-US',
    decimals: null,
    style: 'decimal', // 'decimal', 'percent'
    ...options
  };
  
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }
  
  const formatOptions = {
    style: config.style
  };
  
  if (config.decimals !== null) {
    formatOptions.minimumFractionDigits = config.decimals;
    formatOptions.maximumFractionDigits = config.decimals;
  }
  
  const formatter = new Intl.NumberFormat(config.locale, formatOptions);
  return formatter.format(number);
}

/**
 * Deep clone an object or array
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags);
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }
  
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to camelCase
 * @param {string} str - String to convert
 * @returns {string} CamelCase string
 */
function toCamelCase(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Convert string to snake_case
 * @param {string} str - String to convert
 * @returns {string} snake_case string
 */
function toSnakeCase(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
}

/**
 * Convert string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} kebab-case string
 */
function toKebabCase(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('-');
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to append
 * @returns {string} Truncated string
 */
function truncate(str, length = 100, suffix = '...') {
  if (typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= length) {
    return str;
  }
  
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Get nested object property safely
 * @param {Object} obj - Object to access
 * @param {string} path - Property path (dot notation)
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Property value or default
 */
function getNestedProperty(obj, path, defaultValue = undefined) {
  if (!obj || typeof obj !== 'object' || typeof path !== 'string') {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !current.hasOwnProperty(key)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Set nested object property safely
 * @param {Object} obj - Object to modify
 * @param {string} path - Property path (dot notation)
 * @param {any} value - Value to set
 * @returns {Object} Modified object
 */
function setNestedProperty(obj, path, value) {
  if (!obj || typeof obj !== 'object' || typeof path !== 'string') {
    return obj;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Remove duplicates from array
 * @param {Array} arr - Array to deduplicate
 * @param {string|Function} key - Key to compare by or comparison function
 * @returns {Array} Deduplicated array
 */
function removeDuplicates(arr, key = null) {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  if (!key) {
    return [...new Set(arr)];
  }
  
  if (typeof key === 'string') {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  if (typeof key === 'function') {
    const seen = new Set();
    return arr.filter(item => {
      const value = key(item);
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  return arr;
}

/**
 * Group array of objects by property
 * @param {Array} arr - Array to group
 * @param {string|Function} key - Key to group by or grouping function
 * @returns {Object} Grouped object
 */
function groupBy(arr, key) {
  if (!Array.isArray(arr)) {
    return {};
  }
  
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * Sort array of objects by property
 * @param {Array} arr - Array to sort
 * @param {string|Function} key - Key to sort by or sorting function
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
function sortBy(arr, key, order = 'asc') {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  const sortedArray = [...arr];
  
  sortedArray.sort((a, b) => {
    let aVal, bVal;
    
    if (typeof key === 'function') {
      aVal = key(a);
      bVal = key(b);
    } else {
      aVal = a[key];
      bVal = b[key];
    }
    
    if (aVal < bVal) {
      return order === 'asc' ? -1 : 1;
    }
    
    if (aVal > bVal) {
      return order === 'asc' ? 1 : -1;
    }
    
    return 0;
  });
  
  return sortedArray;
}

/**
 * Create a range of numbers
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} step - Step increment
 * @returns {Array} Array of numbers
 */
function range(start, end, step = 1) {
  const result = [];
  
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  
  return result;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Promise that resolves with function result
 */
async function retry(fn, options = {}) {
  const config = {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    maxDelay: 30000,
    ...options
  };
  
  let lastError;
  let delay = config.initialDelay;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxAttempts) {
        throw lastError;
      }
      
      await sleep(delay);
      delay = Math.min(delay * config.backoffFactor, config.maxDelay);
    }
  }
  
  throw lastError;
}

module.exports = {
  generateId,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatNumber,
  deepClone,
  debounce,
  throttle,
  capitalize,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  truncate,
  isEmpty,
  getNestedProperty,
  setNestedProperty,
  removeDuplicates,
  groupBy,
  sortBy,
  range,
  sleep,
  retry
};