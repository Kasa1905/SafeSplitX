const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Auth Middleware Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Authentication middleware', () => {
    test('should block requests without Authorization header', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .expect(401);

      expectErrorResponse(response);
      expect(response.body.error).toMatch(/token|authorization/i);
    });

    test('should block requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expectErrorResponse(response);
    });

    test('should block requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expectErrorResponse(response);
    });

    test('should return consistent JSON error response structure', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('Rate limiting middleware', () => {
    test('should include rate limit headers in response', async () => {
      const response = await request(app)
        .get('/api/currency/rates');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
});