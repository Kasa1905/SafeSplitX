# SafeSplitX Testing Guide

## Overview

This document outlines the testing strategy and guidelines for the SafeSplitX platform.

**Status**: 🚧 Under Development

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)

## Testing Philosophy

SafeSplitX follows a comprehensive testing approach:

- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: API contract validation
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability assessment

## Test Structure

```
SafeSplitX/
├── backend/
│   ├── __tests__/          # Backend unit tests
│   └── integration/        # Backend integration tests
├── frontend/
│   ├── __tests__/          # Frontend unit tests
│   └── cypress/            # E2E tests
└── tests/
    ├── __tests__/          # Cross-module integration tests
    └── performance/        # Performance test suites
```

## Unit Testing

### Backend Unit Tests (Jest)

```javascript
// Example: testing expense split algorithm
describe('Fair Split Algorithm', () => {
  test('should split amount equally among participants', () => {
    const amount = 100;
    const participants = ['user1', 'user2', 'user3'];
    const result = calculateEqualSplit(amount, participants);
    
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, split) => sum + split.amount, 0)).toBe(100);
  });
});
```

### Frontend Unit Tests (Jest + React Testing Library)

```javascript
// Example: testing expense form component
import { render, screen, fireEvent } from '@testing-library/react';
import ExpenseForm from '../components/ExpenseForm';

test('should validate required fields', () => {
  render(<ExpenseForm onSubmit={jest.fn()} />);
  
  const submitButton = screen.getByRole('button', { name: /submit/i });
  fireEvent.click(submitButton);
  
  expect(screen.getByText(/description is required/i)).toBeInTheDocument();
});
```

### Running Unit Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# All unit tests
npm test
```

## Integration Testing

### API Integration Tests

Located in `tests/__tests__/` directory:

```javascript
describe('Expense API Integration', () => {
  test('should create expense and update group balance', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .send({
        description: 'Test expense',
        amount: 100,
        groupId: 'group123'
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    // Verify group balance was updated
  });
});
```

### Database Integration Tests

```javascript
describe('Database Operations', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    // Cleanup test database
    await cleanupTestDatabase();
  });
  
  test('should persist expense data correctly', async () => {
    // Test database operations
  });
});
```

### Running Integration Tests

```bash
cd tests && npm test
# or
npm run test:integration
```

## End-to-End Testing

### Cypress Configuration

E2E tests simulate real user workflows:

```javascript
// cypress/integration/expense-flow.spec.js
describe('Expense Management Flow', () => {
  it('should create and split expense', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid=create-expense-btn]').click();
    cy.get('[data-testid=expense-description]').type('Team lunch');
    cy.get('[data-testid=expense-amount]').type('120');
    cy.get('[data-testid=submit-expense]').click();
    cy.contains('Expense created successfully').should('be.visible');
  });
});
```

### Running E2E Tests

```bash
cd frontend && npm run test:e2e
# or for interactive mode
npm run test:e2e:open
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/expenses"
```

### Running Performance Tests

```bash
cd tests/performance
artillery run load-test.yml
```

## Security Testing

### Automated Security Scanning

```bash
# Dependencies vulnerability scan
npm audit

# OWASP ZAP security scan
# TODO: Add ZAP configuration
```

### Manual Security Testing

- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing
- [ ] Input validation testing
- [ ] SQL injection testing (if using SQL)
- [ ] XSS vulnerability testing
- [ ] CSRF protection testing

## Test Data Management

### Test Fixtures

```javascript
// tests/fixtures/expenses.js
export const mockExpenses = [
  {
    id: 'exp_1',
    description: 'Test expense 1',
    amount: 100,
    participants: ['user1', 'user2']
  }
];
```

### Database Seeding

```javascript
// tests/utils/seed.js
export const seedTestData = async () => {
  // Insert test data into database
};
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:integration
```

## Coverage Reports

### Generating Coverage

```bash
# Backend coverage
cd backend && npm run test:coverage

# Frontend coverage
cd frontend && npm run test:coverage

# View coverage reports
open coverage/lcov-report/index.html
```

### Coverage Targets

- **Unit Tests**: 80%+ line coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user paths

## Testing Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### Mocking Strategy

```javascript
// Mock external dependencies
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));
```

### Test Maintenance

- Update tests when code changes
- Remove obsolete tests
- Keep test data current
- Review test failures promptly

## Team Testing Responsibilities

### Team Member 1 (Security & Fraud)
- Authentication middleware tests
- Fraud detection algorithm tests
- Security vulnerability tests

### Team Member 2 (Algorithms & Expenses)
- Fair-split algorithm tests
- Expense validation tests
- Database model tests

### Team Member 3 (Payments & Settlement)
- Payment integration tests
- Currency conversion tests
- Settlement calculation tests

### Team Member 4 (UI/UX & Frontend)
- Component unit tests
- User interaction tests
- E2E workflow tests

---

**Note**: This testing guide will be expanded as each team member implements their modules. Please update relevant sections with specific testing requirements and examples.