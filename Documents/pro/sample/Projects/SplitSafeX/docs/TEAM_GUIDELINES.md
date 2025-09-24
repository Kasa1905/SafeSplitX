# SafeSplitX Team Collaboration Guidelines

## 🤝 Team Structure & Responsibilities

### Team Member 1: Security & Fraud Detection 🛡️
**Primary Focus**: Authentication, security middleware, and AI-powered fraud detection

**Assigned Modules**:
- `backend/routes/auth.js` - Authentication endpoints
- `backend/routes/fraud.js` - Fraud detection APIs
- `backend/middleware/auth.js` - JWT authentication middleware
- `backend/middleware/security.js` - Security middleware
- `utils/encryption.js` - Data encryption utilities
- `utils/validation.js` - Input validation helpers

**Key Deliverables**:
- JWT-based authentication system
- Fraud detection algorithms using AI/ML
- Security middleware and rate limiting
- Input sanitization and validation
- User session management

### Team Member 2: Expense Management & Algorithms 📊
**Primary Focus**: Core expense logic and fair-split algorithms

**Assigned Modules**:
- `backend/routes/expenses.js` - Expense CRUD operations
- `backend/routes/groups.js` - Group management
- `algorithms/fairSplit.js` - Fair-split calculation algorithms
- `algorithms/categorization.js` - Expense categorization
- `utils/calculations.js` - Mathematical utilities
- `backend/models/` - Database models

**Key Deliverables**:
- Expense creation, editing, and tracking
- Group management functionality
- Fair-split algorithms (equal, weighted, percentage-based)
- Expense categorization and validation
- Database schema design

### Team Member 3: Settlement & Payment Integration 💳
**Primary Focus**: Payment processing and multi-currency support

**Assigned Modules**:
- `backend/routes/settlements.js` - Settlement calculations
- `backend/routes/payments.js` - Payment processing
- `currency/converter.js` - Currency conversion
- `currency/rates.js` - Exchange rate fetching
- `middleware/payments.js` - Payment middleware
- `utils/webhooks.js` - Payment gateway webhooks

**Key Deliverables**:
- Settlement calculation and tracking
- Stripe and PayPal integration
- Multi-currency support with real-time rates
- Payment webhook handling
- Transaction reconciliation

### Team Member 4: UI/UX & Frontend Dashboard 🎨
**Primary Focus**: User interface and responsive design

**Assigned Modules**:
- `frontend/pages/` - Next.js pages and routing
- `frontend/components/` - Reusable React components
- `frontend/hooks/` - Custom React hooks
- `frontend/utils/api.js` - API client utilities
- `frontend/styles/` - CSS and design system
- `backend/routes/analytics.js` - Analytics endpoints for dashboard

**Key Deliverables**:
- Responsive dashboard with expense tracking
- Intuitive expense input forms
- Real-time notifications and updates
- Data visualization and charts
- Mobile-friendly interface

---

## 📋 Development Standards

### Code Style & Formatting

#### JavaScript/TypeScript
```javascript
// Use ES6+ features
const getUserExpenses = async (userId) => {
  try {
    const expenses = await Expense.find({ userId });
    return expenses;
  } catch (error) {
    logger.error('Error fetching user expenses:', error);
    throw error;
  }
};

// Use descriptive variable names
const fraudDetectionThreshold = 0.7;
const maxDailyTransactionLimit = 1000;

// Use JSDoc comments for functions
/**
 * Calculate fair split for an expense
 * @param {number} amount - Total expense amount
 * @param {Array} participants - Array of participant objects
 * @param {string} method - Split method (equal, weighted, percentage)
 * @returns {Array} Array of split amounts per participant
 */
```

#### React Components
```jsx
// Use functional components with hooks
import React, { useState, useEffect } from 'react';

const ExpenseForm = ({ onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState(initialData || {
    description: '',
    amount: 0,
    category: 'other'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  );
};

export default ExpenseForm;
```

### File Organization

```
backend/
├── routes/          # API endpoints (organized by feature)
├── middleware/      # Custom middleware functions
├── models/          # Database models
├── utils/           # Helper utilities
├── config/          # Configuration files
└── tests/           # Backend tests

frontend/
├── pages/           # Next.js pages
├── components/      # Reusable components
│   ├── common/      # Shared components
│   ├── forms/       # Form components
│   └── charts/      # Data visualization
├── hooks/           # Custom React hooks
├── utils/           # Frontend utilities
├── styles/          # CSS files
└── __tests__/       # Frontend tests
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `expense-form.js` |
| Components | PascalCase | `ExpenseForm` |
| Functions | camelCase | `calculateSplit` |
| Variables | camelCase | `totalAmount` |
| Constants | UPPER_CASE | `MAX_UPLOAD_SIZE` |
| Routes | kebab-case | `/api/user-expenses` |
| Database Models | PascalCase | `ExpenseModel` |

---

## 🔄 Git Workflow

### Branch Strategy
```bash
main                    # Production-ready code
├── develop            # Integration branch
├── feature/auth-jwt   # Team Member 1 features
├── feature/split-algo # Team Member 2 features  
├── feature/payments   # Team Member 3 features
└── feature/dashboard  # Team Member 4 features
```

### Commit Message Format
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: type(scope): description

# Examples:
git commit -m "feat(auth): implement JWT token validation"
git commit -m "fix(payments): resolve stripe webhook validation issue"
git commit -m "docs(api): update expense endpoints documentation"
git commit -m "test(fraud): add unit tests for detection algorithms"
git commit -m "refactor(split): optimize fair-split calculation performance"
```

#### Commit Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   git push -u origin feature/your-feature-name
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Update and Test**
   ```bash
   # Pull latest changes
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature-name
   git rebase develop

   # Run tests
   npm test
   npm run lint
   ```

4. **Create Pull Request**
   - Provide clear description of changes
   - Link related issues
   - Add screenshots for UI changes
   - Request review from team members

5. **PR Review Checklist**
   - [ ] Code follows style guidelines
   - [ ] Tests pass
   - [ ] Documentation updated
   - [ ] No console.log statements
   - [ ] API contracts maintained

---

## 📡 API Integration Standards

### Response Format
All API responses must follow this standard format:

```javascript
// Success Response
{
  "success": true,
  "data": {
    // Response payload
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "uuid-v4"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "amount",
      "issue": "Must be a positive number"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "uuid-v4"
}
```

### Error Codes
Standardize error codes across all modules:

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Authentication failed | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `DUPLICATE_ENTRY` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `FRAUD_DETECTED` | Suspicious activity | 403 |
| `PAYMENT_FAILED` | Payment processing error | 400 |
| `CURRENCY_ERROR` | Currency conversion failed | 400 |
| `INTERNAL_ERROR` | Server error | 500 |

### Request Validation
Use consistent validation patterns:

```javascript
// Backend route example
const { body, validationResult } = require('express-validator');

const validateExpense = [
  body('description').trim().isLength({ min: 1, max: 255 }),
  body('amount').isFloat({ gt: 0 }),
  body('currency').isIn(['USD', 'EUR', 'GBP', 'CAD']),
  body('category').optional().isIn(['food', 'transport', 'accommodation', 'entertainment', 'other'])
];

router.post('/expenses', validateExpense, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  // Process request...
});
```

---

## 🔧 Environment Configuration

### Required Environment Variables
Each team member should set up these variables:

```bash
# Database (choose one)
MONGODB_URI=mongodb://localhost:27017/splitsafex
POSTGRES_URI=postgresql://user:pass@localhost:5432/splitsafex

# JWT Secrets
JWT_SECRET=your-super-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# External APIs (assign to responsible team members)
OPENAI_API_KEY=your-openai-key           # Team Member 1
FOREX_API_KEY=your-forex-api-key         # Team Member 3
STRIPE_SECRET_KEY=your-stripe-key        # Team Member 3
PAYPAL_CLIENT_SECRET=your-paypal-secret  # Team Member 3

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### Development Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd SafeSplitX

# 2. Install dependencies
npm run install:all

# 3. Set up environment
cp .env.example .env
# Edit .env with your values

# 4. Start development servers
npm run dev
```

---

## 🧪 Testing Strategy

### Unit Tests
Each team member is responsible for testing their modules:

```javascript
// Example test structure
describe('Fair Split Algorithm', () => {
  test('should split amount equally among participants', () => {
    const amount = 100;
    const participants = ['user1', 'user2', 'user3'];
    const result = calculateEqualSplit(amount, participants);
    
    expect(result).toHaveLength(3);
    expect(result[0].amount).toBeCloseTo(33.33);
    expect(result[1].amount).toBeCloseTo(33.33);
    expect(result[2].amount).toBeCloseTo(33.34);
  });
});
```

### Integration Testing
Test API contracts between modules:

```javascript
describe('Expense API Integration', () => {
  test('should create expense and trigger fraud analysis', async () => {
    const expenseData = {
      description: 'Test expense',
      amount: 100,
      groupId: 'group123'
    };
    
    const response = await request(app)
      .post('/api/expenses')
      .send(expenseData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.expense).toBeDefined();
    // Verify fraud analysis was triggered
  });
});
```

### Frontend Testing
```javascript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import ExpenseForm from '../components/ExpenseForm';

test('renders expense form and handles submission', () => {
  const mockSubmit = jest.fn();
  render(<ExpenseForm onSubmit={mockSubmit} />);
  
  const descriptionInput = screen.getByLabelText(/description/i);
  const amountInput = screen.getByLabelText(/amount/i);
  const submitButton = screen.getByRole('button', { name: /submit/i });
  
  fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
  fireEvent.change(amountInput, { target: { value: '50.00' } });
  fireEvent.click(submitButton);
  
  expect(mockSubmit).toHaveBeenCalledWith({
    description: 'Test expense',
    amount: 50.00
  });
});
```

---

## 📊 Integration Points

### Module Communication
Use these patterns for inter-module communication:

```javascript
// Example: Expense creation triggers fraud analysis
// In expenses route (Team Member 2)
const createExpense = async (req, res) => {
  try {
    const expense = await ExpenseModel.create(req.body);
    
    // Trigger fraud analysis (Team Member 1's module)
    const fraudAnalysis = await fraudDetection.analyze({
      transactionId: expense.id,
      amount: expense.amount,
      userId: expense.paidBy,
      description: expense.description
    });
    
    // Update expense with fraud score
    expense.fraudScore = fraudAnalysis.score;
    await expense.save();
    
    res.status(201).json({
      success: true,
      data: { expense, fraudAnalysis }
    });
  } catch (error) {
    next(error);
  }
};
```

### Shared Utilities
Place common utilities in the `utils/` directory:

```javascript
// utils/response.js
exports.successResponse = (data, message = 'Success') => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

exports.errorResponse = (message, code = 'INTERNAL_ERROR') => ({
  success: false,
  error: { code, message },
  timestamp: new Date().toISOString()
});

// Usage in any route
const { successResponse, errorResponse } = require('../../utils/response');

router.get('/test', (req, res) => {
  res.json(successResponse({ test: 'data' }, 'Test successful'));
});
```

---

## 🚀 Deployment Checklist

### Pre-deployment Tasks
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] API documentation updated
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Error handling implemented
- [ ] Logging configured

### Production Environment
```bash
# Build applications
npm run build

# Run production checks
npm run test
npm run lint
npm audit

# Deploy to staging first
npm run deploy:staging

# After validation, deploy to production
npm run deploy:production
```

---

## 📞 Communication Protocol

### Daily Standup (15 mins)
**Time**: Every day at 10:00 AM
**Format**: 
- What did you work on yesterday?
- What are you working on today?
- Any blockers or dependencies?

### Integration Sessions
**Schedule**: Every 2 days, 30 minutes
**Purpose**: Test integration between modules, resolve conflicts

### Code Reviews
- All PRs require at least 1 approval
- Review within 24 hours
- Focus on functionality, not style (automated)

### Issue Escalation
1. **Blocker Issues**: Immediate Slack notification
2. **Dependencies**: Tag responsible team member
3. **Integration Problems**: Schedule pair programming session

---

## 📖 Resources & References

### Documentation
- [Express.js Documentation](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Jest Testing Framework](https://jestjs.io/)

### External APIs
- [Stripe API](https://stripe.com/docs/api)
- [PayPal Developer](https://developer.paypal.com/)
- [OpenAI API](https://platform.openai.com/docs)
- [Exchange Rates API](https://exchangerate-api.com/)

### Best Practices
- [Conventional Commits](https://www.conventionalcommits.org/)
- [REST API Design](https://restfulapi.net/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)

---

**Remember**: We're building this together! Communicate early and often, help each other, and let's create something amazing! 🚀

*Last Updated: January 1, 2024*