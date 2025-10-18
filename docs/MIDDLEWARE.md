# SafeSplitX Middleware Documentation

The SafeSplitX middleware layer provides a comprehensive set of utilities for handling authentication, API communication, data validation, and error management. This documentation covers the main functions, their usage, and implementation details.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Functions](#api-functions)
4. [HTTP Client](#http-client)
5. [Validation](#validation)
6. [Error Handling](#error-handling)
7. [Response Formatting](#response-formatting)
8. [Configuration](#configuration)
9. [Usage Examples](#usage-examples)

## Overview

The middleware architecture consists of several interconnected modules:

- **auth.js**: Authentication and token management
- **api.js**: Core API functions and business logic
- **httpClient.js**: HTTP communication utilities
- **validation.js**: Input validation schemas
- **errorHandler.js**: Error processing and user-friendly messaging
- **responseFormatter.js**: Consistent response formatting
- **config.js**: Configuration management

## Authentication

### Core Functions

#### `loginUser(credentials)`

Authenticates a user with email/username and password.

**Parameters:**
- `credentials` (Object)
  - `email` (string): User's email address
  - `password` (string): User's password

**Returns:**
- `Promise<Object>`: Authentication response with user data and tokens

**Usage:**
```javascript
import { loginUser } from './middleware';

const credentials = {
  email: 'user@example.com',
  password: 'securePassword123'
};

try {
  const response = await loginUser(credentials);
  if (response.success) {
    console.log('Login successful:', response.data);
    // Access user data: response.data.user
    // Tokens are automatically stored
  }
} catch (error) {
  console.error('Login failed:', error.message);
}
```

**Response Structure:**
```javascript
{
  success: true,
  data: {
    user: {
      id: "user123",
      email: "user@example.com",
      name: "John Doe",
      avatar: "https://example.com/avatar.jpg"
    },
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    refreshToken: "refresh_token_here"
  },
  timestamp: "2024-01-15T10:30:00.000Z",
  requestId: "req-123-456"
}
```

#### `logoutUser()`

Logs out the current user and clears stored tokens.

**Returns:**
- `Promise<Object>`: Logout confirmation response

**Usage:**
```javascript
try {
  const response = await logoutUser();
  if (response.success) {
    console.log('Logout successful');
    // Redirect to login page
  }
} catch (error) {
  console.error('Logout error:', error.message);
}
```

## API Functions

### Group Management

#### `createGroup(groupData)`

Creates a new expense group.

**Parameters:**
- `groupData` (Object)
  - `name` (string): Group name
  - `description` (string, optional): Group description
  - `currency` (string, optional): Default currency (defaults to 'USD')
  - `members` (Array, optional): Initial member emails

**Usage:**
```javascript
const groupData = {
  name: 'Weekend Trip',
  description: 'Expenses for our mountain getaway',
  currency: 'USD',
  members: ['friend1@example.com', 'friend2@example.com']
};

try {
  const response = await createGroup(groupData);
  if (response.success) {
    const group = response.data;
    console.log('Group created:', group.id);
  }
} catch (error) {
  console.error('Failed to create group:', error.message);
}
```

**Response Structure:**
```javascript
{
  success: true,
  data: {
    id: "group123",
    name: "Weekend Trip",
    description: "Expenses for our mountain getaway",
    currency: "USD",
    createdBy: "user123",
    members: [
      {
        id: "user123",
        email: "user@example.com",
        name: "John Doe",
        role: "admin"
      }
    ],
    createdAt: "2024-01-15T10:30:00.000Z",
    totalExpenses: 0,
    shareCode: "ABC123"
  }
}
```

### Expense Management

#### `addExpense(expenseData)`

Adds a new expense to a group.

**Parameters:**
- `expenseData` (Object)
  - `groupId` (string): Target group ID
  - `description` (string): Expense description
  - `amount` (number): Expense amount
  - `currency` (string, optional): Expense currency
  - `paidBy` (string): User ID who paid
  - `splitBetween` (Array): User IDs to split between
  - `category` (string, optional): Expense category
  - `date` (string, optional): Expense date (ISO format)

**Usage:**
```javascript
const expenseData = {
  groupId: 'group123',
  description: 'Hotel booking',
  amount: 200.00,
  currency: 'USD',
  paidBy: 'user123',
  splitBetween: ['user123', 'user456', 'user789'],
  category: 'accommodation',
  date: '2024-01-15T00:00:00.000Z'
};

try {
  const response = await addExpense(expenseData);
  if (response.success) {
    console.log('Expense added:', response.data);
  }
} catch (error) {
  console.error('Failed to add expense:', error.message);
}
```

### Balance Calculations

#### `getBalances(groupId)`

Retrieves balance information for a group.

**Parameters:**
- `groupId` (string): Group ID to get balances for

**Returns:**
- `Promise<Object>`: Balance data including individual balances and settlements

**Usage:**
```javascript
try {
  const response = await getBalances('group123');
  if (response.success) {
    const balances = response.data;
    console.log('Group balances:', balances);
    
    // Access individual balances
    balances.individuals.forEach(balance => {
      console.log(`${balance.user.name}: $${balance.balance}`);
    });
    
    // Access suggested settlements
    balances.settlements.forEach(settlement => {
      console.log(`${settlement.from.name} owes ${settlement.to.name}: $${settlement.amount}`);
    });
  }
} catch (error) {
  console.error('Failed to get balances:', error.message);
}
```

**Response Structure:**
```javascript
{
  success: true,
  data: {
    groupId: "group123",
    currency: "USD",
    totalExpenses: 450.00,
    individuals: [
      {
        user: {
          id: "user123",
          name: "John Doe",
          email: "john@example.com"
        },
        balance: -50.00,
        totalPaid: 200.00,
        totalOwed: 150.00
      }
    ],
    settlements: [
      {
        from: {
          id: "user456",
          name: "Jane Smith"
        },
        to: {
          id: "user123",
          name: "John Doe"
        },
        amount: 50.00
      }
    ]
  }
}
```

#### `settleUp(settlementData)`

Records a settlement between users.

**Parameters:**
- `settlementData` (Object)
  - `groupId` (string): Group ID
  - `fromUserId` (string): User who is paying
  - `toUserId` (string): User who is receiving payment
  - `amount` (number): Settlement amount
  - `description` (string, optional): Settlement description

**Usage:**
```javascript
const settlementData = {
  groupId: 'group123',
  fromUserId: 'user456',
  toUserId: 'user123',
  amount: 50.00,
  description: 'Cash payment for hotel'
};

try {
  const response = await settleUp(settlementData);
  if (response.success) {
    console.log('Settlement recorded successfully');
  }
} catch (error) {
  console.error('Settlement failed:', error.message);
}
```

## HTTP Client

The HTTP client provides low-level HTTP communication with automatic error handling, authentication, and retry logic.

### Core Methods

- `get(url, config)`: GET requests
- `post(url, data, config)`: POST requests  
- `put(url, data, config)`: PUT requests
- `patch(url, data, config)`: PATCH requests
- `delete(url, config)`: DELETE requests
- `upload(url, formData, config)`: File uploads

### Utilities

- `createCancellableRequest(requestFn)`: Creates cancellable requests
- `batchRequests(requests, options)`: Batch multiple requests
- `healthCheck()`: Check API health status

## Validation

Input validation is handled through Joi schemas with consistent error formatting.

### Available Schemas

- `loginSchema`: Email/password validation
- `registrationSchema`: User registration validation  
- `groupSchema`: Group creation validation
- `expenseSchema`: Expense creation validation
- `settlementSchema`: Settlement validation

### Usage Example

```javascript
import { validateLogin } from './middleware/validation';

const credentials = {
  email: 'user@example.com',
  password: 'short'
};

const validation = validateLogin(credentials);
if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
  // Handle validation errors in UI
}
```

## Error Handling

The error handler provides consistent error processing with user-friendly messages.

### Error Types

- **Validation Errors**: Invalid input data
- **Authentication Errors**: Login/token issues  
- **Authorization Errors**: Permission denied
- **Network Errors**: Connection/timeout issues
- **Server Errors**: Backend processing errors

### Error Response Structure

```javascript
{
  success: false,
  error: "User-friendly error message",
  code: "ERROR_CODE",
  details: {
    // Additional error context
  },
  timestamp: "2024-01-15T10:30:00.000Z",
  requestId: "req-123-456"
}
```

## Response Formatting

All API responses follow a consistent structure:

### Success Response
```javascript
{
  success: true,
  data: {
    // Response data
  },
  message: "Optional success message",
  metadata: {
    // Optional metadata (pagination, etc.)
  },
  timestamp: "2024-01-15T10:30:00.000Z",
  requestId: "req-123-456"
}
```

### Error Response
```javascript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  details: {
    // Error details
  },
  timestamp: "2024-01-15T10:30:00.000Z",
  requestId: "req-123-456"
}
```

## Configuration

The configuration module manages environment-specific settings:

```javascript
// Get configuration values
const apiUrl = getConfig('api.baseURL', 'http://localhost:3001/api');
const timeout = getConfig('api.timeout', 10000);

// Build API URLs
const endpoint = buildApiUrl('/users/profile');

// Access predefined endpoints
const loginUrl = buildApiUrl(endpoints.auth.login);
```

## Usage Examples

### Complete Authentication Flow

```javascript
import { loginUser, logoutUser, getCurrentUser } from './middleware';

// Login
async function handleLogin(email, password) {
  try {
    const response = await loginUser({ email, password });
    if (response.success) {
      // Store user data in app state
      setUser(response.data.user);
      // Navigate to dashboard
      navigate('/dashboard');
    }
  } catch (error) {
    setErrorMessage(error.message);
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const user = await getCurrentUser();
    if (user) {
      setUser(user);
      setIsAuthenticated(true);
    }
  } catch (error) {
    // User not authenticated
    navigate('/login');
  }
}

// Logout
async function handleLogout() {
  try {
    await logoutUser();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  } catch (error) {
    console.error('Logout error:', error.message);
  }
}
```

### Group and Expense Management

```javascript
// Create group and add expenses
async function setupTripExpenses() {
  try {
    // Create group
    const groupResponse = await createGroup({
      name: 'Mountain Trip 2024',
      description: 'Weekend hiking trip',
      members: ['alice@example.com', 'bob@example.com']
    });
    
    const groupId = groupResponse.data.id;
    
    // Add hotel expense
    await addExpense({
      groupId,
      description: 'Hotel for 2 nights',
      amount: 240.00,
      paidBy: 'user123',
      splitBetween: ['user123', 'user456', 'user789']
    });
    
    // Add gas expense  
    await addExpense({
      groupId,
      description: 'Gas for car',
      amount: 60.00,
      paidBy: 'user456',
      splitBetween: ['user123', 'user456', 'user789']
    });
    
    // Get balances
    const balancesResponse = await getBalances(groupId);
    console.log('Current balances:', balancesResponse.data);
    
  } catch (error) {
    console.error('Error setting up expenses:', error.message);
  }
}
```

### Error Handling Best Practices

```javascript
// Comprehensive error handling
async function handleApiCall() {
  try {
    const response = await addExpense(expenseData);
    return response.data;
  } catch (error) {
    // Log error for debugging
    console.error('API call failed:', {
      message: error.message,
      code: error.code,
      requestId: error.requestId
    });
    
    // Handle specific error types
    if (error.code === 'VALIDATION_ERROR') {
      // Show validation errors to user
      showValidationErrors(error.details);
    } else if (error.code === 'UNAUTHORIZED') {
      // Redirect to login
      handleAuthenticationExpired();
    } else if (error.code === 'NETWORK_ERROR') {
      // Show offline message
      showOfflineMessage();
    } else {
      // Show generic error message
      showErrorMessage('Something went wrong. Please try again.');
    }
    
    throw error; // Re-throw for upstream handling
  }
}
```

This documentation provides a comprehensive guide to using the SafeSplitX middleware layer. For additional details about specific functions or error codes, refer to the inline code documentation or contact the development team.