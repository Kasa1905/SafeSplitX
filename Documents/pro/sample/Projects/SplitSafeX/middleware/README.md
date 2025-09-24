# SafeSplitX Middleware

A comprehensive middleware layer for SafeSplitX providing clean integration points between frontend and backend modules.

## Overview

The SafeSplitX Middleware package provides a unified API layer that simplifies communication between the frontend React application and backend services. It includes authentication management, request/response handling, data validation, and error processing.

## Features

- **Authentication Management**: JWT token handling with automatic refresh and cross-tab synchronization
- **HTTP Client**: Axios-based client with request/response interceptors and retry logic
- **Data Validation**: Comprehensive Joi-based validation for all API requests
- **Error Handling**: Consistent error processing with user-friendly messages
- **Response Formatting**: Standardized response structures for frontend consumption
- **Configuration Management**: Environment-aware configuration with validation

## Installation

```bash
cd middleware
npm install
```

## Quick Start

### Basic Usage

```javascript
// Import the main API object
const { SafeSplitAPI } = require('@splitsafex/middleware');

// Or import individual functions
const { 
  loginUser, 
  createGroup, 
  addExpense 
} = require('@splitsafex/middleware');
```

### Authentication

```javascript
// Login user
const result = await SafeSplitAPI.auth.login({
  email: 'user@example.com',
  password: 'securePassword123'
});

if (result.success) {
  console.log('Login successful:', result.data.user);
} else {
  console.error('Login failed:', result.error);
}

// Check authentication status
if (SafeSplitAPI.auth.isAuthenticated()) {
  const user = SafeSplitAPI.auth.getCurrentUser();
  console.log('Current user:', user);
}

// Logout
await SafeSplitAPI.auth.logout();
```

### Group Management

```javascript
// Create a new group
const groupResult = await SafeSplitAPI.groups.create({
  name: 'Weekend Trip',
  description: 'Trip to the mountains',
  currency: 'USD',
  members: ['user1@example.com', 'user2@example.com']
});

// Get user's groups
const groupsResult = await SafeSplitAPI.groups.list({
  page: 1,
  limit: 10
});
```

### Expense Management

```javascript
// Add an expense
const expenseResult = await SafeSplitAPI.expenses.add({
  description: 'Dinner at restaurant',
  amount: 150.50,
  currency: 'USD',
  groupId: 'group-123',
  paidBy: 'user-123',
  splits: [
    { userId: 'user-123', amount: 75.25 },
    { userId: 'user-456', amount: 75.25 }
  ]
});

// Get group expenses
const expensesResult = await SafeSplitAPI.expenses.getByGroup('group-123', {
  page: 1,
  limit: 20
});
```

### Balance & Settlement

```javascript
// Get balances
const balancesResult = await SafeSplitAPI.balances.get({
  groupId: 'group-123'
});

// Create a settlement
const settlementResult = await SafeSplitAPI.settlements.create({
  fromUserId: 'user-123',
  toUserId: 'user-456',
  amount: 50.00,
  currency: 'USD',
  method: 'paypal',
  notes: 'Payment for dinner'
});
```

## API Reference

### Authentication

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `auth.login(credentials)` | Login user | `{ email, password }` | Promise\<Response> |
| `auth.logout()` | Logout current user | None | Promise\<Response> |
| `auth.profile()` | Get user profile | None | Promise\<Response> |
| `auth.isAuthenticated()` | Check auth status | None | Boolean |
| `auth.getCurrentUser()` | Get current user | None | User Object \| null |

### Groups

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `groups.create(groupData)` | Create new group | `{ name, description, currency, members }` | Promise\<Response> |
| `groups.list(options)` | Get user's groups | `{ page?, limit? }` | Promise\<Response> |

### Expenses

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `expenses.add(expenseData)` | Add expense | `{ description, amount, currency, groupId, paidBy, splits }` | Promise\<Response> |
| `expenses.getByGroup(groupId, options)` | Get group expenses | `groupId, { page?, limit? }` | Promise\<Response> |

### Balances & Settlements

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `balances.get(options)` | Get balances | `{ groupId?, userId? }` | Promise\<Response> |
| `settlements.create(settlementData)` | Create settlement | `{ fromUserId, toUserId, amount, currency, method?, notes? }` | Promise\<Response> |

### Utilities

The middleware also provides utility functions for validation, HTTP requests, response formatting, and error handling:

```javascript
const { 
  validateCredentials,
  validateGroupData,
  get,
  post,
  createSuccessResponse,
  handleApiError 
} = require('@splitsafex/middleware');
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
NODE_ENV=development
API_BASE_URL=http://localhost:3001/api
API_TIMEOUT=10000
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6379
```

### Production Configuration

```env
NODE_ENV=production
API_BASE_URL=https://api.splitsafex.com
API_TIMEOUT=30000
JWT_SECRET=production-jwt-secret
REDIS_URL=redis://production-redis:6379
```

## Response Format

All API functions return a standardized response format:

### Success Response
```javascript
{
  success: true,
  data: { /* response data */ },
  message: "Operation successful",
  pagination?: { page: 1, limit: 10, total: 50 },
  requestId: "unique-request-id"
}
```

### Error Response
```javascript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  validationErrors?: [
    { field: "email", message: "Invalid email format" }
  ],
  requestId: "unique-request-id"
}
```

## Error Handling

The middleware includes comprehensive error handling:

```javascript
const result = await SafeSplitAPI.auth.login(credentials);

if (!result.success) {
  switch (result.code) {
    case 'VALIDATION_ERROR':
      // Handle validation errors
      console.log('Validation errors:', result.validationErrors);
      break;
    case 'UNAUTHORIZED':
      // Handle authentication errors
      console.log('Authentication required');
      break;
    case 'NETWORK_ERROR':
      // Handle network issues
      console.log('Network error, please try again');
      break;
    default:
      console.log('Error:', result.error);
  }
}
```

## Authentication Events

Listen to authentication state changes:

```javascript
const { addAuthListener, removeAuthListener } = require('@splitsafex/middleware');

const authListener = (event, data) => {
  switch (event) {
    case 'login':
      console.log('User logged in:', data.user);
      break;
    case 'logout':
      console.log('User logged out');
      break;
    case 'token_refresh':
      console.log('Token refreshed');
      break;
  }
};

// Add listener
addAuthListener(authListener);

// Remove listener
removeAuthListener(authListener);
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Development

### Project Structure

```
middleware/
├── __tests__/           # Test files
│   ├── api.test.js
│   ├── auth.test.js
│   ├── config.test.js
│   └── validation.test.js
├── api.js              # Core API functions
├── auth.js             # Authentication utilities
├── config.js           # Configuration management
├── errorHandler.js     # Error processing
├── httpClient.js       # HTTP client with interceptors
├── index.js            # Main entry point
├── responseFormatter.js # Response formatting
├── validation.js       # Data validation schemas
└── package.json
```

### Adding New API Functions

1. Add the function to `api.js`
2. Export it in `index.js`
3. Add validation schema if needed in `validation.js`
4. Add tests in `__tests__/api.test.js`

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Integration with Frontend

### React Integration

```javascript
// hooks/useAuth.js
import { SafeSplitAPI, addAuthListener, removeAuthListener } from '@splitsafex/middleware';
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth status
    if (SafeSplitAPI.auth.isAuthenticated()) {
      setUser(SafeSplitAPI.auth.getCurrentUser());
    }
    setLoading(false);

    // Listen for auth changes
    const authListener = (event, data) => {
      if (event === 'login') {
        setUser(data.user);
      } else if (event === 'logout') {
        setUser(null);
      }
    };

    addAuthListener(authListener);
    return () => removeAuthListener(authListener);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    const result = await SafeSplitAPI.auth.login(credentials);
    setLoading(false);
    return result;
  };

  const logout = async () => {
    await SafeSplitAPI.auth.logout();
  };

  return { user, loading, login, logout };
};
```

### Error Boundaries

```javascript
// components/ErrorBoundary.js
import React from 'react';
import { handleApiError } from '@splitsafex/middleware';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error using middleware error handler
    const processedError = handleApiError(error);
    console.error('Error boundary caught error:', processedError);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue in the repository or contact the SafeSplitX team.