const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let mongoServer;

// Global setup for all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.AI_SERVICE_URL = 'http://localhost:5001';
  process.env.AI_SERVICE_ENABLED = 'false';
  process.env.RULE_ENGINE_ENABLED = 'true';
  process.env.FRAUD_ALERTS_ENABLED = 'true';
  process.env.LOG_LEVEL = 'error';
});

// Global teardown for all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear all collections before each test
beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Global test utilities
global.createTestUser = async (userData = {}) => {
  const User = require('../../backend/models/User');
  const defaultUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'hashedpassword123',
    role: 'user',
    isActive: true,
    preferences: {
      currency: 'USD',
      notifications: true
    }
  };
  
  const user = new User({ ...defaultUser, ...userData });
  return await user.save();
};

global.createTestGroup = async (groupData = {}) => {
  const Group = require('../../backend/models/Group');
  const defaultGroup = {
    name: 'Test Group',
    description: 'A test group for integration testing',
    currency: 'USD',
    members: [],
    createdBy: null,
    settings: {
      autoApprove: false,
      requireReceipts: false
    }
  };
  
  const group = new Group({ ...defaultGroup, ...groupData });
  return await group.save();
};

global.createTestExpense = async (expenseData = {}) => {
  const Expense = require('../../backend/models/Expense');
  const defaultExpense = {
    description: 'Test Expense',
    amount: 100.00,
    currency: 'USD',
    category: 'food',
    date: new Date(),
    paidBy: null,
    groupId: null,
    splits: [],
    status: 'pending',
    tags: ['test']
  };
  
  const expense = new Expense({ ...defaultExpense, ...expenseData });
  return await expense.save();
};

global.generateAuthToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}