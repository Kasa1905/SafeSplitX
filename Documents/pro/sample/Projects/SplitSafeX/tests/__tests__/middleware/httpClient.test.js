/**
 * Test suite for middleware/httpClient.js
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const MockAdapter = require('axios-mock-adapter');

// Mock dependencies
jest.mock('../../../middleware/config');
jest.mock('../../../middleware/auth');
jest.mock('../../../middleware/errorHandler');

const config = require('../../../middleware/config');
const auth = require('../../../middleware/auth');
const errorHandler = require('../../../middleware/errorHandler');

describe('HttpClient Module', () => {
  let httpClient;
  let mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config
    config.getConfig = jest.fn((key, defaultValue) => {
      const configMap = {
        'api.baseURL': 'http://localhost:3001/api',
        'api.timeout': 10000,
        'api.retries': 3,
        'api.retryDelay': 1000,
        'logging.enabled': false
      };
      return configMap[key] || defaultValue;
    });
    
    config.buildApiUrl = jest.fn(endpoint => `http://localhost:3001/api${endpoint}`);
    config.endpoints = {
      auth: {
        refresh: '/auth/refresh'
      }
    };

    // Mock auth
    auth.getAuthToken = jest.fn();
    auth.setAuthToken = jest.fn();
    auth.clearAuthToken = jest.fn();
    auth.shouldRefreshToken = jest.fn();
    auth.getRefreshToken = jest.fn();

    // Mock error handler
    errorHandler.handleApiError = jest.fn(error => ({ error: error.message }));
    errorHandler.retryRequest = jest.fn();

    // Require httpClient after mocking dependencies
    const httpClientModule = require('../../../middleware/httpClient');
    httpClient = httpClientModule.httpClient;
    
    // Create axios mock
    mock = new MockAdapter(httpClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('HTTP Methods', () => {
    test('should make GET request successfully', async () => {
      const responseData = { success: true, data: { id: 1, name: 'test' } };
      mock.onGet('/test').reply(200, responseData);

      const { get } = require('../../../middleware/httpClient');
      const result = await get('/test');

      expect(result).toEqual(responseData);
    });

    test('should make POST request successfully', async () => {
      const requestData = { name: 'test' };
      const responseData = { success: true, data: { id: 1, ...requestData } };
      mock.onPost('/test', requestData).reply(201, responseData);

      const { post } = require('../../../middleware/httpClient');
      const result = await post('/test', requestData);

      expect(result).toEqual(responseData);
    });

    test('should make PUT request successfully', async () => {
      const requestData = { id: 1, name: 'updated' };
      const responseData = { success: true, data: requestData };
      mock.onPut('/test/1', requestData).reply(200, responseData);

      const { put } = require('../../../middleware/httpClient');
      const result = await put('/test/1', requestData);

      expect(result).toEqual(responseData);
    });

    test('should make PATCH request successfully', async () => {
      const requestData = { name: 'patched' };
      const responseData = { success: true, data: { id: 1, ...requestData } };
      mock.onPatch('/test/1', requestData).reply(200, responseData);

      const { patch } = require('../../../middleware/httpClient');
      const result = await patch('/test/1', requestData);

      expect(result).toEqual(responseData);
    });

    test('should make DELETE request successfully', async () => {
      const responseData = { success: true, message: 'Deleted' };
      mock.onDelete('/test/1').reply(200, responseData);

      const { delete: del } = require('../../../middleware/httpClient');
      const result = await del('/test/1');

      expect(result).toEqual(responseData);
    });

    test('should handle upload request', async () => {
      const formData = new FormData();
      formData.append('file', 'test');
      const responseData = { success: true, data: { url: '/uploads/file.jpg' } };
      
      mock.onPost('/upload').reply(200, responseData);

      const { upload } = require('../../../middleware/httpClient');
      const result = await upload('/upload', formData);

      expect(result).toEqual(responseData);
    });
  });

  describe('Error Handling', () => {
    test('should throw errors without processing', async () => {
      const errorResponse = { message: 'Server error' };
      mock.onGet('/error').reply(500, errorResponse);

      const { get } = require('../../../middleware/httpClient');
      
      await expect(get('/error')).rejects.toThrow();
    });

    test('should handle network errors', async () => {
      mock.onGet('/network-error').networkError();

      const { get } = require('../../../middleware/httpClient');
      
      await expect(get('/network-error')).rejects.toThrow();
    });

    test('should handle timeout errors', async () => {
      mock.onGet('/timeout').timeout();

      const { get } = require('../../../middleware/httpClient');
      
      await expect(get('/timeout')).rejects.toThrow();
    });
  });

  describe('Authentication Integration', () => {
    test('should add auth token to requests', async () => {
      auth.getAuthToken.mockReturnValue('valid-token');
      
      mock.onGet('/protected').reply((config) => {
        expect(config.headers.Authorization).toBe('Bearer valid-token');
        return [200, { success: true }];
      });

      const { get } = require('../../../middleware/httpClient');
      await get('/protected');
    });

    test('should handle token refresh on 401', async () => {
      auth.getAuthToken.mockReturnValue('expired-token');
      auth.shouldRefreshToken.mockReturnValue(true);
      auth.getRefreshToken.mockReturnValue('valid-refresh-token');
      
      // Mock refresh endpoint
      mock.onPost('/auth/refresh').reply(200, {
        data: { token: 'new-token', refreshToken: 'new-refresh-token' }
      });
      
      // First request fails with 401
      mock.onGet('/protected').replyOnce(401, { message: 'Unauthorized' });
      
      // Second request succeeds with new token
      mock.onGet('/protected').reply((config) => {
        expect(config.headers.Authorization).toBe('Bearer new-token');
        return [200, { success: true }];
      });

      const { get } = require('../../../middleware/httpClient');
      const result = await get('/protected');

      expect(auth.setAuthToken).toHaveBeenCalledWith('new-token', 'new-refresh-token');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Request Utilities', () => {
    test('should create cancellable request', () => {
      const { createCancellableRequest } = require('../../../middleware/httpClient');
      
      const requestFn = jest.fn(() => Promise.resolve({ data: 'test' }));
      const { request, cancel } = createCancellableRequest(requestFn);

      expect(typeof request.then).toBe('function');
      expect(typeof cancel).toBe('function');
    });

    test('should handle batch requests', async () => {
      const { batchRequests } = require('../../../middleware/httpClient');
      
      const requests = [
        () => Promise.resolve({ data: 'request1' }),
        () => Promise.resolve({ data: 'request2' }),
        () => Promise.resolve({ data: 'request3' })
      ];

      const results = await batchRequests(requests, { concurrency: 2 });

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ data: 'request1' });
      expect(results[1]).toEqual({ data: 'request2' });
      expect(results[2]).toEqual({ data: 'request3' });
    });

    test('should handle health check', async () => {
      const responseData = { status: 'healthy', timestamp: Date.now() };
      mock.onGet('/health').reply(200, responseData);

      const { healthCheck } = require('../../../middleware/httpClient');
      const result = await healthCheck();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(responseData);
    });

    test('should handle health check failure', async () => {
      mock.onGet('/health').reply(500, { error: 'Service unavailable' });

      const { healthCheck } = require('../../../middleware/httpClient');
      const result = await healthCheck();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Request Interceptors', () => {
    test('should add request metadata', async () => {
      mock.onGet('/test').reply((config) => {
        expect(config.metadata).toBeDefined();
        expect(config.metadata.requestId).toBeDefined();
        return [200, { success: true }];
      });

      const { get } = require('../../../middleware/httpClient');
      await get('/test');
    });
  });
});