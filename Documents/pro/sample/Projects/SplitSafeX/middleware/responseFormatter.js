/**
 * Response formatting utilities for SafeSplitX middleware
 * Ensures consistent response structure for frontend consumption
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Create standardized success response
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {Object} metadata - Optional metadata
 * @returns {Object} Standardized success response
 */
function createSuccessResponse(data, message = null, metadata = {}) {
  return {
    success: true,
    data: data,
    message: message,
    timestamp: new Date().toISOString(),
    requestId: metadata.requestId || uuidv4(),
    ...metadata
  };
}

/**
 * Create standardized error response
 * @param {string} error - Error message
 * @param {string} code - Error code
 * @param {Object} metadata - Optional metadata
 * @returns {Object} Standardized error response
 */
function createErrorResponse(error, code = 'UNKNOWN_ERROR', metadata = {}) {
  return {
    success: false,
    error: error,
    code: code,
    timestamp: new Date().toISOString(),
    requestId: metadata.requestId || uuidv4(),
    ...metadata
  };
}

/**
 * Create paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination information
 * @param {Object} metadata - Optional metadata
 * @returns {Object} Paginated response
 */
function createPaginatedResponse(data, pagination, metadata = {}) {
  return {
    success: true,
    data: data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false
    },
    timestamp: new Date().toISOString(),
    requestId: metadata.requestId || uuidv4(),
    ...metadata
  };
}

/**
 * Format user data for frontend consumption
 * @param {Object} user - Raw user data
 * @returns {Object} Formatted user data
 */
function formatUser(user) {
  if (!user) return null;
  
  return {
    id: user.id || user._id,
    email: user.email,
    name: user.name || user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar || user.profilePicture,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isActive: user.isActive !== false,
    preferences: user.preferences || {}
  };
}

/**
 * Format group data for frontend consumption
 * @param {Object} group - Raw group data
 * @returns {Object} Formatted group data
 */
function formatGroup(group) {
  if (!group) return null;
  
  return {
    id: group.id || group._id,
    name: group.name,
    description: group.description,
    currency: group.currency || 'USD',
    createdBy: formatUser(group.createdBy),
    members: group.members ? group.members.map(member => ({
      user: formatUser(member.user || member),
      role: member.role || 'member',
      joinedAt: member.joinedAt || group.createdAt,
      isActive: member.isActive !== false
    })) : [],
    totalMembers: group.totalMembers || group.members?.length || 0,
    totalExpenses: group.totalExpenses || 0,
    totalAmount: parseFloat(group.totalAmount || 0),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    isActive: group.isActive !== false
  };
}

/**
 * Format expense data for frontend consumption
 * @param {Object} expense - Raw expense data
 * @returns {Object} Formatted expense data
 */
function formatExpense(expense) {
  if (!expense) return null;
  
  return {
    id: expense.id || expense._id,
    description: expense.description,
    amount: parseFloat(expense.amount || 0),
    currency: expense.currency || 'USD',
    category: expense.category,
    date: expense.date || expense.createdAt,
    paidBy: formatUser(expense.paidBy),
    group: expense.group ? {
      id: expense.group.id || expense.group._id || expense.group,
      name: expense.group.name
    } : null,
    splits: expense.splits ? expense.splits.map(split => ({
      user: formatUser(split.user),
      amount: parseFloat(split.amount || 0),
      percentage: parseFloat(split.percentage || 0),
      type: split.type || 'equal'
    })) : [],
    receipts: expense.receipts || [],
    notes: expense.notes,
    tags: expense.tags || [],
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    isSettled: expense.isSettled || false
  };
}

/**
 * Format balance data for frontend consumption
 * @param {Object} balance - Raw balance data
 * @returns {Object} Formatted balance data
 */
function formatBalance(balance) {
  if (!balance) return null;
  
  return {
    user: formatUser(balance.user),
    group: balance.group ? {
      id: balance.group.id || balance.group._id || balance.group,
      name: balance.group.name
    } : null,
    totalPaid: parseFloat(balance.totalPaid || 0),
    totalOwed: parseFloat(balance.totalOwed || 0),
    netBalance: parseFloat(balance.netBalance || 0),
    currency: balance.currency || 'USD',
    lastUpdated: balance.lastUpdated || balance.updatedAt
  };
}

/**
 * Format settlement data for frontend consumption
 * @param {Object} settlement - Raw settlement data
 * @returns {Object} Formatted settlement data
 */
function formatSettlement(settlement) {
  if (!settlement) return null;
  
  return {
    id: settlement.id || settlement._id,
    from: formatUser(settlement.from),
    to: formatUser(settlement.to),
    amount: parseFloat(settlement.amount || 0),
    currency: settlement.currency || 'USD',
    group: settlement.group ? {
      id: settlement.group.id || settlement.group._id || settlement.group,
      name: settlement.group.name
    } : null,
    status: settlement.status || 'pending',
    method: settlement.method,
    reference: settlement.reference,
    notes: settlement.notes,
    createdAt: settlement.createdAt,
    confirmedAt: settlement.confirmedAt,
    isConfirmed: settlement.isConfirmed || false
  };
}

/**
 * Transform backend response to frontend format
 * @param {Object} response - Backend API response
 * @param {string} dataType - Type of data being transformed
 * @returns {Object} Transformed response
 */
function transformResponse(response, dataType = null) {
  if (!response || !response.success) {
    return response;
  }
  
  let transformedData = response.data;
  
  if (dataType && transformedData) {
    switch (dataType.toLowerCase()) {
      case 'user':
        transformedData = Array.isArray(transformedData) 
          ? transformedData.map(formatUser)
          : formatUser(transformedData);
        break;
        
      case 'group':
        transformedData = Array.isArray(transformedData)
          ? transformedData.map(formatGroup)
          : formatGroup(transformedData);
        break;
        
      case 'expense':
        transformedData = Array.isArray(transformedData)
          ? transformedData.map(formatExpense)
          : formatExpense(transformedData);
        break;
        
      case 'balance':
        transformedData = Array.isArray(transformedData)
          ? transformedData.map(formatBalance)
          : formatBalance(transformedData);
        break;
        
      case 'settlement':
        transformedData = Array.isArray(transformedData)
          ? transformedData.map(formatSettlement)
          : formatSettlement(transformedData);
        break;
    }
  }
  
  return {
    ...response,
    data: transformedData
  };
}

/**
 * Format validation errors for display
 * @param {Object} errors - Validation errors object
 * @returns {Array} Array of formatted error messages
 */
function formatValidationErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return [];
  }
  
  const formatted = [];
  
  Object.entries(errors).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      messages.forEach(message => {
        formatted.push({
          field,
          message,
          code: 'VALIDATION_ERROR'
        });
      });
    } else {
      formatted.push({
        field,
        message: messages,
        code: 'VALIDATION_ERROR'
      });
    }
  });
  
  return formatted;
}

/**
 * Create loading response for optimistic updates
 * @param {string} message - Loading message
 * @param {Object} metadata - Optional metadata
 * @returns {Object} Loading response
 */
function createLoadingResponse(message = 'Loading...', metadata = {}) {
  return {
    success: true,
    loading: true,
    message: message,
    timestamp: new Date().toISOString(),
    requestId: metadata.requestId || uuidv4(),
    ...metadata
  };
}

/**
 * Merge response data for optimistic updates
 * @param {Object} optimisticResponse - Optimistic response
 * @param {Object} actualResponse - Actual API response
 * @returns {Object} Merged response
 */
function mergeOptimisticResponse(optimisticResponse, actualResponse) {
  if (!actualResponse.success) {
    return actualResponse;
  }
  
  return {
    ...actualResponse,
    optimistic: false,
    data: actualResponse.data || optimisticResponse.data
  };
}

/**
 * Extract error summary from response
 * @param {Object} errorResponse - Error response
 * @returns {string} Error summary
 */
function getErrorSummary(errorResponse) {
  if (!errorResponse || errorResponse.success) {
    return null;
  }
  
  if (errorResponse.validationErrors) {
    return formatValidationErrors(errorResponse.validationErrors)
      .map(err => err.message)
      .join(', ');
  }
  
  return errorResponse.error || 'An error occurred';
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createLoadingResponse,
  formatUser,
  formatGroup,
  formatExpense,
  formatBalance,
  formatSettlement,
  transformResponse,
  formatValidationErrors,
  mergeOptimisticResponse,
  getErrorSummary
};