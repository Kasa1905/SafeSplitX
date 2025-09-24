/**
 * Request validation utilities for SafeSplitX middleware
 * Validates and sanitizes input data before sending to backend
 */

const Joi = require('joi');

/**
 * User credential validation schema
 */
const credentialsSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

/**
 * User registration validation schema
 */
const registrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  }),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional()
});

/**
 * Group data validation schema
 */
const groupSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Group name cannot be empty',
    'string.max': 'Group name cannot exceed 100 characters',
    'any.required': 'Group name is required'
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Description cannot exceed 500 characters'
  }),
  currency: Joi.string().length(3).default('USD').messages({
    'string.length': 'Currency must be a 3-letter code (e.g., USD, EUR)'
  }),
  members: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      role: Joi.string().valid('admin', 'member').default('member')
    })
  ).optional()
});

/**
 * Expense data validation schema
 */
const expenseSchema = Joi.object({
  description: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Expense description cannot be empty',
    'string.max': 'Description cannot exceed 200 characters',
    'any.required': 'Expense description is required'
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Amount must be greater than 0',
    'any.required': 'Amount is required'
  }),
  currency: Joi.string().length(3).default('USD').messages({
    'string.length': 'Currency must be a 3-letter code'
  }),
  category: Joi.string().max(50).optional().messages({
    'string.max': 'Category cannot exceed 50 characters'
  }),
  groupId: Joi.string().required().messages({
    'any.required': 'Group ID is required'
  }),
  date: Joi.date().max('now').default(Date.now).messages({
    'date.max': 'Expense date cannot be in the future'
  }),
  paidBy: Joi.string().required().messages({
    'any.required': 'Paid by user ID is required'
  }),
  splits: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      amount: Joi.number().positive().precision(2).optional(),
      percentage: Joi.number().min(0).max(100).optional(),
      type: Joi.string().valid('equal', 'amount', 'percentage').default('equal')
    }).or('amount', 'percentage')
  ).min(1).required().messages({
    'array.min': 'At least one split is required',
    'any.required': 'Expense splits are required'
  }),
  notes: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  }),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional().messages({
    'string.max': 'Each tag cannot exceed 30 characters',
    'array.max': 'Maximum 10 tags allowed'
  })
});

/**
 * Settlement data validation schema
 */
const settlementSchema = Joi.object({
  fromUserId: Joi.string().required().messages({
    'any.required': 'From user ID is required'
  }),
  toUserId: Joi.string().required().messages({
    'any.required': 'To user ID is required'
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Settlement amount must be greater than 0',
    'any.required': 'Amount is required'
  }),
  currency: Joi.string().length(3).default('USD'),
  groupId: Joi.string().optional(),
  method: Joi.string().max(50).optional(),
  notes: Joi.string().max(500).optional().allow('')
});

/**
 * Pagination parameters validation schema
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().max(50).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Validate user credentials
 * @param {Object} credentials - User credentials
 * @returns {Object} Validation result
 */
function validateCredentials(credentials) {
  const { error, value } = credentialsSchema.validate(credentials, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      success: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      })),
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: value
  };
}

/**
 * Validate user registration data
 * @param {Object} userData - User registration data
 * @returns {Object} Validation result
 */
function validateRegistration(userData) {
  const { error, value } = registrationSchema.validate(userData, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      success: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      })),
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: value
  };
}

/**
 * Validate group data
 * @param {Object} groupData - Group data
 * @returns {Object} Validation result
 */
function validateGroupData(groupData) {
  const { error, value } = groupSchema.validate(groupData, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      success: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      })),
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: value
  };
}

/**
 * Validate expense data
 * @param {Object} expenseData - Expense data
 * @returns {Object} Validation result
 */
function validateExpenseData(expenseData) {
  const { error, value } = expenseSchema.validate(expenseData, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      success: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      })),
      data: null
    };
  }
  
  // Additional business logic validation
  const validatedData = value;
  const businessValidation = validateExpenseBusinessRules(validatedData);
  
  if (!businessValidation.success) {
    return businessValidation;
  }
  
  return {
    success: true,
    errors: [],
    data: validatedData
  };
}

/**
 * Validate settlement data
 * @param {Object} settlementData - Settlement data
 * @returns {Object} Validation result
 */
function validateSettlementData(settlementData) {
  const { error, value } = settlementSchema.validate(settlementData, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      success: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      })),
      data: null
    };
  }
  
  // Validate that fromUserId and toUserId are different
  if (value.fromUserId === value.toUserId) {
    return {
      success: false,
      errors: [{
        field: 'toUserId',
        message: 'Cannot settle with yourself',
        value: value.toUserId
      }],
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: value
  };
}

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Object} Validation result
 */
function validatePagination(params) {
  const { error, value } = paginationSchema.validate(params, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      success: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      })),
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: value
  };
}

/**
 * Validate expense business rules
 * @param {Object} expenseData - Validated expense data
 * @returns {Object} Business validation result
 */
function validateExpenseBusinessRules(expenseData) {
  const errors = [];
  
  // Validate splits add up correctly
  if (expenseData.splits && expenseData.splits.length > 0) {
    const totalAmount = expenseData.amount;
    let splitTotal = 0;
    let percentageTotal = 0;
    
    for (const split of expenseData.splits) {
      if (split.type === 'amount') {
        splitTotal += split.amount;
      } else if (split.type === 'percentage') {
        percentageTotal += split.percentage;
        splitTotal += (totalAmount * split.percentage) / 100;
      } else if (split.type === 'equal') {
        splitTotal += totalAmount / expenseData.splits.length;
      }
    }
    
    // Allow for small rounding differences
    if (Math.abs(splitTotal - totalAmount) > 0.01) {
      errors.push({
        field: 'splits',
        message: `Split amounts (${splitTotal.toFixed(2)}) do not match expense total (${totalAmount.toFixed(2)})`,
        value: expenseData.splits
      });
    }
    
    // Check percentage splits don't exceed 100%
    const percentageSplits = expenseData.splits.filter(s => s.type === 'percentage');
    if (percentageSplits.length > 0) {
      const totalPercentage = percentageSplits.reduce((sum, split) => sum + split.percentage, 0);
      if (totalPercentage > 100) {
        errors.push({
          field: 'splits',
          message: `Percentage splits cannot exceed 100% (currently ${totalPercentage}%)`,
          value: expenseData.splits
        });
      }
    }
  }
  
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: expenseData
  };
}

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Format validation errors for consistent response
 * @param {Array} errors - Validation errors
 * @returns {string} Formatted error message
 */
function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Validation failed';
  }
  
  return errors.map(error => error.message).join(', ');
}

module.exports = {
  validateCredentials,
  validateRegistration,
  validateGroupData,
  validateExpenseData,
  validateSettlementData,
  validatePagination,
  sanitizeString,
  sanitizeObject,
  formatValidationErrors,
  schemas: {
    credentials: credentialsSchema,
    registration: registrationSchema,
    group: groupSchema,
    expense: expenseSchema,
    settlement: settlementSchema,
    pagination: paginationSchema
  }
};