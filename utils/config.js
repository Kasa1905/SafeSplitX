/**
 * Comprehensive configuration management utilities for SafeSplitX
 * Handles environment variables, validation, and type checking
 */

const fs = require('fs');
const path = require('path');
const Joi = require('joi');

/**
 * Configuration schema for validation
 */
const configSchema = Joi.object({
  // Application metadata
  APP_NAME: Joi.string().default('SafeSplitX'),
  APP_VERSION: Joi.string().default('1.0.0'),
  
  // Server configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('localhost'),
  
  // Database configuration
  MONGODB_URI: Joi.string().uri().required(),
  DB_NAME: Joi.string().default('safesplitx'),
  DB_MAX_CONNECTIONS: Joi.number().positive().default(10),
  DB_TIMEOUT: Joi.number().positive().default(30000),
  
  // Authentication configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(8).max(15).default(12),
  
  // Session configuration
  SESSION_SECRET: Joi.string().min(32).required(),
  SESSION_MAX_AGE: Joi.number().positive().default(86400000), // 24 hours
  
  // API Keys and External Services
  PLAID_CLIENT_ID: Joi.string().optional(),
  PLAID_SECRET: Joi.string().optional(),
  PLAID_ENV: Joi.string().valid('sandbox', 'development', 'production').default('sandbox'),
  
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  
  PAYPAL_CLIENT_ID: Joi.string().optional(),
  PAYPAL_CLIENT_SECRET: Joi.string().optional(),
  PAYPAL_MODE: Joi.string().valid('sandbox', 'live').default('sandbox'),
  
  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),
  
  // Email configuration
  EMAIL_PROVIDER: Joi.string().valid('sendgrid', 'ses', 'mailgun').default('sendgrid'),
  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
  
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  
  MAILGUN_API_KEY: Joi.string().optional(),
  MAILGUN_DOMAIN: Joi.string().optional(),
  
  // SMS configuration
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),
  
  // Currency and Exchange
  EXCHANGE_RATES_API_KEY: Joi.string().optional(),
  CURRENCY_API_PROVIDER: Joi.string().valid('fixer', 'exchangerate', 'currencylayer').default('fixer'),
  DEFAULT_CURRENCY: Joi.string().length(3).uppercase().default('USD'),
  
  // Redis configuration
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).default(0),
  
  // File storage
  STORAGE_PROVIDER: Joi.string().valid('local', 's3', 'gcs').default('local'),
  S3_BUCKET_NAME: Joi.string().optional(),
  GCS_BUCKET_NAME: Joi.string().optional(),
  UPLOAD_MAX_SIZE: Joi.number().positive().default(5242880), // 5MB
  
  // Security settings
  CORS_ORIGINS: Joi.string().default('*'),
  RATE_LIMIT_WINDOW: Joi.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().positive().default(100),
  ENABLE_HTTPS: Joi.boolean().default(false),
  
  // Logging configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.boolean().default(true),
  LOG_CONSOLE: Joi.boolean().default(true),
  LOG_MAX_SIZE: Joi.string().default('10m'),
  LOG_MAX_FILES: Joi.number().positive().default(5),
  
  // Fraud detection
  FRAUD_DETECTION_ENABLED: Joi.boolean().default(true),
  MAX_TRANSACTION_AMOUNT: Joi.number().positive().default(10000),
  SUSPICIOUS_ACTIVITY_THRESHOLD: Joi.number().positive().default(5),
  
  // Feature flags
  ENABLE_SOCIAL_LOGIN: Joi.boolean().default(false),
  ENABLE_TWO_FACTOR_AUTH: Joi.boolean().default(false),
  ENABLE_EMAIL_VERIFICATION: Joi.boolean().default(true),
  ENABLE_SMS_NOTIFICATIONS: Joi.boolean().default(false),
  
  // Development/Debug settings
  DEBUG: Joi.boolean().default(false),
  VERBOSE_LOGGING: Joi.boolean().default(false),
  MOCK_EXTERNAL_SERVICES: Joi.boolean().default(false)
});

/**
 * Configuration cache
 */
let configCache = null;
let configTimestamp = null;

/**
 * Load environment variables from .env file
 * @param {string} envPath - Path to .env file
 */
function loadEnvFile(envPath = '.env') {
  const fullPath = path.resolve(process.cwd(), envPath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`Environment file not found: ${fullPath}`);
    return;
  }
  
  const envContent = fs.readFileSync(fullPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1');
    
    if (key && value !== undefined && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Load configuration from environment variables
 * @param {boolean} forceReload - Force reload configuration
 * @returns {Object} Configuration object
 */
function loadConfig(forceReload = false) {
  const now = Date.now();
  
  // Return cached config if available and recent (5 minutes)
  if (!forceReload && configCache && configTimestamp && (now - configTimestamp) < 300000) {
    return configCache;
  }
  
  // Load .env file if not in production
  if (process.env.NODE_ENV !== 'production') {
    loadEnvFile();
  }
  
  const rawConfig = {};
  
  // Extract configuration from environment variables
  for (const key of Object.keys(configSchema.describe().keys)) {
    if (process.env[key] !== undefined) {
      let value = process.env[key];
      
      // Parse boolean values
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Parse number values
      else if (/^\d+$/.test(value)) value = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
      
      rawConfig[key] = value;
    }
  }
  
  // Validate configuration
  const { error, value: validatedConfig } = configSchema.validate(rawConfig, {
    allowUnknown: true,
    stripUnknown: false
  });
  
  if (error) {
    throw new Error(`Configuration validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }
  
  // Cache the configuration
  configCache = validatedConfig;
  configTimestamp = now;
  
  return validatedConfig;
}

/**
 * Get specific configuration value
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Configuration value
 */
function getConfig(key, defaultValue = undefined) {
  const config = loadConfig();
  
  // Support dot notation for nested keys
  if (key.includes('.')) {
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Set configuration value (runtime only)
 * @param {string} key - Configuration key
 * @param {any} value - Configuration value
 */
function setConfig(key, value) {
  if (!configCache) {
    loadConfig();
  }
  
  if (key.includes('.')) {
    const keys = key.split('.');
    let current = configCache;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  } else {
    configCache[key] = value;
  }
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result
 */
function validateConfig(config = null) {
  const configToValidate = config || loadConfig();
  
  const { error, value, warning } = configSchema.validate(configToValidate, {
    allowUnknown: true,
    stripUnknown: false,
    warnings: true
  });
  
  return {
    isValid: !error,
    error: error ? error.details.map(d => d.message) : null,
    warnings: warning ? warning.details.map(d => d.message) : null,
    validatedConfig: value
  };
}

/**
 * Get database configuration
 * @returns {Object} Database configuration
 */
function getDatabaseConfig() {
  const config = loadConfig();
  
  return {
    uri: config.MONGODB_URI,
    name: config.DB_NAME,
    options: {
      maxPoolSize: config.DB_MAX_CONNECTIONS,
      socketTimeoutMS: config.DB_TIMEOUT,
      serverSelectionTimeoutMS: config.DB_TIMEOUT,
      useUnifiedTopology: true,
      useNewUrlParser: true
    }
  };
}

/**
 * Get JWT configuration
 * @returns {Object} JWT configuration
 */
function getJWTConfig() {
  const config = loadConfig();
  
  return {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshSecret: config.JWT_REFRESH_SECRET,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'SafeSplitX'
  };
}

/**
 * Get Redis configuration
 * @returns {Object|null} Redis configuration
 */
function getRedisConfig() {
  const config = loadConfig();
  
  if (config.REDIS_URL) {
    return { url: config.REDIS_URL };
  }
  
  if (config.REDIS_HOST) {
    return {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      db: config.REDIS_DB
    };
  }
  
  return null;
}

/**
 * Get email configuration
 * @returns {Object} Email configuration
 */
function getEmailConfig() {
  const config = loadConfig();
  
  const baseConfig = {
    provider: config.EMAIL_PROVIDER
  };
  
  switch (config.EMAIL_PROVIDER) {
    case 'sendgrid':
      return {
        ...baseConfig,
        apiKey: config.SENDGRID_API_KEY,
        fromEmail: config.SENDGRID_FROM_EMAIL
      };
    case 'ses':
      return {
        ...baseConfig,
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        region: config.AWS_REGION
      };
    case 'mailgun':
      return {
        ...baseConfig,
        apiKey: config.MAILGUN_API_KEY,
        domain: config.MAILGUN_DOMAIN
      };
    default:
      return baseConfig;
  }
}

/**
 * Check if running in production
 * @returns {boolean} True if production environment
 */
function isProduction() {
  return getConfig('NODE_ENV') === 'production';
}

/**
 * Check if running in development
 * @returns {boolean} True if development environment
 */
function isDevelopment() {
  return getConfig('NODE_ENV') === 'development';
}

/**
 * Check if running in test mode
 * @returns {boolean} True if test environment
 */
function isTest() {
  return getConfig('NODE_ENV') === 'test';
}

/**
 * Get application-specific configuration
 * @returns {Object} App configuration object
 */
function getAppConfig() {
  const config = loadConfig();
  
  return {
    name: config.APP_NAME || 'SafeSplitX',
    version: config.APP_VERSION || '1.0.0',
    environment: config.NODE_ENV,
    port: config.PORT,
    host: config.HOST,
    debug: config.DEBUG,
    features: {
      socialLogin: config.ENABLE_SOCIAL_LOGIN,
      twoFactorAuth: config.ENABLE_TWO_FACTOR_AUTH,
      emailVerification: config.ENABLE_EMAIL_VERIFICATION,
      smsNotifications: config.ENABLE_SMS_NOTIFICATIONS,
      fraudDetection: config.FRAUD_DETECTION_ENABLED
    },
    security: {
      enableHttps: config.ENABLE_HTTPS,
      corsOrigins: config.CORS_ORIGINS.split(',').map(origin => origin.trim()),
      rateLimit: {
        window: config.RATE_LIMIT_WINDOW,
        max: config.RATE_LIMIT_MAX
      }
    },
    logging: {
      level: config.LOG_LEVEL,
      file: config.LOG_FILE,
      console: config.LOG_CONSOLE,
      verbose: config.VERBOSE_LOGGING
    },
    storage: {
      provider: config.STORAGE_PROVIDER,
      maxSize: config.UPLOAD_MAX_SIZE
    },
    currency: {
      default: config.DEFAULT_CURRENCY,
      apiProvider: config.CURRENCY_API_PROVIDER
    },
    limits: {
      maxTransactionAmount: config.MAX_TRANSACTION_AMOUNT,
      suspiciousActivityThreshold: config.SUSPICIOUS_ACTIVITY_THRESHOLD
    }
  };
}

/**
 * Get all configuration (for debugging)
 * @returns {Object} Full configuration object
 */
function getAllConfig() {
  return loadConfig();
}

/**
 * Clear configuration cache
 */
function clearCache() {
  configCache = null;
  configTimestamp = null;
}

module.exports = {
  loadConfig,
  getConfig,
  setConfig,
  validateConfig,
  getDatabaseConfig,
  getJWTConfig,
  getRedisConfig,
  getEmailConfig,
  getAppConfig,
  isProduction,
  isDevelopment,
  isTest,
  getAllConfig,
  clearCache,
  configSchema
};