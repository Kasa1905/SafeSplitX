const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup, createTestExpense, createTestPayment } = require('../helpers/dbHelpers');

let app;
let authToken;
let userId;
let groupId;

describe('Payments Integration Tests', () => {
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

  describe('POST /api/payments', () => {
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
    });

    test('should create payment successfully', async () => {
      const paymentData = {
        fromUserId: userId.toString(),
        toUserId: otherUser._id.toString(),
        amount: 50.00,
        currency: 'USD',
        groupId: groupId.toString(),
        description: 'Payment for shared expense',
        method: 'bank_transfer'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments', authToken)
        .send(paymentData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.payment).toBeDefined();
        expect(data.payment.fromUserId).toBe(paymentData.fromUserId);
        expect(data.payment.toUserId).toBe(paymentData.toUserId);
        expect(data.payment.amount).toBe(paymentData.amount);
        expect(data.payment.currency).toBe(paymentData.currency);
        expect(data.payment.status).toBe('pending');
        expect(data.payment.method).toBe(paymentData.method);
      });
    });

    test('should not create payment without authentication', async () => {
      const paymentData = {
        fromUserId: userId.toString(),
        toUserId: otherUser._id.toString(),
        amount: 50.00,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await request(app)
        .post('/api/payments')
        .send(paymentData)
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should not create payment with invalid amount', async () => {
      const paymentData = {
        fromUserId: userId.toString(),
        toUserId: otherUser._id.toString(),
        amount: -50.00,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments', authToken)
        .send(paymentData)
        .expect(400);

      expectErrorResponse(response, 'Amount must be positive');
    });

    test('should not create self-payment', async () => {
      const paymentData = {
        fromUserId: userId.toString(),
        toUserId: userId.toString(),
        amount: 50.00,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments', authToken)
        .send(paymentData)
        .expect(400);

      expectErrorResponse(response, 'Cannot pay yourself');
    });

    test('should not create payment for non-group members', async () => {
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const paymentData = {
        fromUserId: userId.toString(),
        toUserId: thirdUser._id.toString(),
        amount: 50.00,
        currency: 'USD',
        groupId: groupId.toString()
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments', authToken)
        .send(paymentData)
        .expect(403);

      expectErrorResponse(response, 'Users must be group members');
    });

    test('should create payment with valid payment method', async () => {
      const paymentData = {
        fromUserId: userId.toString(),
        toUserId: otherUser._id.toString(),
        amount: 50.00,
        currency: 'USD',
        groupId: groupId.toString(),
        method: 'paypal',
        methodDetails: {
          paypalEmail: 'test@paypal.com'
        }
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments', authToken)
        .send(paymentData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.payment.method).toBe('paypal');
        expect(data.payment.methodDetails.paypalEmail).toBe('test@paypal.com');
      });
    });
  });

  describe('GET /api/payments', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create test payments
      await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId,
        status: 'pending'
      });

      await createTestPayment({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 25,
        groupId,
        status: 'completed'
      });
    });

    test('should get user payments', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payments).toBeDefined();
        expect(data.payments).toHaveLength(2);
        expect(data.pagination).toBeDefined();
      });
    });

    test('should filter payments by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments?status=pending', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payments).toHaveLength(1);
        expect(data.payments[0].status).toBe('pending');
      });
    });

    test('should filter payments by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/payments?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payments).toHaveLength(2);
        data.payments.forEach(payment => {
          expect(payment.groupId).toBe(groupId.toString());
        });
      });
    });

    test('should filter payments by direction', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments?direction=sent', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payments).toHaveLength(1);
        expect(data.payments[0].fromUserId).toBe(userId.toString());
      });
    });

    test('should paginate payments correctly', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments?page=1&limit=1', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payments).toHaveLength(1);
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(1);
        expect(data.pagination.total).toBe(2);
      });
    });
  });

  describe('GET /api/payments/:id', () => {
    let paymentId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const payment = await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId
      });
      paymentId = payment._id;
    });

    test('should get payment by id', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/payments/${paymentId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payment).toBeDefined();
        expect(data.payment._id).toBe(paymentId.toString());
        expect(data.payment.amount).toBe(50);
      });
    });

    test('should not get payment with invalid id', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/payments/${invalidId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Payment not found');
    });

    test('should not get payment without access', async () => {
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

      const response = await makeAuthenticatedRequest(app, 'get', `/api/payments/${paymentId}`, thirdToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('PATCH /api/payments/:id/confirm', () => {
    let paymentId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const payment = await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId,
        status: 'pending'
      });
      paymentId = payment._id;
    });

    test('should confirm payment successfully', async () => {
      // Login as the recipient to confirm payment
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, otherToken)
        .send({ confirmationNotes: 'Payment received successfully' })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payment.status).toBe('completed');
        expect(data.payment.confirmedBy).toBe(otherUser._id.toString());
        expect(data.payment.confirmedAt).toBeDefined();
        expect(data.payment.confirmationNotes).toBe('Payment received successfully');
      });
    });

    test('should not confirm already completed payment', async () => {
      // First confirm the payment
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, otherToken);

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, otherToken)
        .expect(400);

      expectErrorResponse(response, 'Payment already confirmed');
    });

    test('should not confirm payment by unauthorized user', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, authToken)
        .expect(403);

      expectErrorResponse(response, 'Only payment recipient can confirm');
    });
  });

  describe('PATCH /api/payments/:id/cancel', () => {
    let paymentId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const payment = await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId,
        status: 'pending'
      });
      paymentId = payment._id;
    });

    test('should cancel payment successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/cancel`, authToken)
        .send({ reason: 'Payment no longer needed' })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payment.status).toBe('cancelled');
        expect(data.payment.cancelledBy).toBe(userId.toString());
        expect(data.payment.cancelledAt).toBeDefined();
        expect(data.payment.cancellationReason).toBe('Payment no longer needed');
      });
    });

    test('should not cancel completed payment', async () => {
      // First complete the payment
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;
      await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, otherToken);

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/cancel`, authToken)
        .send({ reason: 'Test' })
        .expect(400);

      expectErrorResponse(response, 'Cannot cancel completed payment');
    });

    test('should allow recipient to cancel payment', async () => {
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/cancel`, otherToken)
        .send({ reason: 'Cancelled by recipient' })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payment.status).toBe('cancelled');
        expect(data.payment.cancelledBy).toBe(otherUser._id.toString());
      });
    });
  });

  describe('PUT /api/payments/:id', () => {
    let paymentId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const payment = await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId,
        status: 'pending'
      });
      paymentId = payment._id;
    });

    test('should update payment successfully', async () => {
      const updateData = {
        amount: 75,
        description: 'Updated payment description',
        method: 'venmo',
        methodDetails: {
          venmoUsername: '@testuser'
        }
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/payments/${paymentId}`, authToken)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.payment.amount).toBe(75);
        expect(data.payment.description).toBe('Updated payment description');
        expect(data.payment.method).toBe('venmo');
        expect(data.payment.methodDetails.venmoUsername).toBe('@testuser');
      });
    });

    test('should not update completed payment', async () => {
      // First complete the payment
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;
      await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, otherToken);

      const updateData = {
        amount: 75
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/payments/${paymentId}`, authToken)
        .send(updateData)
        .expect(400);

      expectErrorResponse(response, 'Cannot update completed payment');
    });

    test('should not update payment by unauthorized user', async () => {
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

      const response = await makeAuthenticatedRequest(app, 'put', `/api/payments/${paymentId}`, thirdToken)
        .send(updateData)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('GET /api/payments/methods', () => {
    test('should get available payment methods', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments/methods', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.methods).toBeDefined();
        expect(Array.isArray(data.methods)).toBe(true);
        expect(data.methods.length).toBeGreaterThan(0);
        
        // Check that common payment methods are included
        const methodIds = data.methods.map(m => m.id);
        expect(methodIds).toContain('bank_transfer');
        expect(methodIds).toContain('paypal');
        expect(methodIds).toContain('venmo');
        
        // Check structure of payment method objects
        data.methods.forEach(method => {
          expect(method.id).toBeDefined();
          expect(method.name).toBeDefined();
          expect(method.description).toBeDefined();
          expect(method.enabled).toBeDefined();
        });
      });
    });
  });

  describe('GET /api/payments/analytics', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Create payments with different statuses and dates
      await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 100,
        groupId,
        status: 'completed',
        confirmedAt: new Date('2024-01-15')
      });

      await createTestPayment({
        fromUserId: otherUser._id,
        toUserId: userId,
        amount: 50,
        groupId,
        status: 'pending'
      });
    });

    test('should get payment analytics', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments/analytics', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
        expect(data.analytics.totalAmount).toBeDefined();
        expect(data.analytics.totalPayments).toBe(2);
        expect(data.analytics.statusSummary).toBeDefined();
        expect(data.analytics.statusSummary.completed).toBe(1);
        expect(data.analytics.statusSummary.pending).toBe(1);
        expect(data.analytics.methodBreakdown).toBeDefined();
      });
    });

    test('should filter analytics by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-20';

      const response = await makeAuthenticatedRequest(app, 'get', `/api/payments/analytics?startDate=${startDate}&endDate=${endDate}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics).toBeDefined();
      });
    });

    test('should filter analytics by group', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/payments/analytics?groupId=${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analytics.totalPayments).toBe(2);
      });
    });
  });

  describe('POST /api/payments/batch', () => {
    let otherUser1, otherUser2;

    beforeEach(async () => {
      otherUser1 = await createTestUser({
        email: 'other1@example.com',
        password: 'Password123!',
        username: 'otheruser1'
      });

      otherUser2 = await createTestUser({
        email: 'other2@example.com',
        password: 'Password123!',
        username: 'otheruser2'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser1._id.toString() });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser2._id.toString() });
    });

    test('should create batch payments successfully', async () => {
      const batchData = {
        payments: [
          {
            toUserId: otherUser1._id.toString(),
            amount: 50,
            currency: 'USD',
            groupId: groupId.toString(),
            description: 'Payment 1'
          },
          {
            toUserId: otherUser2._id.toString(),
            amount: 75,
            currency: 'USD',
            groupId: groupId.toString(),
            description: 'Payment 2'
          }
        ]
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments/batch', authToken)
        .send(batchData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.payments).toBeDefined();
        expect(data.payments).toHaveLength(2);
        expect(data.summary.total).toBe(2);
        expect(data.summary.successful).toBe(2);
        expect(data.summary.failed).toBe(0);
      });
    });

    test('should not create batch payments without payment data', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments/batch', authToken)
        .send({})
        .expect(400);

      expectErrorResponse(response, 'Payments array is required');
    });

    test('should not create too many batch payments', async () => {
      const tooManyPayments = Array(51).fill({
        toUserId: otherUser1._id.toString(),
        amount: 50,
        currency: 'USD',
        groupId: groupId.toString()
      });

      const response = await makeAuthenticatedRequest(app, 'post', '/api/payments/batch', authToken)
        .send({ payments: tooManyPayments })
        .expect(400);

      expectErrorResponse(response, 'Cannot create more than 50 payments at once');
    });
  });

  describe('GET /api/payments/reminders', () => {
    test('should get payment reminders', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/payments/reminders', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.reminders).toBeDefined();
        expect(Array.isArray(data.reminders)).toBe(true);
      });
    });
  });

  describe('POST /api/payments/:id/remind', () => {
    let paymentId;
    let otherUser;

    beforeEach(async () => {
      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      const payment = await createTestPayment({
        fromUserId: userId,
        toUserId: otherUser._id,
        amount: 50,
        groupId,
        status: 'pending'
      });
      paymentId = payment._id;
    });

    test('should send payment reminder successfully', async () => {
      const reminderData = {
        message: 'Friendly reminder about your pending payment'
      };

      const response = await makeAuthenticatedRequest(app, 'post', `/api/payments/${paymentId}/remind`, authToken)
        .send(reminderData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Reminder sent successfully');
        expect(data.reminderSent).toBe(true);
      });
    });

    test('should not remind for completed payment', async () => {
      // First complete the payment
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;
      await makeAuthenticatedRequest(app, 'patch', `/api/payments/${paymentId}/confirm`, otherToken);

      const response = await makeAuthenticatedRequest(app, 'post', `/api/payments/${paymentId}/remind`, authToken)
        .expect(400);

      expectErrorResponse(response, 'Cannot remind for completed payment');
    });
  });
});