const request = require('supertest');
const jwt = require('jsonwebtoken');
const { expectValidContract } = require('./contractValidation');

/**
 * Make authenticated API request
 * @param {Object} app - Express app instance
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} url - Request URL
 * @param {string} token - JWT token
 * @param {Object} data - Request data
 * @returns {Object} Supertest request object
 */
const makeAuthenticatedRequest = (app, method, url, token, data = null) => {
  let req = request(app)[method.toLowerCase()](url);
  
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  
  if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
    req = req.send(data);
  }
  
  return req;
};

/**
 * Validate success response format with optional contract validation
 * @param {Object} response - Response object
 * @param {Object} expectedData - Expected data structure (optional)
 * @param {string} method - HTTP method for contract validation (optional)
 * @param {string} path - API path for contract validation (optional)
 */
const expectSuccessResponse = (response, expectedData = null, method = null, path = null) => {
  expect(response.status).toBeLessThan(400);
  expect(response.headers['content-type']).toMatch(/json/);
  expect(response.body).toHaveProperty('success', true);
  
  if (expectedData) {
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toMatchObject(expectedData);
  }

  // Optional contract validation if method and path are provided
  if (method && path) {
    expectValidContract(response, method, path);
  }
};

/**
 * Validate error response format following { success: false, error: "message" } pattern
 * @param {Object} response - Response object
 * @param {string} expectedError - Expected error message (optional)
 * @param {number} expectedCode - Expected status code (optional)
 * @param {string} method - HTTP method for contract validation (optional)
 * @param {string} path - API path for contract validation (optional)
 */
const expectErrorResponse = (response, expectedError = null, expectedCode = null, method = null, path = null) => {
  if (expectedCode) {
    expect(response.status).toBe(expectedCode);
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400);
  }
  
  expect(response.headers['content-type']).toMatch(/json/);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  expect(typeof response.body.error).toBe('string');
  
  if (expectedError) {
    expect(response.body.error).toContain(expectedError);
  }

  // Optional contract validation if method and path are provided
  if (method && path) {
    expectValidContract(response, method, path);
  }
};

/**
 * Validate validation error response
 * @param {Object} response - Response object
 */
const expectValidationError = (response) => {
  expect(response.status).toBe(400);
  expect(response.headers['content-type']).toMatch(/json/);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toMatch(/validation|invalid|required/i);
};

/**
 * Generate JWT token for testing
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
const createAuthToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

/**
 * Setup test Express app with routes
 * @returns {Object} Express app instance
 */
const setupTestApp = () => {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const compression = require('compression');
  
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Import and use routes
  const authRoutes = require('../../backend/routes/auth');
  const expenseRoutes = require('../../backend/routes/expenses');
  const fraudRoutes = require('../../backend/routes/fraud');
  const groupRoutes = require('../../backend/routes/groups');
  const settlementRoutes = require('../../backend/routes/settlements');
  const currencyRoutes = require('../../backend/routes/currency');
  const paymentRoutes = require('../../backend/routes/payments');
  const analyticsRoutes = require('../../backend/routes/analytics');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/fraud', fraudRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/settlements', settlementRoutes);
  app.use('/api/currency', currencyRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/analytics', analyticsRoutes);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });
  
  return app;
};

/**
 * Validate JSON response content type
 * @param {Object} response - Response object
 */
const expectJsonResponse = (response) => {
  expect(response.headers['content-type']).toMatch(/json/);
};

/**
 * Validate paginated response structure
 * @param {Object} response - Response object
 * @param {Object} options - Pagination options
 */
const expectPaginatedResponse = (response, options = {}) => {
  expectSuccessResponse(response);
  expect(response.body.data).toHaveProperty('items');
  expect(response.body.data).toHaveProperty('pagination');
  expect(response.body.data.pagination).toHaveProperty('page');
  expect(response.body.data.pagination).toHaveProperty('limit');
  expect(response.body.data.pagination).toHaveProperty('total');
  expect(response.body.data.pagination).toHaveProperty('totalPages');
  
  expect(Array.isArray(response.body.data.items)).toBe(true);
  expect(typeof response.body.data.pagination.page).toBe('number');
  expect(typeof response.body.data.pagination.limit).toBe('number');
  expect(typeof response.body.data.pagination.total).toBe('number');
  expect(typeof response.body.data.pagination.totalPages).toBe('number');
  
  if (options.expectedPage) {
    expect(response.body.data.pagination.page).toBe(options.expectedPage);
  }
  
  if (options.expectedLimit) {
    expect(response.body.data.pagination.limit).toBe(options.expectedLimit);
  }
  
  if (options.maxItems) {
    expect(response.body.data.items.length).toBeLessThanOrEqual(options.maxItems);
  }
};

/**
 * Create test user and return auth token
 * @param {Object} userData - User data overrides
 * @returns {Object} { user, token }
 */
const createTestUserWithToken = async (userData = {}) => {
  const user = await global.createTestUser(userData);
  const token = createAuthToken(user._id.toString(), user.role);
  return { user, token };
};

/**
 * Create test group with members and return group
 * @param {Array} members - Array of user IDs
 * @param {Object} groupData - Group data overrides
 * @returns {Object} Group document
 */
const createTestGroupWithMembers = async (members = [], groupData = {}) => {
  const group = await global.createTestGroup({
    members: members.map(member => ({
      userId: member,
      role: 'member',
      joinedAt: new Date()
    })),
    ...groupData
  });
  return group;
};

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  makeAuthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  createAuthToken,
  setupTestApp,
  expectJsonResponse,
  expectPaginatedResponse,
  createTestUserWithToken,
  createTestGroupWithMembers,
  sleep
};