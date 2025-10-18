const { faker } = require('@faker-js/faker');

// Generate mock user data
const generateUser = (overrides = {}) => {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hashedpassword123',
    role: faker.helpers.arrayElement(['user', 'admin']),
    isActive: true,
    preferences: {
      currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'INR']),
      notifications: faker.datatype.boolean(),
      language: 'en'
    },
    createdAt: faker.date.past(),
    lastLogin: faker.date.recent(),
    ...overrides
  };
};

// Generate mock group data
const generateGroup = (overrides = {}) => {
  return {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'INR']),
    members: [],
    createdBy: null,
    settings: {
      autoApprove: faker.datatype.boolean(),
      requireReceipts: faker.datatype.boolean(),
      splitMethod: faker.helpers.arrayElement(['equal', 'weighted', 'percentage'])
    },
    createdAt: faker.date.past(),
    ...overrides
  };
};

// Generate mock expense data
const generateExpense = (overrides = {}) => {
  return {
    description: faker.commerce.productName(),
    amount: parseFloat(faker.commerce.price({ min: 5, max: 500, dec: 2 })),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'INR']),
    category: faker.helpers.arrayElement(['food', 'transportation', 'accommodation', 'entertainment', 'shopping', 'utilities']),
    date: faker.date.recent(),
    paidBy: null,
    groupId: null,
    splits: [],
    status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
    tags: faker.helpers.arrayElements(['business', 'personal', 'vacation', 'urgent'], { min: 0, max: 3 }),
    notes: faker.lorem.sentence(),
    receiptUrl: faker.datatype.boolean() ? faker.internet.url() : null,
    ...overrides
  };
};

// Generate mock fraud analysis data
const generateFraudAnalysis = (overrides = {}) => {
  const fraudScore = faker.number.float({ min: 0, max: 1, precision: 0.01 });
  const riskLevel = fraudScore > 0.8 ? 'HIGH' : fraudScore > 0.5 ? 'MEDIUM' : 'LOW';
  
  return {
    expenseId: null,
    userId: null,
    fraudScore,
    confidence: faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
    riskLevel,
    mlAnalysis: {
      prediction: fraudScore,
      features: {
        amountAnomaly: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
        timeAnomaly: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
        locationAnomaly: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
        behaviorAnomaly: faker.number.float({ min: 0, max: 1, precision: 0.01 })
      }
    },
    ruleAnalysis: {
      triggered: faker.datatype.boolean(),
      rules: faker.helpers.arrayElements(['unusualAmount', 'highFrequency', 'duplicateExpense'], { min: 0, max: 3 }),
      score: faker.number.float({ min: 0, max: 1, precision: 0.01 })
    },
    explanation: faker.lorem.paragraph(),
    requiresReview: riskLevel !== 'LOW',
    requiresAlert: riskLevel === 'HIGH',
    processingTime: faker.number.int({ min: 100, max: 2000 }),
    createdAt: faker.date.recent(),
    ...overrides
  };
};

// Generate mock fraud alert data
const generateFraudAlert = (overrides = {}) => {
  return {
    expenseId: null,
    userId: null,
    alertType: faker.helpers.arrayElement(['HIGH_RISK', 'SUSPICIOUS_PATTERN', 'RULE_VIOLATION']),
    severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['open', 'investigating', 'resolved', 'false_positive']),
    assignedTo: null,
    createdAt: faker.date.recent(),
    resolvedAt: faker.datatype.boolean() ? faker.date.recent() : null,
    ...overrides
  };
};

// Generate mock fraud rule data
const generateFraudRule = (overrides = {}) => {
  return {
    name: faker.lorem.words(2),
    description: faker.lorem.sentence(),
    type: faker.helpers.arrayElement(['amount', 'frequency', 'location', 'behavior']),
    conditions: {
      threshold: faker.number.float({ min: 0.5, max: 2.0, precision: 0.1 }),
      operator: faker.helpers.arrayElement(['>', '<', '>=', '<=', '==']),
      timeWindow: faker.helpers.arrayElement([3600, 7200, 86400]) // 1h, 2h, 24h in seconds
    },
    enabled: faker.datatype.boolean(),
    weight: faker.number.float({ min: 0.1, max: 1.0, precision: 0.1 }),
    createdBy: null,
    createdAt: faker.date.past(),
    ...overrides
  };
};

// Generate mock settlement data
const generateSettlement = (overrides = {}) => {
  return {
    fromUserId: null,
    toUserId: null,
    groupId: null,
    amount: parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 })),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'INR']),
    status: faker.helpers.arrayElement(['pending', 'completed', 'cancelled']),
    method: faker.helpers.arrayElement(['cash', 'bank_transfer', 'paypal', 'venmo']),
    description: faker.lorem.sentence(),
    dueDate: faker.date.future(),
    completedAt: faker.datatype.boolean() ? faker.date.recent() : null,
    createdAt: faker.date.recent(),
    ...overrides
  };
};

// Generate mock payment data
const generatePayment = (overrides = {}) => {
  return {
    settlementId: null,
    userId: null,
    amount: parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 })),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'INR']),
    method: faker.helpers.arrayElement(['stripe', 'paypal', 'bank_transfer']),
    status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed', 'cancelled']),
    transactionId: faker.string.alphanumeric(20),
    gatewayResponse: {
      id: faker.string.alphanumeric(15),
      status: 'success',
      fee: parseFloat(faker.commerce.price({ min: 1, max: 10, dec: 2 }))
    },
    createdAt: faker.date.recent(),
    processedAt: faker.datatype.boolean() ? faker.date.recent() : null,
    ...overrides
  };
};

// Sample data arrays for bulk testing
const sampleUsers = Array.from({ length: 10 }, () => generateUser());
const sampleGroups = Array.from({ length: 5 }, () => generateGroup());
const sampleExpenses = Array.from({ length: 20 }, () => generateExpense());
const sampleFraudAnalyses = Array.from({ length: 15 }, () => generateFraudAnalysis());
const sampleFraudAlerts = Array.from({ length: 8 }, () => generateFraudAlert());
const sampleFraudRules = Array.from({ length: 6 }, () => generateFraudRule());
const sampleSettlements = Array.from({ length: 12 }, () => generateSettlement());
const samplePayments = Array.from({ length: 10 }, () => generatePayment());

module.exports = {
  generateUser,
  generateGroup,
  generateExpense,
  generateFraudAnalysis,
  generateFraudAlert,
  generateFraudRule,
  generateSettlement,
  generatePayment,
  sampleUsers,
  sampleGroups,
  sampleExpenses,
  sampleFraudAnalyses,
  sampleFraudAlerts,
  sampleFraudRules,
  sampleSettlements,
  samplePayments
};