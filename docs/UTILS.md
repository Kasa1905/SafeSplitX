# SafeSplitX Shared Utilities

## Overview

The SafeSplitX Shared Utilities package provides a comprehensive set of framework-agnostic utility functions designed to be used across all modules in the SafeSplitX monorepo. These utilities handle common concerns such as input sanitization, error handling, logging, configuration management, validation, response formatting, and general helper functions.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Modules](#modules)
  - [Sanitizer](#sanitizer)
  - [Error Handler](#error-handler)
  - [Logger](#logger)
  - [Configuration](#configuration)
  - [Validation](#validation)
  - [Response Formatting](#response-formatting)
  - [Helpers](#helpers)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Contributing](#contributing)

## Installation

```bash
npm install @safesplitx/shared-utils
```

## Quick Start

```javascript
// Import the entire utils package
const utils = require('@safesplitx/shared-utils');

// Or import specific utilities
const { sanitizeString, validateEmail, successResponse } = require('@safesplitx/shared-utils');

// Use organized collections
const { utils: { security, validate, response } } = require('@safesplitx/shared-utils');
```

## Modules

### Sanitizer

The sanitizer module provides comprehensive input sanitization with XSS protection and injection prevention.

#### Key Functions

- `sanitizeString(input, options)` - Sanitizes string input with XSS protection
- `sanitizeEmail(email)` - Sanitizes and validates email addresses
- `sanitizeNumber(input)` - Sanitizes numeric input with SQL injection prevention
- `sanitizeHtml(html, options)` - Sanitizes HTML content while preserving safe tags
- `sanitizeObject(obj, deep)` - Recursively sanitizes object properties
- `sanitizeArray(arr)` - Sanitizes arrays of strings or objects
- `whitelistFields(obj, allowedFields)` - Filters object to only include allowed fields
- `removeDangerousPatterns(input)` - Removes known dangerous patterns

#### Example Usage

```javascript
const { sanitizer } = require('@safesplitx/shared-utils');

// Basic string sanitization
const clean = sanitizer.sanitizeString('<script>alert("xss")</script>Hello');
// Result: 'Hello'

// Email sanitization
const email = sanitizer.sanitizeEmail('USER@EXAMPLE.COM');
// Result: 'user@example.com'

// Object sanitization
const userInput = {
  name: '<script>alert("xss")</script>John',
  email: 'JOHN@EXAMPLE.COM',
  bio: '<img src=x onerror=alert("xss")>Developer'
};
const sanitized = sanitizer.sanitizeObject(userInput);
```

### Error Handler

Standardized error handling following team guidelines with consistent error response formats.

#### Key Classes and Functions

- `AppError` - Custom error class with code, status, and metadata
- `createError(code, statusCode, message, details)` - Factory for creating errors
- `formatError(error)` - Formats errors for consistent API responses
- `createValidationError(message, details)` - Creates validation errors
- `createAuthenticationError(message)` - Creates authentication errors
- `createAuthorizationError(message)` - Creates authorization errors
- `createNotFoundError(message)` - Creates not found errors

#### Example Usage

```javascript
const { errorHandler } = require('@safesplitx/shared-utils');

// Create custom error
const error = errorHandler.createError(
  'VALIDATION_ERROR',
  400,
  'Invalid email format',
  { field: 'email', value: 'invalid-email' }
);

// Format error for API response
const formattedError = errorHandler.formatError(error);

// Use specialized error creators
const authError = errorHandler.createAuthenticationError('Invalid credentials');
const notFoundError = errorHandler.createNotFoundError('User not found');
```

### Logger

Centralized logging system with specialized loggers for different concerns.

#### Available Loggers

- `fraudLogger` - For fraud detection and prevention logging
- `settlementLogger` - For financial settlement operations
- `transactionLogger` - For transaction-related events
- `securityLogger` - For security events and audit trails
- `auditLogger` - For compliance and audit logging
- `performanceLogger` - For performance monitoring

#### Example Usage

```javascript
const { logger } = require('@safesplitx/shared-utils');

// Log fraud detection
logger.fraudLogger.warn('Suspicious transaction pattern detected', {
  userId: '12345',
  transactionId: 'txn_67890',
  riskScore: 0.85,
  correlationId: 'req_abc123'
});

// Log settlement operation
logger.settlementLogger.info('Settlement completed successfully', {
  settlementId: 'settle_12345',
  amount: 1000.00,
  currency: 'USD',
  participantCount: 4
});

// Log security event
logger.securityLogger.error('Failed login attempt', {
  email: 'user@example.com',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

### Configuration

Comprehensive configuration management with environment variable validation.

#### Key Functions

- `getConfig(key, defaultValue)` - Get configuration value
- `getDatabaseConfig()` - Get database configuration
- `getJWTConfig()` - Get JWT configuration
- `getRedisConfig()` - Get Redis configuration
- `getEmailConfig()` - Get email service configuration
- `getAppConfig()` - Get application configuration

#### Example Usage

```javascript
const { config } = require('@safesplitx/shared-utils');

// Get database configuration
const dbConfig = config.getDatabaseConfig();
console.log(dbConfig.url, dbConfig.options);

// Get JWT configuration
const jwtConfig = config.getJWTConfig();
console.log(jwtConfig.secret, jwtConfig.expiresIn);

// Get custom configuration
const customValue = config.getConfig('CUSTOM_SETTING', 'default-value');
```

### Validation

Comprehensive validation utilities for common data types and business logic.

#### Key Functions

- `validateEmail(email)` - Validates email addresses
- `validatePhone(phone, country)` - Validates phone numbers
- `validateCurrency(code)` - Validates currency codes
- `validateAmount(amount, options)` - Validates monetary amounts
- `validateDate(date, options)` - Validates dates
- `validateId(id, type)` - Validates various ID formats
- `validatePassword(password, requirements)` - Validates password strength
- `validateSchema(data, schema)` - Validates data against Joi schema

#### Example Usage

```javascript
const { validation } = require('@safesplitx/shared-utils');

// Email validation
const emailResult = validation.validateEmail('user@example.com');
if (emailResult.isValid) {
  console.log('Valid email:', emailResult.value);
} else {
  console.log('Errors:', emailResult.errors);
}

// Amount validation with options
const amountResult = validation.validateAmount(100.50, {
  min: 0.01,
  max: 10000,
  maxDecimals: 2
});

// Schema validation
const Joi = require('joi');
const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(0)
});

const result = validation.validateSchema(userData, userSchema);
```

### Response Formatting

Utilities for consistent API response formatting across all modules.

#### Key Functions

- `successResponse(data, message, metadata)` - Creates success responses
- `errorResponse(error, code, details)` - Creates error responses
- `paginatedResponse(data, pagination)` - Creates paginated responses
- `formatApiResponse(data, options)` - General response formatter
- Specialized error responses: `validationErrorResponse`, `authenticationErrorResponse`, etc.
- Data transformation: `transformData`, `excludeFields`, `includeFields`

#### Example Usage

```javascript
const { response } = require('@safesplitx/shared-utils');

// Success response
const success = response.successResponse(
  { users: userList },
  'Users retrieved successfully',
  { total: userList.length }
);

// Error response
const error = response.errorResponse(
  'Validation failed',
  'VALIDATION_ERROR',
  { field: 'email', message: 'Required' }
);

// Paginated response
const paginated = response.paginatedResponse(users, {
  total: 150,
  page: 2,
  limit: 10
});

// Transform data before response
const transformed = response.transformData(users, user => ({
  id: user.id,
  name: user.name,
  email: user.email
  // password excluded
}));
```

### Helpers

General-purpose helper functions for common operations.

#### Categories

**Date & Time**
- `formatDate(date, options)` - Format dates with various options
- `formatRelativeTime(date)` - Format relative time (e.g., "2 hours ago")

**Currency & Numbers**
- `formatCurrency(amount, currency, locale)` - Format currency amounts
- `formatNumber(number, options)` - Format numbers with localization

**String Manipulation**
- `capitalize(str)` - Capitalize first letter
- `toCamelCase(str)` - Convert to camelCase
- `toSnakeCase(str)` - Convert to snake_case
- `toKebabCase(str)` - Convert to kebab-case
- `truncate(str, length, suffix)` - Truncate strings

**Object & Array Utilities**
- `deepClone(obj)` - Deep clone objects and arrays
- `isEmpty(value)` - Check if value is empty
- `getNestedProperty(obj, path, defaultValue)` - Safely access nested properties
- `setNestedProperty(obj, path, value)` - Safely set nested properties
- `removeDuplicates(arr, key)` - Remove duplicates from arrays
- `groupBy(arr, key)` - Group array elements
- `sortBy(arr, key, order)` - Sort arrays by property

**Function Utilities**
- `debounce(func, wait, immediate)` - Debounce function calls
- `throttle(func, limit)` - Throttle function calls
- `retry(func, options)` - Retry failed operations with exponential backoff
- `sleep(ms)` - Async sleep/delay

**ID Generation**
- `generateId(type)` - Generate various types of IDs (UUID, short, numeric, crypto)

#### Example Usage

```javascript
const { helpers } = require('@safesplitx/shared-utils');

// Date formatting
const formatted = helpers.formatDate(new Date(), {
  format: 'short',
  locale: 'en-US',
  includeTime: true
});

// Currency formatting
const price = helpers.formatCurrency(1234.56, 'USD', 'en-US');
// Result: '$1,234.56'

// String manipulation
const camelCase = helpers.toCamelCase('hello world test');
// Result: 'helloWorldTest'

// Deep cloning
const cloned = helpers.deepClone(complexObject);

// Function utilities
const debouncedSearch = helpers.debounce(searchFunction, 300);

// Retry with exponential backoff
const result = await helpers.retry(apiCall, {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffFactor: 2
});
```

## Usage Examples

### Full Integration Example

```javascript
const {
  sanitizer,
  validation,
  errorHandler,
  response,
  logger
} = require('@safesplitx/shared-utils');

async function createUser(userData) {
  try {
    // 1. Sanitize input
    const sanitized = sanitizer.sanitizeObject(userData);
    
    // 2. Validate data
    const emailValidation = validation.validateEmail(sanitized.email);
    if (!emailValidation.isValid) {
      throw errorHandler.createValidationError(
        'Invalid email format',
        { field: 'email', errors: emailValidation.errors }
      );
    }
    
    // 3. Business logic (user creation)
    const user = await saveUser(sanitized);
    
    // 4. Log success
    logger.auditLogger.info('User created successfully', {
      userId: user.id,
      email: user.email
    });
    
    // 5. Return formatted response
    return response.successResponse(
      response.excludeFields(user, ['password']),
      'User created successfully'
    );
    
  } catch (error) {
    // Log error
    logger.securityLogger.error('User creation failed', {
      error: error.message,
      userData: sanitizer.whitelistFields(userData, ['email', 'name'])
    });
    
    // Return formatted error
    return response.formatApiResponse(null, {
      error: errorHandler.formatError(error)
    });
  }
}
```

### Express.js Middleware Integration

```javascript
const { sanitizer, errorHandler, response } = require('@safesplitx/shared-utils');

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizer.sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizer.sanitizeObject(req.query);
  }
  next();
};

// Error handling middleware
const errorMiddleware = (err, req, res, next) => {
  const formattedError = errorHandler.formatError(err);
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json(formattedError);
};

// Response formatter middleware
const formatResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && !data.success && !data.error) {
      // Format as success response
      data = response.successResponse(data);
    }
    originalJson.call(this, data);
  };
  
  next();
};
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Test Structure

Tests are organized in `tests/__tests__/utils/` with separate test files for each utility module:

- `sanitizer.test.js` - Input sanitization tests
- `errorHandler.test.js` - Error handling tests
- `validation.test.js` - Validation utility tests
- `response.test.js` - Response formatting tests
- `helpers.test.js` - Helper function tests

## Contributing

1. Follow the existing code style and patterns
2. Add comprehensive tests for new functionality
3. Update documentation for any new features
4. Ensure all tests pass before submitting changes
5. Follow semantic versioning for releases

## Dependencies

### Runtime Dependencies

- `validator` - String validation and sanitization
- `xss` - XSS protection for HTML content
- `jsdom` - DOM manipulation for HTML sanitization
- `winston` - Logging framework with multiple transports
- `winston-daily-rotate-file` - Log file rotation
- `joi` - Schema validation
- `libphonenumber-js` - Phone number validation
- `uuid` - UUID generation

### Development Dependencies

- `jest` - Testing framework
- `eslint` - Code linting
- `prettier` - Code formatting

## License

MIT License - See LICENSE file for details.

## Support

For questions or issues, please refer to the project's issue tracker or contact the SafeSplitX development team.