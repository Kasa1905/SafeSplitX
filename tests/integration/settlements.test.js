const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup, createTestExpense, createTestSettlement } = require('../helpers/dbHelpers');

let app;
let authToken;
let userId;
let groupId;

describe('Settlements Integration Tests', () => {
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

  describe('POST /api/settlements', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      // Add other user to group
      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create expense to generate debt
      await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId,
        splits: [
          { userId, amount: 50, percentage: 50 },
          { userId: otherUser._id, amount: 50, percentage: 50 }
        ]
      });
    });

    test('should create settlement successfully', async () => {
      const settlementData = {
        fromUserId: otherUser._id.toString(),
        toUserId: userId.toString(),
        amount: 50,
        currency: 'USD',
        groupId: groupId.toString(),
        description: 'Settling up for test expense'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements', authToken)
        .send(settlementData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.settlement).toBeDefined();
        expect(data.settlement.fromUserId).toBe(settlementData.fromUserId);
        expect(data.settlement.toUserId).toBe(settlementData.toUserId);
        expect(data.settlement.amount).toBe(settlementData.amount);
        expect(data.settlement.status).toBe('pending');
      });
    });

    test('should not create settlement without authentication', async () => {
      const settlementData = {
        fromUserId: otherUser._id.toString(),
        toUserId: userId.toString(),
        amount: 50,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await request(app)
        .post('/api/settlements')
        .send(settlementData)
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should not create settlement with invalid amount', async () => {
      const settlementData = {
        fromUserId: otherUser._id.toString(),
        toUserId: userId.toString(),
        amount: -50,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements', authToken)
        .send(settlementData)
        .expect(400);

      expectErrorResponse(response, 'Amount must be positive');
    });

    test('should not create self-settlement', async () => {
      const settlementData = {
        fromUserId: userId.toString(),
        toUserId: userId.toString(),
        amount: 50,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements', authToken)
        .send(settlementData)
        .expect(400);

      expectErrorResponse(response, 'Cannot settle with yourself');
    });

    test('should not create settlement for non-group members', async () => {
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const settlementData = {
        fromUserId: thirdUser._id.toString(),
        toUserId: userId.toString(),
        amount: 50,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements', authToken)
        .send(settlementData)
        .expect(403);

      expectErrorResponse(response, 'Users must be group members');
    });
  });

  describe('GET /api/settlements', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create test settlements
      await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending'
      });

      await createTestSettlement({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 25,
        groupId,
        status: 'approved'
      });
    });

    test('should get user settlements', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/settlements', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlements).toBeDefined();
        expect(data.settlements).toHaveLength(2);
        expect(data.pagination).toBeDefined();
      });
    });

    test('should filter settlements by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/settlements?status=pending', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlements).toHaveLength(1);
        expect(data.settlements[0].status).toBe('pending');
      });
    });

    test('should filter settlements by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlements).toHaveLength(2);
        data.settlements.forEach(settlement => {
          expect(settlement.groupId).toBe(groupId.toString());
        });
      });
    });

    test('should paginate settlements', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/settlements?page=1&limit=1', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlements).toHaveLength(1);
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(1);
        expect(data.pagination.total).toBe(2);
      });
    });
  });

  describe('GET /api/settlements/:id', () => {
    let settlementId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const settlement = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId
      });
      settlementId = settlement._id;
    });

    test('should get settlement by id', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements/${settlementId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlement).toBeDefined();
        expect(data.settlement._id).toBe(settlementId.toString());
        expect(data.settlement.amount).toBe(50);
      });
    });

    test('should not get settlement with invalid id', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements/${invalidId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Settlement not found');
    });

    test('should not get settlement without access', async () => {
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const thirdLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'third@example.com',
          password: 'Password123!'
        });

      const thirdToken = thirdLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements/${settlementId}`, thirdToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('PATCH /api/settlements/:id/approve', () => {
    let settlementId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const settlement = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending'
      });
      settlementId = settlement._id;
    });

    test('should approve settlement successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlement.status).toBe('approved');
        expect(data.settlement.approvedBy).toBe(userId.toString());
        expect(data.settlement.approvedAt).toBeDefined();
      });
    });

    test('should not approve already approved settlement', async () => {
      // First approve the settlement
      await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, authToken);

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, authToken)
        .expect(400);

      expectErrorResponse(response, 'Settlement already approved');
    });

    test('should not approve settlement by unauthorized user', async () => {
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const thirdLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'third@example.com',
          password: 'Password123!'
        });

      const thirdToken = thirdLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, thirdToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('PATCH /api/settlements/:id/reject', () => {
    let settlementId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const settlement = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending'
      });
      settlementId = settlement._id;
    });

    test('should reject settlement successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/reject`, authToken)
        .send({ reason: 'Incorrect amount' })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlement.status).toBe('rejected');
        expect(data.settlement.rejectedBy).toBe(userId.toString());
        expect(data.settlement.rejectedAt).toBeDefined();
        expect(data.settlement.rejectionReason).toBe('Incorrect amount');
      });
    });

    test('should not reject approved settlement', async () => {
      // First approve the settlement
      await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, authToken);

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/reject`, authToken)
        .send({ reason: 'Testing' })
        .expect(400);

      expectErrorResponse(response, 'Cannot reject approved settlement');
    });
  });

  describe('PUT /api/settlements/:id', () => {
    let settlementId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const settlement = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending',
        createdBy: userId
      });
      settlementId = settlement._id;
    });

    test('should update settlement successfully', async () => {
      const updateData = {
        amount: 75,
        description: 'Updated settlement description'
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/settlements/${settlementId}`, authToken)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.settlement.amount).toBe(75);
        expect(data.settlement.description).toBe('Updated settlement description');
      });
    });

    test('should not update approved settlement', async () => {
      // First approve the settlement
      await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, authToken);

      const updateData = {
        amount: 75
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/settlements/${settlementId}`, authToken)
        .send(updateData)
        .expect(400);

      expectErrorResponse(response, 'Cannot update approved settlement');
    });

    test('should not update settlement by unauthorized user', async () => {
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const thirdLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'third@example.com',
          password: 'Password123!'
        });

      const thirdToken = thirdLoginResponse.body.data.token;

      const updateData = {
        amount: 75
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/settlements/${settlementId}`, thirdToken)
        .send(updateData)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('DELETE /api/settlements/:id', () => {
    let settlementId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const settlement = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending',
        createdBy: userId
      });
      settlementId = settlement._id;
    });

    test('should delete settlement successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'delete', `/api/settlements/${settlementId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Settlement deleted successfully');
      });

      // Verify settlement is deleted
      await makeAuthenticatedRequest(app, 'get', `/api/settlements/${settlementId}`, authToken)
        .expect(404);
    });

    test('should not delete approved settlement', async () => {
      // First approve the settlement
      await makeAuthenticatedRequest(app, 'patch', `/api/settlements/${settlementId}/approve`, authToken);

      const response = await makeAuthenticatedRequest(app, 'delete', `/api/settlements/${settlementId}`, authToken)
        .expect(400);

      expectErrorResponse(response, 'Cannot delete approved settlement');
    });
  });

  describe('GET /api/settlements/suggest', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create expenses to generate balances
      await createTestExpense({
        description: 'Expense 1',
        amount: 100,
        groupId,
        paidBy: userId,
        splits: [
          { userId, amount: 50, percentage: 50 },
          { userId: otherUser._id, amount: 50, percentage: 50 }
        ]
      });

      await createTestExpense({
        description: 'Expense 2',
        amount: 60,
        groupId,
        paidBy: otherUser._id,
        splits: [
          { userId, amount: 30, percentage: 50 },
          { userId: otherUser._id, amount: 30, percentage: 50 }
        ]
      });
    });

    test('should suggest settlements for group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements/suggest?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.suggestions).toBeDefined();
        expect(Array.isArray(data.suggestions)).toBe(true);
        expect(data.summary).toBeDefined();
      });
    });

    test('should suggest settlements for user', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/settlements/suggest', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.suggestions).toBeDefined();
        expect(Array.isArray(data.suggestions)).toBe(true);
      });
    });
  });

  describe('POST /api/settlements/batch-approve', () => {
    let settlementIds;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const settlement1 = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending'
      });

      const settlement2 = await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 25,
        groupId,
        status: 'pending'
      });

      settlementIds = [settlement1._id.toString(), settlement2._id.toString()];
    });

    test('should batch approve settlements', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements/batch-approve', authToken)
        .send({ settlementIds })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.results).toBeDefined();
        expect(data.results).toHaveLength(2);
        expect(data.summary.approved).toBe(2);
        expect(data.summary.failed).toBe(0);
      });
    });

    test('should not batch approve without settlement IDs', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements/batch-approve', authToken)
        .send({})
        .expect(400);

      expectErrorResponse(response, 'Settlement IDs are required');
    });

    test('should not batch approve too many settlements', async () => {
      const tooManyIds = Array(51).fill(new mongoose.Types.ObjectId().toString());

      const response = await makeAuthenticatedRequest(app, 'post', '/api/settlements/batch-approve', authToken)
        .send({ settlementIds: tooManyIds })
        .expect(400);

      expectErrorResponse(response, 'Cannot approve more than 50 settlements at once');
    });
  });

  describe('GET /api/settlements/analytics', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create settlements with different statuses and dates
      await createTestSettlement({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 100,
        groupId,
        status: 'approved',
        approvedAt: new Date('2024-01-15')
      });

      await createTestSettlement({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId,
        status: 'pending'
      });
    });

    test('should get settlement analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/settlements/analytics', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.totalAmount).toBeDefined();
        expect(data.analytics.totalSettlements).toBe(2);
        expect(data.analytics.statusSummary).toBeDefined();
        expect(data.analytics.statusSummary.approved).toBe(1);
        expect(data.analytics.statusSummary.pending).toBe(1);
      });
    });

    test('should filter analytics by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-20';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements/analytics?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
      });
    });

    test('should filter analytics by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/settlements/analytics?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.totalSettlements).toBe(2);
      });
    });
  });
});