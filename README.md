# SafeSplitX 🔐💰

## AI-Powered Expense Management Platform

SafeSplitX is an intelligent expense management platform designed to securely track, split, and settle group expenses with advanced fraud detection capabilities. Built for the modern collaborative economy, our platform ensures fair, transparent, and secure financial interactions among groups.

---

## 🎯 Project Overview

SafeSplitX addresses the common challenges faced in group expense management:

- **🔍 Fraud Detection**: AI-powered analysis to detect suspicious transactions
- **⚖️ Fair Splitting**: Multiple algorithms for equitable expense distribution
- **🌍 Multi-Currency**: Real-time currency conversion and support
- **🔐 Secure Settlements**: Encrypted payment processing with multiple gateway options
- **📊 Smart Analytics**: Comprehensive expense tracking and reporting
- **👥 Group Management**: Intuitive interfaces for managing expense groups

---

## 🏗️ Architecture

This project follows a **monorepo structure** with clearly separated modules:

```
SafeSplitX/
├── backend/           # Node.js/Express API server
├── frontend/          # React/Next.js dashboard
├── middleware/        # Integration layer & authentication
├── utils/             # Shared utilities & helpers
├── algorithms/        # Fair-split calculation algorithms
├── currency/          # Multi-currency support & forex
├── tests/             # Integration & unit tests

# SafeSplitX — Team

## 👥 Team Responsibilities

### Team Member 1: Fraud Detection & Security 🛡️
- Focus: AI-powered fraud detection algorithms
- Modules: `backend/fraud/`, `middleware/security/`, `utils/encryption/`
- Responsibilities:
  - Implement suspicious transaction detection
  - Design security middleware and authentication
  - Create encrypted data handling utilities
  - Integrate ML models for pattern recognition

### Team Member 2: Expense Management & Algorithms 📊
- Focus: Core expense logic and fair-split algorithms
- Modules: `algorithms/`, `backend/expenses/`, `utils/calculations/`
- Responsibilities:
  - Develop fair-split algorithms (equal, weighted, percentage)
  - Create expense categorization and tracking
  - Implement calculation utilities and validation
  - Design expense data models and APIs

### Team Member 3: Settlement & Payment Integration 💳
- Focus: Payment processing and settlement systems
- Modules: `backend/settlements/`, `currency/`, `middleware/payments/`
- Responsibilities:
  - Integrate multiple payment gateways (Stripe, PayPal)
  - Implement multi-currency conversion system
  - Create settlement tracking and reconciliation
  - Design payment middleware and webhooks

### Team Member 4: UI/UX & Frontend Dashboard 🎨
- Focus: User interface and experience
- Modules: `frontend/`, `frontend/components/`, `frontend/pages/`
- Responsibilities:
  - Build responsive React/Next.js dashboard
  - Create intuitive expense input interfaces
  - Design data visualization and reporting views
  - Implement real-time updates and notifications

```
tests/
├── jest.config.js          # Jest configuration with coverage thresholds
├── setup.js                # Global test setup and teardown
├── helpers/                # Test utilities and helper functions
│   ├── apiHelpers.js       # API testing utilities
│   ├── dbHelpers.js        # Database testing utilities
│   ├── dataGenerators.js   # Mock data generation
│   └── aiServiceMocks.js   # AI service mocking infrastructure
├── fixtures/               # Static test data
│   ├── users.json          # Test user accounts
│   ├── groups.json         # Test group configurations
│   ├── expenses.json       # Test expense scenarios
│   └── fraudAnalyses.json  # Test fraud detection data
├── integration/            # API and service integration tests
│   ├── auth.test.js        # Authentication flow testing
│   ├── expenses.test.js    # Expense management testing
│   ├── fraud.test.js       # Fraud detection testing
│   ├── groups.test.js      # Group management testing
│   ├── settlements.test.js # Settlement workflow testing
│   ├── currency.test.js    # Currency operations testing
│   ├── payments.test.js    # Payment processing testing
│   ├── analytics.test.js   # Analytics API testing
│   ├── middleware.test.js  # Middleware validation testing
│   └── aiService.test.js   # AI service integration testing
├── unit/                   # Unit tests for individual modules
├── e2e/                    # End-to-end user journey tests
├── performance/            # Load and performance testing
├── smoke/                  # Quick health check tests
└── mocks/                  # Mock services and data
    └── ai-service/         # AI service mock server
        └── mock_server.py  # FastAPI mock server
```

### Test Commands

```bash
# Run all tests
npm test

# Individual test suites
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e              # End-to-end tests only
npm run test:e2e:ai           # AI service E2E tests only

# Coverage and reporting
npm run test:coverage         # Generate coverage report
npm run test:report          # Generate HTML test report
npm run test:watch           # Watch mode for development

# Performance and compatibility
npm run test:performance     # Load and performance tests
npm run test:compatibility   # Cross-platform compatibility
npm run test:smoke          # Quick health checks
```

### Testing Features

#### 🔍 **Integration Testing**
- **Complete API Coverage**: All endpoints tested with authentication, authorization, validation, and business logic
- **Database Integration**: MongoDB Memory Server for isolated testing
- **AI Service Mocking**: Comprehensive mocking using nock and custom FastAPI mock server
- **Real-world Scenarios**: Tests cover edge cases, error conditions, and complex workflows

#### 🛡️ **Security Testing**
- **Authentication Flow**: Registration, login, token validation, and logout workflows
- **Authorization**: Role-based access control and permission validation
- **Input Validation**: SQL injection, XSS prevention, and data sanitization
- **Rate Limiting**: API rate limiting and abuse prevention

#### 🤖 **AI Service Testing**
- **Health Monitoring**: AI service availability and model readiness
- **Fraud Detection**: Risk analysis, pattern detection, and batch processing
- **Expense Categorization**: ML-powered category prediction
- **Pattern Analysis**: Spending behavior analysis and anomaly detection
- **Failover Testing**: Graceful degradation when AI services are unavailable

#### 📊 **Performance Testing**
- **Load Testing**: Concurrent user simulation and stress testing
- **Response Time**: API endpoint performance benchmarking
- **Database Performance**: Query optimization and indexing validation
- **Memory Usage**: Memory leak detection and resource management

#### 🔄 **Middleware Testing**
- **Authentication Middleware**: Token validation and user context
- **Error Handling**: Consistent error responses and logging
- **Rate Limiting**: Request throttling and abuse prevention
- **CORS and Security**: Cross-origin requests and security headers
- **Validation**: Input validation and data sanitization

### Test Data Management

#### **Fixture Data**
```javascript
// Example test user
{
  "username": "testuser1",
  "email": "test1@example.com",
  "firstName": "Test",
  "lastName": "User",
  "currency": "USD",
  "role": "user"
}

// Example test expense
{
  "description": "Team lunch at restaurant",
  "amount": 125.50,
  "category": "food",
  "currency": "USD",
  "suspicious_indicators": ["none"],
  "expected_risk_level": "low"
}
```

#### **Dynamic Data Generation**
- **Faker.js Integration**: Realistic test data generation
- **Scenario-based Data**: Specific test scenarios with predictable outcomes
- **Edge Case Data**: Boundary conditions and error scenarios

### Coverage Requirements

```javascript
// Coverage thresholds in jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Continuous Integration

#### **GitHub Actions Workflows**
- **`.github/workflows/test.yml`**: Comprehensive test suite with multiple Node.js versions
- **`.github/workflows/ai-validation.yml`**: AI service validation and model testing
- **`.github/workflows/deploy.yml`**: Deployment pipeline with testing gates

#### **Test Environment Setup**
- **MongoDB Memory Server**: In-memory database for fast, isolated tests
- **Redis**: For caching and session testing
- **AI Service Mock**: FastAPI-based mock server for AI integration testing
- **Environment Variables**: Comprehensive `.env.test` configuration

### Test Development Guidelines

#### **Writing Tests**
```javascript
describe('Expense API', () => {
  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser();
    group = await createTestGroup({ adminId: user._id });
  });

  test('should create expense with fraud analysis', async () => {
    // Mock AI service response
    mockAIService.post('/analyze-expense')
      .reply(200, { risk_score: 0.1, risk_level: 'low' });

    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'Coffee shop',
        amount: 5.50,
        groupId: group._id
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fraudAnalysis.risk_level).toBe('low');
  });
});
```

#### **Best Practices**
- **Isolation**: Each test is independent and can run in any order
- **Cleanup**: Proper cleanup between tests to prevent state pollution
- **Realistic Data**: Use faker and fixtures for realistic test scenarios
- **Error Testing**: Test both success and failure scenarios
- **Documentation**: Clear test descriptions and comments

### Debugging Tests

```bash
# Run specific test file
npm test -- tests/integration/auth.test.js

# Run tests with debugging
npm test -- --verbose --detectOpenHandles

# Run tests in watch mode
npm run test:watch

# Debug with Node inspector
node --inspect node_modules/.bin/jest --runInBand
```

### Test Reporting

- **Coverage Reports**: HTML and LCOV reports generated in `coverage/` directory
- **Test Results**: JSON and HTML reports for CI/CD integration
- **Performance Metrics**: Response time and throughput measurements
- **AI Model Validation**: Model accuracy and prediction quality metrics

### Environment-Specific Testing

```bash
# Test against different environments
npm run test:smoke -- --environment=staging
npm run test:smoke -- --environment=production

# Cross-platform compatibility
npm run test:compatibility  # Tests on multiple OS/Node versions
```

This comprehensive testing strategy ensures that SafeSplitX maintains high code quality, reliability, and security standards throughout development and deployment.

---

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both backend and frontend in development mode |
| `npm run build` | Build both applications for production |
| `npm run install:all` | Install dependencies for all modules |
| `npm run clean` | Remove all node_modules folders |
| `npm run reset` | Clean and reinstall all dependencies |
| **Testing Commands** | |
| `npm test` | Run unit and integration tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:e2e:ai` | Run AI service E2E tests |
| `npm run test:coverage` | Generate test coverage report |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:smoke` | Run smoke tests for health checks |
| `npm run test:performance` | Run performance and load tests |
| `npm run test:compatibility` | Run cross-platform compatibility tests |
| `npm run test:report` | Generate HTML test report |
| **Linting & Code Quality** | |
| `npm run lint` | Run ESLint on all modules |
| **AI Service Management** | |
| `npm run start:ai` | Start AI service |
| `npm run test:ai` | Test AI service functionality |
| `npm run ai:health` | Check AI service health |
| `npm run validate:ai` | Complete AI service validation |
| **Docker & Deployment** | |
| `npm run docker:build` | Build Docker containers |
| `npm run docker:up` | Start services with Docker Compose |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:rebuild` | Rebuild and restart containers |

---

## 🔗 API Integration Points

### Inter-Module Communication
```javascript
// Example: Fraud detection calling expense validation
const expenseValidation = require('../utils/validation');
const fraudResult = await fraudDetection.analyze(expense);

// Example: Settlement calling currency conversion
const convertedAmount = await currency.convert(amount, fromCurrency, toCurrency);
```

### Shared Response Format
```javascript
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "timestamp": ISO8601,
  "requestId": uuid
}
```

---

## 🤝 Contributing

### Before Starting Development
1. Review `docs/TEAM_GUIDELINES.md`
2. Understand your module's responsibilities
3. Check API contracts in `docs/API.md`
4. Set up your development environment

### Development Process
1. Create feature branch from your assigned module
2. Develop following the established patterns
3. Write tests for your functionality
4. Update documentation as needed
5. Test integration with other modules
6. Submit PR with detailed description

---

## 🔒 Security Considerations

- **Authentication**: JWT-based with refresh tokens
- **Data Encryption**: All sensitive data encrypted at rest
- **API Security**: Rate limiting, CORS, and input validation
- **Fraud Detection**: Real-time transaction monitoring
- **PCI Compliance**: For payment processing modules

---

## 📊 Performance Targets

- **API Response Time**: < 200ms for 95% of requests
- **Database Queries**: Optimized with proper indexing
- **Frontend Load Time**: < 2 seconds initial load
- **Real-time Updates**: WebSocket connections for live data
- **Concurrent Users**: Support for 1000+ simultaneous users

---

## 🎯 Hackathon Goals

### MVP Features (48 hours)
- [x] Project structure and team setup
- [ ] Basic expense creation and splitting
- [ ] Simple fraud detection rules
- [ ] Multi-currency conversion
- [ ] Basic settlement tracking
- [ ] Responsive dashboard UI

### Stretch Goals
- [ ] Advanced AI fraud detection
- [ ] Multiple payment gateway integration
- [ ] Real-time collaboration features
- [ ] Mobile-responsive PWA
- [ ] Comprehensive analytics dashboard

---

## 📱 Demo & Presentation

### Demo Flow
1. **User Registration & Group Creation**
2. **Expense Entry with Receipt Upload**
3. **AI Fraud Detection in Action**
4. **Fair-Split Algorithm Selection**
5. **Multi-Currency Settlement**
6. **Dashboard Analytics Overview**

### Presentation Structure
- Problem Statement & Solution (2 min)
- Technical Architecture Overview (3 min)
- Live Demo (5 min)
- Team Collaboration Showcase (2 min)
- Q&A (3 min)

---

## 🏆 Success Metrics

- **Functionality**: All core features working end-to-end
- **User Experience**: Intuitive and responsive interface
- **Security**: Demonstrated fraud detection capabilities
- **Team Collaboration**: Seamless integration between modules
- **Code Quality**: Well-documented and tested codebase
- **Innovation**: Unique AI-powered features and algorithms

---

## 📞 Support & Contact

For questions or issues during development:

- **Team Communication**: [Slack/Discord Channel]
- **Documentation Issues**: Create issue in `docs/` folder
- **Technical Blockers**: Tag appropriate team member
- **Integration Questions**: Schedule pair programming session

---

**Let's build something amazing together! 🚀**