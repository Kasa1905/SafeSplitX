/**
 * Test suite for middleware/auth.js
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = mockStorage;
global.sessionStorage = mockStorage;

// Mock jwt-decode
jest.mock('jwt-decode', () => ({
  __esModule: true,
  default: jest.fn()
}));

const jwtDecode = require('jwt-decode').default;

describe('Auth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset storage mocks
    mockStorage.getItem.mockReturnValue(null);
    mockStorage.setItem.mockClear();
    mockStorage.removeItem.mockClear();
    
    // Reset jwt-decode mock
    jwtDecode.mockReset();
  });

  describe('Token Storage', () => {
    test('should store auth token in localStorage', () => {
      const { setAuthToken } = require('../auth');
      const token = 'valid.jwt.token';
      
      const result = setAuthToken(token);
      
      expect(result.success).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token', token);
    });

    test('should store refresh token when provided', () => {
      const { setAuthToken } = require('../auth');
      const token = 'valid.jwt.token';
      const refreshToken = 'valid.refresh.token';
      
      setAuthToken(token, refreshToken);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token', token);
      expect(mockStorage.setItem).toHaveBeenCalledWith('refresh_token', refreshToken);
    });

    test('should store token with expiry when rememberMe is false', () => {
      const { setAuthToken } = require('../auth');
      const token = 'valid.jwt.token';
      
      setAuthToken(token, null, false);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token', token);
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token_session', 'true');
    });

    test('should retrieve stored auth token', () => {
      const { getAuthToken } = require('../auth');
      const storedToken = 'stored.jwt.token';
      
      mockStorage.getItem.mockReturnValue(storedToken);
      
      const token = getAuthToken();
      
      expect(token).toBe(storedToken);
      expect(mockStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    test('should return null when no token stored', () => {
      const { getAuthToken } = require('../auth');
      
      mockStorage.getItem.mockReturnValue(null);
      
      const token = getAuthToken();
      
      expect(token).toBeNull();
    });
  });

  describe('Token Validation', () => {
    test('should validate token is authenticated when valid token exists', () => {
      const { isAuthenticated } = require('../auth');
      
      mockStorage.getItem.mockReturnValue('valid.jwt.token');
      jwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        userId: 'user-123'
      });
      
      const result = isAuthenticated();
      
      expect(result).toBe(true);
    });

    test('should return false when no token exists', () => {
      const { isAuthenticated } = require('../auth');
      
      mockStorage.getItem.mockReturnValue(null);
      
      const result = isAuthenticated();
      
      expect(result).toBe(false);
    });

    test('should return false when token is expired', () => {
      const { isAuthenticated } = require('../auth');
      
      mockStorage.getItem.mockReturnValue('expired.jwt.token');
      jwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        userId: 'user-123'
      });
      
      const result = isAuthenticated();
      
      expect(result).toBe(false);
    });

    test('should handle invalid token gracefully', () => {
      const { isAuthenticated } = require('../auth');
      
      mockStorage.getItem.mockReturnValue('invalid.token');
      jwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = isAuthenticated();
      
      expect(result).toBe(false);
    });
  });

  describe('Token Refresh Logic', () => {
    test('should indicate refresh needed when token expires soon', () => {
      const { shouldRefreshToken } = require('../auth');
      
      mockStorage.getItem.mockReturnValue('valid.jwt.token');
      jwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 240, // Expires in 4 minutes
        userId: 'user-123'
      });
      
      const result = shouldRefreshToken();
      
      expect(result).toBe(true);
    });

    test('should not refresh when token has plenty of time left', () => {
      const { shouldRefreshToken } = require('../auth');
      
      mockStorage.getItem.mockReturnValue('valid.jwt.token');
      jwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        userId: 'user-123'
      });
      
      const result = shouldRefreshToken();
      
      expect(result).toBe(false);
    });

    test('should return false when no token exists', () => {
      const { shouldRefreshToken } = require('../auth');
      
      mockStorage.getItem.mockReturnValue(null);
      
      const result = shouldRefreshToken();
      
      expect(result).toBe(false);
    });
  });

  describe('Current User', () => {
    test('should return current user from token', () => {
      const { getCurrentUser } = require('../auth');
      const userData = {
        exp: Math.floor(Date.now() / 1000) + 3600,
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      mockStorage.getItem.mockReturnValue('valid.jwt.token');
      jwtDecode.mockReturnValue(userData);
      
      const user = getCurrentUser();
      
      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    test('should return null when no valid token', () => {
      const { getCurrentUser } = require('../auth');
      
      mockStorage.getItem.mockReturnValue(null);
      
      const user = getCurrentUser();
      
      expect(user).toBeNull();
    });

    test('should return null for expired token', () => {
      const { getCurrentUser } = require('../auth');
      
      mockStorage.getItem.mockReturnValue('expired.jwt.token');
      jwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired
        userId: 'user-123'
      });
      
      const user = getCurrentUser();
      
      expect(user).toBeNull();
    });
  });

  describe('Token Cleanup', () => {
    test('should clear all auth tokens', () => {
      const { clearAuthToken } = require('../auth');
      
      const result = clearAuthToken();
      
      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('auth_token_session');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    test('should handle storage errors during cleanup', () => {
      const { clearAuthToken } = require('../auth');
      
      mockStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = clearAuthToken();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage error');
    });
  });

  describe('Auth Listeners', () => {
    test('should add and notify auth listeners', () => {
      const { addAuthListener, notifyAuthListeners } = require('../auth');
      const listener = jest.fn();
      
      addAuthListener(listener);
      notifyAuthListeners('login', { userId: 'user-123' });
      
      expect(listener).toHaveBeenCalledWith('login', { userId: 'user-123' });
    });

    test('should remove auth listeners', () => {
      const { addAuthListener, removeAuthListener, notifyAuthListeners } = require('../auth');
      const listener = jest.fn();
      
      addAuthListener(listener);
      removeAuthListener(listener);
      notifyAuthListeners('logout');
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle errors in listeners gracefully', () => {
      const { addAuthListener, notifyAuthListeners } = require('../auth');
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();
      
      addAuthListener(errorListener);
      addAuthListener(goodListener);
      
      // Should not throw
      expect(() => {
        notifyAuthListeners('login');
      }).not.toThrow();
      
      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
    });
  });
});