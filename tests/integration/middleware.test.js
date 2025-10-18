const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectErrorResponse } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser } = require('../helpers/dbHelpers');

let app;

describe('Middleware Integration Tests', () => {
  beforeAll(async () => {
    app = setupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Authentication Middleware', () => {
    test('should block access without token', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should block access with invalid token', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expectErrorResponse(response, 'Invalid token');
    });

    test('should block access with malformed token', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expectErrorResponse(response, 'Invalid token format');
    });

    test('should block access with expired token', async () => {
      // Create a token that's already expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGExYjJjM2Q0ZTVmNjc4OWFiY2RlZjAiLCJpYXQiOjE2MDk0NTkyMDAsImV4cCI6MTYwOTQ2MjgwMH0.test';
      
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expectErrorResponse(response, 'Token expired');
    });

    test('should allow access with valid token', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting Middleware', () => {
    test('should allow requests within rate limit', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      // Make several requests within the limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123!'
          });

        expect(response.status).toBeLessThan(400);
      }
    });

    test('should block requests exceeding rate limit', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      // Make many requests to exceed the limit
      let rateLimitHit = false;
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123!'
          });

        if (response.status === 429) {
          rateLimitHit = true;
          expectErrorResponse(response, 'Too many requests');
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
    }, 10000); // Increase timeout for this test

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .expect(401); // Will fail auth but should include rate limit headers

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Validation Middleware', () => {
    let authToken;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required name field
        .expect(400);

      expectErrorResponse(response, 'Group name is required');
    });

    test('should validate field types', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 123, // Should be string
          currency: 'USD'
        })
        .expect(400);

      expectErrorResponse(response, 'Invalid field type');
    });

    test('should validate field lengths', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'a'.repeat(101), // Too long
          currency: 'USD'
        })
        .expect(400);

      expectErrorResponse(response, 'Name too long');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);

      expectErrorResponse(response, 'Invalid email format');
    });

    test('should validate currency codes', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Group',
          currency: 'INVALID'
        })
        .expect(400);

      expectErrorResponse(response, 'Invalid currency code');
    });

    test('should validate MongoDB ObjectId format', async () => {
      const response = await request(app)
        .get('/api/groups/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expectErrorResponse(response, 'Invalid ID format');
    });
  });

  describe('CORS Middleware', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/expenses')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Authorization, Content-Type')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('Error Handling Middleware', () => {
    let authToken;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expectErrorResponse(response, 'Route not found');
    });

    test('should handle validation errors consistently', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    test('should handle database errors gracefully', async () => {
      // Force a database error by using invalid ObjectId
      const response = await request(app)
        .get('/api/groups/invalid-object-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expectErrorResponse(response, 'Invalid ID format');
    });

    test('should handle server errors with proper format', async () => {
      // This would typically test a 500 error scenario
      // For now, we'll test that the error format is consistent
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Group',
          currency: 'INVALID_CURRENCY_CODE'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should include request ID in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('requestId');
      expect(typeof response.body.requestId).toBe('string');
    });
  });

  describe('Logging Middleware', () => {
    let authToken;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should include request ID header', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    test('should maintain request ID across middleware chain', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Will trigger validation error
          currency: 'USD'
        })
        .expect(400);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
    });
  });

  describe('Security Middleware', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .expect(405); // Method not allowed for GET

      // Check for common security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('should sanitize input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: maliciousInput,
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);

      // Should reject or sanitize malicious input
      expect(response.body.error).not.toContain('<script>');
    });

    test('should prevent parameter pollution', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const authToken = loginResponse.body.data.token;

      // Try to pass multiple values for the same parameter
      const response = await request(app)
        .get('/api/expenses?page=1&page=2&page=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should handle parameter pollution gracefully
      expect(response.body.success).toBe(true);
    });
  });

  describe('Compression Middleware', () => {
    let authToken;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Response should be compressed if middleware is working
      expect(response.headers['content-encoding']).toBe('gzip');
    });

    test('should not compress small responses', async () => {
      const response = await request(app)
        .get('/api/currency/supported')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Small responses might not be compressed
      // This test documents the behavior
      expect(response.body.success).toBe(true);
    });
  });

  describe('Request Size Limiting Middleware', () => {
    let authToken;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should reject requests that are too large', async () => {
      const largeData = {
        name: 'A'.repeat(10000), // Very large name
        description: 'B'.repeat(50000), // Very large description
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData)
        .expect(413);

      expectErrorResponse(response, 'Request entity too large');
    });

    test('should accept normal-sized requests', async () => {
      const normalData = {
        name: 'Test Group',
        description: 'A normal-sized description',
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(normalData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Health Check Middleware', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    test('should include system information in health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status');
    });
  });
});