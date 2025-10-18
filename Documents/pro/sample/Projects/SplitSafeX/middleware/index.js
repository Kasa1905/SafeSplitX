/**
 * Middleware Module Entry Point
 * Exports all middleware functionality for SafeSplitX frontend integration
 */

// Core API functions
const {
  loginUser,
  logoutUser,
  createGroup,
  addExpense,
  getBalances,
  settleUp,
  getUserGroups,
  getGroupExpenses,
  getUserProfile
} = require('./api');

// Authentication utilities
const {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  isAuthenticated,
  getCurrentUser,
  shouldRefreshToken,
  addAuthListener,
  removeAuthListener,
  notifyAuthListeners
} = require('./auth');

// HTTP client utilities
const {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  createCancellableRequest,
  batchRequests,
  healthCheck
} = require('./httpClient');

// Validation utilities
const {
  validateCredentials,
  validateGroupData,
  validateExpenseData,
  validateSettlementData,
  validateRegistration,
  sanitizeObject,
  sanitizeString
} = require('./validation');

// Response formatting utilities
const {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  transformResponse,
  formatUser,
  formatGroup,
  formatExpense,
  formatBalance,
  formatSettlement
} = require('./responseFormatter');

// Error handling utilities
const {
  handleApiError,
  isNetworkError,
  isAuthError,
  isValidationError,
  retryRequest
} = require('./errorHandler');

// Configuration utilities
const {
  config,
  endpoints,
  buildUrl,
  validateConfig,
  getEnvironmentConfig
} = require('./config');

// Main API object for easy access
const SafeSplitAPI = {
  // Authentication
  auth: {
    login: loginUser,
    logout: logoutUser,
    profile: getUserProfile,
    isAuthenticated,
    getCurrentUser,
    setAuthToken,
    getAuthToken,
    clearAuthToken,
    shouldRefreshToken,
    addAuthListener,
    removeAuthListener
  },

  // Groups
  groups: {
    create: createGroup,
    list: getUserGroups
  },

  // Expenses
  expenses: {
    add: addExpense,
    getByGroup: getGroupExpenses
  },

  // Balances & Settlements
  balances: {
    get: getBalances
  },

  settlements: {
    create: settleUp
  },

  // Utilities
  utils: {
    validation: {
      validateCredentials,
      validateGroupData,
      validateExpenseData,
      validateSettlementData,
      validateRegistration,
      sanitizeObject,
      sanitizeString
    },
    http: {
      get,
      post,
      put,
      patch,
      del,
      upload,
      cancelRequest: createCancellableRequest,
      batch: batchRequests,
      healthCheck
    },
    response: {
      createSuccessResponse,
      createErrorResponse,
      createPaginatedResponse,
      transformResponse,
      formatUser,
      formatGroup,
      formatExpense,
      formatBalance,
      formatSettlement
    },
    error: {
      handleApiError,
      isNetworkError,
      isAuthError,
      isValidationError,
      retryRequest
    },
    config: {
      config,
      endpoints,
      buildUrl,
      validateConfig,
      getEnvironmentConfig
    }
  }
};

// Legacy exports for backward compatibility
module.exports = {
  // Main API object
  SafeSplitAPI,

  // Direct function exports
  loginUser,
  logoutUser,
  createGroup,
  addExpense,
  getBalances,
  settleUp,
  getUserGroups,
  getGroupExpenses,
  getUserProfile,

  // Auth utilities
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  isAuthenticated,
  getCurrentUser,
  shouldRefreshToken,
  addAuthListener,
  removeAuthListener,
  notifyAuthListeners,

  // HTTP utilities
  get,
  post,
  put,
  patch,
  del,
  upload,
  cancelRequest: createCancellableRequest,
  batch: batchRequests,
  healthCheck,

  // Validation utilities
  validateCredentials,
  validateGroupData,
  validateExpenseData,
  validateSettlementData,
  validateRegistration,
  sanitizeObject,
  sanitizeString,

  // Response utilities
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  transformResponse,
  formatUser,
  formatGroup,
  formatExpense,
  formatBalance,
  formatSettlement,

  // Error handling utilities
  handleApiError,
  isNetworkError,
  isAuthError,
  isValidationError,
  retryRequest,

  // Config utilities
  config,
  endpoints,
  buildUrl,
  validateConfig,
  getEnvironmentConfig
};