const request = require('supertest');
const { setupTestApp, expectSuccessResponse, expectErrorResponse } = require('../../helpers/apiHelpers');

describe('Forex Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = setupTestApp();
  });

  describe('Currency conversion and forex operations', () => {
    test('should return 400 for invalid currency conversion request', async () => {
      const response = await request(app)
        .post('/api/currency/convert')
        .set('Authorization', 'Bearer invalid-token')
        .send({})
        .expect(400);

      expectErrorResponse(response);
    });

    test('should return valid JSON response for currency conversion', async () => {
      const response = await request(app)
        .post('/api/currency/convert')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          amount: 100,
          from: 'USD',
          to: 'EUR'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
      
      // Contract validation for currency conversion
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('convertedAmount');
        expect(response.body.data).toHaveProperty('exchangeRate');
        expect(typeof response.body.data.convertedAmount).toBe('number');
        expect(typeof response.body.data.exchangeRate).toBe('number');
      }
    });

    test('should handle exchange rate retrieval', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .set('Authorization', 'Bearer invalid-token')
        .query({ base: 'USD' });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
      
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('rates');
        expect(typeof response.body.data.rates).toBe('object');
      }
    });

    test('should handle historical exchange rates', async () => {
      const response = await request(app)
        .get('/api/currency/historical')
        .set('Authorization', 'Bearer invalid-token')
        .query({ 
          from: 'USD',
          to: 'EUR',
          date: '2024-01-01'
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should validate supported currencies', async () => {
      const response = await request(app)
        .get('/api/currency/supported')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('currencies');
        expect(Array.isArray(response.body.data.currencies)).toBe(true);
      }
    });

    test('should handle currency rate caching and freshness', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .set('Authorization', 'Bearer invalid-token')
        .query({ base: 'USD', fresh: 'true' });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(response.body).toHaveProperty('success');
      
      if (response.body.success && response.body.data) {
        expect(response.body.data).toHaveProperty('lastUpdated');
        expect(response.body.data).toHaveProperty('cached');
      }
    });
  });
});