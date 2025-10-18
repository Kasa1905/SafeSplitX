/**
 * Test suite for middleware/validation.js
 */

const { describe, test, expect } = require('@jest/globals');
const {
  validateCredentials,
  validateGroupData,
  validateExpenseData,
  validateSettlementData,
  validateUserData,
  sanitizeObject,
  sanitizeString
} = require('../validation');

describe('Validation Module', () => {
  describe('Credential Validation', () => {
    test('should validate correct credentials', () => {
      const credentials = {
        email: 'test@example.com',
        password: 'securePassword123'
      };

      const result = validateCredentials(credentials);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.password).toBe('securePassword123');
    });

    test('should reject invalid email', () => {
      const credentials = {
        email: 'invalid-email',
        password: 'securePassword123'
      };

      const result = validateCredentials(credentials);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.some(error => error.field === 'email')).toBe(true);
    });

    test('should reject short password', () => {
      const credentials = {
        email: 'test@example.com',
        password: '123'
      };

      const result = validateCredentials(credentials);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'password')).toBe(true);
    });

    test('should reject missing fields', () => {
      const credentials = {
        email: 'test@example.com'
        // password missing
      };

      const result = validateCredentials(credentials);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'password')).toBe(true);
    });
  });

  describe('Group Data Validation', () => {
    test('should validate correct group data', () => {
      const groupData = {
        name: 'Weekend Trip',
        description: 'Trip to the mountains',
        currency: 'USD',
        members: ['user1@example.com', 'user2@example.com']
      };

      const result = validateGroupData(groupData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Weekend Trip');
      expect(result.data.members).toHaveLength(2);
    });

    test('should default currency to USD', () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test description',
        members: ['user1@example.com']
      };

      const result = validateGroupData(groupData);

      expect(result.success).toBe(true);
      expect(result.data.currency).toBe('USD');
    });

    test('should reject empty group name', () => {
      const groupData = {
        name: '',
        description: 'Test description',
        members: ['user1@example.com']
      };

      const result = validateGroupData(groupData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'name')).toBe(true);
    });

    test('should reject invalid currency code', () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test description',
        currency: 'INVALID',
        members: ['user1@example.com']
      };

      const result = validateGroupData(groupData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'currency')).toBe(true);
    });

    test('should reject invalid member emails', () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test description',
        members: ['invalid-email', 'user2@example.com']
      };

      const result = validateGroupData(groupData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'members')).toBe(true);
    });
  });

  describe('Expense Data Validation', () => {
    test('should validate correct expense data', () => {
      const expenseData = {
        description: 'Dinner at restaurant',
        amount: 150.50,
        currency: 'USD',
        groupId: 'group-123',
        paidBy: 'user-123',
        splits: [
          { userId: 'user-123', amount: 75.25 },
          { userId: 'user-456', amount: 75.25 }
        ]
      };

      const result = validateExpenseData(expenseData);

      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(150.50);
      expect(result.data.splits).toHaveLength(2);
    });

    test('should reject negative amount', () => {
      const expenseData = {
        description: 'Test expense',
        amount: -50,
        currency: 'USD',
        groupId: 'group-123',
        paidBy: 'user-123',
        splits: [{ userId: 'user-123', amount: -50 }]
      };

      const result = validateExpenseData(expenseData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'amount')).toBe(true);
    });

    test('should reject mismatched split totals', () => {
      const expenseData = {
        description: 'Test expense',
        amount: 100,
        currency: 'USD',
        groupId: 'group-123',
        paidBy: 'user-123',
        splits: [
          { userId: 'user-123', amount: 60 },
          { userId: 'user-456', amount: 30 } // Total = 90, not 100
        ]
      };

      const result = validateExpenseData(expenseData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('splits total'))).toBe(true);
    });

    test('should reject empty description', () => {
      const expenseData = {
        description: '',
        amount: 100,
        currency: 'USD',
        groupId: 'group-123',
        paidBy: 'user-123',
        splits: [{ userId: 'user-123', amount: 100 }]
      };

      const result = validateExpenseData(expenseData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'description')).toBe(true);
    });
  });

  describe('Settlement Data Validation', () => {
    test('should validate correct settlement data', () => {
      const settlementData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        amount: 50.00,
        currency: 'USD',
        method: 'paypal',
        notes: 'Payment for dinner'
      };

      const result = validateSettlementData(settlementData);

      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(50.00);
      expect(result.data.method).toBe('paypal');
    });

    test('should reject settlement to same user', () => {
      const settlementData = {
        fromUserId: 'user-123',
        toUserId: 'user-123', // Same user
        amount: 50.00,
        currency: 'USD'
      };

      const result = validateSettlementData(settlementData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.message.includes('same user'))).toBe(true);
    });

    test('should reject negative settlement amount', () => {
      const settlementData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        amount: -25.00,
        currency: 'USD'
      };

      const result = validateSettlementData(settlementData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'amount')).toBe(true);
    });

    test('should default method to cash', () => {
      const settlementData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        amount: 50.00,
        currency: 'USD'
      };

      const result = validateSettlementData(settlementData);

      expect(result.success).toBe(true);
      expect(result.data.method).toBe('cash');
    });
  });

  describe('User Data Validation', () => {
    test('should validate correct user data', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      };

      const result = validateUserData(userData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Doe');
      expect(result.data.email).toBe('john@example.com');
    });

    test('should reject invalid phone number', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123' // Too short
      };

      const result = validateUserData(userData);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.field === 'phone')).toBe(true);
    });

    test('should make phone optional', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
        // phone is optional
      };

      const result = validateUserData(userData);

      expect(result.success).toBe(true);
    });
  });

  describe('Sanitization', () => {
    test('should sanitize string by trimming whitespace', () => {
      const input = '  test string  ';
      const result = sanitizeString(input);
      expect(result).toBe('test string');
    });

    test('should handle null and undefined strings', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString('')).toBe('');
    });

    test('should sanitize object by trimming string values', () => {
      const input = {
        name: '  John Doe  ',
        email: '  john@example.com  ',
        age: 30,
        active: true,
        nested: {
          value: '  nested value  '
        }
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.nested.value).toBe('nested value');
    });

    test('should handle arrays in objects', () => {
      const input = {
        tags: ['  tag1  ', '  tag2  '],
        numbers: [1, 2, 3]
      };

      const result = sanitizeObject(input);

      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.numbers).toEqual([1, 2, 3]);
    });

    test('should handle null and undefined object values', () => {
      const input = {
        name: 'John',
        nullValue: null,
        undefinedValue: undefined
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe('John');
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
    });
  });
});