const path = require('path');

/**
 * Centralized Configuration Management
 * Provides clean access to environment variables with validation and defaults
 */
class ServerConfig {
  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  loadConfiguration() {
    return {
      // Server Configuration
      server: {
        port: parseInt(process.env.PORT || '5000'),
        host: process.env.HOST || '0.0.0.0',
        environment: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      },

      // Security Configuration
      security: {
        jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
        enableAuth: process.env.ENABLE_AUTH !== 'false'
      },

      // Rate Limiting Configuration
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000)), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        enabled: process.env.ENABLE_RATE_LIMITING !== 'false'
      },

      // AI Services Configuration
      aiServices: {
        enabled: process.env.ENABLE_AI_SERVICES !== 'false',
        strictMode: process.env.AI_STRICT_MODE === 'true',
        healthCheckInterval: parseInt(process.env.AI_HEALTH_CHECK_INTERVAL_MS || '30000'),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.AI_TIMEOUT_MS || '10000')
      },

      // Database Configuration
      database: {
        type: process.env.DB_TYPE || 'mongodb',
        mongoUri: process.env.MONGODB_URI,
        postgresUri: process.env.POSTGRES_URI,
        postgresHost: process.env.POSTGRES_HOST,
        postgresPort: parseInt(process.env.POSTGRES_PORT || '5432'),
        postgresDb: process.env.POSTGRES_DB,
        postgresUser: process.env.POSTGRES_USER,
        postgresPassword: process.env.POSTGRES_PASSWORD
      },

      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
      },

      // Feature Flags
      features: {
        enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        enableDebugMode: process.env.ENABLE_DEBUG_MODE === 'true',
        enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false',
        enableGracefulShutdown: process.env.ENABLE_GRACEFUL_SHUTDOWN !== 'false'
      },

      // Performance Configuration
      performance: {
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '50mb',
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
        enableEtag: process.env.ENABLE_ETAG !== 'false'
      },

      // Development/Testing Configuration
      development: {
        enableHotReload: process.env.ENABLE_HOT_RELOAD === 'true',
        mockServices: process.env.MOCK_SERVICES === 'true',
        seedDatabase: process.env.SEED_DATABASE === 'true',
        enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES === 'true'
      }
    };
  }

  validateConfiguration() {
    const { server, security, rateLimit, aiServices } = this.config;

    // Validate server port
    if (server.port < 1 || server.port > 65535) {
      throw new Error('PORT must be between 1 and 65535');
    }

    // Validate bcrypt rounds
    if (security.bcryptRounds < 4 || security.bcryptRounds > 20) {
      throw new Error('BCRYPT_ROUNDS must be between 4 and 20');
    }

    // Validate rate limit settings
    if (rateLimit.windowMs < 1000) {
      throw new Error('RATE_LIMIT_WINDOW_MS must be at least 1000');
    }

    if (rateLimit.max < 1) {
      throw new Error('RATE_LIMIT_MAX_REQUESTS must be at least 1');
    }

    // Validate AI services timeout
    if (aiServices.timeout < 1000) {
      throw new Error('AI_TIMEOUT_MS must be at least 1000');
    }

    // Production security checks
    if (this.isProduction() && security.jwtSecret === 'development-secret-change-in-production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }

  // Getter methods for clean access
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  getAll() {
    return { ...this.config };
  }

  // Environment checks
  isDevelopment() {
    return this.config.server.environment === 'development';
  }

  isProduction() {
    return this.config.server.environment === 'production';
  }

  isTest() {
    return this.config.server.environment === 'test';
  }

  // Specific configuration getters
  getServerConfig() {
    return { ...this.config.server };
  }

  getSecurityConfig() {
    return { ...this.config.security };
  }

  getRateLimitConfig() {
    return { ...this.config.rateLimit };
  }

  getAIServicesConfig() {
    return { ...this.config.aiServices };
  }

  getDatabaseConfig() {
    return { ...this.config.database };
  }

  getLoggingConfig() {
    return { ...this.config.logging };
  }

  getFeaturesConfig() {
    return { ...this.config.features };
  }

  getPerformanceConfig() {
    return { ...this.config.performance };
  }

  getDevelopmentConfig() {
    return { ...this.config.development };
  }

  // Update configuration (for testing or runtime changes)
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
  }

  // Get configuration summary for logging
  getConfigSummary() {
    return {
      environment: this.config.server.environment,
      port: this.config.server.port,
      aiServicesEnabled: this.config.aiServices.enabled,
      databaseType: this.config.database.type,
      logLevel: this.config.logging.level,
      corsOrigins: this.config.security.corsOrigins.length,
      rateLimitEnabled: this.config.rateLimit.enabled
    };
  }
}

// Singleton instance
let configInstance = null;

function getServerConfig() {
  if (!configInstance) {
    configInstance = new ServerConfig();
  }
  return configInstance;
}

function resetServerConfig() {
  configInstance = null;
}

module.exports = {
  getServerConfig,
  resetServerConfig,
  ServerConfig
};