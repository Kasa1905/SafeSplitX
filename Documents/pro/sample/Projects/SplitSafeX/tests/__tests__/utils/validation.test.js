const { ValidationResult, validateEmail, validatePhone, validateAmount, validateSchema } = require('../../../utils/validation');

describe('Validation Utils', () => {
  describe('ValidationResult', () => {
    test('should create valid result', () => {
      const result = new ValidationResult(true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.value).toBeUndefined();
    });

    test('should create invalid result', () => {
      const errors = ['Email is required'];
      const result = new ValidationResult(false, null, errors);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
      expect(result.value).toBeNull();
    });

    test('should have addError method', () => {
      const result = new ValidationResult(true);
      result.addError('New error');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New error');
    });
  });

  describe('validateEmail', () => {
    test('should validate correct emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.org',
        'user+tag@example.io'
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(email.toLowerCase());
      });
    });

    test('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should normalize email case', () => {
      const result = validateEmail('TEST@EXAMPLE.COM');
      expect(result.value).toBe('test@example.com');
    });
  });

  describe('validatePhone', () => {
    test('should validate US phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '+1 (234) 567-8901',
        '234-567-8901'
      ];

      validPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(true);
      });
    });

    test('should validate international phone numbers', () => {
      const result = validatePhone('+44 20 1234 5678', 'GB');
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        'abc-def-ghij',
        '123-456-78901',
        ''
      ];

      invalidPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateAmount', () => {
    test('should validate valid amounts', () => {
      const validAmounts = [
        100,
        100.50,
        '99.99',
        0.01
      ];

      validAmounts.forEach(amount => {
        const result = validateAmount(amount);
        expect(result.isValid).toBe(true);
        expect(typeof result.value).toBe('number');
      });
    });

    test('should reject invalid amounts', () => {
      const invalidAmounts = [
        -10,
        0,
        'abc',
        null,
        undefined,
        Infinity,
        NaN
      ];

      invalidAmounts.forEach(amount => {
        const result = validateAmount(amount);
        expect(result.isValid).toBe(false);
      });
    });

    test('should validate with custom range', () => {
      const options = { min: 10, max: 1000 };
      
      expect(validateAmount(5, options).isValid).toBe(false);
      expect(validateAmount(50, options).isValid).toBe(true);
      expect(validateAmount(1500, options).isValid).toBe(false);
    });

    test('should validate decimal places', () => {
      const options = { maxDecimals: 2 };
      
      expect(validateAmount(10.12, options).isValid).toBe(true);
      expect(validateAmount(10.123, options).isValid).toBe(false);
    });
  });

  describe('validateSchema', () => {
    const Joi = require('joi');
    
    const userSchema = Joi.object({
      name: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().required(),
      age: Joi.number().integer().min(0).max(120)
    });

    test('should validate valid data against schema', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const result = validateSchema(validData, userSchema);
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual(validData);
    });

    test('should reject invalid data against schema', () => {
      const invalidData = {
        name: 'A',
        email: 'invalid-email',
        age: -5
      };

      const result = validateSchema(invalidData, userSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing required fields', () => {
      const incompleteData = {
        name: 'John Doe'
      };

      const result = validateSchema(incompleteData, userSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });
  });

  describe('edge cases', () => {
    test('should handle null and undefined inputs', () => {
      expect(validateEmail(null).isValid).toBe(false);
      expect(validateEmail(undefined).isValid).toBe(false);
      expect(validatePhone(null).isValid).toBe(false);
      expect(validateAmount(null).isValid).toBe(false);
    });

    test('should handle empty strings', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validatePhone('').isValid).toBe(false);
    });

    test('should handle whitespace', () => {
      const result = validateEmail('  test@example.com  ');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('test@example.com');
    });
  });
});