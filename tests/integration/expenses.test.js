const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, seedDatabase, createTestUser, createTestGroup, createTestExpense } = require('../helpers/dbHelpers');
const { generateExpense } = require('../helpers/mockData');

let app;
let authToken;
let userId;
let groupId;

describe('Expenses Integration Tests', () => {
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
  });

  describe('POST /api/expenses', () => {
    test('should create expense with valid data', async () => {
      const expenseData = {
        description: 'Test Expense',
        amount: 100.50,
        currency: 'USD',
        category: 'food',
        groupId: groupId.toString(),
        splits: [
          {
            userId: userId.toString(),
            amount: 100.50,
            percentage: 100
          }
        ]
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/expenses', authToken)
        .send(expenseData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.expense).toBeDefined();
        expect(data.expense.description).toBe(expenseData.description);
        expect(data.expense.amount).toBe(expenseData.amount);
        expect(data.expense.paidBy).toBe(userId.toString());
        expect(data.expense.splits).toHaveLength(1);
      });
    });

    test('should not create expense without authentication', async () => {
      const expenseData = {
        description: 'Test Expense',
        amount: 100.50,
        currency: 'USD',
        category: 'food',
        groupId: groupId.toString()
      };

      const response = await request(app)
        .post('/api/expenses')
        .send(expenseData)
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should not create expense with invalid group', async () => {
      const expenseData = {
        description: 'Test Expense',
        amount: 100.50,
        currency: 'USD',
        category: 'food',
        groupId: new mongoose.Types.ObjectId().toString(),
        splits: [
          {
            userId: userId.toString(),
            amount: 100.50,
            percentage: 100
          }
        ]
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/expenses', authToken)
        .send(expenseData)
        .expect(404);

      expectErrorResponse(response, 'Group not found');
    });

    test('should not create expense with invalid amount', async () => {
      const expenseData = {
        description: 'Test Expense',
        amount: -50,
        currency: 'USD',
        category: 'food',
        groupId: groupId.toString(),
        splits: [
          {
            userId: userId.toString(),
            amount: -50,
            percentage: 100
          }
        ]
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/expenses', authToken)
        .send(expenseData)
        .expect(400);

      expectErrorResponse(response, 'Amount must be positive');
    });

    test('should not create expense with invalid split percentages', async () => {
      const expenseData = {
        description: 'Test Expense',
        amount: 100,
        currency: 'USD',
        category: 'food',
        groupId: groupId.toString(),
        splits: [
          {
            userId: userId.toString(),
            amount: 150,
            percentage: 150
          }
        ]
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/expenses', authToken)
        .send(expenseData)
        .expect(400);

      expectErrorResponse(response, 'Split percentages must add up to 100');
    });
  });

  describe('GET /api/expenses', () => {
    beforeEach(async () => {
      // Create some test expenses
      await createTestExpense({
        description: 'Expense 1',
        amount: 50,
        groupId,
        paidBy: userId
      });
      await createTestExpense({
        description: 'Expense 2',
        amount: 75,
        groupId,
        paidBy: userId
      });
    });

    test('should get all user expenses', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/expenses', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expenses).toBeDefined();
        expect(data.expenses).toHaveLength(2);
        expect(data.pagination).toBeDefined();
      });
    });

    test('should filter expenses by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/expenses?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expenses).toBeDefined();
        expect(data.expenses).toHaveLength(2);
        data.expenses.forEach(expense => {
          expect(expense.groupId).toBe(groupId.toString());
        });
      });
    });

    test('should filter expenses by category', async () => {
      await createTestExpense({
        description: 'Transport Expense',
        amount: 25,
        category: 'transportation',
        groupId,
        paidBy: userId
      });

      const response = await makeAuthenticatedRequest(app, 'get', '/api/expenses?category=transportation', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expenses).toBeDefined();
        expect(data.expenses).toHaveLength(1);
        expect(data.expenses[0].category).toBe('transportation');
      });
    });

    test('should paginate expenses correctly', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/expenses?page=1&limit=1', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expenses).toHaveLength(1);
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(1);
        expect(data.pagination.total).toBe(2);
      });
    });
  });

  describe('GET /api/expenses/:id', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId
      });
      expenseId = expense._id;
    });

    test('should get expense by id', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/expenses/${expenseId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expense).toBeDefined();
        expect(data.expense._id).toBe(expenseId.toString());
        expect(data.expense.description).toBe('Test Expense');
      });
    });

    test('should not get expense with invalid id', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/expenses/${invalidId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Expense not found');
    });

    test('should not get expense without access', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'get', `/api/expenses/${expenseId}`, otherToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('PUT /api/expenses/:id', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId,
        status: 'pending'
      });
      expenseId = expense._id;
    });

    test('should update expense with valid data', async () => {
      const updateData = {
        description: 'Updated Expense',
        amount: 150,
        category: 'transportation'
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/expenses/${expenseId}`, authToken)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expense.description).toBe('Updated Expense');
        expect(data.expense.amount).toBe(150);
        expect(data.expense.category).toBe('transportation');
      });
    });

    test('should not update approved expense', async () => {
      // First approve the expense
      await makeAuthenticatedRequest(app, 'patch', `/api/expenses/${expenseId}/approve`, authToken);

      const updateData = {
        description: 'Updated Expense'
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/expenses/${expenseId}`, authToken)
        .send(updateData)
        .expect(400);

      expectErrorResponse(response, 'Cannot update approved expense');
    });

    test('should not update expense paid by another user', async () => {
      // Create expense paid by another user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      // Add other user to group
      await request(app)
        .patch(`/api/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString() });

      const otherExpense = await createTestExpense({
        description: 'Other Expense',
        amount: 100,
        groupId,
        paidBy: otherUser._id
      });

      const updateData = {
        description: 'Updated Expense'
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/expenses/${otherExpense._id}`, authToken)
        .send(updateData)
        .expect(403);

      expectErrorResponse(response, 'Only expense creator can update');
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId,
        status: 'pending'
      });
      expenseId = expense._id;
    });

    test('should delete expense successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'delete', `/api/expenses/${expenseId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Expense deleted successfully');
      });

      // Verify expense is deleted
      await makeAuthenticatedRequest(app, 'get', `/api/expenses/${expenseId}`, authToken)
        .expect(404);
    });

    test('should not delete approved expense', async () => {
      // First approve the expense
      await makeAuthenticatedRequest(app, 'patch', `/api/expenses/${expenseId}/approve`, authToken);

      const response = await makeAuthenticatedRequest(app, 'delete', `/api/expenses/${expenseId}`, authToken)
        .expect(400);

      expectErrorResponse(response, 'Cannot delete approved expense');
    });
  });

  describe('PATCH /api/expenses/:id/approve', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId,
        status: 'pending'
      });
      expenseId = expense._id;
    });

    test('should approve expense successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/expenses/${expenseId}/approve`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expense.status).toBe('approved');
        expect(data.expense.approvedBy).toBe(userId.toString());
        expect(data.expense.approvedAt).toBeDefined();
      });
    });

    test('should not approve already approved expense', async () => {
      // First approve the expense
      await makeAuthenticatedRequest(app, 'patch', `/api/expenses/${expenseId}/approve`, authToken);

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/expenses/${expenseId}/approve`, authToken)
        .expect(400);

      expectErrorResponse(response, 'Expense already approved');
    });
  });

  describe('GET /api/expenses/analytics', () => {
    beforeEach(async () => {
      // Create expenses with different categories and dates
      await createTestExpense({
        description: 'Food Expense',
        amount: 50,
        category: 'food',
        groupId,
        paidBy: userId,
        date: new Date('2024-01-15')
      });
      await createTestExpense({
        description: 'Transport Expense',
        amount: 25,
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
    });

    test('should get expense analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/expenses/analytics', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.totalAmount).toBe(150);
        expect(data.analytics.totalExpenses).toBe(3);
        expect(data.analytics.categorySummary).toBeDefined();
        expect(data.analytics.categorySummary.food.total).toBe(125);
        expect(data.analytics.categorySummary.transportation.total).toBe(25);
      });
    });

    test('should filter analytics by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-18';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/expenses/analytics?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.totalExpenses).toBe(1);
        expect(data.analytics.totalAmount).toBe(50);
      });
    });

    test('should filter analytics by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/expenses/analytics?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.totalExpenses).toBe(3);
        expect(data.analytics.totalAmount).toBe(150);
      });
    });
  });
});