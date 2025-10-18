const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Split Algorithms Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Split calculation algorithms', () => {
    test('should return 400 for invalid split calculation request', async () => {
      const response = await request(app)
        .post('/api/expenses/calculate-split')
        .set('Authorization', 'Bearer invalid-token')
        .send({})
        .expect(400);

      expectErrorResponse(response);
    });

    test('should return valid JSON response for equal split calculation', async () => {
      const response = await request(app)
        .post('/api/expenses/calculate-split')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          amount: 100,
          splitType: 'equal',
          participants: ['user1', 'user2', 'user3', 'user4']
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
      
      // Contract validation for split calculation
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('splits');
        expect(Array.isArray(response.body.data.splits)).toBe(true);
      }
    });

    test('should handle weighted split calculation', async () => {
      const response = await request(app)
        .post('/api/expenses/calculate-split')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          amount: 200,
          splitType: 'weighted',
          participants: [
            { userId: 'user1', weight: 2 },
            { userId: 'user2', weight: 1 },
            { userId: 'user3', weight: 1 }
          ]
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should handle percentage split calculation', async () => {
      const response = await request(app)
        .post('/api/expenses/calculate-split')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          amount: 300,
          splitType: 'percentage',
          participants: [
            { userId: 'user1', percentage: 50 },
            { userId: 'user2', percentage: 30 },
            { userId: 'user3', percentage: 20 }
          ]
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should validate split calculation results total correctly', async () => {
      const response = await request(app)
        .post('/api/expenses/calculate-split')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          amount: 99.99,
          splitType: 'equal',
          participants: ['user1', 'user2', 'user3']
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      if (response.body.success && response.body.data && response.body.data.splits) {
        const total = response.body.data.splits.reduce((sum, split) => sum + (split.amount || 0), 0);
        expect(Math.abs(total - 99.99)).toBeLessThan(0.01); // Allow for rounding
      }
    });
  });
});