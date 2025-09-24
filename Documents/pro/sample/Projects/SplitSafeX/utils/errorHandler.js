/**
 * Standardized error handling utilities for SafeSplitX
 * Implements team's established error response format
 */

const { generateId } = require('./helpers');
const logger = require('./logger');

/**
 * Error codes mapping
 */
const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Business logic errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INVALID_OPERATION: 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION'
};

/**
 * HTTP status codes mapping
 */
const STATUS_CODES = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.INVALID_TOKEN]: 401,
  [ERROR_CODES.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.INVALID_CREDENTIALS]: 401,
  
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,
  [ERROR_CODES.ACCESS_DENIED]: 403,
  
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 404,
  
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 409,
  
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
  
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 400,
  [ERROR_CODES.TRANSACTION_FAILED]: 400,
  [ERROR_CODES.INVALID_OPERATION]: 400,
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 400
};

/**
 * User-friendly error messages
 */
const USER_MESSAGES = {
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again',
  [ERROR_CODES.INVALID_INPUT]: 'The provided data is invalid',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required information is missing',
  
  [ERROR_CODES.UNAUTHORIZED]: 'Please log in to continue',
  [ERROR_CODES.INVALID_TOKEN]: 'Your session is invalid. Please log in again',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  
  [ERROR_CODES.FORBIDDEN]: 'You don\'t have permission to perform this action',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You don\'t have sufficient permissions',
  [ERROR_CODES.ACCESS_DENIED]: 'Access to this resource is denied',
  
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource could not be found',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'A resource with this information already exists',
  
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal error occurred. Please try again later',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable',
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred. Please try again later',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred',
  
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction',
  [ERROR_CODES.TRANSACTION_FAILED]: 'The transaction could not be completed',
  [ERROR_CODES.INVALID_OPERATION]: 'This operation is not allowed',
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'This action violates business rules'
};

/**
 * Custom error class with flexible constructor signatures
 */
class AppError extends Error {
  constructor(...args) {
    // Detect constructor signature
    let message, code, statusCode, details;
    
    if (args.length === 0) {
      // No arguments - use defaults
      message = 'Internal error';
      code = ERROR_CODES.INTERNAL_ERROR;
      statusCode = 500;
      details = {};
    } else if (args.length === 1) {
      // Single argument - treat as message
      message = args[0];
      code = ERROR_CODES.INTERNAL_ERROR;
      statusCode = 500;
      details = {};
    } else if (args.length >= 3 && typeof args[0] === 'string' && typeof args[1] === 'number') {
      // Legacy signature: (code, statusCode, message, details?)
      code = args[0];
      statusCode = args[1];
      message = args[2];
      details = args[3] || {};
    } else {
      // Canonical signature: (message, code?, statusCode?, details?)
      message = args[0];
      code = args[1] || ERROR_CODES.INTERNAL_ERROR;
      statusCode = args[2] || STATUS_CODES[code] || 500;
      details = args[3] || {};
    }
    
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date(); // Return actual Date object
    this.requestId = generateId();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create standardized error object (original function - returns formatted object)
 * @param {number} statusCode - HTTP status code 
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @param {string} type - Error type/category
 * @returns {Object} Standardized error object
 */
function createErrorResponse(statusCode, message, code = ERROR_CODES.INTERNAL_ERROR, details = {}, type = 'general') {
  const userMessage = USER_MESSAGES[code] || message;
  
  const error = {
    success: false,
    error: {
      code,
      message, // Keep original message for formatError compatibility
      userMessage: userMessage, // Add user-friendly message
      statusCode,
      type,
      timestamp: new Date().toISOString(), // Move timestamp to error level
      details: {
        ...details,
        originalMessage: message !== userMessage ? message : undefined,
        requestId: generateId()
      }
    }
  };
  
  // Handle stack trace at error level in development
  if (process.env.NODE_ENV === 'development' && details.stack) {
    error.error.stack = details.stack;
    delete error.error.details.stack;
  }
  
  // Remove undefined values
  if (!error.error.details.originalMessage) {
    delete error.error.details.originalMessage;
  }
  
  return error;
}

/**
 * Flexible createError that handles multiple signatures
 * @param {...any} args - Various argument patterns
 * @returns {Object|AppError} Error object or AppError instance
 */
function createError(...args) {
  // Detect legacy signature: (code, statusCode, message, details?)
  // This should return an AppError instance for backward compatibility
  if (args.length >= 3 && typeof args[0] === 'string' && typeof args[1] === 'number' && typeof args[2] === 'string') {
    const [code, statusCode, message, details = {}] = args;
    return new AppError(code, statusCode, message, details); // Using legacy constructor order
  }
  
  // Use original signature: (statusCode, message, code, details, type)
  // This returns a formatted object
  return createErrorResponse(...args);
}

/**
 * Format error for consistent response structure
 * @param {Error|Object} error - Error to format
 * @param {Object} context - Additional context
 * @returns {Object} Formatted error response
 */
function formatError(error, context = {}) {
  let code = ERROR_CODES.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';
  let details = {};
  let statusCode = 500;
  let type = 'general';
  
  if (error instanceof AppError) {
    code = error.code;
    message = error.message; // Use original message, not user-friendly message
    details = error.details;
    statusCode = error.statusCode;
    type = 'app';
  } else if (error instanceof Error) {
    message = error.message; // Use original message
    details = {
      ...context
    };
    // Add stack to top-level in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      details.stack = error.stack;
    }
  } else if (typeof error === 'object' && error.code) {
    code = error.code;
    message = error.message || message;
    details = error.details || {};
    statusCode = error.statusCode || STATUS_CODES[code] || 500;
    type = error.type || 'general';
  }
  
  return createErrorResponse(statusCode, message, code, { ...details, ...context }, type);
}

/**
 * Handle different types of errors
 * @param {Error|Object} error - Error to handle
 * @param {Object} context - Request context
 * @returns {Object} Handled error response
 */
function handleError(error, context = {}) {
  const formattedError = formatError(error, context);
  
  // Log the error
  logger.securityLogger.error('Error occurred', {
    ...formattedError,
    context,
    stack: error.stack
  });
  
  // Log security-related errors separately
  if (isSecurityError(formattedError.error.code)) {
    logger.securityLogger.warn('Security-related error', {
      code: formattedError.error.code,
      message: formattedError.error.message,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  return formattedError;
}

/**
 * Check if error is operational (expected) vs programming error
 * @param {Error|Object} error - Error to check
 * @returns {boolean} True if operational error
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  
  if (error && error.code && ERROR_CODES[error.code]) {
    return true;
  }
  
  // Common operational error patterns
  const operationalPatterns = [
    /validation/i,
    /unauthorized/i,
    /forbidden/i,
    /not found/i,
    /already exists/i,
    /insufficient/i
  ];
  
  const message = error.message || error.toString();
  return operationalPatterns.some(pattern => pattern.test(message));
}

/**
 * Check if error is security-related
 * @param {string} code - Error code
 * @returns {boolean} True if security-related error
 */
function isSecurityError(code) {
  const securityCodes = [
    ERROR_CODES.UNAUTHORIZED,
    ERROR_CODES.INVALID_TOKEN,
    ERROR_CODES.TOKEN_EXPIRED,
    ERROR_CODES.INVALID_CREDENTIALS,
    ERROR_CODES.FORBIDDEN,
    ERROR_CODES.INSUFFICIENT_PERMISSIONS,
    ERROR_CODES.ACCESS_DENIED
  ];
  
  return securityCodes.includes(code);
}

/**
 * Create validation error - returns AppError instance to match test expectations
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {AppError} AppError instance for validation error
 */
function createValidationError(message = 'Validation failed', details = {}) {
  return new AppError(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
}

// Compatibility wrappers for AppError instances
/**
 * Create authentication error (returns AppError instance)
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {AppError} AppError instance
 */
function createAuthenticationError(message, details = {}) {
  return new AppError(message, 'AUTHENTICATION_ERROR', 401, details);
}

/**
 * Create authorization error (returns AppError instance)
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {AppError} AppError instance
 */
function createAuthorizationError(message, details = {}) {
  return new AppError(message, 'AUTHORIZATION_ERROR', 403, details);
}

/**
 * Create not found error (returns AppError instance)
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {AppError} AppError instance
 */
function createNotFoundError(message, details = {}) {
  return new AppError(message, 'NOT_FOUND_ERROR', 404, details);
}



/**
 * Format AppError or generic error to standardized response object
 * @param {AppError|Error} appError - Error to format
 * @returns {Object} Formatted error response
 */
function formatAppError(appError) {
  if (appError instanceof AppError) {
    return createErrorResponse(appError.statusCode, appError.message, appError.code, appError.details, 'app');
  }
  
  return createErrorResponse(500, appError.message || 'Internal error', ERROR_CODES.INTERNAL_ERROR, {}, 'general');
}

/**
 * Legacy create authentication error (returns formatted object)
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {Object} Formatted authentication error
 */
function createAuthError(message = 'Authentication required', details = {}) {
  return createErrorResponse(401, message, ERROR_CODES.UNAUTHORIZED, details, 'auth');
}

// Alias for createAuthorizationError that returns formatted object
function createForbiddenError(message = 'Access denied', details = {}) {
  return createErrorResponse(403, message, ERROR_CODES.FORBIDDEN, details, 'auth');
}

/**
 * Create business logic error
 * @param {string} message - Error message
 * @param {string} code - Specific business error code
 * @param {Object} details - Additional details
 * @returns {Object} Formatted business error
 */
function createBusinessError(message, code = ERROR_CODES.BUSINESS_RULE_VIOLATION, details = {}) {
  const statusCode = STATUS_CODES[code] || 400;
  return createErrorResponse(statusCode, message, code, details, 'business');
}

module.exports = {
  AppError,
  createError,
  formatError,
  formatAppError,
  handleError,
  isOperationalError,
  isSecurityError,
  createValidationError,
  createAuthError,
  createAuthenticationError,
  createAuthorizationError,
  createForbiddenError,
  createNotFoundError,
  createBusinessError,
  ERROR_CODES,
  STATUS_CODES,
  USER_MESSAGES
};