/**
 * Basic sanity test to ensure test infrastructure is working
 */

describe('Test Infrastructure', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to Node.js modules', () => {
    expect(process).toBeDefined();
    expect(process.env).toBeDefined();
  });

  it('should support async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  describe('Basic JavaScript functionality', () => {
    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      expect(arr).toHaveLength(3);
      expect(arr[0]).toBe(1);
    });

    it('should handle objects', () => {
      const obj = { name: 'test', value: 42 };
      expect(obj.name).toBe('test');
      expect(obj.value).toBe(42);
    });

    it('should handle strings', () => {
      const str = 'Hello World';
      expect(str).toContain('Hello');
      expect(str.length).toBe(11);
    });
  });
});
