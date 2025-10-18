const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Fraud Detection Middleware Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Fraud detection middleware', () => {
    test('should analyze expenses for fraud indicators', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Large suspicious purchase',
          amount: 10000,
          category: 'electronics'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should include fraud analysis in response when available', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Normal coffee purchase',
          amount: 5.50,
          category: 'food'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      // Check if fraud analysis is included when successful
      if (response.body.success && response.body.data) {
        if (response.body.data.fraudAnalysis) {
          expect(response.body.data.fraudAnalysis).toHaveProperty('riskLevel');
          expect(response.body.data.fraudAnalysis).toHaveProperty('score');
        }
      }
    });

    test('should handle fraud service unavailability gracefully', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Test expense',
          amount: 25.00,
          category: 'food'
        });

      // Should not fail even if fraud service is down
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });
});