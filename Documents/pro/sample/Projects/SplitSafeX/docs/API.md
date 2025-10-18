# SafeSplitX API Documentation

## Overview

This document outlines the API endpoints for the SafeSplitX platform. The API follows REST principles and returns JSON responses with a consistent structure.

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.splitsafex.com/api`

### Response Format
All API responses follow this standard format:

```json
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "timestamp": "ISO8601",
  "requestId": "uuid"
}
```

### Error Format
Error responses include additional details:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  },
  "timestamp": "ISO8601",
  "requestId": "uuid"
}
```

---

## Authentication Endpoints
*Team Member 1 - Security & Fraud Detection*

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  },
  "message": "User registered successfully"
}
```

### POST /api/auth/login
Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/auth/refresh
Refresh access token using refresh token.

### POST /api/auth/logout
Logout user and invalidate tokens.

### GET /api/auth/profile
Get current user profile information.

---

## Fraud Detection Endpoints
*Team Member 1 - Security & Fraud Detection*

### POST /api/fraud/analyze
Analyze a transaction for potential fraud.

**Request Body:**
```json
{
  "transactionId": "txn_123",
  "amount": 150.75,
  "currency": "USD",
  "description": "Dinner at Restaurant",
  "location": "New York, NY",
  "timestamp": "2024-01-01T20:00:00Z",
  "userId": "user_123",
  "metadata": {
    "deviceId": "device_456",
    "ipAddress": "192.168.1.1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fraudScore": 0.15,
    "riskLevel": "low",
    "flags": [],
    "recommendations": [
      "Transaction appears normal"
    ],
    "analysis": {
      "amountAnalysis": "normal",
      "locationAnalysis": "consistent",
      "timeAnalysis": "normal",
      "patternAnalysis": "no_anomalies"
    }
  }
}
```

### GET /api/fraud/reports
Get fraud detection reports and statistics.

### GET /api/fraud/patterns
Get detected fraud patterns and insights.

---

## Expense Management Endpoints
*Team Member 2 - Expense Management & Algorithms*

### POST /api/expenses
Create a new expense entry.

**Request Body:**
```json
{
  "description": "Team dinner",
  "amount": 240.00,
  "currency": "USD",
  "category": "food",
  "date": "2024-01-01T19:00:00Z",
  "groupId": "group_123",
  "paidBy": "user_123",
  "receipt": {
    "url": "https://example.com/receipt.jpg",
    "filename": "receipt_123.jpg"
  },
  "splitMethod": "equal",
  "participants": [
    "user_123",
    "user_456",
    "user_789"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "exp_123",
      "description": "Team dinner",
      "amount": 240.00,
      "currency": "USD",
      "category": "food",
      "date": "2024-01-01T19:00:00Z",
      "groupId": "group_123",
      "paidBy": "user_123",
      "splitMethod": "equal",
      "participants": [
        "user_123",
        "user_456", 
        "user_789"
      ],
      "splits": [
        {
          "userId": "user_123",
          "amount": 80.00,
          "percentage": 33.33
        },
        {
          "userId": "user_456",
          "amount": 80.00,
          "percentage": 33.33
        },
        {
          "userId": "user_789",
          "amount": 80.00,
          "percentage": 33.34
        }
      ],
      "createdAt": "2024-01-01T19:05:00Z"
    }
  }
}
```

### GET /api/expenses
Get list of expenses with filtering options.

**Query Parameters:**
- `groupId`: Filter by group
- `userId`: Filter by user
- `category`: Filter by category
- `dateFrom`: Start date filter
- `dateTo`: End date filter
- `page`: Page number for pagination
- `limit`: Number of items per page

### GET /api/expenses/:id
Get detailed information about a specific expense.

### PUT /api/expenses/:id
Update an existing expense.

### DELETE /api/expenses/:id
Delete an expense (soft delete).

### POST /api/expenses/:id/split
Calculate and apply split for an expense.

**Request Body:**
```json
{
  "splitMethod": "weighted",
  "customSplits": [
    {
      "userId": "user_123",
      "weight": 2
    },
    {
      "userId": "user_456",
      "weight": 1
    },
    {
      "userId": "user_789",
      "weight": 1
    }
  ]
}
```

---

## Group Management Endpoints
*Team Member 2 - Expense Management & Algorithms*

### POST /api/groups
Create a new expense group.

**Request Body:**
```json
{
  "name": "Weekend Trip",
  "description": "Expenses for our weekend getaway",
  "currency": "USD",
  "members": [
    "user_123",
    "user_456",
    "user_789"
  ],
  "settings": {
    "defaultSplitMethod": "equal",
    "allowSelfPayments": true,
    "requireApproval": false
  }
}
```

### GET /api/groups
Get list of groups for the authenticated user.

### GET /api/groups/:id
Get detailed information about a specific group.

### PUT /api/groups/:id
Update group information.

### DELETE /api/groups/:id
Delete a group (only if no expenses exist).

### POST /api/groups/:id/members
Add members to a group.

### DELETE /api/groups/:id/members/:userId
Remove a member from a group.

---

## Settlement Endpoints
*Team Member 3 - Settlement & Payment Integration*

### POST /api/settlements
Create a new settlement calculation.

**Request Body:**
```json
{
  "groupId": "group_123",
  "expenseIds": ["exp_123", "exp_456", "exp_789"],
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "settlement": {
      "id": "settlement_123",
      "groupId": "group_123",
      "totalAmount": 500.00,
      "currency": "USD",
      "balances": [
        {
          "userId": "user_123",
          "balance": 50.00,
          "status": "owes"
        },
        {
          "userId": "user_456",
          "balance": -25.00,
          "status": "owed"
        },
        {
          "userId": "user_789",
          "balance": -25.00,
          "status": "owed"
        }
      ],
      "recommendations": [
        {
          "from": "user_123",
          "to": "user_456",
          "amount": 25.00
        },
        {
          "from": "user_123",
          "to": "user_789",
          "amount": 25.00
        }
      ],
      "createdAt": "2024-01-01T20:00:00Z"
    }
  }
}
```

### GET /api/settlements
Get list of settlements.

### GET /api/settlements/:id
Get detailed settlement information.

### PUT /api/settlements/:id/status
Update settlement status (pending, processing, completed, failed).

### POST /api/settlements/:id/process
Process payment for a settlement.

---

## Payment Endpoints
*Team Member 3 - Settlement & Payment Integration*

### POST /api/payments/stripe
Process payment through Stripe.

**Request Body:**
```json
{
  "settlementId": "settlement_123",
  "paymentMethodId": "pm_stripe_123",
  "amount": 25.00,
  "currency": "USD",
  "description": "Settlement payment to John Doe"
}
```

### POST /api/payments/paypal
Process payment through PayPal.

### POST /api/payments/webhook
Handle payment gateway webhooks.

### GET /api/payments/methods
Get available payment methods for user.

---

## Currency Endpoints
*Team Member 3 - Settlement & Payment Integration*

### GET /api/currency/rates
Get current exchange rates.

**Query Parameters:**
- `base`: Base currency (default: USD)
- `currencies`: Comma-separated list of target currencies

**Response:**
```json
{
  "success": true,
  "data": {
    "base": "USD",
    "date": "2024-01-01",
    "rates": {
      "EUR": 0.85,
      "GBP": 0.75,
      "JPY": 110.50,
      "CAD": 1.25
    }
  }
}
```

### POST /api/currency/convert
Convert amount between currencies.

**Request Body:**
```json
{
  "amount": 100.00,
  "from": "USD",
  "to": "EUR"
}
```

### GET /api/currency/supported
Get list of supported currencies.

---

## Analytics Endpoints
*Team Member 4 - UI/UX & Frontend Dashboard*

### GET /api/analytics/dashboard
Get dashboard summary data.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalExpenses": 1250.75,
    "monthlySpending": 420.25,
    "activeGroups": 3,
    "pendingSettlements": 2,
    "recentTransactions": [...],
    "spendingByCategory": {...},
    "monthlyTrends": [...]
  }
}
```

### GET /api/analytics/expenses
Get detailed expense analytics.

### GET /api/analytics/groups
Get group-specific analytics.

### GET /api/analytics/reports
Generate custom reports.

---

## WebSocket Events
Real-time updates for collaborative features.

### Connection
Connect to WebSocket at `/ws` endpoint with JWT token.

### Events

#### expense.created
```json
{
  "event": "expense.created",
  "data": {
    "expense": {...},
    "groupId": "group_123"
  }
}
```

#### settlement.updated
```json
{
  "event": "settlement.updated",
  "data": {
    "settlementId": "settlement_123",
    "status": "completed"
  }
}
```

#### payment.processed
```json
{
  "event": "payment.processed",
  "data": {
    "paymentId": "payment_123",
    "status": "success",
    "amount": 25.00
  }
}
```

---

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per minute per IP
- **Fraud Detection**: 50 requests per minute per user
- **Payment Processing**: 10 requests per minute per user

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 501 | Not Implemented |
| 503 | Service Unavailable |

## Testing

Use the provided Postman collection or test endpoints with curl:

```bash
# Health check
curl -X GET http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

---

**Note**: This API documentation will be updated as each team member implements their assigned endpoints. Please keep this document synchronized with your implementations.