/**
 * Test suite for middleware/config.js
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock environment variables before requiring the module
const originalEnv = process.env;

describe('Config Module', () => {
  beforeEach(() => {
    jest.resetModules(); // Clear the module cache
    process.env = { ...originalEnv }; // Reset environment
  });

  afterEach(() => {
    process.env = originalEnv; // Restore original environment
  });

  describe('Environment Loading', () => {
    test('should load default development configuration', () => {
      process.env.NODE_ENV = 'development';
      const { config } = require('../config');

      expect(config.environment).toBe('development');
      expect(config.api.timeout).toBe(10000);
      expect(config.auth.tokenRefreshThreshold).toBe(300000);
    });

    test('should load production configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.API_BASE_URL = 'https://api.prod.splitsafex.com';
      process.env.API_TIMEOUT = '30000';

      const { config } = require('../config');

      expect(config.environment).toBe('production');
      expect(config.api.baseURL).toBe('https://api.prod.splitsafex.com');
      expect(config.api.timeout).toBe(30000);
    });

    test('should use environment variables when provided', () => {
      process.env.API_BASE_URL = 'https://custom.api.com';
      process.env.JWT_SECRET = 'custom-secret';
      process.env.REDIS_URL = 'redis://custom:6379';

      const { config } = require('../config');

      expect(config.api.baseURL).toBe('https://custom.api.com');
      expect(config.auth.jwtSecret).toBe('custom-secret');
      expect(config.redis.url).toBe('redis://custom:6379');
    });
  });

  describe('URL Building', () => {
    test('should build URL with path parameters', () => {
      const { buildUrl } = require('../config');
      
      const url = buildUrl('/api/groups/:groupId/expenses', { groupId: '123' });
      expect(url).toBe('/api/groups/123/expenses');
    });

    test('should build URL with multiple parameters', () => {
      const { buildUrl } = require('../config');
      
      const url = buildUrl('/api/users/:userId/groups/:groupId', { 
        userId: 'user-123', 
        groupId: 'group-456' 
      });
      expect(url).toBe('/api/users/user-123/groups/group-456');
    });

    test('should return original URL when no parameters provided', () => {
      const { buildUrl } = require('../config');
      
      const url = buildUrl('/api/groups');
      expect(url).toBe('/api/groups');
    });

    test('should handle missing parameters gracefully', () => {
      const { buildUrl } = require('../config');
      
      const url = buildUrl('/api/groups/:groupId/expenses', {});
      expect(url).toBe('/api/groups/:groupId/expenses');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate complete configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.API_BASE_URL = 'https://api.splitsafex.com';
      process.env.JWT_SECRET = 'valid-secret';

      const { validateConfig } = require('../config');
      const result = validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required configuration in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.API_BASE_URL;
      delete process.env.JWT_SECRET;

      const { validateConfig } = require('../config');
      const result = validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('API_BASE_URL'))).toBe(true);
    });

    test('should be lenient in development environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;

      const { validateConfig } = require('../config');
      const result = validateConfig();

      // Development should be more forgiving
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Utilities', () => {
    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      const { isProduction } = require('../config');
      expect(isProduction()).toBe(true);
    });

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const { isDevelopment } = require('../config');
      expect(isDevelopment()).toBe(true);
    });

    test('should return correct environment name', () => {
      process.env.NODE_ENV = 'test';
      const { getEnvironment } = require('../config');
      expect(getEnvironment()).toBe('test');
    });
  });

  describe('Endpoints Configuration', () => {
    test('should provide all required endpoints', () => {
      const { endpoints } = require('../config');

      // Auth endpoints
      expect(endpoints.auth.login).toBeDefined();
      expect(endpoints.auth.logout).toBeDefined();
      expect(endpoints.auth.refresh).toBeDefined();
      expect(endpoints.auth.profile).toBeDefined();

      // Group endpoints
      expect(endpoints.groups.create).toBeDefined();
      expect(endpoints.groups.list).toBeDefined();
      expect(endpoints.groups.details).toBeDefined();

      // Expense endpoints
      expect(endpoints.expenses.create).toBeDefined();
      expect(endpoints.expenses.byGroup).toBeDefined();
      expect(endpoints.expenses.update).toBeDefined();

      // Balance endpoints
      expect(endpoints.balances.user).toBeDefined();
      expect(endpoints.balances.group).toBeDefined();
      expect(endpoints.balances.summary).toBeDefined();

      // Settlement endpoints
      expect(endpoints.settlements.create).toBeDefined();
      expect(endpoints.settlements.list).toBeDefined();
    });

    test('should have consistent endpoint structure', () => {
      const { endpoints } = require('../config');

      Object.values(endpoints).forEach(category => {
        expect(typeof category).toBe('object');
        Object.values(category).forEach(endpoint => {
          expect(typeof endpoint).toBe('string');
          expect(endpoint.startsWith('/')).toBe(true);
        });
      });
    });
  });
});