const { 
  formatCurrency, 
  formatDate, 
  deepClone, 
  debounce, 
  groupBy,
  isEmpty,
  retry 
} = require('../../../utils/helpers');

describe('Helpers Utils', () => {
  describe('formatCurrency', () => {
    test('should format USD currency', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(999999.99, 'USD')).toBe('$999,999.99');
    });

    test('should format different currencies', () => {
      expect(formatCurrency(1000, 'EUR', 'en-US')).toContain('€1,000.00');
      expect(formatCurrency(1000, 'GBP', 'en-GB')).toContain('£1,000.00');
    });

    test('should handle invalid numbers', () => {
      expect(formatCurrency('abc')).toBe('0.00');
      expect(formatCurrency(null)).toBe('0.00');
      expect(formatCurrency(undefined)).toBe('0.00');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2023-12-25T10:30:00Z');

    test('should format date with default options', () => {
      const formatted = formatDate(testDate);
      expect(formatted).toContain('December');
      expect(formatted).toContain('2023');
    });

    test('should format date in short format', () => {
      const formatted = formatDate(testDate, { format: 'short' });
      expect(formatted).toContain('Dec');
      expect(formatted).toContain('25');
      expect(formatted).toContain('2023');
    });

    test('should format date in ISO format', () => {
      const formatted = formatDate(testDate, { format: 'iso' });
      expect(formatted).toBe('2023-12-25T10:30:00.000Z');
    });

    test('should handle invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
      expect(formatDate(null)).toBe('Invalid Date');
    });
  });

  describe('deepClone', () => {
    test('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });

    test('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);
      
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    test('should clone objects', () => {
      const obj = {
        a: 1,
        b: { c: 2 },
        d: [3, 4, 5]
      };
      const cloned = deepClone(obj);
      
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.d).not.toBe(obj.d);
    });

    test('should clone Date objects', () => {
      const date = new Date('2023-12-25');
      const cloned = deepClone(date);
      
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
      expect(cloned).toBeInstanceOf(Date);
    });

    test('should clone RegExp objects', () => {
      const regex = /test/gi;
      const cloned = deepClone(regex);
      
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
      expect(cloned).not.toBe(regex);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    test('should debounce function calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(fn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should handle immediate execution', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100, true);
      
      debouncedFn();
      expect(fn).toHaveBeenCalledTimes(1);
      
      debouncedFn();
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });

  describe('groupBy', () => {
    test('should group array by property', () => {
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
        { category: 'B', value: 4 }
      ];
      
      const grouped = groupBy(data, 'category');
      
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(2);
      expect(grouped.A[0].value).toBe(1);
      expect(grouped.A[1].value).toBe(3);
    });

    test('should group array by function', () => {
      const data = [1, 2, 3, 4, 5, 6];
      const grouped = groupBy(data, (item) => item % 2 === 0 ? 'even' : 'odd');
      
      expect(grouped.even).toEqual([2, 4, 6]);
      expect(grouped.odd).toEqual([1, 3, 5]);
    });

    test('should handle empty array', () => {
      const grouped = groupBy([], 'category');
      expect(grouped).toEqual({});
    });
  });

  describe('isEmpty', () => {
    test('should check if values are empty', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    test('should check if values are not empty', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('retry', () => {
    test('should retry failed function', async () => {
      let attempts = 0;
      const fn = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry test error');
        }
        return 'success';
      });

      // Add shorter timeout for test
      const result = await Promise.race([
        helpers.retry(fn, 3, 100), // 100ms delay instead of default
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), 1000)
        )
      ]);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    }, 2000); // Increase test timeout to 2 seconds

    test('should throw error after max attempts', async () => {
      const fn = jest.fn(() => {
        throw new Error('Always fails');
      });

      // Add shorter timeout for test
      await expect(
        Promise.race([
          helpers.retry(fn, 2, 100), // 100ms delay instead of default
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), 1000)
          )
        ])
      ).rejects.toThrow('Always fails');

      expect(fn).toHaveBeenCalledTimes(2);
    }, 2000); // Increase test timeout to 2 seconds  describe('string manipulation helpers', () => {
    const { capitalize, toCamelCase, toSnakeCase, truncate } = require('../../../utils/helpers');

    test('should capitalize strings', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('')).toBe('');
    });

    test('should convert to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('Hello World Test')).toBe('helloWorldTest');
    });

    test('should convert to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
      expect(toSnakeCase('Hello World Test')).toBe('hello_world_test');
    });

    test('should truncate strings', () => {
      expect(truncate('Hello World', 5)).toBe('He...');
      expect(truncate('Short', 10)).toBe('Short');
      expect(truncate('Hello World', 8, '***')).toBe('Hello***');
    });
  });

  describe('array helpers', () => {
    const { removeDuplicates, sortBy } = require('../../../utils/helpers');

    test('should remove duplicates', () => {
      expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      
      const objects = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' }
      ];
      expect(removeDuplicates(objects, 'id')).toHaveLength(2);
    });

    test('should sort by property', () => {
      const data = [
        { name: 'Charlie', age: 25 },
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 20 }
      ];
      
      const sorted = sortBy(data, 'age');
      expect(sorted[0].name).toBe('Bob');
      expect(sorted[2].name).toBe('Alice');
    });
  });
});