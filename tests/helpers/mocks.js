/**
 * Centralized mocking utilities for SafeSplitX tests
 * This file provides a unified approach to mocking external dependencies
 * and services, resolving conflicts between global and test-specific mocks.
 */

// Global mock utilities
const mockUtilities = {
  /**
   * Create mock response object for Express middleware tests
   */
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn(),
    locals: {}
  }),

  /**
   * Create mock request object for Express middleware tests
   */
  createMockRequest: (overrides = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    user: null,
    session: {},
    cookies: {},
    protocol: 'http',
    get: jest.fn(),
    ...overrides
  }),

  /**
   * Create mock next function for Express middleware tests
   */
  createMockNext: () => jest.fn(),

  /**
   * Mock AI service responses consistently across tests
   */
  mockAIService: {
    fraudDetection: {
      success: {
        riskScore: 0.3,
        riskLevel: 'low',
        confidence: 0.95,
        factors: ['normal_amount', 'known_merchant'],
        recommendation: 'approve'
      },
      highRisk: {
        riskScore: 0.8,
        riskLevel: 'high',
        confidence: 0.92,
        factors: ['unusual_amount', 'new_merchant', 'off_hours'],
        recommendation: 'review'
      },
      error: {
        error: 'Service temporarily unavailable',
        code: 'AI_SERVICE_ERROR'
      }
    },
    categorization: {
      success: {
        category: 'food',
        confidence: 0.89,
        subcategories: ['restaurant', 'dining']
      },
      error: {
        error: 'Categorization failed',
        code: 'CATEGORIZATION_ERROR'
      }
    }
  },

  /**
   * Mock database models consistently
   */
  mockModels: {
    User: {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn()
    },
    Group: {
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      aggregate: jest.fn()
    },
    Expense: {
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn()
    }
  },

  /**
   * Mock external services
   */
  mockExternalServices: {
    // Currency service mock
    forexAPI: {
      getRates: jest.fn().mockResolvedValue({
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73, JPY: 110.5 },
        timestamp: Date.now()
      }),
      convert: jest.fn().mockResolvedValue({
        from: 'USD',
        to: 'EUR',
        amount: 100,
        converted: 85,
        rate: 0.85
      })
    },

    // Email service mock
    emailService: {
      sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-id' }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
    },

    // Payment service mocks
    stripe: {
      charges: {
        create: jest.fn().mockResolvedValue({ id: 'ch_mock', status: 'succeeded' })
      },
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_mock' })
      }
    }
  }
};

/**
 * Setup function to apply consistent mocks across all tests
 * Call this in your test setup to avoid mock conflicts
 */
const setupTestMocks = () => {
  // Mock console methods to reduce test noise
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Mock timers for consistent test behavior
  jest.useFakeTimers('legacy');

  // Mock global Date for consistent testing
  const mockDate = new Date('2024-01-15T10:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  Date.now = jest.fn(() => mockDate.getTime());
};

/**
 * Cleanup function to restore mocks after tests
 */
const cleanupTestMocks = () => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
};

/**
 * Create a mock for the AI service that can be used across tests
 */
const createAIServiceMock = () => {
  return {
    analyzeFraud: jest.fn(),
    categorizeExpense: jest.fn(),
    detectPatterns: jest.fn(),
    isHealthy: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({ status: 'healthy', uptime: 3600 })
  };
};

/**
 * Create mock data for consistent testing
 */
const createMockData = () => {
  return {
    user: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      isActive: true
    },
    group: {
      _id: '507f1f77bcf86cd799439012',
      name: 'Test Group',
      description: 'A test group',
      currency: 'USD',
      members: ['507f1f77bcf86cd799439011'],
      createdBy: '507f1f77bcf86cd799439011'
    },
    expense: {
      _id: '507f1f77bcf86cd799439013',
      description: 'Test Expense',
      amount: 100.00,
      currency: 'USD',
      category: 'food',
      paidBy: '507f1f77bcf86cd799439011',
      groupId: '507f1f77bcf86cd799439012'
    }
  };
};

module.exports = {
  mockUtilities,
  setupTestMocks,
  cleanupTestMocks,
  createAIServiceMock,
  createMockData
};