const request = require('supertest');
const mongoose = require('mongoose');
const nock = require('nock');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup, createTestExpense, createTestFraudAnalysis } = require('../helpers/dbHelpers');
const { mockPythonServiceHealthy, mockFraudPrediction, startMockPythonService } = require('../helpers/aiServiceMock');

let app;
let authToken;
let userId;
let groupId;
let mockServer;

describe('Fraud Detection Integration Tests', () => {
  beforeAll(async () => {
    app = setupTestApp();
    mockServer = await startMockPythonService();
  });

  afterAll(async () => {
    if (mockServer) {
      mockServer.close();
    }
  });

  beforeEach(async () => {
    await clearDatabase();
    nock.cleanAll();
    
    // Create test user and get auth token
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
      role: 'admin'
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

  describe('POST /api/fraud/analyze', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        category: 'food',
        groupId,
        paidBy: userId
      });
      expenseId = expense._id;
    });

    test('should analyze expense for fraud successfully', async () => {
      mockPythonServiceHealthy();
      mockFraudPrediction(expenseId, {
        risk_score: 0.2,
        risk_level: 'low',
        indicators: {
          amount_anomaly: false,
          duplicate_check: false,
          time_anomaly: false,
          behavior_anomaly: false
        },
        predictions: {
          legitimacy: 0.95,
          category_accuracy: 0.98,
          amount_reasonableness: 0.92
        }
      });

      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/analyze', authToken)
        .send({ expenseId: expenseId.toString() })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analysis).toBeDefined();
        expect(data.analysis.expenseId).toBe(expenseId.toString());
        expect(data.analysis.analysis.riskScore).toBe(0.2);
        expect(data.analysis.analysis.riskLevel).toBe('low');
        expect(data.analysis.status).toBe('approved');
      });
    });

    test('should detect high-risk expense', async () => {
      // Create suspicious expense
      const suspiciousExpense = await createTestExpense({
        description: 'Suspicious large purchase',
        amount: 5000,
        category: 'electronics',
        groupId,
        paidBy: userId,
        date: new Date('2024-02-01T03:00:00Z') // Late night purchase
      });

      mockPythonServiceHealthy();
      mockFraudPrediction(suspiciousExpense._id, {
        risk_score: 0.85,
        risk_level: 'high',
        indicators: {
          amount_anomaly: true,
          duplicate_check: false,
          time_anomaly: true,
          behavior_anomaly: true
        },
        predictions: {
          legitimacy: 0.25,
          category_accuracy: 0.60,
          amount_reasonableness: 0.15
        }
      });

      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/analyze', authToken)
        .send({ expenseId: suspiciousExpense._id.toString() })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analysis.analysis.riskScore).toBe(0.85);
        expect(data.analysis.analysis.riskLevel).toBe('high');
        expect(data.analysis.status).toBe('flagged');
        expect(data.analysis.recommendations).toBeDefined();
        expect(data.analysis.recommendations.length).toBeGreaterThan(0);
      });
    });

    test('should not analyze without authentication', async () => {
      const response = await request(app)
        .post('/api/fraud/analyze')
        .send({ expenseId: expenseId.toString() })
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should not analyze with invalid expense ID', async () => {
      mockPythonServiceHealthy();

      const invalidId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/analyze', authToken)
        .send({ expenseId: invalidId.toString() })
        .expect(404);

      expectErrorResponse(response, 'Expense not found');
    });

    test('should handle AI service failure gracefully', async () => {
      // Mock AI service to return error
      nock('http://localhost:8001')
        .get('/health')
        .reply(200, { status: 'healthy' })
        .post('/predict/fraud')
        .reply(500, { error: 'AI service error' });

      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/analyze', authToken)
        .send({ expenseId: expenseId.toString() })
        .expect(500);

      expectErrorResponse(response, 'Fraud analysis service unavailable');
    });
  });

  describe('GET /api/fraud/analysis/:expenseId', () => {
    let expenseId;
    let analysisId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId
      });
      expenseId = expense._id;

      const analysis = await createTestFraudAnalysis({
        expenseId,
        analysis: {
          riskScore: 0.3,
          riskLevel: 'medium',
          indicators: {
            amountAnomaly: false,
            duplicateCheck: false,
            timeAnomaly: true,
            behaviorAnomaly: false
          }
        }
      });
      analysisId = analysis._id;
    });

    test('should get fraud analysis by expense ID', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/fraud/analysis/${expenseId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analysis).toBeDefined();
        expect(data.analysis.expenseId).toBe(expenseId.toString());
        expect(data.analysis.analysis.riskScore).toBe(0.3);
        expect(data.analysis.analysis.riskLevel).toBe('medium');
      });
    });

    test('should not get analysis for non-existent expense', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/fraud/analysis/${invalidId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Analysis not found');
    });
  });

  describe('GET /api/fraud/analyses', () => {
    beforeEach(async () => {
      // Create multiple expenses and analyses
      const expense1 = await createTestExpense({
        description: 'Expense 1',
        amount: 50,
        groupId,
        paidBy: userId
      });

      const expense2 = await createTestExpense({
        description: 'Expense 2',
        amount: 200,
        groupId,
        paidBy: userId
      });

      await createTestFraudAnalysis({
        expenseId: expense1._id,
        analysis: {
          riskScore: 0.1,
          riskLevel: 'low'
        },
        status: 'approved'
      });

      await createTestFraudAnalysis({
        expenseId: expense2._id,
        analysis: {
          riskScore: 0.8,
          riskLevel: 'high'
        },
        status: 'flagged'
      });
    });

    test('should get all fraud analyses', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/analyses', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analyses).toBeDefined();
        expect(data.analyses).toHaveLength(2);
        expect(data.pagination).toBeDefined();
      });
    });

    test('should filter analyses by risk level', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/analyses?riskLevel=high', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analyses).toHaveLength(1);
        expect(data.analyses[0].analysis.riskLevel).toBe('high');
      });
    });

    test('should filter analyses by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/analyses?status=flagged', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analyses).toHaveLength(1);
        expect(data.analyses[0].status).toBe('flagged');
      });
    });

    test('should paginate analyses correctly', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/analyses?page=1&limit=1', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analyses).toHaveLength(1);
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(1);
        expect(data.pagination.total).toBe(2);
      });
    });
  });

  describe('POST /api/fraud/batch-analyze', () => {
    let expenseIds;

    beforeEach(async () => {
      const expense1 = await createTestExpense({
        description: 'Expense 1',
        amount: 50,
        groupId,
        paidBy: userId
      });

      const expense2 = await createTestExpense({
        description: 'Expense 2',
        amount: 100,
        groupId,
        paidBy: userId
      });

      expenseIds = [expense1._id.toString(), expense2._id.toString()];
    });

    test('should batch analyze multiple expenses', async () => {
      mockPythonServiceHealthy();
      
      // Mock batch analysis endpoint
      nock('http://localhost:8001')
        .post('/predict/batch-fraud')
        .reply(200, {
          results: expenseIds.map((id, index) => ({
            expense_id: id,
            risk_score: 0.1 + (index * 0.1),
            risk_level: 'low',
            indicators: {
              amount_anomaly: false,
              duplicate_check: false,
              time_anomaly: false,
              behavior_anomaly: false
            },
            predictions: {
              legitimacy: 0.95 - (index * 0.05),
              category_accuracy: 0.98,
              amount_reasonableness: 0.92
            }
          }))
        });

      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/batch-analyze', authToken)
        .send({ expenseIds })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analyses).toBeDefined();
        expect(data.analyses).toHaveLength(2);
        expect(data.summary).toBeDefined();
        expect(data.summary.total).toBe(2);
        expect(data.summary.flagged).toBe(0);
        expect(data.summary.approved).toBe(2);
      });
    });

    test('should not batch analyze without expense IDs', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/batch-analyze', authToken)
        .send({})
        .expect(400);

      expectErrorResponse(response, 'Expense IDs are required');
    });

    test('should not batch analyze with too many expenses', async () => {
      const tooManyIds = Array(101).fill(new mongoose.Types.ObjectId().toString());

      const response = await makeAuthenticatedRequest(app, 'post', '/api/fraud/batch-analyze', authToken)
        .send({ expenseIds: tooManyIds })
        .expect(400);

      expectErrorResponse(response, 'Cannot analyze more than 100 expenses at once');
    });
  });

  describe('PATCH /api/fraud/analysis/:id/status', () => {
    let analysisId;

    beforeEach(async () => {
      const expense = await createTestExpense({
        description: 'Test Expense',
        amount: 100,
        groupId,
        paidBy: userId
      });

      const analysis = await createTestFraudAnalysis({
        expenseId: expense._id,
        analysis: {
          riskScore: 0.7,
          riskLevel: 'medium'
        },
        status: 'pending'
      });
      analysisId = analysis._id;
    });

    test('should update analysis status', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/fraud/analysis/${analysisId}/status`, authToken)
        .send({ status: 'approved', notes: 'Manual review completed' })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.analysis.status).toBe('approved');
        expect(data.analysis.reviewedBy).toBe(userId.toString());
        expect(data.analysis.reviewedAt).toBeDefined();
        expect(data.analysis.reviewNotes).toBe('Manual review completed');
      });
    });

    test('should not update with invalid status', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/fraud/analysis/${analysisId}/status`, authToken)
        .send({ status: 'invalid_status' })
        .expect(400);

      expectErrorResponse(response, 'Invalid status');
    });
  });

  describe('GET /api/fraud/dashboard', () => {
    beforeEach(async () => {
      // Create various analyses for dashboard
      const expense1 = await createTestExpense({
        description: 'Low risk expense',
        amount: 50,
        groupId,
        paidBy: userId
      });

      const expense2 = await createTestExpense({
        description: 'High risk expense',
        amount: 1000,
        groupId,
        paidBy: userId
      });

      await createTestFraudAnalysis({
        expenseId: expense1._id,
        analysis: {
          riskScore: 0.1,
          riskLevel: 'low'
        },
        status: 'approved'
      });

      await createTestFraudAnalysis({
        expenseId: expense2._id,
        analysis: {
          riskScore: 0.9,
          riskLevel: 'high'
        },
        status: 'flagged'
      });
    });

    test('should get fraud detection dashboard data', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/dashboard', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.dashboard).toBeDefined();
        expect(data.dashboard.summary).toBeDefined();
        expect(data.dashboard.summary.totalAnalyses).toBe(2);
        expect(data.dashboard.summary.flaggedCount).toBe(1);
        expect(data.dashboard.summary.approvedCount).toBe(1);
        expect(data.dashboard.riskDistribution).toBeDefined();
        expect(data.dashboard.recentAnalyses).toBeDefined();
      });
    });

    test('should require admin role for dashboard', async () => {
      // Create regular user
      const regularUser = await createTestUser({
        email: 'regular@example.com',
        password: 'Password123!',
        username: 'regularuser',
        role: 'user'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'regular@example.com',
          password: 'Password123!'
        });

      const regularToken = loginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/dashboard', regularToken)
        .expect(403);

      expectErrorResponse(response, 'Admin access required');
    });
  });

  describe('GET /api/fraud/health', () => {
    test('should check AI service health successfully', async () => {
      mockPythonServiceHealthy();

      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/health', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.status).toBe('healthy');
        expect(data.service).toBe('fraud-detection');
        expect(data.timestamp).toBeDefined();
      });
    });

    test('should detect unhealthy AI service', async () => {
      nock('http://localhost:8001')
        .get('/health')
        .reply(500, { status: 'error' });

      const response = await makeAuthenticatedRequest(app, 'get', '/api/fraud/health', authToken)
        .expect(503);

      expectErrorResponse(response, 'AI service unavailable');
    });
  });
});