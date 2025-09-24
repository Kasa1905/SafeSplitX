/**
 * Configuration management for SafeSplitX middleware layer
 * Handles environment variables, API endpoints, and middleware settings
 */

require('dotenv').config();

/**
 * Default configuration values
 */
const defaults = {
  api: {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    retries: 3,
    retryDelay: 1000
  },
  auth: {
    tokenKey: 'splitsafex_token',
    refreshTokenKey: 'splitsafex_refresh_token',
    tokenExpiryBuffer: 300000, // 5 minutes in milliseconds
    storageType: 'localStorage' // or 'sessionStorage'
  },
  validation: {
    strictMode: true,
    sanitizeInputs: true
  },
  logging: {
    enabled: process.env.NODE_ENV !== 'production',
    level: 'info'
  }
};

/**
 * Load configuration from environment variables
 */
const config = {
  api: {
    baseURL: process.env.REACT_APP_API_BASE_URL || process.env.API_BASE_URL || defaults.api.baseURL,
    timeout: parseInt(process.env.API_TIMEOUT) || defaults.api.timeout,
    retries: parseInt(process.env.API_RETRIES) || defaults.api.retries,
    retryDelay: parseInt(process.env.API_RETRY_DELAY) || defaults.api.retryDelay
  },
  auth: {
    tokenKey: process.env.TOKEN_KEY || defaults.auth.tokenKey,
    refreshTokenKey: process.env.REFRESH_TOKEN_KEY || defaults.auth.refreshTokenKey,
    tokenExpiryBuffer: parseInt(process.env.TOKEN_EXPIRY_BUFFER) || defaults.auth.tokenExpiryBuffer,
    storageType: process.env.AUTH_STORAGE_TYPE || defaults.auth.storageType
  },
  validation: {
    strictMode: process.env.VALIDATION_STRICT_MODE === 'true' || defaults.validation.strictMode,
    sanitizeInputs: process.env.SANITIZE_INPUTS !== 'false'
  },
  logging: {
    enabled: process.env.MIDDLEWARE_LOGGING !== 'false' && defaults.logging.enabled,
    level: process.env.LOG_LEVEL || defaults.logging.level
  },
  environment: process.env.NODE_ENV || 'development'
};

/**
 * API endpoints configuration
 */
const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    register: '/auth/register',
    profile: '/auth/profile'
  },
  groups: {
    list: '/groups',
    create: '/groups',
    details: '/groups/:groupId',
    update: '/groups/:groupId',
    delete: '/groups/:groupId',
    join: '/groups/:groupId/join',
    leave: '/groups/:groupId/leave',
    members: '/groups/:groupId/members'
  },
  expenses: {
    list: '/expenses',
    create: '/expenses',
    details: '/expenses/:expenseId',
    update: '/expenses/:expenseId',
    delete: '/expenses/:expenseId',
    byGroup: '/groups/:groupId/expenses'
  },
  balances: {
    user: '/balances/user/:userId',
    group: '/balances/group/:groupId',
    summary: '/balances/summary'
  },
  settlements: {
    create: '/settlements',
    list: '/settlements',
    details: '/settlements/:settlementId',
    confirm: '/settlements/:settlementId/confirm'
  }
};

/**
 * Validate required configuration values
 */
function validateConfig() {
  const required = [
    'api.baseURL'
  ];

  const missing = [];

  required.forEach(path => {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (!value) {
      missing.push(path);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

/**
 * Get configuration value by path
 */
function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Set configuration value by path
 */
function setConfig(path, value) {
  const keys = path.split('.');
  let target = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {};
    }
    target = target[key];
  }
  
  target[keys[keys.length - 1]] = value;
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig() {
  return {
    isDevelopment: config.environment === 'development',
    isProduction: config.environment === 'production',
    isTest: config.environment === 'test'
  };
}

/**
 * Build complete API URL from endpoint
 */
function buildApiUrl(endpoint) {
  return `${config.api.baseURL}${endpoint}`;
}

/**
 * Replace URL parameters with values
 */
function buildUrl(template, params = {}) {
  let url = template;
  
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  });
  
  return url;
}

// Validate configuration on module load
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  if (config.environment === 'production') {
    throw error;
  }
}

module.exports = {
  config,
  endpoints,
  defaults,
  getConfig,
  setConfig,
  validateConfig,
  getEnvironmentConfig,
  buildApiUrl,
  buildUrl
};