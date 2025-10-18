/**
 * Error handling utilities for SafeSplitX middleware
 * Provides consistent error processing and user-friendly error messages
 */

const { getConfig } = require('./config');

/**
 * Error types and their corresponding user-friendly messages
 */
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  
  // Authentication errors
  UNAUTHORIZED: 'Authentication required. Please log in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  
  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_INPUT: 'The provided data is invalid.',
  MISSING_REQUIRED: 'Required fields are missing.',
  
  // Business logic errors
  DUPLICATE_ENTRY: 'This entry already exists.',
  NOT_FOUND: 'The requested resource was not found.',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action.',
  
  // General errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  MAINTENANCE_MODE: 'The system is currently under maintenance. Please try again later.'
};

/**
 * HTTP status code to error type mapping
 */
const STATUS_CODE_MAPPING = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'DUPLICATE_ENTRY',
  422: 'INVALID_INPUT',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'SERVER_ERROR',
  502: 'SERVER_ERROR',
  503: 'MAINTENANCE_MODE',
  504: 'TIMEOUT_ERROR'
};

/**
 * Handle API errors and normalize them to consistent format
 * @param {Error|Object} error - Error object or axios error response
 * @returns {Object} Normalized error response
 */
function handleApiError(error) {
  let errorResponse = {
    success: false,
    error: 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: null,
    timestamp: new Date().toISOString(),
    requestId: null
  };

  try {
    if (error.response) {
      // HTTP error response
      const { status, data, config } = error.response;
      
      errorResponse.statusCode = status;
      errorResponse.code = STATUS_CODE_MAPPING[status] || 'SERVER_ERROR';
      errorResponse.requestId = data?.requestId || config?.metadata?.requestId;
      
      // Extract error message from response
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorResponse.error = data.error;
        } else if (data.error.message) {
          errorResponse.error = data.error.message;
        } else if (data.error.details) {
          errorResponse.error = Array.isArray(data.error.details) 
            ? data.error.details.join(', ')
            : data.error.details;
        }
      } else if (data?.message) {
        errorResponse.error = data.message;
      } else {
        errorResponse.error = ERROR_MESSAGES[errorResponse.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
      }
      
      // Handle validation errors
      if (status === 422 && data?.errors) {
        errorResponse.validationErrors = data.errors;
        errorResponse.error = formatValidationErrors(data.errors);
      }
      
    } else if (error.request) {
      // Network error
      errorResponse.code = 'NETWORK_ERROR';
      errorResponse.error = ERROR_MESSAGES.NETWORK_ERROR;
      
      if (error.code === 'ECONNABORTED') {
        errorResponse.code = 'TIMEOUT_ERROR';
        errorResponse.error = ERROR_MESSAGES.TIMEOUT_ERROR;
      }
      
    } else if (error.message) {
      // Generic error
      errorResponse.error = error.message;
      
      // Check for specific error types
      if (error.message.toLowerCase().includes('network')) {
        errorResponse.code = 'NETWORK_ERROR';
        errorResponse.error = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (error.message.toLowerCase().includes('timeout')) {
        errorResponse.code = 'TIMEOUT_ERROR';
        errorResponse.error = ERROR_MESSAGES.TIMEOUT_ERROR;
      }
    }
    
    // Log error if logging is enabled
    if (getConfig('logging.enabled', false)) {
      logError(error, errorResponse);
    }
    
  } catch (processingError) {
    console.error('Error processing API error:', processingError);
    errorResponse.error = ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  return errorResponse;
}

/**
 * Format validation errors into user-friendly message
 * @param {Array|Object} errors - Validation errors
 * @returns {string} Formatted error message
 */
function formatValidationErrors(errors) {
  if (!errors) return ERROR_MESSAGES.VALIDATION_ERROR;
  
  if (Array.isArray(errors)) {
    return errors.join(', ');
  }
  
  if (typeof errors === 'object') {
    const messages = [];
    
    Object.entries(errors).forEach(([field, message]) => {
      if (Array.isArray(message)) {
        messages.push(`${field}: ${message.join(', ')}`);
      } else {
        messages.push(`${field}: ${message}`);
      }
    });
    
    return messages.join('; ');
  }
  
  return errors.toString();
}

/**
 * Format error message for user display
 * @param {string} errorCode - Error code
 * @param {string} customMessage - Custom error message
 * @returns {string} User-friendly error message
 */
function formatErrorMessage(errorCode, customMessage = null) {
  if (customMessage) return customMessage;
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Check if error is a network error
 * @param {Error|Object} error - Error object
 * @returns {boolean} Whether error is network-related
 */
function isNetworkError(error) {
  return !error.response && error.request;
}

/**
 * Check if error is a timeout error
 * @param {Error|Object} error - Error object
 * @returns {boolean} Whether error is timeout-related
 */
function isTimeoutError(error) {
  return error.code === 'ECONNABORTED' || 
         error.message?.toLowerCase().includes('timeout');
}

/**
 * Check if error is authentication-related
 * @param {Error|Object} error - Error object
 * @returns {boolean} Whether error is authentication-related
 */
function isAuthError(error) {
  if (error.response) {
    const status = error.response.status;
    return status === 401 || status === 403;
  }
  return false;
}

/**
 * Check if error is a validation error
 * @param {Error|Object} error - Error object
 * @returns {boolean} Whether error is validation-related
 */
function isValidationError(error) {
  if (error.response) {
    const status = error.response.status;
    return status === 400 || status === 422;
  }
  return false;
}

/**
 * Get error details for debugging
 * @param {Error|Object} error - Error object
 * @returns {Object} Detailed error information
 */
function getErrorDetails(error) {
  return {
    message: error.message || 'Unknown error',
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    url: error.config?.url,
    method: error.config?.method,
    data: error.config?.data,
    headers: error.config?.headers,
    stack: error.stack
  };
}

/**
 * Log error with appropriate level
 * @param {Error|Object} originalError - Original error object
 * @param {Object} processedError - Processed error response
 */
function logError(originalError, processedError) {
  const logLevel = getConfig('logging.level', 'info');
  const details = getErrorDetails(originalError);
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: processedError.error,
    code: processedError.code,
    statusCode: processedError.statusCode,
    requestId: processedError.requestId,
    details: logLevel === 'debug' ? details : {
      message: details.message,
      status: details.status,
      url: details.url,
      method: details.method
    }
  };
  
  console.error('API Error:', logEntry);
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code
 * @param {Object} additional - Additional error data
 * @returns {Object} Standardized error response
 */
function createError(message, code = 'UNKNOWN_ERROR', statusCode = null, additional = {}) {
  return {
    success: false,
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    ...additional
  };
}

/**
 * Handle and retry failed requests
 * @param {Function} requestFn - Request function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} Request result
 */
async function retryRequest(requestFn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      if (isAuthError(error) || isValidationError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

module.exports = {
  handleApiError,
  formatErrorMessage,
  formatValidationErrors,
  isNetworkError,
  isTimeoutError,
  isAuthError,
  isValidationError,
  getErrorDetails,
  createError,
  retryRequest,
  ERROR_MESSAGES,
  STATUS_CODE_MAPPING
};