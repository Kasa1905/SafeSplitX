/**
 * JSON Contract Validation Helpers for SafeSplitX Integration Tests
 * Provides comprehensive schema validation for API responses
 */

const Joi = require('joi');

/**
 * Common schema patterns for SafeSplitX API responses
 */
const commonSchemas = {
  // Base response structure
  baseResponse: Joi.object({
    success: Joi.boolean().required(),
    message: Joi.string().optional(),
    timestamp: Joi.date().iso().optional(),
    requestId: Joi.string().optional()
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).required(),
    limit: Joi.number().integer().min(1).max(100).required(),
    total: Joi.number().integer().min(0).required(),
    pages: Joi.number().integer().min(0).required()
  }),

  // User schema
  user: Joi.object({
    _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    name: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('user', 'admin', 'moderator').default('user'),
    isActive: Joi.boolean().default(true),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required(),
    preferences: Joi.object({
      currency: Joi.string().length(3).default('USD'),
      notifications: Joi.boolean().default(true),
      theme: Joi.string().valid('light', 'dark').default('light')
    }).optional()
  }),

  // Group schema
  group: Joi.object({
    _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    currency: Joi.string().length(3).required(),
    members: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).required(),
    createdBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required(),
    settings: Joi.object({
      autoApprove: Joi.boolean().default(false),
      requireReceipts: Joi.boolean().default(false)
    }).optional()
  }),

  // Expense schema
  expense: Joi.object({
    _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    description: Joi.string().min(1).max(200).required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).required(),
    category: Joi.string().valid('food', 'transport', 'accommodation', 'entertainment', 'utilities', 'other').required(),
    date: Joi.date().iso().required(),
    paidBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    splits: Joi.array().items(Joi.object({
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      amount: Joi.number().positive().precision(2).required(),
      percentage: Joi.number().min(0).max(100).precision(2).optional()
    })).required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending'),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    receipt: Joi.object({
      url: Joi.string().uri().optional(),
      originalName: Joi.string().optional(),
      mimeType: Joi.string().optional(),
      size: Joi.number().integer().positive().optional()
    }).optional(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required()
  }),

  // Fraud analysis schema
  fraudAnalysis: Joi.object({
    _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    expenseId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    riskScore: Joi.number().min(0).max(1).precision(3).required(),
    riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    confidence: Joi.number().min(0).max(1).precision(3).required(),
    factors: Joi.array().items(Joi.string()).required(),
    recommendation: Joi.string().valid('approve', 'review', 'reject').required(),
    analysisDate: Joi.date().iso().required(),
    aiModel: Joi.string().optional(),
    processingTime: Joi.number().positive().optional()
  }),

  // Settlement schema
  settlement: Joi.object({
    _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    debtor: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    creditor: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).required(),
    status: Joi.string().valid('pending', 'completed', 'cancelled').default('pending'),
    description: Joi.string().max(200).optional(),
    dueDate: Joi.date().iso().optional(),
    completedAt: Joi.date().iso().optional(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required()
  }),

  // Payment schema
  payment: Joi.object({
    _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    settlementId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).required(),
    method: Joi.string().valid('cash', 'bank_transfer', 'card', 'paypal', 'venmo', 'other').required(),
    reference: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional(),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled').default('pending'),
    processedAt: Joi.date().iso().optional(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().required()
  }),

  // Currency conversion schema
  currencyConversion: Joi.object({
    from: Joi.string().length(3).required(),
    to: Joi.string().length(3).required(),
    amount: Joi.number().positive().precision(2).required(),
    convertedAmount: Joi.number().positive().precision(2).required(),
    rate: Joi.number().positive().precision(6).required(),
    timestamp: Joi.date().iso().required(),
    provider: Joi.string().optional()
  }),

  // Error schema
  error: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().required(),
    code: Joi.string().optional(),
    details: Joi.alternatives(Joi.string(), Joi.object(), Joi.array()).optional(),
    timestamp: Joi.date().iso().optional(),
    requestId: Joi.string().optional()
  })
};

/**
 * API response schemas for different endpoints
 */
const responseSchemas = {
  // Authentication responses
  'POST /api/auth/register': commonSchemas.baseResponse.keys({
    data: Joi.object({
      user: commonSchemas.user,
      token: Joi.string().required()
    }).required()
  }),

  'POST /api/auth/login': commonSchemas.baseResponse.keys({
    data: Joi.object({
      user: commonSchemas.user,
      token: Joi.string().required()
    }).required()
  }),

  'POST /api/auth/logout': commonSchemas.baseResponse,

  'GET /api/auth/me': commonSchemas.baseResponse.keys({
    data: commonSchemas.user.required()
  }),

  // User management responses
  'GET /api/users': commonSchemas.baseResponse.keys({
    data: Joi.array().items(commonSchemas.user).required(),
    pagination: commonSchemas.pagination.optional()
  }),

  'GET /api/users/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.user.required()
  }),

  'PUT /api/users/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.user.required()
  }),

  // Group management responses
  'GET /api/groups': commonSchemas.baseResponse.keys({
    data: Joi.array().items(commonSchemas.group).required(),
    pagination: commonSchemas.pagination.optional()
  }),

  'POST /api/groups': commonSchemas.baseResponse.keys({
    data: commonSchemas.group.required()
  }),

  'GET /api/groups/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.group.required()
  }),

  'PUT /api/groups/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.group.required()
  }),

  'DELETE /api/groups/:id': commonSchemas.baseResponse,

  // Expense management responses
  'GET /api/expenses': commonSchemas.baseResponse.keys({
    data: Joi.array().items(commonSchemas.expense).required(),
    pagination: commonSchemas.pagination.optional()
  }),

  'POST /api/expenses': commonSchemas.baseResponse.keys({
    data: commonSchemas.expense.required()
  }),

  'GET /api/expenses/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.expense.required()
  }),

  'PUT /api/expenses/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.expense.required()
  }),

  'DELETE /api/expenses/:id': commonSchemas.baseResponse,

  // Fraud detection responses
  'POST /api/fraud/analyze': commonSchemas.baseResponse.keys({
    data: commonSchemas.fraudAnalysis.required()
  }),

  'GET /api/fraud/analyses': commonSchemas.baseResponse.keys({
    data: Joi.array().items(commonSchemas.fraudAnalysis).required(),
    pagination: commonSchemas.pagination.optional()
  }),

  'GET /api/fraud/analyses/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.fraudAnalysis.required()
  }),

  // Settlement responses
  'GET /api/settlements': commonSchemas.baseResponse.keys({
    data: Joi.array().items(commonSchemas.settlement).required(),
    pagination: commonSchemas.pagination.optional()
  }),

  'POST /api/settlements': commonSchemas.baseResponse.keys({
    data: commonSchemas.settlement.required()
  }),

  'GET /api/settlements/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.settlement.required()
  }),

  'PUT /api/settlements/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.settlement.required()
  }),

  // Payment responses
  'GET /api/payments': commonSchemas.baseResponse.keys({
    data: Joi.array().items(commonSchemas.payment).required(),
    pagination: commonSchemas.pagination.optional()
  }),

  'POST /api/payments': commonSchemas.baseResponse.keys({
    data: commonSchemas.payment.required()
  }),

  'GET /api/payments/:id': commonSchemas.baseResponse.keys({
    data: commonSchemas.payment.required()
  }),

  // Currency responses
  'GET /api/currency/rates': commonSchemas.baseResponse.keys({
    data: Joi.object({
      base: Joi.string().length(3).required(),
      rates: Joi.object().pattern(Joi.string().length(3), Joi.number().positive()).required(),
      timestamp: Joi.date().iso().required()
    }).required()
  }),

  'POST /api/currency/convert': commonSchemas.baseResponse.keys({
    data: commonSchemas.currencyConversion.required()
  }),

  // Analytics responses
  'GET /api/analytics/expenses/summary': commonSchemas.baseResponse.keys({
    data: Joi.object({
      totalExpenses: Joi.number().min(0).precision(2).required(),
      totalTransactions: Joi.number().integer().min(0).required(),
      averageAmount: Joi.number().min(0).precision(2).required(),
      categories: Joi.object().pattern(Joi.string(), Joi.number().min(0)).required(),
      monthlyTrend: Joi.array().items(Joi.object({
        month: Joi.string().required(),
        amount: Joi.number().min(0).precision(2).required(),
        count: Joi.number().integer().min(0).required()
      })).required()
    }).required()
  }),

  // Health check responses
  'GET /api/health': commonSchemas.baseResponse.keys({
    data: Joi.object({
      status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
      uptime: Joi.number().positive().required(),
      version: Joi.string().required(),
      services: Joi.object({
        database: Joi.string().valid('connected', 'disconnected', 'error').required(),
        redis: Joi.string().valid('connected', 'disconnected', 'error').optional(),
        ai_service: Joi.string().valid('healthy', 'down', 'error').optional()
      }).required()
    }).required()
  })
};

/**
 * Validate API response against predefined schema
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API path with parameters
 * @param {Object} responseBody - Response body to validate
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Validation result with success and errors
 */
const validateApiResponse = (method, path, responseBody, statusCode) => {
  const schemaKey = `${method.toUpperCase()} ${path}`;
  const schema = responseSchemas[schemaKey];

  if (!schema) {
    return {
      success: false,
      error: `No schema defined for ${schemaKey}`,
      validatedData: null
    };
  }

  // For error responses, use the error schema
  if (statusCode >= 400) {
    const { error, value } = commonSchemas.error.validate(responseBody, { allowUnknown: false });
    return {
      success: error === undefined,
      error: error ? error.details.map(d => d.message).join(', ') : null,
      validatedData: value
    };
  }

  // For success responses, use the specific schema
  const { error, value } = schema.validate(responseBody, { allowUnknown: false });
  return {
    success: error === undefined,
    error: error ? error.details.map(d => d.message).join(', ') : null,
    validatedData: value
  };
};

/**
 * Enhanced contract validation that combines status code and schema validation
 * @param {Object} response - Supertest response object
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @returns {Object} Enhanced validation result
 */
const validateContract = (response, method, path) => {
  const { status, body } = response;
  
  // First validate the response schema
  const schemaValidation = validateApiResponse(method, path, body, status);
  
  // Additional contract validations
  const contractValidations = {
    hasTimestamp: body.timestamp ? new Date(body.timestamp).getTime() > 0 : true,
    hasRequestId: typeof body.requestId === 'string' || body.requestId === undefined,
    successMatchesStatus: (status < 400 && body.success === true) || (status >= 400 && body.success === false),
    errorHasMessage: status >= 400 ? typeof body.error === 'string' && body.error.length > 0 : true
  };

  const contractErrors = Object.entries(contractValidations)
    .filter(([key, passed]) => !passed)
    .map(([key]) => `Contract violation: ${key}`);

  return {
    ...schemaValidation,
    contractValidations,
    contractErrors,
    isValidContract: schemaValidation.success && contractErrors.length === 0
  };
};

/**
 * Create enhanced expectation functions with contract validation
 */
const expectValidContract = (response, method, path) => {
  const validation = validateContract(response, method, path);
  
  if (!validation.isValidContract) {
    const errors = [
      ...(validation.error ? [validation.error] : []),
      ...validation.contractErrors
    ];
    throw new Error(`Contract validation failed: ${errors.join('; ')}`);
  }
  
  return validation.validatedData;
};

/**
 * Middleware to automatically validate contracts in test helpers
 */
const withContractValidation = (originalHelper) => {
  return (response, method, path) => {
    // Call original helper first
    const result = originalHelper(response);
    
    // Then validate contract
    expectValidContract(response, method, path);
    
    return result;
  };
};

module.exports = {
  commonSchemas,
  responseSchemas,
  validateApiResponse,
  validateContract,
  expectValidContract,
  withContractValidation
};