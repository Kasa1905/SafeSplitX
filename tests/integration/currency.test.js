const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup, createTestExpense } = require('../helpers/dbHelpers');

let app;
let authToken;
let userId;
let groupId;

describe('Currency Integration Tests', () => {
  beforeAll(async () => {
    app = setupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create test user and get auth token
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser'
    });
    userId = user._id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    authToken = loginResponse.body.data.token;

    // Create test group
    const group = await createTestGroup({
      name: 'Test Group',
      members: [userId],
      createdBy: userId,
      currency: 'USD'
    });
    groupId = group._id;
  });

  describe('GET /api/currency/rates', () => {
    test('should get current exchange rates', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/rates', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.rates).toBeDefined();
        expect(data.baseCurrency).toBeDefined();
        expect(data.lastUpdated).toBeDefined();
        expect(typeof data.rates).toBe('object');
      });
    });

    test('should get rates for specific currencies', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/rates?currencies=EUR,GBP,JPY', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.rates).toBeDefined();
        expect(Object.keys(data.rates)).toEqual(expect.arrayContaining(['EUR', 'GBP', 'JPY']));
      });
    });

    test('should get rates with specific base currency', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/rates?base=EUR', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.baseCurrency).toBe('EUR');
        expect(data.rates).toBeDefined();
      });
    });

    test('should not get rates without authentication', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should handle invalid base currency', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/rates?base=INVALID', authToken)
        .expect(400);

      expectErrorResponse(response, 'Invalid base currency');
    });
  });

  describe('POST /api/currency/convert', () => {
    test('should convert currency successfully', async () => {
      const conversionData = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/convert', authToken)
        .send(conversionData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.originalAmount).toBe(100);
        expect(data.fromCurrency).toBe('USD');
        expect(data.toCurrency).toBe('EUR');
        expect(data.convertedAmount).toBeDefined();
        expect(data.exchangeRate).toBeDefined();
        expect(data.timestamp).toBeDefined();
        expect(typeof data.convertedAmount).toBe('number');
        expect(typeof data.exchangeRate).toBe('number');
      });
    });

    test('should convert same currency without change', async () => {
      const conversionData = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'USD'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/convert', authToken)
        .send(conversionData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.originalAmount).toBe(100);
        expect(data.convertedAmount).toBe(100);
        expect(data.exchangeRate).toBe(1);
      });
    });

    test('should not convert without required fields', async () => {
      const conversionData = {
        amount: 100,
        fromCurrency: 'USD'
        // Missing toCurrency
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/convert', authToken)
        .send(conversionData)
        .expect(400);

      expectErrorResponse(response, 'Amount, fromCurrency, and toCurrency are required');
    });

    test('should not convert with invalid amount', async () => {
      const conversionData = {
        amount: -100,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/convert', authToken)
        .send(conversionData)
        .expect(400);

      expectErrorResponse(response, 'Amount must be positive');
    });

    test('should not convert with invalid currency codes', async () => {
      const conversionData = {
        amount: 100,
        fromCurrency: 'INVALID',
        toCurrency: 'EUR'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/convert', authToken)
        .send(conversionData)
        .expect(400);

      expectErrorResponse(response, 'Invalid currency code');
    });

    test('should handle batch conversion', async () => {
      const conversionData = {
        conversions: [
          { amount: 100, fromCurrency: 'USD', toCurrency: 'EUR' },
          { amount: 50, fromCurrency: 'EUR', toCurrency: 'GBP' },
          { amount: 200, fromCurrency: 'USD', toCurrency: 'JPY' }
        ]
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/convert/batch', authToken)
        .send(conversionData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.conversions).toBeDefined();
        expect(data.conversions).toHaveLength(3);
        data.conversions.forEach(conversion => {
          expect(conversion.originalAmount).toBeDefined();
          expect(conversion.convertedAmount).toBeDefined();
          expect(conversion.exchangeRate).toBeDefined();
        });
      });
    });
  });

  describe('GET /api/currency/supported', () => {
    test('should get supported currencies', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/supported', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.currencies).toBeDefined();
        expect(Array.isArray(data.currencies)).toBe(true);
        expect(data.currencies.length).toBeGreaterThan(0);
        
        // Check that common currencies are included
        const currencyCodes = data.currencies.map(c => c.code);
        expect(currencyCodes).toContain('USD');
        expect(currencyCodes).toContain('EUR');
        expect(currencyCodes).toContain('GBP');
        
        // Check structure of currency objects
        data.currencies.forEach(currency => {
          expect(currency.code).toBeDefined();
          expect(currency.name).toBeDefined();
          expect(currency.symbol).toBeDefined();
        });
      });
    });
  });

  describe('GET /api/currency/history/:from/:to', () => {
    test('should get exchange rate history', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/history/${fromCurrency}/${toCurrency}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.fromCurrency).toBe(fromCurrency);
        expect(data.toCurrency).toBe(toCurrency);
        expect(data.history).toBeDefined();
        expect(Array.isArray(data.history)).toBe(true);
        
        if (data.history.length > 0) {
          data.history.forEach(entry => {
            expect(entry.date).toBeDefined();
            expect(entry.rate).toBeDefined();
            expect(typeof entry.rate).toBe('number');
          });
        }
      });
    });

    test('should filter history by date range', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/history/${fromCurrency}/${toCurrency}?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.history).toBeDefined();
        expect(data.dateRange.startDate).toBe(startDate);
        expect(data.dateRange.endDate).toBe(endDate);
      });
    });

    test('should not get history for invalid currency pair', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/history/INVALID/EUR', authToken)
        .expect(400);

      expectErrorResponse(response, 'Invalid currency code');
    });
  });

  describe('GET /api/currency/group-analysis/:groupId', () => {
    beforeEach(async () => {
      // Create expenses in different currencies
      await createTestExpense({
        description: 'USD Expense',
        amount: 100,
        currency: 'USD',
        groupId,
        paidBy: userId
      });

      // Create another group with EUR currency
      const eurGroup = await createTestGroup({
        name: 'EUR Group',
        members: [userId],
        createdBy: userId,
        currency: 'EUR'
      });

      await createTestExpense({
        description: 'EUR Expense',
        amount: 85,
        currency: 'EUR',
        groupId: eurGroup._id,
        paidBy: userId
      });
    });

    test('should get currency analysis for group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/group-analysis/${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.groupId).toBe(groupId.toString());
        expect(data.baseCurrency).toBeDefined();
        expect(data.totalExpenses).toBeDefined();
        expect(data.currencyBreakdown).toBeDefined();
        expect(data.conversionSummary).toBeDefined();
        
        expect(typeof data.totalExpenses.count).toBe('number');
        expect(typeof data.totalExpenses.amount).toBe('number');
        expect(Array.isArray(data.currencyBreakdown)).toBe(true);
      });
    });

    test('should get analysis with specific target currency', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/group-analysis/${groupId}?targetCurrency=EUR`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.targetCurrency).toBe('EUR');
        expect(data.conversionSummary.totalInTargetCurrency).toBeDefined();
      });
    });

    test('should not get analysis for non-existent group', async () => {
      const invalidGroupId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/group-analysis/${invalidGroupId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Group not found');
    });

    test('should not get analysis for group without access', async () => {
      // Create another user and group
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      const otherGroup = await createTestGroup({
        name: 'Other Group',
        members: [otherUser._id],
        createdBy: otherUser._id
      });

      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/group-analysis/${otherGroup._id}`, authToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('GET /api/currency/user-preferences', () => {
    test('should get user currency preferences', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/user-preferences', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.preferences).toBeDefined();
        expect(data.preferences.defaultCurrency).toBeDefined();
        expect(data.preferences.displayCurrencies).toBeDefined();
        expect(Array.isArray(data.preferences.displayCurrencies)).toBe(true);
      });
    });
  });

  describe('PUT /api/currency/user-preferences', () => {
    test('should update user currency preferences', async () => {
      const preferences = {
        defaultCurrency: 'EUR',
        displayCurrencies: ['EUR', 'USD', 'GBP'],
        autoConversion: true,
        rateRefreshInterval: 3600
      };

      const response = await makeAuthenticatedRequest(app, 'put', '/api/currency/user-preferences', authToken)
        .send({ preferences })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.preferences.defaultCurrency).toBe('EUR');
        expect(data.preferences.displayCurrencies).toEqual(['EUR', 'USD', 'GBP']);
        expect(data.preferences.autoConversion).toBe(true);
        expect(data.preferences.rateRefreshInterval).toBe(3600);
      });
    });

    test('should not update with invalid default currency', async () => {
      const preferences = {
        defaultCurrency: 'INVALID'
      };

      const response = await makeAuthenticatedRequest(app, 'put', '/api/currency/user-preferences', authToken)
        .send({ preferences })
        .expect(400);

      expectErrorResponse(response, 'Invalid default currency');
    });

    test('should not update with invalid display currencies', async () => {
      const preferences = {
        displayCurrencies: ['EUR', 'INVALID', 'USD']
      };

      const response = await makeAuthenticatedRequest(app, 'put', '/api/currency/user-preferences', authToken)
        .send({ preferences })
        .expect(400);

      expectErrorResponse(response, 'Invalid currency in display currencies');
    });
  });

  describe('POST /api/currency/expense-conversion', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'USD Expense',
        amount: 100,
        currency: 'USD',
        groupId,
        paidBy: userId
      });
      expenseId = expense._id;
    });

    test('should convert expense to different currency', async () => {
      const conversionData = {
        expenseId: expenseId.toString(),
        targetCurrency: 'EUR'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/expense-conversion', authToken)
        .send(conversionData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expenseId).toBe(expenseId.toString());
        expect(data.originalCurrency).toBe('USD');
        expect(data.targetCurrency).toBe('EUR');
        expect(data.originalAmount).toBe(100);
        expect(data.convertedAmount).toBeDefined();
        expect(data.exchangeRate).toBeDefined();
        expect(data.conversionDate).toBeDefined();
      });
    });

    test('should not convert non-existent expense', async () => {
      const invalidExpenseId = new mongoose.Types.ObjectId();
      const conversionData = {
        expenseId: invalidExpenseId.toString(),
        targetCurrency: 'EUR'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/expense-conversion', authToken)
        .send(conversionData)
        .expect(404);

      expectErrorResponse(response, 'Expense not found');
    });
  });

  describe('GET /api/currency/volatility/:currency', () => {
    test('should get currency volatility data', async () => {
      const currency = 'EUR';
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/volatility/${currency}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.currency).toBe(currency);
        expect(data.baseCurrency).toBeDefined();
        expect(data.volatility).toBeDefined();
        expect(data.period).toBeDefined();
        expect(typeof data.volatility.percentage).toBe('number');
        expect(typeof data.volatility.standardDeviation).toBe('number');
      });
    });

    test('should get volatility for custom period', async () => {
      const currency = 'GBP';
      const response = await makeAuthenticatedRequest(app, 'get', `/api/currency/volatility/${currency}?period=7d`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.period).toBe('7d');
        expect(data.volatility).toBeDefined();
      });
    });

    test('should not get volatility for invalid currency', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/volatility/INVALID', authToken)
        .expect(400);

      expectErrorResponse(response, 'Invalid currency code');
    });
  });

  describe('GET /api/currency/alerts', () => {
    test('should get currency rate alerts', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/currency/alerts', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.alerts).toBeDefined();
        expect(Array.isArray(data.alerts)).toBe(true);
      });
    });
  });

  describe('POST /api/currency/alerts', () => {
    test('should create currency rate alert', async () => {
      const alertData = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        targetRate: 0.85,
        condition: 'below',
        enabled: true
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/alerts', authToken)
        .send(alertData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.alert).toBeDefined();
        expect(data.alert.fromCurrency).toBe('USD');
        expect(data.alert.toCurrency).toBe('EUR');
        expect(data.alert.targetRate).toBe(0.85);
        expect(data.alert.condition).toBe('below');
        expect(data.alert.enabled).toBe(true);
      });
    });

    test('should not create alert with invalid currencies', async () => {
      const alertData = {
        fromCurrency: 'INVALID',
        toCurrency: 'EUR',
        targetRate: 0.85,
        condition: 'below'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/alerts', authToken)
        .send(alertData)
        .expect(400);

      expectErrorResponse(response, 'Invalid currency code');
    });

    test('should not create alert with invalid target rate', async () => {
      const alertData = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        targetRate: -0.85,
        condition: 'below'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/currency/alerts', authToken)
        .send(alertData)
        .expect(400);

      expectErrorResponse(response, 'Target rate must be positive');
    });
  });
});