/**
 * Response formatting utilities for consistent API responses
 * Ensures standardized response structure across all modules
 */

const { generateId } = require('./helpers');

/**
 * Create successful response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted success response
 */
function successResponse(data = null, message = null, metadata = {}) {
  const response = {
    success: true,
    data: data, // Always include data key even when null
    timestamp: new Date().toISOString(),
    requestId: generateId()
  };
  
  if (message) {
    response.message = message;
  }
  
  if (metadata && Object.keys(metadata).length > 0) {
    response.metadata = metadata;
  }
  
  return response;
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
function errorResponse(message = 'An error occurred', code = 'UNKNOWN_ERROR', details = {}, statusCode = 500) {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        requestId: generateId()
      }
    },
    timestamp: new Date().toISOString(),
    requestId: generateId()
  };
}

/**
 * Create paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Optional message
 * @returns {Object} Formatted paginated response
 */
function paginatedResponse(data, pagination, message = null) {
  const paginationMeta = {
    page: pagination.page || 1,
    limit: pagination.limit || 10,
    total: pagination.total || data.length,
    totalPages: Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
    hasNext: null,
    hasPrevious: null
  };
  
  paginationMeta.hasNext = paginationMeta.page < paginationMeta.totalPages;
  paginationMeta.hasPrevious = paginationMeta.page > 1;
  
  const response = successResponse(data, message);
  response.pagination = paginationMeta;
  
  return response;
}

/**
 * Format API response for external APIs
 * @param {any} data - Response data
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted API response
 */
function formatApiResponse(data, options = {}) {
  const config = {
    includeMetadata: true,
    transformData: null,
    wrapInData: false,
    ...options
  };
  
  let responseData = data;
  
  // Apply data transformation if provided
  if (config.transformData && typeof config.transformData === 'function') {
    responseData = config.transformData(data);
  }
  
  // Wrap in data property if requested
  if (config.wrapInData) {
    responseData = { data: responseData };
  }
  
  const response = {
    ...responseData
  };
  
  // Add metadata if enabled
  if (config.includeMetadata) {
    response.meta = {
      timestamp: new Date().toISOString(),
      requestId: generateId(),
      version: '1.0',
      ...config.metadata
    };
  }
  
  return response;
}

/**
 * Create validation error response
 * @param {Array|Object} validationErrors - Validation errors
 * @param {string} message - Error message
 * @returns {Object} Formatted validation error response
 */
function validationErrorResponse(validationErrors, message = 'Validation failed') {
  const errors = Array.isArray(validationErrors) ? validationErrors : [validationErrors];
  
  return errorResponse(message, 'VALIDATION_ERROR', {
    errors: errors, // Primary location for validation errors
    validationErrors: errors, // Keep deprecated alias for backward compatibility
    fieldCount: errors.length
  }, 400);
}

/**
 * Create authentication error response
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {Object} Formatted authentication error response
 */
function authErrorResponse(message = 'Authentication required', details = {}) {
  return errorResponse(message, 'AUTHENTICATION_ERROR', details, 401);
}

// Alias for backward compatibility
const authenticationErrorResponse = authErrorResponse;

/**
 * Create authorization error response
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {Object} Formatted authorization error response
 */
function authorizationErrorResponse(message = 'Access denied', details = {}) {
  return errorResponse(message, 'AUTHORIZATION_ERROR', details, 403);
}

/**
 * Create not found error response
 * @param {string} resource - Resource name
 * @param {Object} details - Additional details
 * @returns {Object} Formatted not found error response
 */
function notFoundErrorResponse(resource = 'Resource', details = {}) {
  const message = `${resource} not found`;
  return errorResponse(message, 'NOT_FOUND_ERROR', details, 404);
}

/**
 * Create rate limit error response
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Object} Formatted rate limit error response
 */
function rateLimitErrorResponse(rateLimitInfo = {}) {
  const message = 'Rate limit exceeded';
  const details = {
    retryAfter: rateLimitInfo.retryAfter || 60,
    limit: rateLimitInfo.limit || 100,
    remaining: 0,
    reset: rateLimitInfo.reset || Date.now() + (60 * 1000)
  };
  
  return errorResponse(message, 'RATE_LIMIT_EXCEEDED', details, 429);
}

/**
 * Create conflict error response
 * @param {Object} details - Error details
 * @returns {Object} Formatted conflict error response
 */
function conflictErrorResponse(details = {}) {
  return errorResponse('Conflict', 'CONFLICT', details, 409);
}

/**
 * Create internal server error response  
 * @param {string} message - Error message
 * @param {Object} details - Error details
 * @returns {Object} Formatted internal server error response
 */
function internalErrorResponse(message = 'Internal error', details = {}) {
  return errorResponse(message, 'INTERNAL_ERROR', details, 500);
}

/**
 * Transform response data based on content type
 * @param {any} data - Data to transform
 * @param {string} contentType - Target content type
 * @returns {any} Transformed data
 */
function transformResponseData(data, contentType = 'application/json') {
  switch (contentType.toLowerCase()) {
    case 'application/json':
      return data; // Already in correct format
    
    case 'text/csv':
      if (Array.isArray(data)) {
        return arrayToCsv(data);
      }
      return data;
    
    case 'text/plain':
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    
    case 'application/xml':
      return objectToXml(data);
    
    default:
      return data;
  }
}

/**
 * Convert array to CSV format
 * @param {Array} data - Array of objects
 * @returns {string} CSV string
 */
function arrayToCsv(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Convert object to XML format (simple implementation)
 * @param {Object} data - Object to convert
 * @param {string} rootElement - Root element name
 * @returns {string} XML string
 */
function objectToXml(data, rootElement = 'root') {
  function toXml(obj, name) {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => toXml(item, `${name}_${index}`)).join('');
      } else {
        const elements = Object.entries(obj)
          .map(([key, value]) => toXml(value, key))
          .join('');
        return `<${name}>${elements}</${name}>`;
      }
    } else {
      return `<${name}>${String(obj).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${name}>`;
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>${toXml(data, rootElement)}`;
}

/**
 * Add CORS headers to response
 * @param {Object} response - Response object
 * @param {Object} options - CORS options
 * @returns {Object} Response with CORS headers
 */
function addCorsHeaders(response, options = {}) {
  const config = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization,X-Correlation-ID',
    credentials: false,
    ...options
  };
  
  return {
    ...response,
    headers: {
      'Access-Control-Allow-Origin': config.origin,
      'Access-Control-Allow-Methods': config.methods,
      'Access-Control-Allow-Headers': config.allowedHeaders,
      'Access-Control-Allow-Credentials': config.credentials,
      ...response.headers
    }
  };
}

/**
 * Add caching headers to response
 * @param {Object} response - Response object
 * @param {Object} options - Caching options
 * @returns {Object} Response with caching headers
 */
function addCacheHeaders(response, options = {}) {
  const config = {
    maxAge: 300, // 5 minutes
    mustRevalidate: false,
    noCache: false,
    noStore: false,
    ...options
  };
  
  let cacheControl = `max-age=${config.maxAge}`;
  
  if (config.mustRevalidate) {
    cacheControl += ', must-revalidate';
  }
  
  if (config.noCache) {
    cacheControl = 'no-cache';
  }
  
  if (config.noStore) {
    cacheControl = 'no-store';
  }
  
  return {
    ...response,
    headers: {
      'Cache-Control': cacheControl,
      'ETag': generateId(), // Simple ETag generation
      ...response.headers
    }
  };
}

/**
 * Validate response structure
 * @param {Object} response - Response to validate
 * @returns {boolean} True if valid response structure
 */
function validateResponseStructure(response) {
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  
  // Check for required fields
  if (!response.hasOwnProperty('success')) {
    return false;
  }
  
  if (typeof response.success !== 'boolean') {
    return false;
  }
  
  // For success responses, check data field
  if (response.success && !response.hasOwnProperty('data') && !response.hasOwnProperty('message')) {
    return false;
  }
  
  // For error responses, check error field
  if (!response.success && !response.hasOwnProperty('error')) {
    return false;
  }
  
  return true;
}

/**
 * Transform data using a transformer function
 * @param {any} data - Data to transform (object or array)
 * @param {Function} transformer - Function to transform each item
 * @returns {any} Transformed data
 */
function transformData(data, transformer) {
  if (typeof transformer !== 'function') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(transformer);
  }
  
  if (data && typeof data === 'object') {
    return transformer(data);
  }
  
  return data;
}

/**
 * Exclude specified fields from object or array of objects
 * @param {Object|Array} data - Data to filter
 * @param {Array} fields - Fields to exclude
 * @returns {Object|Array} Filtered data
 */
function excludeFields(data, fields = []) {
  if (!fields || fields.length === 0) {
    return data;
  }
  
  function excludeFromObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const filtered = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!fields.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }
  
  if (Array.isArray(data)) {
    return data.map(excludeFromObject);
  }
  
  return excludeFromObject(data);
}

/**
 * Include only specified fields from object or array of objects
 * @param {Object|Array} data - Data to filter
 * @param {Array} fields - Fields to include
 * @returns {Object|Array} Filtered data
 */
function includeFields(data, fields = []) {
  if (!fields || fields.length === 0) {
    return data;
  }
  
  function includeFromObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const filtered = {};
    for (const field of fields) {
      if (obj.hasOwnProperty(field)) {
        filtered[field] = obj[field];
      }
    }
    return filtered;
  }
  
  if (Array.isArray(data)) {
    return data.map(includeFromObject);
  }
  
  return includeFromObject(data);
}

/**
 * Flatten nested object into dot notation keys
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Key prefix
 * @returns {Object} Flattened object
 */
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

/**
 * Sanitize response data for client consumption
 * @param {any} data - Data to sanitize
 * @param {Array} sensitiveFields - Fields to remove
 * @returns {any} Sanitized data
 */
function sanitizeResponseData(data, sensitiveFields = []) {
  const defaultSensitiveFields = [
    'password', 'secret', 'token', 'key', 'hash',
    'salt', 'privateKey', 'apiKey', 'refreshToken'
  ];
  
  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
  
  function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (allSensitiveFields.includes(key.toLowerCase())) {
        // Skip sensitive fields
        continue;
      }
      
      sanitized[key] = sanitizeObject(value);
    }
    
    return sanitized;
  }
  
  return sanitizeObject(data);
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  formatApiResponse,
  validationErrorResponse,
  authErrorResponse,
  authenticationErrorResponse,
  authorizationErrorResponse,
  notFoundErrorResponse,
  rateLimitErrorResponse,
  conflictErrorResponse,
  internalErrorResponse,
  transformResponseData,
  transformData,
  excludeFields,
  includeFields,
  flattenObject,
  addCorsHeaders,
  addCacheHeaders,
  validateResponseStructure,
  sanitizeResponseData,
  arrayToCsv,
  objectToXml
};