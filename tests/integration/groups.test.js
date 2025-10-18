const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestApp, expectSuccessResponse, expectErrorResponse, makeAuthenticatedRequest } = require('../helpers/apiHelpers');
const { clearDatabase, createTestUser, createTestGroup } = require('../helpers/dbHelpers');

let app;
let authToken;
let userId;

describe('Groups Integration Tests', () => {
  beforeAll(async () => {
    app = setupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create test user and get auth token
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser'
    });
    userId = user._id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    authToken = loginResponse.body.data.token;
  });

  describe('POST /api/groups', () => {
    test('should create group with valid data', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group for integration testing',
        currency: 'USD'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/groups', authToken)
        .send(groupData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.group).toBeDefined();
        expect(data.group.name).toBe(groupData.name);
        expect(data.group.description).toBe(groupData.description);
        expect(data.group.currency).toBe(groupData.currency);
        expect(data.group.createdBy).toBe(userId.toString());
        expect(data.group.members).toContain(userId.toString());
      });
    });

    test('should not create group without authentication', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group',
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/groups')
        .send(groupData)
        .expect(401);

      expectErrorResponse(response, 'Access token required');
    });

    test('should not create group without name', async () => {
      const groupData = {
        description: 'A test group',
        currency: 'USD'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/groups', authToken)
        .send(groupData)
        .expect(400);

      expectErrorResponse(response, 'Group name is required');
    });

    test('should not create group with invalid currency', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group',
        currency: 'INVALID'
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/groups', authToken)
        .send(groupData)
        .expect(400);

      expectErrorResponse(response, 'Invalid currency code');
    });

    test('should create group with settings', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group',
        currency: 'USD',
        settings: {
          autoApprove: false,
          requireReceipts: true,
          splitMethod: 'percentage'
        }
      };

      const response = await makeAuthenticatedRequest(app, 'post', '/api/groups', authToken)
        .send(groupData)
        .expect(201);

      expectSuccessResponse(response, (data) => {
        expect(data.group.settings.autoApprove).toBe(false);
        expect(data.group.settings.requireReceipts).toBe(true);
        expect(data.group.settings.splitMethod).toBe('percentage');
      });
    });
  });

  describe('GET /api/groups', () => {
    beforeEach(async () => {
      // Create test groups
      await createTestGroup({
        name: 'Group 1',
        members: [userId],
        createdBy: userId
      });
      await createTestGroup({
        name: 'Group 2',
        members: [userId],
        createdBy: userId
      });
    });

    test('should get user groups', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/groups', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.groups).toBeDefined();
        expect(data.groups).toHaveLength(2);
        expect(data.groups[0].name).toBeDefined();
        expect(data.groups[0].members).toContain(userId.toString());
      });
    });

    test('should filter groups by name', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/groups?search=Group 1', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.groups).toHaveLength(1);
        expect(data.groups[0].name).toBe('Group 1');
      });
    });

    test('should paginate groups', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', '/api/groups?page=1&limit=1', authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.groups).toHaveLength(1);
        expect(data.pagination).toBeDefined();
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(1);
        expect(data.pagination.total).toBe(2);
      });
    });
  });

  describe('GET /api/groups/:id', () => {
    let groupId;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;
    });

    test('should get group by id', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/groups/${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.group).toBeDefined();
        expect(data.group._id).toBe(groupId.toString());
        expect(data.group.name).toBe('Test Group');
        expect(data.group.members).toContain(userId.toString());
      });
    });

    test('should not get group with invalid id', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'get', `/api/groups/${invalidId}`, authToken)
        .expect(404);

      expectErrorResponse(response, 'Group not found');
    });

    test('should not get group without membership', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      // Create group without current user
      const group = await createTestGroup({
        name: 'Other Group',
        members: [otherUser._id],
        createdBy: otherUser._id
      });

      const response = await makeAuthenticatedRequest(app, 'get', `/api/groups/${group._id}`, authToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('PUT /api/groups/:id', () => {
    let groupId;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;
    });

    test('should update group successfully', async () => {
      const updateData = {
        name: 'Updated Group',
        description: 'Updated description',
        currency: 'EUR'
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/groups/${groupId}`, authToken)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.group.name).toBe('Updated Group');
        expect(data.group.description).toBe('Updated description');
        expect(data.group.currency).toBe('EUR');
      });
    });

    test('should update group settings', async () => {
      const updateData = {
        settings: {
          autoApprove: true,
          requireReceipts: false,
          splitMethod: 'equal'
        }
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/groups/${groupId}`, authToken)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.group.settings.autoApprove).toBe(true);
        expect(data.group.settings.requireReceipts).toBe(false);
        expect(data.group.settings.splitMethod).toBe('equal');
      });
    });

    test('should not update group by non-admin member', async () => {
      // Create another user and add to group
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Login as other user
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const updateData = {
        name: 'Updated Group'
      };

      const response = await makeAuthenticatedRequest(app, 'put', `/api/groups/${groupId}`, otherToken)
        .send(updateData)
        .expect(403);

      expectErrorResponse(response, 'Only group admin can update group');
    });
  });

  describe('PATCH /api/groups/:id/members', () => {
    let groupId;
    let otherUser;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;

      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });
    });

    test('should add member to group', async () => {
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() })
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.group.members).toContain(otherUser._id.toString());
        expect(data.group.members).toHaveLength(2);
      });
    });

    test('should not add non-existent user', async () => {
      const invalidUserId = new mongoose.Types.ObjectId();
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: invalidUserId.toString() })
        .expect(404);

      expectErrorResponse(response, 'User not found');
    });

    test('should not add already existing member', async () => {
      // First add the user
      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Try to add again
      const response = await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() })
        .expect(400);

      expectErrorResponse(response, 'User is already a member');
    });

    test('should not add member by non-admin', async () => {
      // Create third user
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      // Add other user to group
      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Login as other user (non-admin)
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, otherToken)
        .send({ userId: thirdUser._id.toString() })
        .expect(403);

      expectErrorResponse(response, 'Only group admin can add members');
    });
  });

  describe('DELETE /api/groups/:id/members/:userId', () => {
    let groupId;
    let otherUser;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;

      otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      // Add other user to group
      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });
    });

    test('should remove member from group', async () => {
      const response = await makeAuthenticatedRequest(app, 'delete', `/api/groups/${groupId}/members/${otherUser._id}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.group.members).not.toContain(otherUser._id.toString());
        expect(data.group.members).toHaveLength(1);
      });
    });

    test('should allow user to leave group', async () => {
      // Login as other user and leave group
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'delete', `/api/groups/${groupId}/members/${otherUser._id}`, otherToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.group.members).not.toContain(otherUser._id.toString());
      });
    });

    test('should not remove non-member', async () => {
      const thirdUser = await createTestUser({
        email: 'third@example.com',
        password: 'Password123!',
        username: 'thirduser'
      });

      const response = await makeAuthenticatedRequest(app, 'delete', `/api/groups/${groupId}/members/${thirdUser._id}`, authToken)
        .expect(400);

      expectErrorResponse(response, 'User is not a member of this group');
    });

    test('should not remove group creator', async () => {
      const response = await makeAuthenticatedRequest(app, 'delete', `/api/groups/${groupId}/members/${userId}`, authToken)
        .expect(400);

      expectErrorResponse(response, 'Group creator cannot be removed');
    });
  });

  describe('DELETE /api/groups/:id', () => {
    let groupId;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;
    });

    test('should delete group successfully', async () => {
      const response = await makeAuthenticatedRequest(app, 'delete', `/api/groups/${groupId}`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.message).toBe('Group deleted successfully');
      });

      // Verify group is deleted
      await makeAuthenticatedRequest(app, 'get', `/api/groups/${groupId}`, authToken)
        .expect(404);
    });

    test('should not delete group by non-creator', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      // Add other user to group
      await makeAuthenticatedRequest(app, 'patch', `/api/groups/${groupId}/members`, authToken)
        .send({ userId: otherUser._id.toString() });

      // Login as other user
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'delete', `/api/groups/${groupId}`, otherToken)
        .expect(403);

      expectErrorResponse(response, 'Only group creator can delete group');
    });
  });

  describe('GET /api/groups/:id/expenses', () => {
    let groupId;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;
    });

    test('should get group expenses', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/groups/${groupId}/expenses`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.expenses).toBeDefined();
        expect(Array.isArray(data.expenses)).toBe(true);
        expect(data.pagination).toBeDefined();
      });
    });

    test('should not get expenses for non-member', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser'
      });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!'
        });

      const otherToken = otherLoginResponse.body.data.token;

      const response = await makeAuthenticatedRequest(app, 'get', `/api/groups/${groupId}/expenses`, otherToken)
        .expect(403);

      expectErrorResponse(response, 'Access denied');
    });
  });

  describe('GET /api/groups/:id/balances', () => {
    let groupId;

    beforeEach(async () => {
      const group = await createTestGroup({
        name: 'Test Group',
        members: [userId],
        createdBy: userId
      });
      groupId = group._id;
    });

    test('should get group balances', async () => {
      const response = await makeAuthenticatedRequest(app, 'get', `/api/groups/${groupId}/balances`, authToken)
        .expect(200);

      expectSuccessResponse(response, (data) => {
        expect(data.balances).toBeDefined();
        expect(Array.isArray(data.balances)).toBe(true);
        expect(data.summary).toBeDefined();
      });
    });
  });
});