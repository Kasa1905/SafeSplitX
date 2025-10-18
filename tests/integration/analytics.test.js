const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup, createTestExpense } = require('../helpers/dbHelpers');

let app;
let authToken;
let userId;
let groupId;

describe('Analytics Integration Tests', () => {
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
      createdBy: userId
    });
    groupId = group._id;

    // Create sample expenses for analytics
    await createTestExpense({
      description: 'Food Expense 1',
      amount: 100,
      category: 'food',
      groupId,
      paidBy: userId,
      date: new Date('2024-01-15')
    });

    await createTestExpense({
      description: 'Transportation Expense',
      amount: 50,
      category: 'transportation',
      groupId,
      paidBy: userId,
      date: new Date('2024-01-20')
    });

    await createTestExpense({
      description: 'Food Expense 2',
      amount: 75,
      category: 'food',
      groupId,
      paidBy: userId,
      date: new Date('2024-01-25')
    });

    await createTestExpense({
      description: 'Entertainment Expense',
      amount: 120,
      category: 'entertainment',
      groupId,
      paidBy: userId,
      date: new Date('2024-02-01')
    });
  });

  describe('GET /api/analytics/overview', () => {
    test('should get overview analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/overview', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.overview).toBeDefined();
        expect(data.overview.totalExpenses).toBeDefined();
        expect(data.overview.totalAmount).toBeDefined();
        expect(data.overview.averageExpense).toBeDefined();
        expect(data.overview.totalGroups).toBeDefined();
        expect(data.overview.activeGroups).toBeDefined();
        expect(data.overview.totalUsers).toBeDefined();
        expect(data.overview.recentActivity).toBeDefined();
        
        expect(typeof data.overview.totalExpenses).toBe('number');
        expect(typeof data.overview.totalAmount).toBe('number');
        expect(Array.isArray(data.overview.recentActivity)).toBe(true);
      });
    });

    test('should get overview analytics with date filter', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/overview?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.overview).toBeDefined();
        expect(data.dateRange.startDate).toBe(startDate);
        expect(data.dateRange.endDate).toBe(endDate);
      });
    });

    test('should not get overview without authentication', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });
  });

  describe('GET /api/analytics/expenses', () => {
    test('should get expense analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/expenses', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.totalAmount).toBeDefined();
        expect(data.analytics.totalExpenses).toBeDefined();
        expect(data.analytics.averageAmount).toBeDefined();
        expect(data.analytics.categoryBreakdown).toBeDefined();
        expect(data.analytics.monthlyTrends).toBeDefined();
        expect(data.analytics.topExpenses).toBeDefined();
        
        // Verify category breakdown structure
        expect(Array.isArray(data.analytics.categoryBreakdown)).toBe(true);
        if (data.analytics.categoryBreakdown.length > 0) {
          data.analytics.categoryBreakdown.forEach(category => {
            expect(category.category).toBeDefined();
            expect(category.total).toBeDefined();
            expect(category.count).toBeDefined();
            expect(category.percentage).toBeDefined();
          });
        }
        
        // Verify monthly trends structure
        expect(Array.isArray(data.analytics.monthlyTrends)).toBe(true);
      });
    });

    test('should filter expense analytics by category', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/expenses?category=food', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.categoryFilter).toBe('food');
        // Should only include food expenses
        data.analytics.categoryBreakdown.forEach(category => {
          if (category.count > 0) {
            expect(category.category).toBe('food');
          }
        });
      });
    });

    test('should filter expense analytics by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/expenses?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.groupFilter).toBe(groupId.toString());
        expect(data.analytics.totalExpenses).toBeGreaterThan(0);
      });
    });

    test('should filter expense analytics by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/expenses?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.dateRange.startDate).toBe(startDate);
        expect(data.dateRange.endDate).toBe(endDate);
        // Should only include expenses from January
        expect(data.analytics.totalExpenses).toBe(3); // 3 expenses in January
      });
    });

    test('should get expense analytics with currency conversion', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/expenses?currency=EUR', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.currency).toBe('EUR');
        expect(data.analytics.conversionApplied).toBe(true);
        expect(data.analytics.exchangeRate).toBeDefined();
      });
    });
  });

  describe('GET /api/analytics/groups', () => {
    beforeEach(async () => {
      // Create additional group for analytics
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await createTestGroup({
        name: 'Other Group',
        members: [userId, otherUser._id],
        createdBy: userId
      });
    });

    test('should get group analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/groups', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.totalGroups).toBeDefined();
        expect(data.analytics.activeGroups).toBeDefined();
        expect(data.analytics.averageMembersPerGroup).toBeDefined();
        expect(data.analytics.groupActivity).toBeDefined();
        expect(data.analytics.membershipTrends).toBeDefined();
        expect(data.analytics.topGroups).toBeDefined();
        
        expect(typeof data.analytics.totalGroups).toBe('number');
        expect(typeof data.analytics.activeGroups).toBe('number');
        expect(Array.isArray(data.analytics.topGroups)).toBe(true);
      });
    });

    test('should get specific group analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/groups/${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.groupId).toBe(groupId.toString());
        expect(data.analytics.groupName).toBeDefined();
        expect(data.analytics.totalExpenses).toBeDefined();
        expect(data.analytics.totalAmount).toBeDefined();
        expect(data.analytics.memberCount).toBeDefined();
        expect(data.analytics.expenseBreakdown).toBeDefined();
        expect(data.analytics.memberActivity).toBeDefined();
        expect(data.analytics.balanceSummary).toBeDefined();
      });
    });

    test('should not get analytics for non-existent group', async () => {
      const invalidGroupId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/groups/${invalidGroupId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Group not found');
    });

    test('should not get analytics for group without access', async () => {
      const otherUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const restrictedGroup = await createTestGroup({
        name: 'Restricted Group',
        members: [otherUser._id],
        createdBy: otherUser._id
      });

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/groups/${restrictedGroup._id}`, authToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('GET /api/analytics/categories', () => {
    test('should get category analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/categories', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.categoryBreakdown).toBeDefined();
        expect(data.analytics.topCategories).toBeDefined();
        expect(data.analytics.categoryTrends).toBeDefined();
        expect(data.analytics.averagePerCategory).toBeDefined();
        
        expect(Array.isArray(data.analytics.categoryBreakdown)).toBe(true);
        expect(Array.isArray(data.analytics.topCategories)).toBe(true);
        
        // Verify we have food as top category based on our test data
        const topCategory = data.analytics.topCategories[0];
        expect(topCategory.category).toBe('food');
        expect(topCategory.total).toBe(175); // 100 + 75
        expect(topCategory.count).toBe(2);
      });
    });

    test('should get category analytics with date filter', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/categories?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.dateRange.startDate).toBe(startDate);
        expect(data.dateRange.endDate).toBe(endDate);
        // Should only include categories from January expenses
      });
    });

    test('should get category analytics with limit', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/categories?limit=2', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.topCategories.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('GET /api/analytics/trends', () => {
    test('should get spending trends', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/trends', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.trends).toBeDefined();
        expect(data.trends.monthly).toBeDefined();
        expect(data.trends.weekly).toBeDefined();
        expect(data.trends.daily).toBeDefined();
        expect(data.trends.predictions).toBeDefined();
        
        expect(Array.isArray(data.trends.monthly)).toBe(true);
        expect(Array.isArray(data.trends.weekly)).toBe(true);
        expect(Array.isArray(data.trends.daily)).toBe(true);
        
        // Verify trend data structure
        if (data.trends.monthly.length > 0) {
          data.trends.monthly.forEach(trend => {
            expect(trend.period).toBeDefined();
            expect(trend.amount).toBeDefined();
            expect(trend.count).toBeDefined();
          });
        }
      });
    });

    test('should get trends with specific period', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/trends?period=weekly', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.trends.period).toBe('weekly');
        expect(data.trends.data).toBeDefined();
      });
    });

    test('should get trends for specific group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/trends?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.trends.groupFilter).toBe(groupId.toString());
      });
    });
  });

  describe('GET /api/analytics/users', () => {
    beforeEach(async () => {
      // Create additional users for analytics
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      // Add other user to group
      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create expense paid by other user
      await createTestExpense({
        description: 'Other User Expense',
        amount: 60,
        category: 'food',
        groupId,
        paidBy: otherUser._id,
        date: new Date('2024-01-30')
      });
    });

    test('should get user analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/users', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.totalUsers).toBeDefined();
        expect(data.analytics.activeUsers).toBeDefined();
        expect(data.analytics.userActivity).toBeDefined();
        expect(data.analytics.topSpenders).toBeDefined();
        expect(data.analytics.userGrowth).toBeDefined();
        
        expect(typeof data.analytics.totalUsers).toBe('number');
        expect(Array.isArray(data.analytics.topSpenders)).toBe(true);
        
        // Should include current user as top spender
        const currentUserSpending = data.analytics.topSpenders.find(
          user => user.userId === userId.toString()
        );
        expect(currentUserSpending).toBeDefined();
        expect(currentUserSpending.totalSpent).toBeGreaterThan(0);
      });
    });

    test('should get personal user analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/users/personal', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.userId).toBe(userId.toString());
        expect(data.analytics.totalSpent).toBeDefined();
        expect(data.analytics.totalExpenses).toBeDefined();
        expect(data.analytics.averageExpense).toBeDefined();
        expect(data.analytics.categoryPreferences).toBeDefined();
        expect(data.analytics.monthlySpending).toBeDefined();
        expect(data.analytics.groupParticipation).toBeDefined();
        
        expect(typeof data.analytics.totalSpent).toBe('number');
        expect(Array.isArray(data.analytics.categoryPreferences)).toBe(true);
      });
    });

    test('should get personal analytics with date filter', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/users/personal?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.dateRange.startDate).toBe(startDate);
        expect(data.dateRange.endDate).toBe(endDate);
      });
    });
  });

  describe('GET /api/analytics/comparisons', () => {
    test('should get comparison analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/comparisons', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.comparisons).toBeDefined();
        expect(data.comparisons.currentPeriod).toBeDefined();
        expect(data.comparisons.previousPeriod).toBeDefined();
        expect(data.comparisons.percentageChange).toBeDefined();
        expect(data.comparisons.categoryComparisons).toBeDefined();
        expect(data.comparisons.groupComparisons).toBeDefined();
        
        expect(typeof data.comparisons.percentageChange.amount).toBe('number');
        expect(typeof data.comparisons.percentageChange.count).toBe('number');
      });
    });

    test('should get comparisons with custom periods', async () => {
      const currentStart = '2024-02-01';
      const currentEnd = '2024-02-29';
      const previousStart = '2024-01-01';
      const previousEnd = '2024-01-31';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/comparisons?currentStart=${currentStart}&currentEnd=${currentEnd}&previousStart=${previousStart}&previousEnd=${previousEnd}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.comparisons.periods.current.start).toBe(currentStart);
        expect(data.comparisons.periods.current.end).toBe(currentEnd);
        expect(data.comparisons.periods.previous.start).toBe(previousStart);
        expect(data.comparisons.periods.previous.end).toBe(previousEnd);
      });
    });
  });

  describe('GET /api/analytics/export', () => {
    test('should export analytics data', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/export', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.export).toBeDefined();
        expect(data.export.format).toBeDefined();
        expect(data.export.data).toBeDefined();
        expect(data.export.generatedAt).toBeDefined();
        expect(data.export.downloadUrl).toBeDefined();
      });
    });

    test('should export analytics in CSV format', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/export?format=csv', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.export.format).toBe('csv');
        expect(data.export.downloadUrl).toContain('.csv');
      });
    });

    test('should export analytics with date filter', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/export?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.export.dateRange.startDate).toBe(startDate);
        expect(data.export.dateRange.endDate).toBe(endDate);
      });
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    test('should get dashboard analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/analytics/dashboard', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.dashboard).toBeDefined();
        expect(data.dashboard.overview).toBeDefined();
        expect(data.dashboard.recentExpenses).toBeDefined();
        expect(data.dashboard.categoryBreakdown).toBeDefined();
        expect(data.dashboard.monthlyTrend).toBeDefined();
        expect(data.dashboard.topGroups).toBeDefined();
        expect(data.dashboard.balanceSummary).toBeDefined();
        
        // Verify structure
        expect(Array.isArray(data.dashboard.recentExpenses)).toBe(true);
        expect(Array.isArray(data.dashboard.categoryBreakdown)).toBe(true);
        expect(Array.isArray(data.dashboard.topGroups)).toBe(true);
      });
    });

    test('should get dashboard with custom date range', async () => {
      const days = 30;
      const response = await makeAuthenticatedRequest(app, 'get', `/api/analytics/dashboard?days=${days}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.dashboard.period.days).toBe(days);
      });
    });
  });
});