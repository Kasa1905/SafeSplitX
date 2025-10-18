# Integration Tests

This directory contains integration tests for the SafeSplitX API, testing end-to-end functionality with real HTTP requests and database operations.

## Test Suite Structure

```
tests/integration/
├── api/                    # API endpoint tests
│   ├── auth.test.js       # Authentication endpoints
│   ├── expenses.test.js   # Expense management
│   ├── fraud.test.js      # Fraud detection
│   ├── groups.test.js     # Group management
│   ├── settlements.test.js # Settlement operations
│   ├── currency.test.js   # Currency operations
│   ├── payments.test.js   # Payment processing
│   └── analytics.test.js  # Analytics endpoints
├── middleware/             # Middleware integration tests
│   ├── auth.integration.test.js           # Auth middleware
│   ├── fraudDetection.integration.test.js # Fraud detection middleware
│   └── sanitization.integration.test.js  # Input sanitization
├── ai/                     # AI service integration
│   ├── fraudService.integration.test.js  # Fraud service
│   └── pythonService.integration.test.js # Python AI service
├── algorithms/             # Core algorithm tests
│   └── split.integration.test.js         # Split calculation
└── currency/               # Currency service tests
    └── forex.integration.test.js         # Forex operations
```

## Running Tests

### Local Development
```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- tests/integration/api/auth.test.js

# Run with coverage
npm run test:integration -- --coverage

# Run in watch mode
npm run test:integration -- --watch
```

### CI Environment
Tests run automatically on push/PR using the same `npm run test:integration` command with MongoDB Memory Server and Redis services.

## Test Database Setup

Integration tests use **MongoDB Memory Server** for isolated testing:

- **Setup**: `tests/helpers/globalSetup.js` starts MongoDB Memory Server
- **Teardown**: `tests/helpers/globalTeardown.js` stops the server
- **Per-test cleanup**: `tests/helpers/testSetup.js` clears collections between tests
- **Test data**: Use helpers from `tests/helpers/dbHelpers.js` for seeding

### Environment Variables
Required test environment variables (set automatically):
```bash
NODE_ENV=test
JWT_SECRET=test_jwt_secret_key_for_testing_only
AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_ENABLED=false
```

## Contract Helpers

Use these helpers from `tests/helpers/apiHelpers.js` for consistent response validation:

### `expectSuccessResponse(response, expectedData?, method?, path?)`
Validates successful API responses:
```javascript
expectSuccessResponse(response, { user: { name: 'Test User' } }, 'POST', '/api/auth/register');
```

### `expectErrorResponse(response, expectedError?, expectedCode?, method?, path?)`
Validates error responses:
```javascript
expectErrorResponse(response, 'Invalid credentials', 401, 'POST', '/api/auth/login');
```

### `expectPaginatedResponse(response, expectedData?)`
Validates paginated responses:
```javascript
expectPaginatedResponse(response, { items: expect.any(Array) });
```

### Contract Validation
When method and path are provided, helpers automatically validate JSON response schemas using `tests/helpers/contractValidation.js`.

## AI Service Mocking

**Important**: Use consistent mocking approach within each test suite.

### Recommended: Node.js Mocks
Use `tests/helpers/aiServiceMock.js` for HTTP mocking:
```javascript
const { mockAIServiceHealthy, mockFraudPrediction } = require('../helpers/aiServiceMock');

beforeEach(() => {
  mockAIServiceHealthy();
  mockFraudPrediction({ riskScore: 0.3, riskLevel: 'low' });
});
```

### Alternative: nock (HTTP Interception)
For more complex scenarios:
```javascript
const nock = require('nock');

beforeEach(() => {
  nock(process.env.AI_SERVICE_URL)
    .get('/health')
    .reply(200, { status: 'healthy' });
});
```

**⚠️ Warning**: Don't mix `nock` with Express app mocks in the same test suite as this can cause request interception conflicts.

## Authentication in Tests

Use `makeAuthenticatedRequest` for endpoints requiring authentication:
```javascript
const { makeAuthenticatedRequest, createAuthToken } = require('../helpers/apiHelpers');

const user = await createTestUser();
const token = createAuthToken(user._id, user.role);
const response = await makeAuthenticatedRequest(app, 'GET', '/api/profile', token);
```

## Troubleshooting

### Common Issues

**HTTP 401 Unauthorized**
- Ensure `JWT_SECRET` environment variable is set
- Check token generation: `createAuthToken(userId, role)`
- Verify user exists in test database

**Missing Environment Variables**
- Check `tests/helpers/testSetup.js` for required variables
- Ensure `NODE_ENV=test` is set
- AI service variables should be set to test values

**Database Connection Issues**
- MongoDB Memory Server should start automatically
- Check `tests/helpers/globalSetup.js` for connection issues
- Ensure proper cleanup with `beforeEach(() => clearDatabase())`

**Test Timeouts**
- Integration tests use 30-second timeout (configured in `jest.config.js`)
- For slow operations, increase timeout: `jest.setTimeout(60000)`

**AI Service Mocking Conflicts**
- Use either `aiServiceMock.js` OR `nock`, not both
- Clear mocks in `afterEach()`: `nock.cleanAll()`
- Check for port conflicts if running real AI service

### Debugging Tips

```javascript
// Debug response body
console.log('Response:', JSON.stringify(response.body, null, 2));

// Debug database state
const users = await User.find({});
console.log('Users in DB:', users.length);

// Debug environment
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET?.substring(0, 10) + '...'
});
```

### Performance Tips

- Use `runInBand: true` for database-dependent tests
- Clear only necessary collections in `beforeEach`
- Use `createTestUser`, `createTestGroup` helpers for efficient seeding
- Avoid unnecessary `await` operations

## Contributing

When adding new integration tests:

1. **Follow naming convention**: `*.integration.test.js` or place in appropriate subdirectory
2. **Use helpers**: Leverage existing helpers for consistency
3. **Clean up**: Always clean database state between tests
4. **Test both success and error cases**
5. **Use contract validation**: Include method/path for schema validation
6. **Add documentation**: Update this README for new patterns or helpers

## Related Files

- `tests/jest.config.js` - Jest configuration
- `tests/helpers/` - Test helper utilities
- `.github/workflows/test.yml` - CI configuration
- `backend/package.json` - Test scripts