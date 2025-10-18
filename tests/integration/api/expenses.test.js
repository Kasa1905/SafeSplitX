const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Expenses API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('GET /api/expenses', () => {
    test('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .expect(401);

      expectErrorResponse(response);
    });

    test('should return valid JSON response structure', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });

  describe('POST /api/expenses', () => {
    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({})
        .expect(400);

      expectErrorResponse(response);
    });

    test('should return valid JSON response structure', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Test expense',
          amount: 50.00,
          category: 'food'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });
});