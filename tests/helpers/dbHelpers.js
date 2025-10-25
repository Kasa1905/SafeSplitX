const mongoose = require('mongoose');

// Direct MongoDB model imports to avoid needing initializeModels()
const { MongoUser: User } = require('../../backend/models/User');
const { MongoGroup: Group } = require('../../backend/models/Group');
const { MongoExpense: Expense } = require('../../backend/models/Expense');
const { MongoSettlement: Settlement } = require('../../backend/models/Settlement');
const FraudAnalysis = require('../../backend/ai/models/FraudAnalysis');
const FraudAlert = require('../../backend/ai/models/FraudAlert');
const FraudRule = require('../../backend/ai/models/FraudRule');

/**
 * Clear all collections in the test database
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

/**
 * Seed database with test data
 * @param {Object} data - Data to seed { users, groups, expenses, etc. }
 */
const seedDatabase = async (data = {}) => {
  try {
  // use top-level model references
    // Seed users
    if (data.users && Array.isArray(data.users)) {
      await User.insertMany(data.users);
    }
    
    // Seed groups
    if (data.groups && Array.isArray(data.groups)) {
      await Group.insertMany(data.groups);
    }
    
    // Seed expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      await Expense.insertMany(data.expenses);
    }
    
    // Seed fraud analyses
    if (data.fraudAnalyses && Array.isArray(data.fraudAnalyses)) {
      await FraudAnalysis.insertMany(data.fraudAnalyses);
    }

    // Seed fraud alerts
    if (data.fraudAlerts && Array.isArray(data.fraudAlerts)) {
      await FraudAlert.insertMany(data.fraudAlerts);
    }

    // Seed fraud rules
    if (data.fraudRules && Array.isArray(data.fraudRules)) {
      await FraudRule.insertMany(data.fraudRules);
    }
    
    // Seed settlements
    if (data.settlements && Array.isArray(data.settlements)) {
      await Settlement.insertMany(data.settlements);
    }
    
    // Seed payments (handled through settlements)
    if (data.payments && Array.isArray(data.payments)) {
      // Payments are handled through the Settlement model
      console.log('Payment data should be handled through settlements');
    }
    
  } catch (error) {
    throw new Error(`Failed to seed database: ${error.message}`);
  }
};

/**
 * Create test user in database
 * @param {Object} userData - User data
 * @returns {Object} User document
 */
const createTestUser = async (userData = {}) => {
  try {
    
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
  } catch (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
};

/**
 * Create test group in database
 * @param {Object} groupData - Group data
 * @returns {Object} Group document
 */
const createTestGroup = async (groupData = {}) => {
  try {
    
    const defaultGroup = {
      name: 'Test Group',
      description: 'A test group for integration testing',
      currency: 'USD',
      members: [],
      settings: {
        autoApprove: false,
        requireReceipts: false
      }
    };
    
    const group = new Group({ ...defaultGroup, ...groupData });
    return await group.save();
  } catch (error) {
    throw new Error(`Failed to create test group: ${error.message}`);
  }
};

/**
 * Create test expense in database
 * @param {Object} expenseData - Expense data
 * @returns {Object} Expense document
 */
const createTestExpense = async (expenseData = {}) => {
  try {
    
    const defaultExpense = {
      description: 'Test Expense',
      amount: 100.00,
      currency: 'USD',
      category: 'food',
      date: new Date(),
      splits: [],
      status: 'pending',
      tags: ['test']
    };
    
    const expense = new Expense({ ...defaultExpense, ...expenseData });
    return await expense.save();
  } catch (error) {
    throw new Error(`Failed to create test expense: ${error.message}`);
  }
};

/**
 * Create test fraud analysis in database
 * @param {Object} analysisData - Fraud analysis data
 * @returns {Object} FraudAnalysis document
 */
const createTestFraudAnalysis = async (analysisData = {}) => {
  try {
    const FraudAnalysis = require('../../backend/ai/models/FraudAnalysis');
    const defaultAnalysis = {
      fraudScore: 0.3,
      confidence: 0.85,
      riskLevel: 'LOW',
      mlAnalysis: {
        prediction: 0.3,
        features: {
          amountAnomaly: 0.2,
          timeAnomaly: 0.1,
          locationAnomaly: 0.0,
          behaviorAnomaly: 0.1
        }
      },
      ruleAnalysis: {
        triggered: false,
        rules: [],
        score: 0.0
      },
      explanation: 'Low risk transaction with normal patterns',
      requiresReview: false,
      requiresAlert: false,
      processingTime: 250
    };
    
    const analysis = new FraudAnalysis({ ...defaultAnalysis, ...analysisData });
    return await analysis.save();
  } catch (error) {
    throw new Error(`Failed to create test fraud analysis: ${error.message}`);
  }
};

/**
 * Get test database connection
 * @returns {Object} Mongoose connection
 */
const getTestConnection = () => {
  return mongoose.connection;
};

/**
 * Close test database connection
 */
const closeTestConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
};

/**
 * Get collection statistics
 * @param {string} collectionName - Name of collection
 * @returns {Object} Collection stats
 */
const getCollectionStats = async (collectionName) => {
  try {
    const collection = mongoose.connection.collection(collectionName);
    const count = await collection.countDocuments();
    return { name: collectionName, count };
  } catch (error) {
    return { name: collectionName, count: 0, error: error.message };
  }
};

/**
 * Create test settlement in database
 * @param {Object} settlementData - Settlement data
 * @returns {Object} Settlement document
 */
const createTestSettlement = async (settlementData = {}) => {
  try {
    
    const defaultSettlement = {
      amount: 50.00,
      currency: 'USD',
      status: 'pending',
      method: 'cash',
      description: 'Test settlement'
    };
    
    const settlement = new Settlement({ ...defaultSettlement, ...settlementData });
    return await settlement.save();
  } catch (error) {
    throw new Error(`Failed to create test settlement: ${error.message}`);
  }
};

/**
 * Create test payment in database
 * @param {Object} paymentData - Payment data
 * @returns {Object} Settlement document (payments are handled as settlements)
 */
const createTestPayment = async (paymentData = {}) => {
  try {
  // Payments are handled through settlements in this system
    
    const defaultPayment = {
      amount: 25.00,
      currency: 'USD',
      method: 'stripe',
      status: 'pending',
      description: `Payment ${Date.now()}`
    };
    
    const settlement = new Settlement({ ...defaultPayment, ...paymentData });
    return await settlement.save();
  } catch (error) {
    throw new Error(`Failed to create test payment: ${error.message}`);
  }
};

module.exports = {
  clearDatabase,
  seedDatabase,
  createTestUser,
  createTestGroup,
  createTestExpense,
  createTestFraudAnalysis,
  createTestSettlement,
  createTestPayment,
  getTestConnection,
  closeTestConnection,
  getCollectionStats
};