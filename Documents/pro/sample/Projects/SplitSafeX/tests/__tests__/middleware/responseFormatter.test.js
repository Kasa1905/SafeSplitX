/**
 * Test suite for middleware/responseFormatter.js
 */

const { describe, test, expect } = require('@jest/globals');
const { 
  createSuccessResponse,
  createErrorResponse,
  formatApiResponse,
  formatValidationErrors,
  wrapResponse
} = require('../../../middleware/responseFormatter');

describe('ResponseFormatter Module', () => {
  describe('createSuccessResponse', () => {
    test('should create success response with data', () => {
      const data = { id: 1, name: 'test' };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
      expect(response.requestId).toBeDefined();
    });

    test('should create success response with message', () => {
      const data = { id: 1, name: 'test' };
      const message = 'Operation successful';
      const response = createSuccessResponse(data, message);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
      expect(response.timestamp).toBeDefined();
    });

    test('should create success response with metadata', () => {
      const data = { id: 1, name: 'test' };
      const metadata = { total: 1, page: 1 };
      const response = createSuccessResponse(data, null, metadata);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toEqual(metadata);
    });
  });

  describe('createErrorResponse', () => {
    test('should create error response with message', () => {
      const message = 'Something went wrong';
      const response = createErrorResponse(message);

      expect(response.success).toBe(false);
      expect(response.error).toBe(message);
      expect(response.timestamp).toBeDefined();
      expect(response.requestId).toBeDefined();
    });

    test('should create error response with code and details', () => {
      const message = 'Validation failed';
      const code = 'VALIDATION_ERROR';
      const details = { field: 'email', issue: 'required' };
      const response = createErrorResponse(message, code, details);

      expect(response.success).toBe(false);
      expect(response.error).toBe(message);
      expect(response.code).toBe(code);
      expect(response.details).toEqual(details);
    });
  });

  describe('formatApiResponse', () => {
    test('should format successful axios response', () => {
      const axiosResponse = {
        data: { id: 1, name: 'test' },
        status: 200,
        statusText: 'OK'
      };

      const response = formatApiResponse(axiosResponse);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(axiosResponse.data);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
    });

    test('should format axios error response', () => {
      const axiosError = {
        response: {
          data: { error: 'Not found' },
          status: 404,
          statusText: 'Not Found'
        },
        message: 'Request failed with status code 404'
      };

      const response = formatApiResponse(axiosError, true);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Request failed with status code 404');
      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Not Found');
    });

    test('should handle network errors', () => {
      const networkError = {
        message: 'Network Error',
        code: 'ECONNREFUSED'
      };

      const response = formatApiResponse(networkError, true);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network Error');
      expect(response.code).toBe('ECONNREFUSED');
    });
  });

  describe('formatValidationErrors', () => {
    test('should format single validation error', () => {
      const error = {
        details: [
          {
            message: '"email" is required',
            path: ['email'],
            type: 'any.required',
            context: { key: 'email', label: 'email' }
          }
        ]
      };

      const formatted = formatValidationErrors(error);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        field: 'email',
        message: 'email is required',
        type: 'any.required',
        value: undefined
      });
    });

    test('should format multiple validation errors', () => {
      const error = {
        details: [
          {
            message: '"email" is required',
            path: ['email'],
            type: 'any.required',
            context: { key: 'email', label: 'email' }
          },
          {
            message: '"password" length must be at least 8 characters long',
            path: ['password'],
            type: 'string.min',
            context: { key: 'password', label: 'password', limit: 8, value: 'short' }
          }
        ]
      };

      const formatted = formatValidationErrors(error);

      expect(formatted).toHaveLength(2);
      expect(formatted[0].field).toBe('email');
      expect(formatted[1].field).toBe('password');
      expect(formatted[1].value).toBe('short');
    });

    test('should handle nested field paths', () => {
      const error = {
        details: [
          {
            message: '"user.profile.name" is required',
            path: ['user', 'profile', 'name'],
            type: 'any.required',
            context: { key: 'name', label: 'user.profile.name' }
          }
        ]
      };

      const formatted = formatValidationErrors(error);

      expect(formatted[0].field).toBe('user.profile.name');
    });

    test('should return empty array for invalid error object', () => {
      const formatted1 = formatValidationErrors(null);
      const formatted2 = formatValidationErrors({});
      const formatted3 = formatValidationErrors({ details: null });

      expect(formatted1).toEqual([]);
      expect(formatted2).toEqual([]);
      expect(formatted3).toEqual([]);
    });
  });

  describe('wrapResponse', () => {
    test('should wrap successful response', () => {
      const data = { id: 1, name: 'test' };
      const wrapped = wrapResponse(data);

      expect(wrapped.success).toBe(true);
      expect(wrapped.data).toEqual(data);
      expect(wrapped.timestamp).toBeDefined();
    });

    test('should wrap error response', () => {
      const error = new Error('Something went wrong');
      const wrapped = wrapResponse(null, error);

      expect(wrapped.success).toBe(false);
      expect(wrapped.error).toBe('Something went wrong');
      expect(wrapped.timestamp).toBeDefined();
    });

    test('should preserve existing response structure', () => {
      const existingResponse = {
        success: true,
        data: { id: 1 },
        message: 'Already formatted'
      };

      const wrapped = wrapResponse(existingResponse);

      expect(wrapped).toEqual(expect.objectContaining({
        success: true,
        data: { id: 1 },
        message: 'Already formatted'
      }));
    });
  });

  describe('Response Consistency', () => {
    test('should maintain consistent timestamp format', () => {
      const response1 = createSuccessResponse({ test: 1 });
      const response2 = createErrorResponse('test error');

      expect(typeof response1.timestamp).toBe('string');
      expect(typeof response2.timestamp).toBe('string');
      expect(new Date(response1.timestamp)).toBeInstanceOf(Date);
      expect(new Date(response2.timestamp)).toBeInstanceOf(Date);
    });

    test('should generate unique request IDs', () => {
      const response1 = createSuccessResponse({ test: 1 });
      const response2 = createSuccessResponse({ test: 2 });

      expect(response1.requestId).toBeDefined();
      expect(response2.requestId).toBeDefined();
      expect(response1.requestId).not.toBe(response2.requestId);
    });
  });
});