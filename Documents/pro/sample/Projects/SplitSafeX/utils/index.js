/**
 * Main utilities index file
 * Central point for importing all utility functions
 */

const sanitizer = require('./sanitizer');
const errorHandler = require('./errorHandler');
const logger = require('./logger');
const config = require('./config');
const validation = require('./validation');
const response = require('./response');
const helpers = require('./helpers');

module.exports = {
  // Input Sanitization
  sanitizer,
  sanitizeString: sanitizer.sanitizeString,
  sanitizeEmail: sanitizer.sanitizeEmail,
  sanitizeNumber: sanitizer.sanitizeNumber,
  sanitizeHtml: sanitizer.sanitizeHtml,
  sanitizeObject: sanitizer.sanitizeObject,
  sanitizeArray: sanitizer.sanitizeArray,
  whitelistFields: sanitizer.whitelistFields,
  removeDangerousPatterns: sanitizer.removeDangerousPatterns,
  
  // Error Handling
  errorHandler,
  AppError: errorHandler.AppError,
  createError: errorHandler.createError,
  formatError: errorHandler.formatError,
  createValidationError: errorHandler.createValidationError,
  createAuthError: errorHandler.createAuthError,
  createAuthenticationError: errorHandler.createAuthenticationError, // AppError factory
  createAuthorizationError: errorHandler.createAuthorizationError,
  createNotFoundError: errorHandler.createNotFoundError,
  createBusinessError: errorHandler.createBusinessError,
  
  // Logging
  logger,
  fraudLogger: logger.fraudLogger,
  settlementLogger: logger.settlementLogger,
  transactionLogger: logger.transactionLogger,
  securityLogger: logger.securityLogger,
  auditLogger: logger.auditLogger,
  performanceLogger: logger.performanceLogger,
  
  // Configuration
  config,
  getConfig: config.getConfig,
  getDatabaseConfig: config.getDatabaseConfig,
  getJWTConfig: config.getJWTConfig,
  getRedisConfig: config.getRedisConfig,
  getEmailConfig: config.getEmailConfig,
  getAppConfig: config.getAppConfig,
  
  // Validation
  validation,
  ValidationResult: validation.ValidationResult,
  validateEmail: validation.validateEmail,
  validatePhone: validation.validatePhone,
  validateCurrency: validation.validateCurrency,
  validateAmount: validation.validateAmount,
  validateDate: validation.validateDate,
  validateId: validation.validateId,
  validatePassword: validation.validatePassword,
  validateSchema: validation.validateSchema,
  
  // Response Formatting
  response,
  successResponse: response.successResponse,
  errorResponse: response.errorResponse,
  paginatedResponse: response.paginatedResponse,
  formatApiResponse: response.formatApiResponse,
  validationErrorResponse: response.validationErrorResponse,
  authErrorResponse: response.authErrorResponse,
  authenticationErrorResponse: response.authErrorResponse, // Alias for backward compatibility
  authorizationErrorResponse: response.authorizationErrorResponse,
  notFoundErrorResponse: response.notFoundErrorResponse,
  rateLimitErrorResponse: response.rateLimitErrorResponse,
  transformData: response.transformData,
  excludeFields: response.excludeFields,
  includeFields: response.includeFields,
  flattenObject: response.flattenObject,
  
  // Helpers
  helpers,
  generateId: helpers.generateId,
  formatCurrency: helpers.formatCurrency,
  formatDate: helpers.formatDate,
  formatRelativeTime: helpers.formatRelativeTime,
  formatNumber: helpers.formatNumber,
  deepClone: helpers.deepClone,
  debounce: helpers.debounce,
  throttle: helpers.throttle,
  capitalize: helpers.capitalize,
  toCamelCase: helpers.toCamelCase,
  toSnakeCase: helpers.toSnakeCase,
  toKebabCase: helpers.toKebabCase,
  truncate: helpers.truncate,
  isEmpty: helpers.isEmpty,
  getNestedProperty: helpers.getNestedProperty,
  setNestedProperty: helpers.setNestedProperty,
  removeDuplicates: helpers.removeDuplicates,
  groupBy: helpers.groupBy,
  sortBy: helpers.sortBy,
  range: helpers.range,
  sleep: helpers.sleep,
  retry: helpers.retry
};

// Quick access collections for common use cases
module.exports.utils = {
  // Security utilities
  security: {
    sanitizeString: sanitizer.sanitizeString,
    sanitizeEmail: sanitizer.sanitizeEmail,
    sanitizeNumber: sanitizer.sanitizeNumber,
    sanitizeHtml: sanitizer.sanitizeHtml,
    sanitizeObject: sanitizer.sanitizeObject,
    sanitizeArray: sanitizer.sanitizeArray,
    whitelistFields: sanitizer.whitelistFields,
    removeDangerousPatterns: sanitizer.removeDangerousPatterns
  },
  
  // Validation utilities
  validate: {
    email: validation.validateEmail,
    phone: validation.validatePhone,
    currency: validation.validateCurrency,
    amount: validation.validateAmount,
    date: validation.validateDate,
    id: validation.validateId,
    password: validation.validatePassword,
    schema: validation.validateSchema
  },
  
  // String utilities
  string: {
    capitalize: helpers.capitalize,
    toCamelCase: helpers.toCamelCase,
    toSnakeCase: helpers.toSnakeCase,
    toKebabCase: helpers.toKebabCase,
    truncate: helpers.truncate
  },
  
  // Array utilities
  array: {
    removeDuplicates: helpers.removeDuplicates,
    groupBy: helpers.groupBy,
    sortBy: helpers.sortBy
  },
  
  // Object utilities
  object: {
    deepClone: helpers.deepClone,
    isEmpty: helpers.isEmpty,
    getNestedProperty: helpers.getNestedProperty,
    setNestedProperty: helpers.setNestedProperty,
    transformData: response.transformData,
    excludeFields: response.excludeFields,
    includeFields: response.includeFields,
    flattenObject: response.flattenObject
  },
  
  // Format utilities
  format: {
    currency: helpers.formatCurrency,
    date: helpers.formatDate,
    relativeTime: helpers.formatRelativeTime,
    number: helpers.formatNumber
  },
  
  // Function utilities
  function: {
    debounce: helpers.debounce,
    throttle: helpers.throttle,
    retry: helpers.retry,
    sleep: helpers.sleep
  },
  
  // Response utilities
  response: {
    success: response.successResponse,
    error: response.errorResponse,
    paginated: response.paginatedResponse,
    format: response.formatApiResponse,
    validationError: response.validationErrorResponse,
    authError: response.authenticationErrorResponse,
    authzError: response.authorizationErrorResponse,
    notFound: response.notFoundErrorResponse,
    conflict: response.conflictErrorResponse,
    rateLimit: response.rateLimitErrorResponse,
    internal: response.internalErrorResponse
  }
};