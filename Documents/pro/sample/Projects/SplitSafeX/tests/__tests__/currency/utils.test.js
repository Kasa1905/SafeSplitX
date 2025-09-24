/**
 * Unit tests for currency utilities
 * Tests edge cases and helper functions
 */

const {
    isValidCurrency,
    validateDateString,
    formatRate,
    parseProviderConfig,
    createCacheKey,
    calculateAge,
    normalizeAmount,
    convertAmount
} = require('../../../currency/utils');

describe('Currency Utils', () => {
    describe('isValidCurrency', () => {
        test('should validate standard currency codes', () => {
            expect(isValidCurrency('USD')).toBe(true);
            expect(isValidCurrency('EUR')).toBe(true);
            expect(isValidCurrency('GBP')).toBe(true);
            expect(isValidCurrency('JPY')).toBe(true);
            expect(isValidCurrency('CHF')).toBe(true);
        });

        test('should reject invalid currency codes', () => {
            expect(isValidCurrency('US')).toBe(false);
            expect(isValidCurrency('USDT')).toBe(false);
            expect(isValidCurrency('123')).toBe(false);
            expect(isValidCurrency('usd')).toBe(false);
            expect(isValidCurrency('')).toBe(false);
            expect(isValidCurrency(null)).toBe(false);
            expect(isValidCurrency(undefined)).toBe(false);
        });

        test('should handle edge cases', () => {
            expect(isValidCurrency('XAU')).toBe(true); // Gold
            expect(isValidCurrency('XAG')).toBe(true); // Silver
            expect(isValidCurrency('BTC')).toBe(false); // Crypto not supported
            expect(isValidCurrency('ETH')).toBe(false); // Crypto not supported
        });
    });

    describe('validateDateString', () => {
        test('should validate correct date formats', () => {
            expect(validateDateString('2023-09-15')).toBe(true);
            expect(validateDateString('2020-01-01')).toBe(true);
            expect(validateDateString('1999-12-31')).toBe(true);
        });

        test('should reject invalid date formats', () => {
            expect(validateDateString('15-09-2023')).toBe(false);
            expect(validateDateString('2023/09/15')).toBe(false);
            expect(validateDateString('2023-9-15')).toBe(false);
            expect(validateDateString('2023-09-5')).toBe(false);
            expect(validateDateString('23-09-15')).toBe(false);
            expect(validateDateString('invalid')).toBe(false);
            expect(validateDateString('')).toBe(false);
            expect(validateDateString(null)).toBe(false);
        });

        test('should reject invalid dates', () => {
            expect(validateDateString('2023-13-01')).toBe(false); // Invalid month
            expect(validateDateString('2023-02-30')).toBe(false); // Invalid day for February
            expect(validateDateString('2023-04-31')).toBe(false); // Invalid day for April
            expect(validateDateString('2023-00-15')).toBe(false); // Invalid month
            expect(validateDateString('2023-09-00')).toBe(false); // Invalid day
        });

        test('should handle leap years', () => {
            expect(validateDateString('2020-02-29')).toBe(true);  // Leap year
            expect(validateDateString('2021-02-29')).toBe(false); // Non-leap year
            expect(validateDateString('2000-02-29')).toBe(true);  // Leap year (divisible by 400)
            expect(validateDateString('1900-02-29')).toBe(false); // Non-leap year (divisible by 100 but not 400)
        });
    });

    describe('formatRate', () => {
        test('should format rates with correct precision', () => {
            expect(formatRate(1.23456789)).toBe('1.2346');
            expect(formatRate(0.85123)).toBe('0.8512');
            expect(formatRate(110.123)).toBe('110.1230');
            expect(formatRate(0.00123)).toBe('0.0012');
        });

        test('should handle whole numbers', () => {
            expect(formatRate(1)).toBe('1.0000');
            expect(formatRate(100)).toBe('100.0000');
            expect(formatRate(0)).toBe('0.0000');
        });

        test('should handle edge cases', () => {
            expect(formatRate(NaN)).toBe('0.0000');
            expect(formatRate(Infinity)).toBe('0.0000');
            expect(formatRate(-Infinity)).toBe('0.0000');
            expect(formatRate(null)).toBe('0.0000');
            expect(formatRate(undefined)).toBe('0.0000');
        });

        test('should handle negative numbers', () => {
            expect(formatRate(-1.23)).toBe('-1.2300');
            expect(formatRate(-0.85)).toBe('-0.8500');
        });

        test('should handle very small numbers', () => {
            expect(formatRate(0.000123)).toBe('0.0001');
            expect(formatRate(0.0000123)).toBe('0.0000');
        });
    });

    describe('parseProviderConfig', () => {
        test('should parse valid provider configurations', () => {
            const config = {
                providers: {
                    'exchangerate-api': {
                        apiKey: 'key123',
                        enabled: true,
                        priority: 1
                    },
                    'fixer': {
                        apiKey: 'key456',
                        enabled: false,
                        priority: 2
                    }
                }
            };

            const result = parseProviderConfig(config);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('exchangerate-api');
            expect(result[0].enabled).toBe(true);
            expect(result[0].priority).toBe(1);
            expect(result[1].name).toBe('fixer');
            expect(result[1].enabled).toBe(false);
        });

        test('should handle missing configuration', () => {
            expect(() => parseProviderConfig({})).toThrow('Provider configuration is required');
            expect(() => parseProviderConfig(null)).toThrow('Provider configuration is required');
            expect(() => parseProviderConfig({ providers: {} })).toThrow('At least one provider must be configured');
        });

        test('should validate provider structure', () => {
            const invalidConfig = {
                providers: {
                    'invalid-provider': {
                        // Missing apiKey
                        enabled: true
                    }
                }
            };

            expect(() => parseProviderConfig(invalidConfig))
                .toThrow('invalid-provider: API key is required');
        });
    });

    describe('createCacheKey', () => {
        test('should create consistent cache keys', () => {
            const key1 = createCacheKey('USD', ['EUR', 'GBP'], 'current');
            const key2 = createCacheKey('USD', ['EUR', 'GBP'], 'current');
            expect(key1).toBe(key2);
        });

        test('should create different keys for different parameters', () => {
            const key1 = createCacheKey('USD', ['EUR'], 'current');
            const key2 = createCacheKey('EUR', ['USD'], 'current');
            const key3 = createCacheKey('USD', ['EUR'], '2023-09-15');

            expect(key1).not.toBe(key2);
            expect(key1).not.toBe(key3);
            expect(key2).not.toBe(key3);
        });

        test('should normalize currency order', () => {
            const key1 = createCacheKey('USD', ['EUR', 'GBP'], 'current');
            const key2 = createCacheKey('USD', ['GBP', 'EUR'], 'current');
            expect(key1).toBe(key2); // Target currencies should be sorted
        });

        test('should handle edge cases', () => {
            expect(createCacheKey('USD', [], 'current')).toBeTruthy();
            expect(createCacheKey('USD', null, 'current')).toBeTruthy();
            expect(() => createCacheKey('', ['EUR'], 'current')).toThrow();
            expect(() => createCacheKey(null, ['EUR'], 'current')).toThrow();
        });
    });

    describe('calculateAge', () => {
        test('should calculate age in seconds', () => {
            const now = Date.now();
            const oneMinuteAgo = now - (60 * 1000);
            const oneHourAgo = now - (60 * 60 * 1000);

            expect(calculateAge(oneMinuteAgo)).toBeCloseTo(60, 0);
            expect(calculateAge(oneHourAgo)).toBeCloseTo(3600, 0);
        });

        test('should handle future timestamps', () => {
            const future = Date.now() + (60 * 1000);
            expect(calculateAge(future)).toBe(0);
        });

        test('should handle invalid timestamps', () => {
            expect(calculateAge(null)).toBe(Infinity);
            expect(calculateAge(undefined)).toBe(Infinity);
            expect(calculateAge('invalid')).toBe(Infinity);
        });
    });

    describe('normalizeAmount', () => {
        test('should normalize valid amounts', () => {
            expect(normalizeAmount(100.50)).toBe(100.50);
            expect(normalizeAmount('100.50')).toBe(100.50);
            expect(normalizeAmount('100')).toBe(100);
            expect(normalizeAmount(0)).toBe(0);
        });

        test('should handle edge cases', () => {
            expect(normalizeAmount(null)).toBe(0);
            expect(normalizeAmount(undefined)).toBe(0);
            expect(normalizeAmount('')).toBe(0);
            expect(normalizeAmount('invalid')).toBe(0);
            expect(normalizeAmount(NaN)).toBe(0);
        });

        test('should handle negative amounts', () => {
            expect(normalizeAmount(-100)).toBe(0);
            expect(normalizeAmount('-100')).toBe(0);
        });

        test('should round to 2 decimal places', () => {
            expect(normalizeAmount(100.456)).toBe(100.46);
            expect(normalizeAmount(100.454)).toBe(100.45);
            expect(normalizeAmount('100.999')).toBe(101);
        });
    });

    describe('convertAmount', () => {
        const mockRates = {
            EUR: 0.85,
            GBP: 0.75,
            JPY: 110,
            USD: 1
        };

        test('should convert amounts correctly', () => {
            expect(convertAmount(100, 'USD', 'EUR', mockRates)).toBe(85);
            expect(convertAmount(100, 'USD', 'GBP', mockRates)).toBe(75);
            expect(convertAmount(100, 'USD', 'JPY', mockRates)).toBe(11000);
        });

        test('should handle same currency conversion', () => {
            expect(convertAmount(100, 'USD', 'USD', mockRates)).toBe(100);
            expect(convertAmount(100, 'EUR', 'EUR', mockRates)).toBe(100);
        });

        test('should handle cross-currency conversion', () => {
            // EUR to GBP: (100 / 0.85) * 0.75 = 88.24
            const result = convertAmount(100, 'EUR', 'GBP', mockRates);
            expect(result).toBeCloseTo(88.24, 2);
        });

        test('should handle missing rates', () => {
            expect(() => convertAmount(100, 'USD', 'CAD', mockRates))
                .toThrow('Exchange rate not found for CAD');
            expect(() => convertAmount(100, 'CAD', 'USD', mockRates))
                .toThrow('Exchange rate not found for CAD');
        });

        test('should handle invalid amounts', () => {
            expect(convertAmount(null, 'USD', 'EUR', mockRates)).toBe(0);
            expect(convertAmount(undefined, 'USD', 'EUR', mockRates)).toBe(0);
            expect(convertAmount('invalid', 'USD', 'EUR', mockRates)).toBe(0);
            expect(convertAmount(-100, 'USD', 'EUR', mockRates)).toBe(0);
        });

        test('should handle precision correctly', () => {
            const result = convertAmount(100, 'USD', 'EUR', mockRates);
            expect(Number.isInteger(result * 100)).toBe(true); // Should be rounded to 2 decimal places
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed currency arrays', () => {
            expect(() => isValidCurrency(['USD'])).toThrow();
            expect(() => isValidCurrency(123)).toThrow();
            expect(() => isValidCurrency({})).toThrow();
        });

        test('should handle malformed date inputs', () => {
            expect(validateDateString({})).toBe(false);
            expect(validateDateString([])).toBe(false);
            expect(validateDateString(123)).toBe(false);
        });

        test('should handle rate formatting edge cases', () => {
            expect(formatRate('not-a-number')).toBe('0.0000');
            expect(formatRate({})).toBe('0.0000');
            expect(formatRate([])).toBe('0.0000');
        });
    });

    describe('Performance Edge Cases', () => {
        test('should handle large arrays efficiently', () => {
            const largeCurrencyArray = new Array(1000).fill('USD');
            const start = performance.now();
            
            for (let i = 0; i < 100; i++) {
                createCacheKey('USD', largeCurrencyArray.slice(0, 10), 'current');
            }
            
            const end = performance.now();
            expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
        });

        test('should handle repeated operations efficiently', () => {
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                isValidCurrency('USD');
                validateDateString('2023-09-15');
                formatRate(1.2345);
            }
            
            const end = performance.now();
            expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
        });
    });
});