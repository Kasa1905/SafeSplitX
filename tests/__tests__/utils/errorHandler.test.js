const { AppError, createError, formatError, createValidationError } = require('../../../utils/errorHandler');

describe('Error Handler Utils', () => {
  describe('AppError', () => {
    test('should create error with required properties', () => {
      const error = new AppError('VALIDATION_ERROR', 400, 'Invalid input');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.isOperational).toBe(true);
    });

    test('should handle optional properties', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new AppError('VALIDATION_ERROR', 400, 'Invalid input', details);
      
      expect(error.details).toEqual(details);
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createError', () => {
    test('should create error with all properties', () => {
      const error = createError('VALIDATION_ERROR', 400, 'Invalid input', { field: 'email' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('formatError', () => {
    test('should format AppError correctly', () => {
      const error = new AppError('VALIDATION_ERROR', 400, 'Invalid input', { field: 'email' });
      const formatted = formatError(error);
      
      expect(formatted).toHaveProperty('success', false);
      expect(formatted).toHaveProperty('error');
      expect(formatted.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(formatted.error).toHaveProperty('message', 'Invalid input');
      expect(formatted.error).toHaveProperty('statusCode', 400);
      expect(formatted.error).toHaveProperty('details');
      expect(formatted.error).toHaveProperty('timestamp');
    });

    test('should format generic Error', () => {
      const error = new Error('Something went wrong');
      const formatted = formatError(error);
      
      expect(formatted).toHaveProperty('success', false);
      expect(formatted).toHaveProperty('error');
      expect(formatted.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(formatted.error).toHaveProperty('message', 'Something went wrong');
      expect(formatted.error).toHaveProperty('statusCode', 500);
    });

    test('should handle development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const formatted = formatError(error);
      
      expect(formatted.error).toHaveProperty('stack', 'Error stack trace');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createValidationError', () => {
    test('should create validation error with field details', () => {
      const error = createValidationError('Email is required', { field: 'email', value: '' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Email is required');
      expect(error.details.field).toBe('email');
    });

    test('should handle array of validation errors', () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too short' }
      ];
      const error = createValidationError('Validation failed', { errors });
      
      expect(error.details.errors).toHaveLength(2);
      expect(error.details.errors[0].field).toBe('email');
    });
  });

  describe('error creation helpers', () => {
    const { createAuthenticationError, createAuthorizationError, createNotFoundError } = require('../../../utils/errorHandler');
    
    test('should create authentication error', () => {
      const error = createAuthenticationError('Invalid credentials');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });

    test('should create authorization error', () => {
      const error = createAuthorizationError('Access denied');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });

    test('should create not found error', () => {
      const error = createNotFoundError('User not found');
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('error codes and messages', () => {
    test('should have consistent error codes', () => {
      const validationError = createValidationError('Test');
      const authError = createError('AUTHENTICATION_ERROR', 401, 'Test');
      
      expect(validationError.code).toBe('VALIDATION_ERROR');
      expect(authError.code).toBe('AUTHENTICATION_ERROR');
    });

    test('should provide user-friendly messages', () => {
      const error = new AppError('VALIDATION_ERROR', 400, 'Email format is invalid');
      const formatted = formatError(error);
      
      expect(formatted.error.message).toBe('Email format is invalid');
      expect(formatted.error.userMessage).toBeDefined();
    });
  });
});