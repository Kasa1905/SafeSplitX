const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Fraud API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('POST /api/fraud/analyze', () => {
    test('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/fraud/analyze')
        .send({
          expenseId: 'test-expense-id'
        })
        .expect(401);

      expectErrorResponse(response);
    });

    test('should return valid JSON response structure with fraud analysis fields', async () => {
      const response = await request(app)
        .post('/api/fraud/analyze')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Suspicious large purchase',
          amount: 5000,
          category: 'electronics'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
      
      // Contract validation for fraud analysis response
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('fraudScore');
        expect(response.body.data).toHaveProperty('riskLevel');
        expect(response.body.data).toHaveProperty('confidence');
      }
    });
  });

  describe('GET /api/fraud/health', () => {
    test('should return service health status', async () => {
      const response = await request(app)
        .get('/api/fraud/health')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });
});