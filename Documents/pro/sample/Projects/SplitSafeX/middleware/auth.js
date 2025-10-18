/**
 * Authentication utilities for SafeSplitX middleware
 * Handles token management, user session, and authentication state
 */

const { getConfig } = require('./config');
const jwtDecode = require('jwt-decode');

/**
 * Get storage instance based on configuration
 */
function getStorage() {
  const storageType = getConfig('auth.storageType', 'localStorage');
  
  if (typeof window === 'undefined') {
    // Server-side or Node.js environment
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };
  }
  
  return storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
}

/**
 * Store authentication token securely
 * @param {string} token - JWT access token
 * @param {string} refreshToken - JWT refresh token (optional)
 */
function setAuthToken(token, refreshToken = null) {
  try {
    const storage = getStorage();
    const tokenKey = getConfig('auth.tokenKey');
    const refreshTokenKey = getConfig('auth.refreshTokenKey');
    
    if (token) {
      storage.setItem(tokenKey, token);
    }
    
    if (refreshToken) {
      storage.setItem(refreshTokenKey, refreshToken);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to store auth token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve authentication token
 * @returns {string|null} JWT access token
 */
function getAuthToken() {
  try {
    const storage = getStorage();
    const tokenKey = getConfig('auth.tokenKey');
    return storage.getItem(tokenKey);
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Retrieve refresh token
 * @returns {string|null} JWT refresh token
 */
function getRefreshToken() {
  try {
    const storage = getStorage();
    const refreshTokenKey = getConfig('auth.refreshTokenKey');
    return storage.getItem(refreshTokenKey);
  } catch (error) {
    console.error('Failed to retrieve refresh token:', error);
    return null;
  }
}

/**
 * Clear all authentication data
 */
function clearAuthToken() {
  try {
    const storage = getStorage();
    const tokenKey = getConfig('auth.tokenKey');
    const refreshTokenKey = getConfig('auth.refreshTokenKey');
    
    storage.removeItem(tokenKey);
    storage.removeItem(refreshTokenKey);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to clear auth tokens:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is currently authenticated
 * @returns {boolean} Authentication status
 */
function isAuthenticated() {
  const token = getAuthToken();
  return token && isTokenValid(token);
}

/**
 * Validate JWT token
 * @param {string} token - JWT token to validate
 * @returns {boolean} Token validity
 */
function isTokenValid(token) {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    const buffer = getConfig('auth.tokenExpiryBuffer', 300000) / 1000; // Convert to seconds
    
    // Check if token expires within the buffer time
    return decoded.exp > (now + buffer);
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
}

/**
 * Check if token needs refresh
 * @param {string} token - JWT token to check
 * @returns {boolean} Whether token needs refresh
 */
function shouldRefreshToken(token) {
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    const buffer = getConfig('auth.tokenExpiryBuffer', 300000) / 1000;
    
    // Refresh if token expires within buffer time but is still valid
    return decoded.exp > now && decoded.exp <= (now + buffer);
  } catch (error) {
    return false;
  }
}

/**
 * Get decoded token payload
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload
 */
function getTokenPayload(token = null) {
  const authToken = token || getAuthToken();
  
  if (!authToken) return null;
  
  try {
    return jwtDecode(authToken);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Get current user information from token
 * @returns {Object|null} User information
 */
function getCurrentUser() {
  const payload = getTokenPayload();
  
  if (!payload) return null;
  
  return {
    id: payload.sub || payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    exp: payload.exp,
    iat: payload.iat
  };
}

/**
 * Create authorization header
 * @returns {Object|null} Authorization header object
 */
function getAuthHeader() {
  const token = getAuthToken();
  
  if (!token) return null;
  
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Set up cross-tab authentication synchronization
 */
function setupAuthSync() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('storage', (event) => {
    const tokenKey = getConfig('auth.tokenKey');
    
    if (event.key === tokenKey) {
      // Token changed in another tab
      const newToken = event.newValue;
      
      if (!newToken) {
        // Token was cleared - user logged out
        window.dispatchEvent(new CustomEvent('auth:logout'));
      } else {
        // Token was updated - user logged in or token refreshed
        window.dispatchEvent(new CustomEvent('auth:login', {
          detail: { token: newToken }
        }));
      }
    }
  });
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const token = getAuthToken();
  
  if (token && !isTokenValid(token)) {
    clearAuthToken();
  }
}

/**
 * Initialize authentication system
 */
function initAuth() {
  // Clean up any expired tokens
  cleanupExpiredTokens();
  
  // Set up cross-tab synchronization
  setupAuthSync();
  
  // Set up periodic token cleanup
  if (typeof window !== 'undefined') {
    setInterval(cleanupExpiredTokens, 60000); // Check every minute
  }
}

/**
 * Authentication event listeners
 */
const authListeners = new Set();

/**
 * Add authentication event listener
 * @param {Function} listener - Event listener function
 */
function addAuthListener(listener) {
  authListeners.add(listener);
}

/**
 * Remove authentication event listener
 * @param {Function} listener - Event listener function
 */
function removeAuthListener(listener) {
  authListeners.delete(listener);
}

/**
 * Notify authentication event listeners
 * @param {string} event - Event type ('login' or 'logout')
 * @param {Object} data - Event data
 */
function notifyAuthListeners(event, data = {}) {
  authListeners.forEach(listener => {
    try {
      listener(event, data);
    } catch (error) {
      console.error('Auth listener error:', error);
    }
  });
}

module.exports = {
  setAuthToken,
  getAuthToken,
  getRefreshToken,
  clearAuthToken,
  isAuthenticated,
  isTokenValid,
  shouldRefreshToken,
  getTokenPayload,
  getCurrentUser,
  getAuthHeader,
  setupAuthSync,
  cleanupExpiredTokens,
  initAuth,
  addAuthListener,
  removeAuthListener,
  notifyAuthListeners
};