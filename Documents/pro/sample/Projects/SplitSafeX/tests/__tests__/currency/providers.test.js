/**
 * Unit tests for currency providers
 * Tests provider classes including Fixer re-basing logic
 */

const axios = require('axios');
const { 
    ExchangeRateAPIProvider,
    FixerProvider, 
    CurrencyAPIProvider
} = require('../../../currency/providers');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Currency Providers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ExchangeRateAPIProvider', () => {
        let provider;

        beforeEach(() => {
            const mockConfig = {
                apiKey: '123456789abcdef123456789a',
                baseUrl: 'https://v6.exchangerate-api.com/v6',
                timeout: 10000,
                requestsPerSecond: 1,
                burstCapacity: 5
            };
            provider = new ExchangeRateAPIProvider(mockConfig);
        });

        test('should initialize with correct configuration', () => {
            expect(provider.name).toBe('exchangerate-api');
            expect(provider.apiKey).toBe('123456789abcdef123456789a');
            expect(provider.baseUrl).toBe('https://v6.exchangerate-api.com/v6');
        });

        test('should get rates successfully', async () => {
            const mockResponse = {
                data: {
                    result: 'success',
                    conversion_rates: {
                        EUR: 0.85,
                        GBP: 0.75,
                        JPY: 110
                    },
                    time_last_update_unix: 1695555555,
                    time_next_update_unix: 1695559555
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('USD', ['EUR', 'GBP', 'JPY']);

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('USD');
            expect(result.data.rates.EUR).toBe(0.85);
            expect(result.data.rates.GBP).toBe(0.75);
            expect(result.data.rates.JPY).toBe(110);
            expect(result.data.provider).toBe('exchangerate-api');
        });

        test('should handle API error', async () => {
            const mockResponse = {
                data: {
                    result: 'error',
                    'error-type': 'invalid-key'
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('USD', ['EUR']);

            expect(result.success).toBe(false);
            expect(result.error).toBe('invalid-key');
        });

        test('should handle network error', async () => {
            mockedAxios.create().get.mockRejectedValue(new Error('Network error'));

            const result = await provider.getRates('USD', ['EUR']);

            expect(result.success).toBe(false);
            expect(result.error).toContain('ExchangeRate-API request failed: Network error');
        });

        test('should get historical rates', async () => {
            const mockResponse = {
                data: {
                    result: 'success',
                    conversion_rates: {
                        EUR: 0.87,
                        GBP: 0.77
                    },
                    year: 2023,
                    month: 9,
                    day: 20
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getHistoricalRates('USD', ['EUR', 'GBP'], '2023-09-20');

            expect(result.success).toBe(true);
            expect(result.data.rates.EUR).toBe(0.87);
            expect(result.data.rates.GBP).toBe(0.77);
        });

        test('should perform health check', async () => {
            const mockResponse = {
                data: {
                    result: 'success',
                    conversion_rates: { EUR: 0.85 }
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.healthCheck();

            expect(result.success).toBe(true);
            expect(result.responseTime).toBeGreaterThan(0);
        });
    });

    describe('FixerProvider', () => {
        let provider;

        beforeEach(() => {
            const mockConfig = {
                apiKey: '12345678901234567890123456789012',
                baseUrl: 'http://data.fixer.io/api',
                timeout: 10000,
                requestsPerSecond: 0.2,
                burstCapacity: 3
            };
            provider = new FixerProvider(mockConfig);
        });

        test('should initialize with correct configuration', () => {
            expect(provider.name).toBe('fixer');
            expect(provider.apiKey).toBe('12345678901234567890123456789012');
            expect(provider.baseUrl).toBe('http://data.fixer.io/api');
        });

        test('should get EUR-based rates successfully', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    base: 'EUR',
                    rates: {
                        USD: 1.18,
                        GBP: 0.88,
                        JPY: 130
                    },
                    timestamp: 1695555555
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('EUR', ['USD', 'GBP', 'JPY']);

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('EUR');
            expect(result.data.rates.USD).toBe(1.18);
            expect(result.data.rates.GBP).toBe(0.88);
            expect(result.data.rates.JPY).toBe(130);
        });

        test('should perform EUR re-basing for USD base currency', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    base: 'EUR',
                    rates: {
                        USD: 1.20,  // EUR to USD rate
                        GBP: 0.85,  // EUR to GBP rate
                        JPY: 135    // EUR to JPY rate
                    },
                    timestamp: 1695555555
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('USD', ['GBP', 'JPY']);

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('USD');
            
            // Re-based rates: EUR_target / EUR_base
            // For GBP: 0.85 / 1.20 = 0.7083333
            // For JPY: 135 / 1.20 = 112.5
            expect(result.data.rates.GBP).toBeCloseTo(0.7083, 4);
            expect(result.data.rates.JPY).toBeCloseTo(112.5, 1);
            
            // Base currency should always be 1
            expect(result.data.rates.USD).toBe(1);
        });

        test('should perform EUR re-basing for GBP base currency', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    base: 'EUR',
                    rates: {
                        USD: 1.15,  // EUR to USD rate
                        GBP: 0.90,  // EUR to GBP rate
                        JPY: 140    // EUR to JPY rate
                    },
                    timestamp: 1695555555
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('GBP', ['USD', 'JPY']);

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('GBP');
            
            // Re-based rates: EUR_target / EUR_base
            // For USD: 1.15 / 0.90 = 1.2778
            // For JPY: 140 / 0.90 = 155.56
            expect(result.data.rates.USD).toBeCloseTo(1.2778, 4);
            expect(result.data.rates.JPY).toBeCloseTo(155.56, 2);
            
            // Base currency should always be 1  
            expect(result.data.rates.GBP).toBe(1);
        });

        test('should handle historical rates with EUR re-basing', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    base: 'EUR',
                    rates: {
                        USD: 1.25,
                        GBP: 0.82
                    },
                    date: '2023-09-20'
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getHistoricalRates('USD', ['GBP'], '2023-09-20');

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('USD');
            
            // Re-based rate: 0.82 / 1.25 = 0.656
            expect(result.data.rates.GBP).toBeCloseTo(0.656, 3);
            expect(result.data.rates.USD).toBe(1);
        });

        test('should handle API error', async () => {
            const mockResponse = {
                data: {
                    success: false,
                    error: {
                        type: 'invalid_access_key'
                    }
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('USD', ['EUR']);

            expect(result.success).toBe(false);
            expect(result.error).toContain('invalid_access_key');
        });
    });

    describe('CurrencyAPIProvider', () => {
        let provider;

        beforeEach(() => {
            const mockConfig = {
                apiKey: 'cur_' + '12345678901234567890123456789012',
                baseUrl: 'https://api.currencyapi.com/v3',
                timeout: 10000,
                requestsPerSecond: 0.3,
                burstCapacity: 4
            };
            provider = new CurrencyAPIProvider(mockConfig);
        });

        test('should initialize with correct configuration', () => {
            expect(provider.name).toBe('currencyapi');
            expect(provider.apiKey).toBe('cur_12345678901234567890123456789012');
            expect(provider.baseUrl).toBe('https://api.currencyapi.com/v3');
        });

        test('should get rates successfully', async () => {
            const mockResponse = {
                data: {
                    data: {
                        EUR: { value: 0.85 },
                        GBP: { value: 0.75 },
                        JPY: { value: 110 }
                    }
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getRates('USD', ['EUR', 'GBP', 'JPY']);

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('USD');
            expect(result.data.rates.EUR).toBe(0.85);
            expect(result.data.rates.GBP).toBe(0.75);
            expect(result.data.rates.JPY).toBe(110);
            expect(result.data.provider).toBe('currencyapi');
        });

        test('should get supported currencies', async () => {
            const mockResponse = {
                data: {
                    data: {
                        USD: { name: 'United States Dollar', code: 'USD' },
                        EUR: { name: 'Euro', code: 'EUR' },
                        GBP: { name: 'British Pound Sterling', code: 'GBP' }
                    }
                }
            };

            mockedAxios.create().get.mockResolvedValue(mockResponse);

            const result = await provider.getSupportedCurrencies();

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data.currencies)).toBe(true);
            const codes = result.data.currencies.map(c => c.code);
            expect(codes).toEqual(expect.arrayContaining(['USD','EUR','GBP']));
        });

        test('should handle timeout error', async () => {
            mockedAxios.create().get.mockRejectedValue(new Error('timeout'));

            const result = await provider.getRates('USD', ['EUR']);

            expect(result.success).toBe(false);
            expect(result.error).toContain('CurrencyAPI request failed: timeout');
        });
    });

    describe('Provider Configuration Validation', () => {
        test('should throw error for invalid ExchangeRateAPI configuration', () => {
            expect(() => {
                new ExchangeRateAPIProvider({});
            }).toThrow('exchangerate-api: API key is required');

            expect(() => {
                new ExchangeRateAPIProvider({
                    apiKey: 'invalid-key-format'
                });
            }).toThrow('exchangerate-api: API key should be a 24-character hexadecimal string');
        });

        test('should throw error for invalid Fixer configuration', () => {
            expect(() => {
                new FixerProvider({});
            }).toThrow('fixer: API key is required');

            expect(() => {
                new FixerProvider({
                    apiKey: 'short'
                });
            }).toThrow('fixer: API key should be a 32-character hexadecimal string');
        });

        test('should throw error for invalid CurrencyAPI configuration', () => {
            expect(() => {
                new CurrencyAPIProvider({});
            }).toThrow('currencyapi: API key is required');

            expect(() => {
                new CurrencyAPIProvider({
                    apiKey: 'invalid-format'
                });
            }).toThrow('currencyapi: API key should start with \'cur_\' followed by 32 alphanumeric characters');
        });
    });

    describe('Rate Limiting', () => {
        test('should include rate limiting statistics', () => {
            const provider = new ExchangeRateAPIProvider({
                apiKey: '123456789abcdef123456789a',
                requestsPerSecond: 2,
                burstCapacity: 10
            });

            const stats = provider.getStats();
            
            expect(stats.rateLimiting).toBeDefined();
            expect(stats.rateLimiting.tokensCapacity).toBe(10);
            expect(stats.rateLimiting.refillRate).toBe(2);
            expect(stats.rateLimiting.tokensRemaining).toBeGreaterThanOrEqual(0);
        });
    });
});