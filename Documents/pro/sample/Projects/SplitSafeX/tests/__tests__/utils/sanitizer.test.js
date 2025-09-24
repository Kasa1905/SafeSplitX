const sanitizer = require('../../../utils/sanitizer');

describe('Sanitizer Utils', () => {
  describe('sanitizeString', () => {
    test('should remove XSS attempts', () => {
      const maliciousString = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizer.sanitizeString(maliciousString);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    test('should handle null and undefined', () => {
      expect(sanitizer.sanitizeString(null)).toBe('');
      expect(sanitizer.sanitizeString(undefined)).toBe('');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      const sanitized = sanitizer.sanitizeString(input);
      expect(sanitized).toBe('Hello World');
    });
  });

  describe('sanitizeEmail', () => {
    test('should sanitize valid email', () => {
      const email = 'test@example.com';
      const sanitized = sanitizer.sanitizeEmail(email);
      expect(sanitized).toBe('test@example.com');
    });

    test('should handle malicious email', () => {
      const maliciousEmail = 'test<script>alert("xss")</script>@example.com';
      const sanitized = sanitizer.sanitizeEmail(maliciousEmail);
      expect(sanitized).not.toContain('<script>');
    });

    test('should convert to lowercase', () => {
      const email = 'TEST@EXAMPLE.COM';
      const sanitized = sanitizer.sanitizeEmail(email);
      expect(sanitized).toBe('test@example.com');
    });
  });

  describe('sanitizeNumber', () => {
    test('should return valid numbers', () => {
      expect(sanitizer.sanitizeNumber(42)).toBe(42);
      expect(sanitizer.sanitizeNumber('42')).toBe(42);
      expect(sanitizer.sanitizeNumber('42.5')).toBe(42.5);
    });

    test('should return 0 for invalid numbers', () => {
      expect(sanitizer.sanitizeNumber('abc')).toBe(0);
      expect(sanitizer.sanitizeNumber(null)).toBe(0);
      expect(sanitizer.sanitizeNumber(undefined)).toBe(0);
    });

    test('should handle SQL injection attempts', () => {
      const maliciousInput = "42; DROP TABLE users;--";
      const sanitized = sanitizer.sanitizeNumber(maliciousInput);
      expect(sanitized).toBe(42);
    });
  });

  describe('sanitizeHtml', () => {
    test('should sanitize HTML content', () => {
      const maliciousHtml = '<div onclick="alert(\'xss\')">Content</div>';
      const sanitized = sanitizer.sanitizeHtml(maliciousHtml);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Content');
    });

    test('should allow safe HTML tags', () => {
      const safeHtml = '<p><strong>Bold text</strong> and <em>italic text</em></p>';
      const sanitized = sanitizer.sanitizeHtml(safeHtml);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<em>');
    });
  });

  describe('sanitizeObject', () => {
    test('should sanitize all string properties', () => {
      const obj = {
        name: '<script>alert("xss")</script>John',
        email: 'JOHN@EXAMPLE.COM',
        age: '25'
      };
      
      const sanitized = sanitizer.sanitizeObject(obj);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.name).toContain('John');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.age).toBe('25');
    });

    test('should handle nested objects', () => {
      const obj = {
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: '<img src=x onerror=alert("xss")>Bio'
          }
        }
      };
      
      const sanitized = sanitizer.sanitizeObject(obj);
      expect(sanitized.user.name).not.toContain('<script>');
      expect(sanitized.user.profile.bio).not.toContain('onerror');
    });
  });

  describe('sanitizeArray', () => {
    test('should sanitize array of strings', () => {
      const arr = [
        '<script>alert("xss")</script>Item1',
        'Item2',
        '<img src=x onerror=alert("xss")>Item3'
      ];
      
      const sanitized = sanitizer.sanitizeArray(arr);
      expect(sanitized[0]).not.toContain('<script>');
      expect(sanitized[0]).toContain('Item1');
      expect(sanitized[2]).not.toContain('onerror');
    });

    test('should sanitize array of objects', () => {
      const arr = [
        { name: '<script>alert("xss")</script>John' },
        { name: 'Jane' }
      ];
      
      const sanitized = sanitizer.sanitizeArray(arr);
      expect(sanitized[0].name).not.toContain('<script>');
      expect(sanitized[0].name).toContain('John');
    });
  });

  describe('whitelistFields', () => {
    test('should only keep whitelisted fields', () => {
      const obj = {
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
        ssn: '123-45-6789'
      };
      
      const whitelisted = sanitizer.whitelistFields(obj, ['name', 'email']);
      expect(whitelisted).toHaveProperty('name');
      expect(whitelisted).toHaveProperty('email');
      expect(whitelisted).not.toHaveProperty('password');
      expect(whitelisted).not.toHaveProperty('ssn');
    });

    test('should handle empty object', () => {
      const result = sanitizer.whitelistFields({}, ['name']);
      expect(result).toEqual({});
    });
  });

  describe('removeDangerousPatterns', () => {
    test('should remove SQL injection patterns', () => {
      const input = "SELECT * FROM users WHERE id = 1; DROP TABLE users;--";
      const sanitized = sanitizer.removeDangerousPatterns(input);
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    test('should remove NoSQL injection patterns', () => {
      const input = "{ $where: 'this.name == \\'admin\\' && this.password == \\'\\' || \\'a\\'==\\'a\\'' }";
      const sanitized = sanitizer.removeDangerousPatterns(input);
      expect(sanitized).not.toContain('$where');
    });

    test('should remove XSS patterns', () => {
      const input = 'javascript:alert("xss")';
      const sanitized = sanitizer.removeDangerousPatterns(input);
      expect(sanitized).not.toContain('javascript:');
    });
  });
});