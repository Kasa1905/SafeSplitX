/**
 * Test suite for middleware/errorHandler.js
 */

const { describe, test, expect, beforeEach, jest } = require('@jest/globals');

// Mock dependencies
jest.mock('../../../middleware/config');

const config = require('../../../middleware/config');

describe('ErrorHandler Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config
    config.getConfig = jest.fn((key, defaultValue) => {
      const configMap = {
        'api.retries': 3,
        'api.retryDelay': 1000,
        'logging.enabled': false,
        'errors.showStackTrace': false
      };
      return configMap[key] || defaultValue;
    });
  });

  describe('Error Processing', () => {
    const {
      handleApiError,
      createError,
      normalizeError,
      isRetryableError,
      retryRequest
    } = require('../../../middleware/errorHandler');

    test('should handle API error with response', () => {
      const axiosError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid input', code: 'VALIDATION_ERROR' }
        },
        message: 'Request failed with status code 400',
        config: { url: '/api/test', method: 'post' }
      };

      const result = handleApiError(axiosError);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input');
      expect(result.status).toBe(400);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    test('should handle API error without response', () => {
      const networkError = {
        message: 'Network Error',
        code: 'ECONNREFUSED',
        config: { url: '/api/test', method: 'get' }
      };

      const result = handleApiError(networkError);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(result.code).toBe('ECONNREFUSED');
    });

    test('should create standardized error response', () => {
      const message = 'Something went wrong';
      const code = 'INTERNAL_ERROR';
      const details = { field: 'test', value: 'invalid' };

      const result = createError(message, code, details);

      expect(result.success).toBe(false);
      expect(result.error).toBe(message);
      expect(result.code).toBe(code);
      expect(result.details).toEqual(details);
      expect(result.timestamp).toBeDefined();
      expect(result.requestId).toBeDefined();
    });

    test('should normalize different error types', () => {
      const stringError = 'Simple error message';
      const objectError = { message: 'Object error', code: 'TEST_ERROR' };
      const errorInstance = new Error('Error instance');

      const result1 = normalizeError(stringError);
      const result2 = normalizeError(objectError);
      const result3 = normalizeError(errorInstance);

      expect(result1.message).toBe('Simple error message');
      expect(result2.message).toBe('Object error');
      expect(result2.code).toBe('TEST_ERROR');
      expect(result3.message).toBe('Error instance');
    });

    test('should identify retryable errors', () => {
      const retryableErrors = [
        { response: { status: 500 } },
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 504 } },
        { code: 'ECONNRESET' },
        { code: 'ECONNREFUSED' },
        { code: 'ETIMEDOUT' }
      ];

      const nonRetryableErrors = [
        { response: { status: 400 } },
        { response: { status: 401 } },
        { response: { status: 404 } },
        { code: 'ENOENT' }
      ];

      retryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });

    test('should implement retry logic with backoff', async () => {
      let attemptCount = 0;
      const mockRequest = jest.fn(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject({ response: { status: 500 } });
        }
        return Promise.resolve({ data: 'success', status: 200 });
      });

      const result = await retryRequest(mockRequest, 3, 100);

      expect(attemptCount).toBe(3);
      expect(result.data).toBe('success');
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    test('should give up after max retries', async () => {
      const mockRequest = jest.fn(() => 
        Promise.reject({ response: { status: 500 } })
      );

      await expect(retryRequest(mockRequest, 2, 100))
        .rejects.toMatchObject({ response: { status: 500 } });

      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    test('should not retry non-retryable errors', async () => {
      const mockRequest = jest.fn(() => 
        Promise.reject({ response: { status: 401 } })
      );

      await expect(retryRequest(mockRequest, 3, 100))
        .rejects.toMatchObject({ response: { status: 401 } });

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Mapping', () => {
    const { mapStatusToUserMessage } = require('../../../middleware/errorHandler');

    test('should map common HTTP status codes', () => {
      const statusMessages = {
        400: 'Please check your input and try again',
        401: 'Please log in to continue',
        403: 'You don\'t have permission to access this resource',
        404: 'The requested resource was not found',
        422: 'The data you provided is invalid',
        500: 'A server error occurred. Please try again later',
        502: 'Service is temporarily unavailable',
        503: 'Service is temporarily unavailable'
      };

      Object.entries(statusMessages).forEach(([status, expectedMessage]) => {
        const message = mapStatusToUserMessage(parseInt(status));
        expect(message).toBe(expectedMessage);
      });
    });

    test('should provide default message for unknown status codes', () => {
      const message = mapStatusToUserMessage(418); // I'm a teapot
      expect(message).toBe('An unexpected error occurred');
    });
  });

  describe('Error Context', () => {
    const { addErrorContext, formatErrorForLogging } = require('../../../middleware/errorHandler');

    test('should add context to errors', () => {
      const error = new Error('Test error');
      const context = {
        userId: '123',
        action: 'update_profile',
        requestId: 'req-456'
      };

      const contextualError = addErrorContext(error, context);

      expect(contextualError.context).toEqual(context);
      expect(contextualError.message).toBe('Test error');
    });

    test('should format error for logging', () => {
      const error = {
        message: 'Test error',
        stack: 'Error: Test error\n    at test.js:1:1',
        context: {
          userId: '123',
          action: 'test'
        }
      };

      const formatted = formatErrorForLogging(error);

      expect(formatted).toContain('Test error');
      expect(formatted).toContain('userId: 123');
      expect(formatted).toContain('action: test');
    });
  });

  describe('Graceful Degradation', () => {
    const { getErrorFallback, sanitizeError } = require('../../../middleware/errorHandler');

    test('should provide fallback for critical errors', () => {
      const fallback = getErrorFallback('auth');
      
      expect(fallback).toEqual({
        success: false,
        error: 'Authentication service is temporarily unavailable',
        fallback: true
      });
    });

    test('should sanitize sensitive error information', () => {
      const sensitiveError = {
        message: 'Database connection failed',
        details: {
          connectionString: 'mongodb://user:password@host:27017/db',
          credentials: { username: 'admin', password: 'secret' }
        }
      };

      const sanitized = sanitizeError(sensitiveError);

      expect(sanitized.message).toBe('Database connection failed');
      expect(sanitized.details).not.toContain('password');
      expect(sanitized.details).not.toContain('secret');
    });
  });
});