const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, seedDatabase, createTestUser } = require('../helpers/dbHelpers');

let app;

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    app = setupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe(userData.email);
        expect(data.user.username).toBe(userData.username);
        expect(data.user.password).toBeUndefined();
        expect(data.token).toBeDefined();
      });
    });

    test('should not register user with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expectErrorResponse(response, 'Invalid email format');
    });

    test('should not register user with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expectErrorResponse(response, 'Password must be at least 8 characters');
    });

    test('should not register user with duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const duplicateData = {
        ...userData,
        username: 'testuser2'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400);

      expectErrorResponse(response, 'Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe('test@example.com');
        expect(data.token).toBeDefined();
      });
    });

    test('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expectErrorResponse(response, 'Invalid credentials');
    });

    test('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expectErrorResponse(response, 'Invalid credentials');
    });

    test('should not login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expectErrorResponse(response, 'Email and password are required');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });
      userId = user._id;

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = response.body.data.token;
    });

    test('should get user profile with valid token', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/auth/profile', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe('test@example.com');
        expect(data.user.password).toBeUndefined();
      });
    });

    test('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expectErrorResponse(response, 'Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User'
      });
      userId = user._id;

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = response.body.data.token;
    });

    test('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890'
      };

      const response = await makeAuthenticatedRequest(app, 'put', '/api/auth/profile', authToken)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.user.firstName).toBe('Updated');
        expect(data.user.lastName).toBe('Name');
        expect(data.user.phone).toBe('+1234567890');
      });
    });

    test('should not update email through profile endpoint', async () => {
      const updateData = {
        email: 'newemail@example.com'
      };

      const response = await makeAuthenticatedRequest(app, 'put', '/api/auth/profile', authToken)
        .send(updateData)
        .expect(400);

      expectErrorResponse(response, 'Email cannot be updated through this endpoint');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = response.body.data.token;
    });

    test('should change password with valid current password', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/auth/change-password', authToken)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Password changed successfully');
      });

      // Verify login with new password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!'
        })
        .expect(200);
    });

    test('should not change password with invalid current password', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/auth/change-password', authToken)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expectErrorResponse(response, 'Current password is incorrect');
    });

    test('should not change password with weak new password', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/auth/change-password', authToken)
        .send({
          currentPassword: 'Password123!',
          newPassword: '123'
        })
        .expect(400);

      expectErrorResponse(response, 'Password must be at least 8 characters');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      await createTestUser({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      authToken = response.body.data.token;
    });

    test('should logout successfully with valid token', async () => {
      const response = await makeAuthenticatedRequest(app, 'post', '/api/auth/logout', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Logged out successfully');
      });
    });

    test('should handle logout without token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Logged out successfully');
      });
    });
  });
});