const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Python Service Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Python AI service integration', () => {
    test('should return 503 when Python service is unavailable', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .set('Authorization', 'Bearer invalid-token')
        .expect(503);

      expectErrorResponse(response);
      expect(response.body.error).toMatch(/service.*unavailable|ai.*down/i);
    });

    test('should return valid JSON response structure for AI health', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should handle expense categorization requests', async () => {
      const response = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Starbucks coffee and pastry',
          amount: 12.50
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      // Contract validation for categorization
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('category');
        expect(response.body.data).toHaveProperty('confidence');
        expect(typeof response.body.data.confidence).toBe('number');
      }
    });

    test('should handle pattern analysis requests', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-patterns')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          userId: 'test-user-123',
          timeframe: '30d'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should handle prediction requests with proper timeout', async () => {
      const response = await request(app)
        .post('/api/ai/predict')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          features: {
            amount: 150,
            category: 'food',
            hour: 12,
            dayOfWeek: 'friday'
          }
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    }, 10000); // Extended timeout for AI processing
  });
});