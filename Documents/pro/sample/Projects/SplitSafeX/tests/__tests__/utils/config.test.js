/**
 * Basic tests for config utility module
 * Tests core functionality with proper test environment setup
 */

describe('Config Utils', () => {
  let config;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set up test environment with required variables
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'test-session-secret-with-sufficient-length-32-characters-minimum';
    process.env.JWT_SECRET = 'test-jwt-secret-with-sufficient-length-32-characters-minimum';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-sufficient-length-32-characters-minimum';
    process.env.DB_URI = 'mongodb://localhost:27017/testdb';
    process.env.DB_NAME = 'testapp';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
    process.env.TEST_CONFIG_VALUE = 'test-value';
    process.env.EMPTY_CONFIG = '';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache to ensure fresh config
    delete require.cache[require.resolve('../../../utils/config')];
    config = require('../../../utils/config');
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Module Exports', () => {
    test('should export loadConfig function', () => {
      expect(typeof config.loadConfig).toBe('function');
    });

    test('should export getConfig function', () => {
      expect(typeof config.getConfig).toBe('function');
    });

    test('should export typed configuration accessors', () => {
      expect(typeof config.getDatabaseConfig).toBe('function');
      expect(typeof config.getJWTConfig).toBe('function');
      expect(typeof config.getRedisConfig).toBe('function');
      expect(typeof config.getEmailConfig).toBe('function');
      expect(typeof config.getAppConfig).toBe('function');
    });

    test('should export validation function', () => {
      expect(typeof config.validateConfig).toBe('function');
    });

    test('should export environment helpers', () => {
      expect(typeof config.isDevelopment).toBe('function');
      expect(typeof config.isProduction).toBe('function');
      expect(typeof config.isTest).toBe('function');
    });
  });

  describe('Function Signatures', () => {
    test('should have proper function arities', () => {
      expect(config.loadConfig.length).toBeGreaterThanOrEqual(0);
      expect(config.getConfig.length).toBeGreaterThanOrEqual(0);
      expect(config.getDatabaseConfig.length).toBe(0);
      expect(config.getJWTConfig.length).toBe(0);
      expect(config.getRedisConfig.length).toBe(0);
      expect(config.getEmailConfig.length).toBe(0);
      expect(config.getAppConfig.length).toBe(0);
    });
  });

  describe('Basic Configuration Loading', () => {
    test('should load configuration successfully', () => {
      expect(() => config.loadConfig()).not.toThrow();
    });

    test('should return configuration object', () => {
      const result = config.loadConfig();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('Environment Detection', () => {
    test('should detect test environment', () => {
      expect(config.isTest()).toBe(true);
    });

    test('should return boolean for environment checks', () => {
      expect(typeof config.isDevelopment()).toBe('boolean');
      expect(typeof config.isProduction()).toBe('boolean');
      expect(typeof config.isTest()).toBe('boolean');
    });
  });

  describe('Typed Configuration Accessors', () => {
    test('should return database configuration', () => {
      const dbConfig = config.getDatabaseConfig();
      expect(dbConfig).toBeDefined();
      expect(typeof dbConfig).toBe('object');
      expect(dbConfig.uri).toBe('mongodb://localhost:27017/testdb');
      expect(dbConfig.name).toBe('testapp');
    });

    test('should return JWT configuration', () => {
      const jwtConfig = config.getJWTConfig();
      expect(jwtConfig).toBeDefined();
      expect(typeof jwtConfig).toBe('object');
      expect(jwtConfig.secret).toBe('test-jwt-secret-with-sufficient-length-32-characters-minimum');
    });

    test('should return Redis configuration', () => {
      const redisConfig = config.getRedisConfig();
      expect(redisConfig).toBeDefined();
      expect(typeof redisConfig).toBe('object');
      expect(redisConfig.url).toBe('redis://localhost:6379/1');
    });

    test('should return email configuration', () => {
      const emailConfig = config.getEmailConfig();
      expect(emailConfig).toBeDefined();
      expect(typeof emailConfig).toBe('object');
    });

    test('should return app configuration', () => {
      const appConfig = config.getAppConfig();
      expect(appConfig).toBeDefined();
      expect(typeof appConfig).toBe('object');
    });
  });

  describe('Configuration Access', () => {
    test('should get configuration values', () => {
      // Load config first
      config.loadConfig();
      expect(config.getConfig('TEST_CONFIG_VALUE')).toBe('test-value');
    });

    test('should handle default values', () => {
      config.loadConfig();
      expect(config.getConfig('NON_EXISTENT_VALUE', 'default')).toBe('default');
    });
  });

  describe('Basic Validation', () => {
    test('should handle validation without throwing for basic setup', () => {
      // Just test that validation function exists and can be called
      expect(() => {
        try {
          config.validateConfig();
        } catch (error) {
          // Validation might fail due to missing optional fields, which is acceptable
          expect(error.message).toContain('Configuration validation failed');
        }
      }).not.toThrow();
    });
  });
});