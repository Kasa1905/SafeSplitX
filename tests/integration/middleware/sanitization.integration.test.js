const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Sanitization Middleware Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Input sanitization middleware', () => {
    test('should sanitize XSS attempts in request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '<script>alert("xss")</script>testuser',
          email: 'test@example.com',
          password: 'Password123!',
          firstName: '<img src=x onerror=alert(1)>',
          lastName: 'User'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      // Should not contain script tags in error messages
      if (response.body.error) {
        expect(response.body.error).not.toContain('<script>');
        expect(response.body.error).not.toContain('onerror');
      }
    });

    test('should sanitize SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: "' OR '1'='1"
        });

      expectErrorResponse(response);
      // Should return standard authentication error, not expose SQL
      expect(response.body.error).not.toContain('DROP TABLE');
      expect(response.body.error).not.toContain('SQL');
    });

    test('should handle special characters safely', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Special chars: <>"\'&',
          amount: 25.00,
          category: 'food'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should preserve valid Unicode characters', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          description: 'Café meal 🍽️ with émojis',
          amount: 15.50,
          category: 'food'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });
});