/**
 * Tests for config utility module
 */

// Mock required dependencies before importing config
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

const fs = require('fs');

describe('Config Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment and mocks
    jest.resetModules();
    process.env = { ...originalEnv };
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('');
    
    // Set minimal required env vars to avoid validation errors
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-jwt-secret-with-sufficient-length-32chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-sufficient-length-32chars';
    process.env.SESSION_SECRET = 'test-session-secret-with-sufficient-length-32chars';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      const config = require('../../../config');
      
      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = require('../../../config');
      
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    test('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = require('../../../config');
      
      expect(config.isTest()).toBe(true);
      expect(config.isProduction()).toBe(false);
      expect(config.isDevelopment()).toBe(false);
    });

    test('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const config = require('../../../config');
      
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
    });
  });

  describe('Configuration Loading', () => {
    test('should load configuration with required fields', () => {
      const config = require('../../../config');
      
      expect(() => config.loadConfig()).not.toThrow();
    });

    test('should get configuration value', () => {
      process.env.TEST_CONFIG_VALUE = 'test-value';
      const config = require('../../../config');
      
      expect(config.getConfig('TEST_CONFIG_VALUE')).toBe('test-value');
    });

    test('should get configuration with default value', () => {
      const config = require('../../../config');
      
      expect(config.getConfig('NON_EXISTENT_CONFIG', 'default-value')).toBe('default-value');
    });

    test('should handle empty string values', () => {
      process.env.EMPTY_CONFIG = '';
      const config = require('../../../config');
      
      expect(config.getConfig('EMPTY_CONFIG')).toBe('');
    });
  });

  describe('Database Configuration', () => {
    test('should get database configuration', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.DB_NAME = 'testapp';
      process.env.DB_MAX_CONNECTIONS = '20';
      process.env.DB_TIMEOUT = '5000';
      
      const config = require('../../../config');
      const dbConfig = config.getDatabaseConfig();
      
      expect(dbConfig).toEqual({
        uri: 'mongodb://localhost:27017/testdb',
        name: 'testapp',
        maxConnections: 20,
        timeout: 5000
      });
    });

    test('should use default database values', () => {
      const config = require('../../../config');
      const dbConfig = config.getDatabaseConfig();
      
      expect(dbConfig.name).toBe('safesplitx');
      expect(dbConfig.maxConnections).toBe(10);
      expect(dbConfig.timeout).toBe(30000);
    });
  });

  describe('JWT Configuration', () => {
    test('should get JWT configuration', () => {
      process.env.JWT_SECRET = 'test-jwt-secret-with-sufficient-length-32chars';
      process.env.JWT_EXPIRES_IN = '1h';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-sufficient-length-32chars';
      process.env.JWT_REFRESH_EXPIRES_IN = '30d';
      
      const config = require('../../../config');
      const jwtConfig = config.getJWTConfig();
      
      expect(jwtConfig).toEqual({
        secret: 'test-jwt-secret-with-sufficient-length-32chars',
        expiresIn: '1h',
        refreshSecret: 'test-refresh-secret-with-sufficient-length-32chars',
        refreshExpiresIn: '30d'
      });
    });

    test('should use default JWT values', () => {
      const config = require('../../../config');
      const jwtConfig = config.getJWTConfig();
      
      expect(jwtConfig.expiresIn).toBe('24h');
      expect(jwtConfig.refreshExpiresIn).toBe('7d');
    });
  });

  describe('Redis Configuration', () => {
    test('should get Redis configuration with URL', () => {
      process.env.REDIS_URL = 'redis://localhost:6379/1';
      
      const config = require('../../../config');
      const redisConfig = config.getRedisConfig();
      
      expect(redisConfig).toEqual({
        url: 'redis://localhost:6379/1',
        host: 'localhost',
        port: 6379,
        db: 1
      });
    });

    test('should get Redis configuration with individual settings', () => {
      process.env.REDIS_HOST = 'redis-server';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'redis-pass';
      process.env.REDIS_DB = '2';
      
      const config = require('../../../config');
      const redisConfig = config.getRedisConfig();
      
      expect(redisConfig).toEqual({
        host: 'redis-server',
        port: 6380,
        password: 'redis-pass',
        db: 2
      });
    });
  });

  describe('Email Configuration', () => {
    test('should get SendGrid email configuration', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'sg-test-key';
      process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
      
      const config = require('../../../config');
      const emailConfig = config.getEmailConfig();
      
      expect(emailConfig).toEqual({
        provider: 'sendgrid',
        apiKey: 'sg-test-key',
        fromEmail: 'test@example.com'
      });
    });

    test('should get AWS SES email configuration', () => {
      process.env.EMAIL_PROVIDER = 'ses';
      process.env.AWS_ACCESS_KEY_ID = 'aws-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'aws-secret-key';
      process.env.AWS_REGION = 'us-west-2';
      
      const config = require('../../../config');
      const emailConfig = config.getEmailConfig();
      
      expect(emailConfig).toEqual({
        provider: 'ses',
        accessKeyId: 'aws-access-key',
        secretAccessKey: 'aws-secret-key',
        region: 'us-west-2'
      });
    });
  });

  describe('App Configuration', () => {
    test('should get application configuration', () => {
      process.env.APP_NAME = 'TestApp';
      process.env.APP_VERSION = '2.0.0';
      process.env.NODE_ENV = 'production';
      process.env.PORT = '4000';
      process.env.HOST = 'api.example.com';
      process.env.DEBUG = 'false';
      
      const config = require('../../../config');
      const appConfig = config.getAppConfig();
      
      expect(appConfig).toEqual({
        name: 'TestApp',
        version: '2.0.0',
        environment: 'production',
        port: 4000,
        host: 'api.example.com',
        debug: false,
        features: {
          socialLogin: false,
          twoFactorAuth: false,
          emailVerification: true,
          smsNotifications: false,
          fraudDetection: true
        },
        security: {
          enableHttps: false,
          corsOrigins: ['*'],
          rateLimit: {
            window: 900000,
            max: 100
          }
        },
        logging: {
          level: 'info',
          file: true,
          console: true,
          verbose: false
        },
        storage: {
          provider: 'local',
          maxSize: 5242880
        },
        currency: {
          default: 'USD',
          apiProvider: 'fixer'
        },
        limits: {
          maxTransactionAmount: 10000,
          suspiciousActivityThreshold: 5
        }
      });
    });

    test('should use default app configuration values', () => {
      const config = require('../../../config');
      const appConfig = config.getAppConfig();
      
      expect(appConfig.name).toBe('SafeSplitX');
      expect(appConfig.version).toBe('1.0.0');
      expect(appConfig.features.emailVerification).toBe(true);
      expect(appConfig.security.corsOrigins).toEqual(['*']);
      expect(appConfig.currency.default).toBe('USD');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate configuration successfully with required fields', () => {
      const config = require('../../../config');
      
      expect(() => config.validateConfig()).not.toThrow();
    });

    test('should throw error when required fields are missing', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        const config = require('../../../config');
        config.loadConfig();
      }).toThrow(/Configuration validation failed.*MONGODB_URI.*is required/);
    });

    test('should validate JWT secret length', () => {
      process.env.JWT_SECRET = 'short';
      
      expect(() => {
        const config = require('../../../config');
        config.loadConfig();
      }).toThrow(/Configuration validation failed/);
    });
  });

  describe('Cache Behavior', () => {
    test('should cache loaded configuration', () => {
      const config = require('../../../config');
      
      const config1 = config.loadConfig();
      const config2 = config.loadConfig();
      
      // Should return the same cached instance
      expect(config1).toBe(config2);
    });

    test('should clear cache', () => {
      const config = require('../../../config');
      
      config.loadConfig();
      config.clearCache();
      
      // After clearing cache, should reload config
      expect(() => config.loadConfig()).not.toThrow();
    });

    test('should reload config after cache clear', () => {
      const config = require('../../../config');
      
      const originalConfig = config.loadConfig();
      config.clearCache();
      
      process.env.NEW_TEST_VAR = 'new-value';
      const newConfig = config.loadConfig();
      
      expect(newConfig.NEW_TEST_VAR).toBe('new-value');
    });
  });

  describe('Environment File Loading', () => {
    test('should load environment file when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('TEST_ENV_VAR=test-value\nANOTHER_VAR=another-value');
      
      const config = require('../../../config');
      config.loadConfig();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    test('should handle missing environment file gracefully', () => {
      fs.existsSync.mockReturnValue(false);
      
      const config = require('../../../config');
      
      expect(() => config.loadConfig()).not.toThrow();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('should skip comments and empty lines in env file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(`
# This is a comment
TEST_VAR=value
# Another comment

EMPTY_LINES_TEST=works
      `);
      
      const config = require('../../../config');
      config.loadConfig();
      
      expect(process.env.TEST_VAR).toBe('value');
      expect(process.env.EMPTY_LINES_TEST).toBe('works');
    });
  });
});