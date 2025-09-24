const { successResponse, errorResponse, paginatedResponse, transformData, excludeFields } = require('../../../utils/response');

describe('Response Utils', () => {
  describe('successResponse', () => {
    test('should create basic success response', () => {
      const data = { id: 1, name: 'John' };
      const response = successResponse(data);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('timestamp');
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    test('should create success response with message', () => {
      const data = { id: 1 };
      const message = 'User created successfully';
      const response = successResponse(data, message);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe(message);
      expect(response.data).toEqual(data);
    });

    test('should create success response with metadata', () => {
      const data = { users: [] };
      const message = 'Users retrieved';
      const metadata = { total: 0, page: 1 };
      const response = successResponse(data, message, metadata);
      
      expect(response.metadata).toEqual(metadata);
    });
  });

  describe('errorResponse', () => {
    test('should create basic error response', () => {
      const error = 'Something went wrong';
      const response = errorResponse(error);
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('message', error);
      expect(response.error).toHaveProperty('code', 'UNKNOWN_ERROR');
      expect(response).toHaveProperty('timestamp');
    });

    test('should create error response with code', () => {
      const error = 'Validation failed';
      const code = 'VALIDATION_ERROR';
      const response = errorResponse(error, code);
      
      expect(response.error.message).toBe(error);
      expect(response.error.code).toBe(code);
    });

    test('should create error response with details', () => {
      const error = 'Validation failed';
      const code = 'VALIDATION_ERROR';
      const details = { field: 'email', value: 'invalid' };
      const response = errorResponse(error, code, details);
      
      expect(response.error.details).toEqual(details);
    });
  });

  describe('paginatedResponse', () => {
    test('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        total: 100,
        page: 1,
        limit: 2,
        totalPages: 50
      };
      
      const response = paginatedResponse(data, pagination);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual(pagination);
    });

    test('should calculate pagination metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        total: 100,
        page: 2,
        limit: 10
      };
      
      const response = paginatedResponse(data, pagination);
      
      expect(response.pagination.totalPages).toBe(10);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrevious).toBe(true);
    });
  });

  describe('transformData', () => {
    test('should apply transformer function to data', () => {
      const data = [
        { id: 1, name: 'John', password: 'secret' },
        { id: 2, name: 'Jane', password: 'secret' }
      ];
      
      const transformer = (item) => ({
        id: item.id,
        name: item.name
      });
      
      const transformed = transformData(data, transformer);
      
      expect(transformed).toHaveLength(2);
      expect(transformed[0]).not.toHaveProperty('password');
      expect(transformed[0]).toHaveProperty('id', 1);
      expect(transformed[0]).toHaveProperty('name', 'John');
    });

    test('should handle single object transformation', () => {
      const data = { id: 1, name: 'John', password: 'secret' };
      const transformer = (item) => ({ id: item.id, name: item.name });
      
      const transformed = transformData(data, transformer);
      
      expect(transformed).not.toHaveProperty('password');
      expect(transformed).toHaveProperty('id', 1);
    });
  });

  describe('excludeFields', () => {
    test('should exclude specified fields from object', () => {
      const data = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
        ssn: '123-45-6789'
      };
      
      const filtered = excludeFields(data, ['password', 'ssn']);
      
      expect(filtered).toHaveProperty('id');
      expect(filtered).toHaveProperty('name');
      expect(filtered).toHaveProperty('email');
      expect(filtered).not.toHaveProperty('password');
      expect(filtered).not.toHaveProperty('ssn');
    });

    test('should exclude fields from array of objects', () => {
      const data = [
        { id: 1, name: 'John', password: 'secret' },
        { id: 2, name: 'Jane', password: 'secret' }
      ];
      
      const filtered = excludeFields(data, ['password']);
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0]).not.toHaveProperty('password');
      expect(filtered[1]).not.toHaveProperty('password');
    });
  });

  describe('specialized error responses', () => {
    const { 
      validationErrorResponse, 
      authenticationErrorResponse, 
      notFoundErrorResponse 
    } = require('../../../utils/response');

    test('should create validation error response', () => {
      const errors = [{ field: 'email', message: 'Required' }];
      const response = validationErrorResponse(errors);
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.details.errors).toEqual(errors);
    });

    test('should create authentication error response', () => {
      const response = authenticationErrorResponse('Invalid credentials');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.error.statusCode).toBe(401);
    });

    test('should create not found error response', () => {
      const response = notFoundErrorResponse('User not found');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND_ERROR');
      expect(response.error.statusCode).toBe(404);
    });
  });

  describe('edge cases', () => {
    test('should handle null data in success response', () => {
      const response = successResponse(null);
      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });

    test('should handle empty array in paginated response', () => {
      const response = paginatedResponse([], { total: 0, page: 1, limit: 10 });
      expect(response.data).toEqual([]);
      expect(response.pagination.totalPages).toBe(0);
    });

    test('should handle transformation errors gracefully', () => {
      const data = { id: 1 };
      const faultyTransformer = (item) => {
        throw new Error('Transform failed');
      };
      
      expect(() => transformData(data, faultyTransformer)).toThrow();
    });
  });
});