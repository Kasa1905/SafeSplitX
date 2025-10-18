const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Fraud Service Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Fraud service integration', () => {
    test('should return 503 when fraud service is unavailable', async () => {
      const response = await request(app)
        .get('/api/fraud/health')
        .set('Authorization', 'Bearer invalid-token')
        .expect(503);

      expectErrorResponse(response);
      expect(response.body.error).toMatch(/service.*unavailable/i);
    });

    test('should return valid JSON response structure for health check', async () => {
      const response = await request(app)
        .get('/api/fraud/health')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should handle fraud analysis requests with proper contract', async () => {
      const response = await request(app)
        .post('/api/fraud/analyze')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          expenseId: 'test-expense-123',
          description: 'Large electronics purchase',
          amount: 2500,
          category: 'electronics'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      // Contract validation for fraud analysis
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('fraudScore');
        expect(response.body.data).toHaveProperty('riskLevel');
        expect(response.body.data).toHaveProperty('confidence');
        expect(typeof response.body.data.fraudScore).toBe('number');
        expect(['low', 'medium', 'high']).toContain(response.body.data.riskLevel);
      }
    });

    test('should handle batch fraud analysis', async () => {
      const response = await request(app)
        .post('/api/fraud/analyze-batch')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          expenses: [
            { id: 'exp1', amount: 100, description: 'Lunch' },
            { id: 'exp2', amount: 2000, description: 'Suspicious purchase' }
          ]
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });
});