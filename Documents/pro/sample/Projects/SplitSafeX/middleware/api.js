/**
 * Core middleware functions for SafeSplitX
 * Provides clean integration points for frontend API communication
 */

const { post, get, put, del } = require('./httpClient');
const { endpoints, buildUrl } = require('./config');
const { 
  validateCredentials, 
  validateGroupData, 
  validateExpenseData, 
  validateSettlementData,
  sanitizeObject,
  formatValidationErrors
} = require('./validation');
const { 
  setAuthToken, 
  clearAuthToken, 
  isAuthenticated, 
  getCurrentUser,
  notifyAuthListeners 
} = require('./auth');
const { 
  createSuccessResponse, 
  createErrorResponse, 
  transformResponse
} = require('./responseFormatter');
const { handleApiError, createError } = require('./errorHandler');

/**
 * Login user with email and password
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} Standardized response with user data or error
 */
async function loginUser(credentials) {
  try {
    // Validate credentials
    const validation = validateCredentials(credentials);
    if (!validation.success) {
      const msg = formatValidationErrors(validation.errors);
      return createErrorResponse(
        msg,
        'VALIDATION_ERROR',
        { validationErrors: validation.errors, fields: validation.errors }
      );
    }

    // Sanitize input
    const sanitizedCredentials = sanitizeObject(validation.data);

    // Make API request
    const response = await post(endpoints.auth.login, sanitizedCredentials);

    if (response.success) {
      // Store authentication tokens
      const { token, refreshToken, user } = response.data;
      
      if (token) {
        const tokenResult = setAuthToken(token, refreshToken);
        if (!tokenResult.success) {
          return createErrorResponse(
            'Failed to store authentication token',
            'TOKEN_STORAGE_ERROR'
          );
        }
      }

      // Notify auth listeners
      notifyAuthListeners('login', { user, token });

      // Return formatted response
      return createSuccessResponse(
        {
          user: transformResponse({ success: true, data: user }, 'user').data,
          token,
          isAuthenticated: true
        },
        'Login successful'
      );
    }

    return createErrorResponse(
      response.error || 'Login failed',
      response.code || 'LOGIN_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Logout current user
 * @returns {Promise<Object>} Standardized response
 */
async function logoutUser() {
  try {
    // Call backend logout endpoint (optional, for token blacklisting)
    try {
      await post(endpoints.auth.logout);
    } catch (error) {
      // Continue with local logout even if backend fails
      console.warn('Backend logout failed:', error);
    }

    // Clear local authentication data
    const clearResult = clearAuthToken();
    if (!clearResult.success) {
      console.error('Failed to clear auth tokens:', clearResult.error);
    }

    // Notify auth listeners
    notifyAuthListeners('logout');

    return createSuccessResponse(
      { isAuthenticated: false },
      'Logout successful'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Create a new group
 * @param {Object} groupData - Group data
 * @param {string} groupData.name - Group name
 * @param {string} groupData.description - Group description
 * @param {string} groupData.currency - Group currency (default: USD)
 * @param {Array} groupData.members - Initial group members
 * @returns {Promise<Object>} Standardized response with group data or error
 */
async function createGroup(groupData) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    // Validate group data
    const validation = validateGroupData(groupData);
    if (!validation.success) {
      const msg = formatValidationErrors(validation.errors);
      return createErrorResponse(
        msg,
        'VALIDATION_ERROR',
        { validationErrors: validation.errors, fields: validation.errors }
      );
    }

    // Sanitize input
    const sanitizedData = sanitizeObject(validation.data);

    // Make API request
    const response = await post(endpoints.groups.create, sanitizedData);

    if (response.success) {
      return createSuccessResponse(
        transformResponse({ success: true, data: response.data }, 'group').data,
        'Group created successfully'
      );
    }

    return createErrorResponse(
      response.error || 'Failed to create group',
      response.code || 'GROUP_CREATE_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Add an expense to a group
 * @param {Object} expenseData - Expense data
 * @param {string} expenseData.description - Expense description
 * @param {number} expenseData.amount - Expense amount
 * @param {string} expenseData.currency - Expense currency
 * @param {string} expenseData.groupId - Group ID
 * @param {string} expenseData.paidBy - User ID who paid
 * @param {Array} expenseData.splits - Expense splits
 * @returns {Promise<Object>} Standardized response with expense data or error
 */
async function addExpense(expenseData) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    // Validate expense data
    const validation = validateExpenseData(expenseData);
    if (!validation.success) {
      const msg = formatValidationErrors(validation.errors);
      return createErrorResponse(
        msg,
        'VALIDATION_ERROR',
        { validationErrors: validation.errors, fields: validation.errors }
      );
    }

    // Sanitize input
    const sanitizedData = sanitizeObject(validation.data);

    // Make API request
    const response = await post(endpoints.expenses.create, sanitizedData);

    if (response.success) {
      return createSuccessResponse(
        transformResponse({ success: true, data: response.data }, 'expense').data,
        'Expense added successfully'
      );
    }

    return createErrorResponse(
      response.error || 'Failed to add expense',
      response.code || 'EXPENSE_CREATE_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get balances for a user or group
 * @param {Object} options - Balance options
 * @param {string} options.groupId - Group ID (optional)
 * @param {string} options.userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Standardized response with balance data or error
 */
async function getBalances(options = {}) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    const { groupId, userId } = options;
    const currentUser = getCurrentUser();
    const targetUserId = userId || currentUser?.id;

    let endpoint;
    let params = {};

    if (groupId) {
      // Get group balances
      endpoint = buildUrl(endpoints.balances.group, { groupId });
    } else if (targetUserId) {
      // Get user balances
      endpoint = buildUrl(endpoints.balances.user, { userId: targetUserId });
    } else {
      // Get summary balances
      endpoint = endpoints.balances.summary;
    }

    // Make API request
    const response = await get(endpoint, params);

    if (response.success) {
      return createSuccessResponse(
        transformResponse({ success: true, data: response.data }, 'balance').data,
        'Balances retrieved successfully'
      );
    }

    return createErrorResponse(
      response.error || 'Failed to get balances',
      response.code || 'BALANCE_FETCH_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Settle up between users
 * @param {Object} settlementData - Settlement data
 * @param {string} settlementData.fromUserId - User ID paying
 * @param {string} settlementData.toUserId - User ID receiving
 * @param {number} settlementData.amount - Settlement amount
 * @param {string} settlementData.currency - Currency
 * @param {string} settlementData.groupId - Group ID (optional)
 * @param {string} settlementData.method - Payment method (optional)
 * @param {string} settlementData.notes - Settlement notes (optional)
 * @returns {Promise<Object>} Standardized response with settlement data or error
 */
async function settleUp(settlementData) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    // Validate settlement data
    const validation = validateSettlementData(settlementData);
    if (!validation.success) {
      const msg = formatValidationErrors(validation.errors);
      return createErrorResponse(
        msg,
        'VALIDATION_ERROR',
        { validationErrors: validation.errors, fields: validation.errors }
      );
    }

    // Sanitize input
    const sanitizedData = sanitizeObject(validation.data);

    // Make API request
    const response = await post(endpoints.settlements.create, sanitizedData);

    if (response.success) {
      return createSuccessResponse(
        transformResponse({ success: true, data: response.data }, 'settlement').data,
        'Settlement created successfully'
      );
    }

    return createErrorResponse(
      response.error || 'Failed to create settlement',
      response.code || 'SETTLEMENT_CREATE_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get user's groups
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} Standardized response with groups data or error
 */
async function getUserGroups(options = {}) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    const { page = 1, limit = 10 } = options;

    // Make API request
    const response = await get(endpoints.groups.list, { page, limit });

    if (response.success) {
      const transformedData = transformResponse({ success: true, data: response.data }, 'group');
      
      return createSuccessResponse(
        transformedData.data,
        'Groups retrieved successfully',
        { pagination: response.pagination }
      );
    }

    return createErrorResponse(
      response.error || 'Failed to get groups',
      response.code || 'GROUPS_FETCH_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get group expenses
 * @param {string} groupId - Group ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} Standardized response with expenses data or error
 */
async function getGroupExpenses(groupId, options = {}) {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    if (!groupId) {
      return createErrorResponse(
        'Group ID is required',
        'VALIDATION_ERROR'
      );
    }

    const { page = 1, limit = 10 } = options;
    const endpoint = buildUrl(endpoints.expenses.byGroup, { groupId });

    // Make API request
    const response = await get(endpoint, { page, limit });

    if (response.success) {
      const transformedData = transformResponse({ success: true, data: response.data }, 'expense');
      
      return createSuccessResponse(
        transformedData.data,
        'Expenses retrieved successfully',
        { pagination: response.pagination }
      );
    }

    return createErrorResponse(
      response.error || 'Failed to get expenses',
      response.code || 'EXPENSES_FETCH_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get current user profile
 * @returns {Promise<Object>} Standardized response with user data or error
 */
async function getUserProfile() {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return createErrorResponse(
        'Authentication required',
        'UNAUTHORIZED'
      );
    }

    // Make API request
    const response = await get(endpoints.auth.profile);

    if (response.success) {
      return createSuccessResponse(
        transformResponse({ success: true, data: response.data }, 'user').data,
        'Profile retrieved successfully'
      );
    }

    return createErrorResponse(
      response.error || 'Failed to get profile',
      response.code || 'PROFILE_FETCH_FAILED'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

module.exports = {
  loginUser,
  logoutUser,
  createGroup,
  addExpense,
  getBalances,
  settleUp,
  getUserGroups,
  getGroupExpenses,
  getUserProfile
};