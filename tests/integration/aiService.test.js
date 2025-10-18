const request = require('supertest');
const nock = require('nock');
const { setupTestApp, expectErrorResponse } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup, createTestExpense } = require('../helpers/dbHelpers');
const { startMockAIServer, stopMockAIServer } = require('../helpers/aiServiceMocks');

let app;
let authToken;
let user;
let group;

describe('AI Service Integration Tests', () => {
  beforeAll(async () => {
    app = setupTestApp();
    await startMockAIServer();
  });

  afterAll(async () => {
    await stopMockAIServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    user = await createTestUser({
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser'
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    authToken = loginResponse.body.data.token;

    group = await createTestGroup({
      name: 'Test Group',
      adminId: user._id,
      members: [user._id],
      currency: 'USD'
    });

    // Clear any existing nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Health Check Integration', () => {
    test('should verify AI service is available', async () => {
      // Mock AI service health check
      nock('http://localhost:8000')
        .get('/health')
        .reply(200, {
          status: 'healthy',
          version: '1.0.0',
          models_loaded: ['fraud_detection', 'expense_categorization'],
          gpu_available: false,
          memory_usage: '2.1GB'
        });

      const response = await request(app)
        .get('/api/fraud/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ai_service');
      expect(response.body.data.ai_service.status).toBe('healthy');
      expect(response.body.data.ai_service.models_loaded).toContain('fraud_detection');
    });

    test('should handle AI service unavailability', async () => {
      // Mock AI service being down
      nock('http://localhost:8000')
        .get('/health')
        .replyWithError('ECONNREFUSED');

      const response = await request(app)
        .get('/api/fraud/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      expectErrorResponse(response, 'AI service unavailable');
      expect(response.body.details).toHaveProperty('ai_service', 'down');
    });

    test('should handle AI service timeout', async () => {
      // Mock AI service timeout
      nock('http://localhost:8000')
        .get('/health')
        .delay(6000) // Longer than timeout
        .reply(200, { status: 'healthy' });

      const response = await request(app)
        .get('/api/fraud/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      expectErrorResponse(response, 'AI service timeout');
    }, 10000);
  });

  describe('Fraud Detection Integration', () => {
    let expense;

    beforeEach(async () => {
      expense = await createTestExpense({
        description: 'Suspicious large purchase',
        amount: 5000,
        category: 'electronics',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id]
      });
    });

    test('should analyze expense for fraud indicators', async () => {
      // Mock AI service fraud detection
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(200, {
          expense_id: expense._id.toString(),
          risk_score: 0.75,
          risk_level: 'high',
          indicators: [
            {
              type: 'amount_anomaly',
              description: 'Amount significantly higher than user average',
              severity: 'high',
              confidence: 0.85
            },
            {
              type: 'category_mismatch',
              description: 'Category unusual for this user',
              severity: 'medium',
              confidence: 0.65
            }
          ],
          predictions: {
            is_legitimate: 0.25,
            category_accuracy: 0.45,
            amount_reasonable: 0.15
          },
          recommendations: [
            'Request additional verification',
            'Flag for manual review',
            'Check for receipt validation'
          ],
          model_version: '2.1.0'
        });

      const response = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('risk_score', 0.75);
      expect(response.body.data).toHaveProperty('risk_level', 'high');
      expect(response.body.data.indicators).toHaveLength(2);
      expect(response.body.data.recommendations).toContain('Request additional verification');
    });

    test('should handle batch fraud analysis', async () => {
      const expense2 = await createTestExpense({
        description: 'Regular lunch',
        amount: 25,
        category: 'food',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id]
      });

      // Mock batch analysis response
      nock('http://localhost:8000')
        .post('/analyze-batch')
        .reply(200, {
          analyses: [
            {
              expense_id: expense._id.toString(),
              risk_score: 0.75,
              risk_level: 'high',
              processing_time: 0.234
            },
            {
              expense_id: expense2._id.toString(),
              risk_score: 0.05,
              risk_level: 'low',
              processing_time: 0.123
            }
          ],
          total_processed: 2,
          average_processing_time: 0.178,
          batch_id: 'batch_123'
        });

      const response = await request(app)
        .post('/api/fraud/analyze-batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          expense_ids: [expense._id, expense2._id]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analyses).toHaveLength(2);
      expect(response.body.data.total_processed).toBe(2);
      expect(response.body.data).toHaveProperty('batch_id');
    });

    test('should handle AI service analysis errors', async () => {
      // Mock AI service error
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(500, {
          error: 'Model inference failed',
          details: 'GPU memory exhausted'
        });

      const response = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expectErrorResponse(response, 'AI analysis failed');
      expect(response.body.details).toHaveProperty('ai_error');
    });

    test('should validate expense data before sending to AI', async () => {
      const response = await request(app)
        .post('/api/fraud/analyze/invalid-expense-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expectErrorResponse(response, 'Invalid expense ID');
    });

    test('should handle AI service model validation', async () => {
      // Mock AI service with missing model
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(503, {
          error: 'Model not available',
          details: 'fraud_detection model not loaded'
        });

      const response = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      expectErrorResponse(response, 'Fraud detection model unavailable');
    });
  });

  describe('Expense Categorization Integration', () => {
    test('should get category predictions for expense', async () => {
      // Mock AI categorization service
      nock('http://localhost:8000')
        .post('/categorize-expense')
        .reply(200, {
          description: 'Uber ride to airport',
          predicted_categories: [
            {
              category: 'transportation',
              confidence: 0.92,
              subcategory: 'rideshare'
            },
            {
              category: 'travel',
              confidence: 0.78,
              subcategory: 'ground_transport'
            },
            {
              category: 'business',
              confidence: 0.23,
              subcategory: 'client_meeting'
            }
          ],
          suggested_tags: ['uber', 'airport', 'travel', 'transportation'],
          amount_category_match: 0.85,
          model_version: '1.3.0'
        });

      const response = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Uber ride to airport',
          amount: 35.50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.predicted_categories).toHaveLength(3);
      expect(response.body.data.predicted_categories[0].category).toBe('transportation');
      expect(response.body.data.predicted_categories[0].confidence).toBe(0.92);
      expect(response.body.data.suggested_tags).toContain('transportation');
    });

    test('should handle bulk categorization', async () => {
      // Mock bulk categorization
      nock('http://localhost:8000')
        .post('/categorize-batch')
        .reply(200, {
          categorizations: [
            {
              description: 'Starbucks coffee',
              predicted_category: 'food',
              confidence: 0.89,
              subcategory: 'beverages'
            },
            {
              description: 'Gas station fill-up',
              predicted_category: 'transportation',
              confidence: 0.94,
              subcategory: 'fuel'
            }
          ],
          total_processed: 2,
          average_confidence: 0.915
        });

      const response = await request(app)
        .post('/api/ai/categorize-batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          expenses: [
            { description: 'Starbucks coffee', amount: 5.75 },
            { description: 'Gas station fill-up', amount: 45.20 }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categorizations).toHaveLength(2);
      expect(response.body.data.average_confidence).toBe(0.915);
    });
  });

  describe('Spending Pattern Analysis', () => {
    test('should analyze user spending patterns', async () => {
      // Create multiple expenses for pattern analysis
      await createTestExpense({
        description: 'Grocery shopping',
        amount: 85.50,
        category: 'food',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id],
        date: new Date('2024-01-15')
      });

      await createTestExpense({
        description: 'Gas station',
        amount: 45.20,
        category: 'transportation',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id],
        date: new Date('2024-01-20')
      });

      // Mock pattern analysis
      nock('http://localhost:8000')
        .post('/analyze-patterns')
        .reply(200, {
          user_id: user._id.toString(),
          analysis_period: '30_days',
          patterns: {
            spending_frequency: {
              daily_average: 2.3,
              weekly_average: 16.1,
              monthly_trend: 'increasing'
            },
            category_distribution: {
              food: 0.45,
              transportation: 0.25,
              entertainment: 0.15,
              utilities: 0.10,
              other: 0.05
            },
            amount_patterns: {
              average_expense: 42.50,
              median_expense: 35.00,
              most_common_range: '20-50',
              outlier_threshold: 150.00
            },
            temporal_patterns: {
              peak_day: 'friday',
              peak_hour: 18,
              weekend_vs_weekday_ratio: 1.2
            }
          },
          anomalies: [
            {
              type: 'amount_spike',
              description: 'Expense 3x higher than average',
              expense_id: 'expense_123',
              severity: 'medium'
            }
          ],
          predictions: {
            next_month_spending: 1250.75,
            budget_adherence_probability: 0.78,
            category_shifts: ['increase_in_transportation']
          },
          confidence_score: 0.82
        });

      const response = await request(app)
        .post('/api/ai/analyze-patterns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: '30_days',
          include_predictions: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patterns).toHaveProperty('spending_frequency');
      expect(response.body.data.patterns).toHaveProperty('category_distribution');
      expect(response.body.data.predictions).toHaveProperty('next_month_spending');
      expect(response.body.data.confidence_score).toBe(0.82);
    });

    test('should detect spending anomalies', async () => {
      // Mock anomaly detection
      nock('http://localhost:8000')
        .post('/detect-anomalies')
        .reply(200, {
          user_id: user._id.toString(),
          anomalies: [
            {
              type: 'unusual_amount',
              expense_id: 'expense_456',
              description: 'Amount significantly higher than normal',
              severity: 'high',
              anomaly_score: 0.89,
              expected_range: [20, 80],
              actual_amount: 350
            },
            {
              type: 'unusual_timing',
              expense_id: 'expense_789',
              description: 'Transaction at unusual time',
              severity: 'low',
              anomaly_score: 0.32,
              typical_time_range: '09:00-18:00',
              actual_time: '03:15'
            }
          ],
          total_expenses_analyzed: 45,
          anomaly_rate: 0.044,
          risk_assessment: 'medium'
        });

      const response = await request(app)
        .post('/api/ai/detect-anomalies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          analysis_period: '90_days',
          sensitivity: 'medium'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.anomalies).toHaveLength(2);
      expect(response.body.data.anomalies[0].severity).toBe('high');
      expect(response.body.data.risk_assessment).toBe('medium');
    });
  });

  describe('Model Performance Monitoring', () => {
    test('should retrieve model metrics', async () => {
      // Mock model metrics endpoint
      nock('http://localhost:8000')
        .get('/metrics')
        .reply(200, {
          models: {
            fraud_detection: {
              version: '2.1.0',
              accuracy: 0.94,
              precision: 0.91,
              recall: 0.89,
              f1_score: 0.90,
              last_retrained: '2024-01-15T10:30:00Z',
              total_predictions: 15420,
              error_rate: 0.012
            },
            expense_categorization: {
              version: '1.3.0',
              accuracy: 0.87,
              top_3_accuracy: 0.96,
              category_coverage: 0.92,
              last_retrained: '2024-01-10T14:20:00Z',
              total_predictions: 23750,
              error_rate: 0.008
            }
          },
          system_metrics: {
            average_response_time: 0.145,
            requests_per_minute: 45.2,
            memory_usage: '2.1GB',
            cpu_usage: 0.35,
            gpu_usage: 0.67
          }
        });

      const response = await request(app)
        .get('/api/ai/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.models).toHaveProperty('fraud_detection');
      expect(response.body.data.models).toHaveProperty('expense_categorization');
      expect(response.body.data.models.fraud_detection.accuracy).toBe(0.94);
      expect(response.body.data.system_metrics).toHaveProperty('average_response_time');
    });

    test('should handle model retraining status', async () => {
      // Mock retraining status
      nock('http://localhost:8000')
        .get('/retrain-status')
        .reply(200, {
          fraud_detection: {
            status: 'training',
            progress: 0.65,
            estimated_completion: '2024-01-20T16:00:00Z',
            new_data_samples: 1250,
            validation_accuracy: 0.92
          },
          expense_categorization: {
            status: 'completed',
            completion_time: '2024-01-18T12:30:00Z',
            improvement: 0.03,
            deployed: true
          }
        });

      const response = await request(app)
        .get('/api/ai/retrain-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fraud_detection.status).toBe('training');
      expect(response.body.data.fraud_detection.progress).toBe(0.65);
      expect(response.body.data.expense_categorization.status).toBe('completed');
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    test('should fallback to rule-based analysis when AI fails', async () => {
      const expense = await createTestExpense({
        description: 'Large electronics purchase',
        amount: 2500,
        category: 'electronics',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id]
      });

      // Mock AI service failure
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .replyWithError('Service temporarily unavailable');

      const response = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis_method', 'rule_based');
      expect(response.body.data).toHaveProperty('risk_score');
      expect(response.body.data.fallback_reason).toBe('AI service unavailable');
    });

    test('should cache AI responses for resilience', async () => {
      const expense = await createTestExpense({
        description: 'Coffee shop',
        amount: 5.50,
        category: 'food',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id]
      });

      // First request - mock AI response
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(200, {
          expense_id: expense._id.toString(),
          risk_score: 0.05,
          risk_level: 'low',
          cached: false
        });

      const firstResponse = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstResponse.body.data.cached).toBe(false);

      // Second request - should use cache (no nock needed)
      const secondResponse = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondResponse.body.data.cached).toBe(true);
      expect(secondResponse.body.data.risk_score).toBe(0.05);
    });

    test('should handle partial AI service degradation', async () => {
      // Mock one service working, another failing
      nock('http://localhost:8000')
        .post('/categorize-expense')
        .reply(200, {
          predicted_categories: [{
            category: 'food',
            confidence: 0.89
          }]
        });

      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(503, { error: 'Fraud detection model unavailable' });

      const response = await request(app)
        .post('/api/ai/full-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Restaurant dinner',
          amount: 75.50
        })
        .expect(206); // Partial content

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categorization');
      expect(response.body.data).toHaveProperty('fraud_analysis');
      expect(response.body.data.fraud_analysis.status).toBe('failed');
      expect(response.body.data.categorization.status).toBe('success');
    });
  });

  describe('Rate Limiting with AI Service', () => {
    test('should respect AI service rate limits', async () => {
      // Mock rate limit response
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(429, {
          error: 'Rate limit exceeded',
          retry_after: 60,
          limit: 100,
          window: '1h'
        });

      const expense = await createTestExpense({
        description: 'Test expense',
        amount: 25,
        category: 'food',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id]
      });

      const response = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(429);

      expectErrorResponse(response, 'AI service rate limit exceeded');
      expect(response.headers['retry-after']).toBe('60');
    });

    test('should queue requests when AI service is rate limited', async () => {
      // Mock successful response after rate limit
      nock('http://localhost:8000')
        .post('/analyze-expense')
        .reply(200, {
          expense_id: 'test',
          risk_score: 0.1,
          queued: true,
          queue_position: 5
        });

      const expense = await createTestExpense({
        description: 'Test expense',
        amount: 25,
        category: 'food',
        groupId: group._id,
        paidBy: user._id,
        splitAmong: [user._id]
      });

      const response = await request(app)
        .post(`/api/fraud/analyze/${expense._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ queue: 'true' })
        .expect(202); // Accepted

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queued', true);
      expect(response.body.data).toHaveProperty('queue_position', 5);
    });
  });
});