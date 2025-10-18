const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Analytics API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('GET /api/analytics/overview', () => {
    test('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .expect(401);

      expectErrorResponse(response);
    });

    test('should return valid JSON response structure', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });

  describe('GET /api/analytics/expenses', () => {
    test('should return valid JSON response structure', async () => {
      const response = await request(app)
        .get('/api/analytics/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .query({ period: '30d' });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });
});