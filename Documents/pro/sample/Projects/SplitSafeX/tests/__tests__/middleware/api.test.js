/**
 * Test suite for middleware/api.js
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock all dependencies
jest.mock('../httpClient');
jest.mock('../validation');
jest.mock('../auth');
jest.mock('../responseFormatter');
jest.mock('../errorHandler');

// Import mocked modules
const httpClient = require('../httpClient');
const validation = require('../validation');
const auth = require('../auth');
const responseFormatter = require('../responseFormatter');
const errorHandler = require('../errorHandler');

describe('API Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    auth.isAuthenticated.mockReturnValue(true);
    auth.getCurrentUser.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
    
    validation.sanitizeObject.mockImplementation(obj => obj);
    
    responseFormatter.createSuccessResponse.mockImplementation((data, message) => ({
      success: true,
      data,
      message
    }));
    
    responseFormatter.createErrorResponse.mockImplementation((message, code) => ({
      success: false,
      error: message,
      code
    }));
    
    responseFormatter.transformResponse.mockImplementation((response, type) => response);
    responseFormatter.formatValidationErrors.mockReturnValue('Validation error');
    
    errorHandler.handleApiError.mockReturnValue({
      success: false,
      error: 'API error',
      code: 'API_ERROR'
    });
  });

  describe('loginUser', () => {
    const {
      loginUser
    } = require('../api');

    test('should successfully login with valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      
      validation.validateCredentials.mockReturnValue({
        success: true,
        data: credentials
      });
      
      httpClient.post.mockResolvedValue({
        success: true,
        data: {
          token: 'jwt.token.here',
          refreshToken: 'refresh.token.here',
          user: { id: 'user-123', email: 'test@example.com' }
        }
      });
      
      auth.setAuthToken.mockReturnValue({ success: true });

      const result = await loginUser(credentials);

      expect(validation.validateCredentials).toHaveBeenCalledWith(credentials);
      expect(httpClient.post).toHaveBeenCalledWith(expect.any(String), credentials);
      expect(auth.setAuthToken).toHaveBeenCalledWith('jwt.token.here', 'refresh.token.here');
      expect(result.success).toBe(true);
    });

    test('should return error for invalid credentials', async () => {
      const credentials = { email: 'invalid', password: '123' };
      
      validation.validateCredentials.mockReturnValue({
        success: false,
        errors: [{ field: 'email', message: 'Invalid email' }]
      });

      const result = await loginUser(credentials);

      expect(result.success).toBe(false);
      expect(responseFormatter.createErrorResponse).toHaveBeenCalledWith(
        'Validation error',
        'VALIDATION_ERROR',
        expect.any(Object)
      );
    });

    test('should handle API errors', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      
      validation.validateCredentials.mockReturnValue({
        success: true,
        data: credentials
      });
      
      httpClient.post.mockRejectedValue(new Error('Network error'));

      const result = await loginUser(credentials);

      expect(errorHandler.handleApiError).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    test('should handle token storage failure', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      
      validation.validateCredentials.mockReturnValue({
        success: true,
        data: credentials
      });
      
      httpClient.post.mockResolvedValue({
        success: true,
        data: { token: 'jwt.token.here', user: { id: 'user-123' } }
      });
      
      auth.setAuthToken.mockReturnValue({ 
        success: false, 
        error: 'Storage failed' 
      });

      const result = await loginUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store authentication token');
    });
  });

  describe('logoutUser', () => {
    const {
      logoutUser
    } = require('../api');

    test('should successfully logout user', async () => {
      httpClient.post.mockResolvedValue({ success: true });
      auth.clearAuthToken.mockReturnValue({ success: true });

      const result = await logoutUser();

      expect(httpClient.post).toHaveBeenCalledWith(expect.any(String));
      expect(auth.clearAuthToken).toHaveBeenCalled();
      expect(auth.notifyAuthListeners).toHaveBeenCalledWith('logout');
      expect(result.success).toBe(true);
    });

    test('should logout locally even if backend fails', async () => {
      httpClient.post.mockRejectedValue(new Error('Backend error'));
      auth.clearAuthToken.mockReturnValue({ success: true });

      const result = await logoutUser();

      expect(auth.clearAuthToken).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('createGroup', () => {
    const {
      createGroup
    } = require('../api');

    test('should create group when authenticated', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test description',
        currency: 'USD'
      };
      
      validation.validateGroupData.mockReturnValue({
        success: true,
        data: groupData
      });
      
      httpClient.post.mockResolvedValue({
        success: true,
        data: { id: 'group-123', ...groupData }
      });

      const result = await createGroup(groupData);

      expect(auth.isAuthenticated).toHaveBeenCalled();
      expect(validation.validateGroupData).toHaveBeenCalledWith(groupData);
      expect(httpClient.post).toHaveBeenCalledWith(expect.any(String), groupData);
      expect(result.success).toBe(true);
    });

    test('should reject when not authenticated', async () => {
      auth.isAuthenticated.mockReturnValue(false);

      const result = await createGroup({});

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    test('should return validation errors', async () => {
      const groupData = { name: '' };
      
      validation.validateGroupData.mockReturnValue({
        success: false,
        errors: [{ field: 'name', message: 'Name required' }]
      });

      const result = await createGroup(groupData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('addExpense', () => {
    const {
      addExpense
    } = require('../api');

    test('should add expense when authenticated and valid', async () => {
      const expenseData = {
        description: 'Test expense',
        amount: 100,
        currency: 'USD',
        groupId: 'group-123',
        paidBy: 'user-123',
        splits: [{ userId: 'user-123', amount: 100 }]
      };
      
      validation.validateExpenseData.mockReturnValue({
        success: true,
        data: expenseData
      });
      
      httpClient.post.mockResolvedValue({
        success: true,
        data: { id: 'expense-123', ...expenseData }
      });

      const result = await addExpense(expenseData);

      expect(validation.validateExpenseData).toHaveBeenCalledWith(expenseData);
      expect(httpClient.post).toHaveBeenCalledWith(expect.any(String), expenseData);
      expect(result.success).toBe(true);
    });

    test('should reject when not authenticated', async () => {
      auth.isAuthenticated.mockReturnValue(false);

      const result = await addExpense({});

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });
  });

  describe('getBalances', () => {
    const {
      getBalances
    } = require('../api');

    test('should get user balances when authenticated', async () => {
      const balanceData = { totalOwed: 50, totalOwing: 30 };
      
      httpClient.get.mockResolvedValue({
        success: true,
        data: balanceData
      });

      const result = await getBalances({ userId: 'user-123' });

      expect(httpClient.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should get group balances', async () => {
      const balanceData = { groupBalance: 100 };
      
      httpClient.get.mockResolvedValue({
        success: true,
        data: balanceData
      });

      const result = await getBalances({ groupId: 'group-123' });

      expect(httpClient.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should reject when not authenticated', async () => {
      auth.isAuthenticated.mockReturnValue(false);

      const result = await getBalances();

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });
  });

  describe('settleUp', () => {
    const {
      settleUp
    } = require('../api');

    test('should create settlement when valid', async () => {
      const settlementData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        amount: 50,
        currency: 'USD'
      };
      
      validation.validateSettlementData.mockReturnValue({
        success: true,
        data: settlementData
      });
      
      httpClient.post.mockResolvedValue({
        success: true,
        data: { id: 'settlement-123', ...settlementData }
      });

      const result = await settleUp(settlementData);

      expect(validation.validateSettlementData).toHaveBeenCalledWith(settlementData);
      expect(httpClient.post).toHaveBeenCalledWith(expect.any(String), settlementData);
      expect(result.success).toBe(true);
    });

    test('should reject when not authenticated', async () => {
      auth.isAuthenticated.mockReturnValue(false);

      const result = await settleUp({});

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });
  });

  describe('getUserGroups', () => {
    const {
      getUserGroups
    } = require('../api');

    test('should get user groups with pagination', async () => {
      const groupsData = [
        { id: 'group-1', name: 'Group 1' },
        { id: 'group-2', name: 'Group 2' }
      ];
      
      httpClient.get.mockResolvedValue({
        success: true,
        data: groupsData,
        pagination: { page: 1, limit: 10, total: 2 }
      });

      const result = await getUserGroups({ page: 1, limit: 10 });

      expect(httpClient.get).toHaveBeenCalledWith(expect.any(String), { page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.pagination).toBeDefined();
    });

    test('should use default pagination', async () => {
      httpClient.get.mockResolvedValue({
        success: true,
        data: []
      });

      await getUserGroups();

      expect(httpClient.get).toHaveBeenCalledWith(expect.any(String), { page: 1, limit: 10 });
    });
  });

  describe('getGroupExpenses', () => {
    const {
      getGroupExpenses
    } = require('../api');

    test('should get group expenses', async () => {
      const expensesData = [
        { id: 'expense-1', description: 'Expense 1', amount: 50 },
        { id: 'expense-2', description: 'Expense 2', amount: 75 }
      ];
      
      httpClient.get.mockResolvedValue({
        success: true,
        data: expensesData
      });

      const result = await getGroupExpenses('group-123');

      expect(httpClient.get).toHaveBeenCalledWith(
        expect.any(String), 
        { page: 1, limit: 10 }
      );
      expect(result.success).toBe(true);
    });

    test('should reject when group ID missing', async () => {
      const result = await getGroupExpenses();

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    test('should reject when not authenticated', async () => {
      auth.isAuthenticated.mockReturnValue(false);

      const result = await getGroupExpenses('group-123');

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });
  });

  describe('getUserProfile', () => {
    const {
      getUserProfile
    } = require('../api');

    test('should get user profile when authenticated', async () => {
      const profileData = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      httpClient.get.mockResolvedValue({
        success: true,
        data: profileData
      });

      const result = await getUserProfile();

      expect(httpClient.get).toHaveBeenCalledWith(expect.any(String));
      expect(result.success).toBe(true);
    });

    test('should reject when not authenticated', async () => {
      auth.isAuthenticated.mockReturnValue(false);

      const result = await getUserProfile();

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });
  });
});