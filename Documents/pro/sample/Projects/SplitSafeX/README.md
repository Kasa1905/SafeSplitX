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
└── docs/              # Documentation & API specs
```

---

## 👥 Team Responsibilities

### Team Member 1: Fraud Detection & Security 🛡️
- **Focus**: AI-powered fraud detection algorithms
- **Modules**: `backend/fraud/`, `middleware/security/`, `utils/encryption/`
- **Responsibilities**:
  - Implement suspicious transaction detection
  - Design security middleware and authentication
  - Create encrypted data handling utilities
  - Integrate ML models for pattern recognition

### Team Member 2: Expense Management & Algorithms 📊
- **Focus**: Core expense logic and fair-split algorithms
- **Modules**: `algorithms/`, `backend/expenses/`, `utils/calculations/`
- **Responsibilities**:
  - Develop fair-split algorithms (equal, weighted, percentage)
  - Create expense categorization and tracking
  - Implement calculation utilities and validation
  - Design expense data models and APIs

### Team Member 3: Settlement & Payment Integration 💳
- **Focus**: Payment processing and settlement systems
- **Modules**: `backend/settlements/`, `currency/`, `middleware/payments/`
- **Responsibilities**:
  - Integrate multiple payment gateways (Stripe, PayPal)
  - Implement multi-currency conversion system
  - Create settlement tracking and reconciliation
  - Design payment middleware and webhooks

### Team Member 4: UI/UX & Frontend Dashboard 🎨
- **Focus**: User interface and experience
- **Modules**: `frontend/`, `frontend/components/`, `frontend/pages/`
- **Responsibilities**:
  - Build responsive React/Next.js dashboard
  - Create intuitive expense input interfaces
  - Design data visualization and reporting views
  - Implement real-time updates and notifications

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Database**: MongoDB or PostgreSQL
- **API Keys**: See `.env.example` for required services

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd SplitSafeX
   cp .env.example .env
   ```

2. **Configure Environment**
   ```bash
   # Edit .env with your actual values
   nano .env
   ```

3. **Install Dependencies**
   ```bash
   npm run install:all
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

   This starts both backend (port 5000) and frontend (port 3000) simultaneously.

### Individual Module Development

```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend

# Run tests
npm test

# Build for production
npm run build
```

---

## 📝 Development Workflow

### 1. Branch Strategy
```bash
# Feature branches
git checkout -b feature/fraud-detection-ai
git checkout -b feature/payment-integration
git checkout -b feature/expense-algorithms
git checkout -b feature/dashboard-ui

# Integration branch
git checkout -b integration/team-merge
```

### 2. Commit Convention
```bash
git commit -m "feat(fraud): implement AI transaction analysis"
git commit -m "fix(payments): resolve stripe webhook validation"
git commit -m "docs(api): update expense endpoints documentation"
```

### 3. Code Integration
- Each team member develops in their assigned modules
- Regular integration testing using `npm run test:integration`
- API contracts documented in `docs/API.md`
- Shared utilities in `utils/` and `middleware/`

---

## 📚 Documentation

| Document | Purpose | Maintainer |
|----------|---------|------------|
| `docs/API.md` | API endpoint specifications | All team members |
| `docs/TEAM_GUIDELINES.md` | Collaboration standards | Team Lead |
| `docs/DEPLOYMENT.md` | Production deployment guide | DevOps |
| `docs/TESTING.md` | Testing strategies and guides | QA Team |

---

## 🧪 Testing Strategy

```bash
# Unit tests for individual modules
npm run test:backend
npm run test:frontend

# Integration tests for API contracts
npm run test:integration

# End-to-end testing
npm run test:e2e
```

### Test Structure
```
tests/
├── unit/              # Module-specific unit tests
├── integration/       # API contract testing
├── e2e/              # End-to-end user journeys
└── fixtures/         # Test data and mocks
```

---

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both backend and frontend in development mode |
| `npm run build` | Build both applications for production |
| `npm test` | Run all tests across modules |
| `npm run lint` | Run ESLint on all modules |
| `npm run install:all` | Install dependencies for all modules |
| `npm run clean` | Remove all node_modules folders |
| `npm run reset` | Clean and reinstall all dependencies |

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