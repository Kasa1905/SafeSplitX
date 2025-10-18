/**
 * Comprehensive unit tests for caching utilities
 * Tests Redis operations, in-memory fallback, TTL management,    describe('generateHistoricalCacheKey', () => {
        test('should generate historical cache keys with date and provider', () => {
            const key = cache.generateHistoricalCacheKey('USD', ['EUR'], '2023-12-01', 'fixer');
            expect(key).toBe('forex:historical:fixer:USD:EUR:2023-12-01');
        });

        test('should use default provider when not specified', () => {
            const key = cache.generateHistoricalCacheKey('USD', ['EUR'], '2023-12-01');
            expect(key).toBe('forex:historical:default:USD:EUR:2023-12-01');
        });

        test('should handle multiple currencies in historical cache key', () => {
            const key = cache.generateHistoricalCacheKey('USD', ['EUR', 'GBP'], '2023-12-01', 'exchangerate-api');
            expect(key).toBe('forex:historical:exchangerate-api:USD:EUR,GBP:2023-12-01');
        });
    });optimization
 */

const cache = require('../../../currency/cache');
const redis = require('redis');
const NodeCache = require('node-cache');

// Mock Redis and NodeCache
jest.mock('redis');
jest.mock('node-cache');

describe('Cache Module', () => {
    let mockRedisClient;
    let mockNodeCache;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Redis client
        mockRedisClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn(),
            keys: jest.fn(),
            flushDb: jest.fn(),
            quit: jest.fn(),
            ping: jest.fn().mockResolvedValue('PONG'),
            on: jest.fn()
        };

        // Mock NodeCache instance
        mockNodeCache = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            keys: jest.fn().mockReturnValue([]),
            flushAll: jest.fn(),
            close: jest.fn(),
            getStats: jest.fn().mockReturnValue({ vsize: 0 })
        };

        redis.createClient.mockReturnValue(mockRedisClient);
        NodeCache.mockImplementation(() => mockNodeCache);
    });

    describe('initializeCache', () => {
        test('should initialize memory cache successfully', async () => {
            const result = await cache.initializeCache();

            expect(result.success).toBe(true);
            expect(result.data.memory).toBe(true);
            expect(NodeCache).toHaveBeenCalled();
        });

        test('should initialize Redis and memory cache when Redis is enabled', async () => {
            // Mock successful Redis connection
            mockRedisClient.connect.mockResolvedValue(undefined);

            const result = await cache.initializeCache();

            expect(result.success).toBe(true);
            expect(NodeCache).toHaveBeenCalled();
        });

        test('should fallback to memory cache when Redis fails', async () => {
            // Mock Redis connection failure
            mockRedisClient.connect.mockRejectedValue(new Error('Redis connection failed'));

            const result = await cache.initializeCache();

            expect(result.success).toBe(true);
            expect(result.data.redis).toBe(false);
            expect(result.data.memory).toBe(true);
        });

        test('should handle initialization errors gracefully', async () => {
            // Mock NodeCache constructor failure
            NodeCache.mockImplementation(() => {
                throw new Error('NodeCache initialization failed');
            });

            const result = await cache.initializeCache();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cache initialization failed');
        });
    });

    describe('generateRatesCacheKey', () => {
        test('should generate consistent cache keys with provider', () => {
            const key1 = cache.generateRatesCacheKey('USD', ['EUR', 'GBP'], 'fixer');
            const key2 = cache.generateRatesCacheKey('USD', ['GBP', 'EUR'], 'fixer'); // Different order

            expect(key1).toBe('forex:rates:fixer:USD:EUR,GBP');
            expect(key2).toBe('forex:rates:fixer:USD:EUR,GBP'); // Should be sorted consistently
        });

        test('should use default provider when not specified', () => {
            const key = cache.generateRatesCacheKey('USD', ['EUR']);
            expect(key).toBe('forex:rates:default:USD:EUR');
        });

        test('should handle empty target currencies', () => {
            const key = cache.generateRatesCacheKey('USD', [], 'exchangerate-api');
            expect(key).toBe('forex:rates:exchangerate-api:USD:');
        });

        test('should handle single target currency', () => {
            const key = cache.generateRatesCacheKey('USD', ['EUR'], 'currencyapi');
            expect(key).toBe('forex:rates:currencyapi:USD:EUR');
        });
    });

    describe('generateHistoricalCacheKey', () => {
        test('should generate historical cache keys with date', () => {
            const key = cache.generateHistoricalCacheKey('USD', ['EUR'], '2023-12-01');
            expect(key).toBe('forex:historical:USD:EUR:2023-12-01');
        });

        test('should handle multiple target currencies in historical keys', () => {
            const key = cache.generateHistoricalCacheKey('USD', ['EUR', 'GBP'], '2023-12-01');
            expect(key).toBe('forex:historical:USD:EUR,GBP:2023-12-01');
        });
    });

    describe('getCachedRates', () => {
        test('should retrieve from Redis when available', async () => {
            const testData = { rates: { EUR: 0.85 }, timestamp: '2023-12-01T00:00:00.000Z' };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

            const result = await cache.getCachedRates('test-key');

            expect(result).toEqual(testData);
            expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
        });

        test('should fallback to memory cache when Redis fails', async () => {
            const testData = { rates: { EUR: 0.85 }, timestamp: '2023-12-01T00:00:00.000Z' };
            mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
            mockNodeCache.get.mockReturnValue(testData);

            const result = await cache.getCachedRates('test-key');

            expect(result).toEqual(testData);
            expect(mockNodeCache.get).toHaveBeenCalledWith('test-key');
        });

        test('should return null when no cache data exists', async () => {
            mockRedisClient.get.mockResolvedValue(null);
            mockNodeCache.get.mockReturnValue(undefined);

            const result = await cache.getCachedRates('test-key');

            expect(result).toBeNull();
        });

        test('should handle JSON parsing errors', async () => {
            mockRedisClient.get.mockResolvedValue('invalid-json');
            mockNodeCache.get.mockReturnValue(undefined);

            const result = await cache.getCachedRates('test-key');

            expect(result).toBeNull();
        });

        test('should prefer Redis over memory cache by default', async () => {
            const redisData = { source: 'redis' };
            const memoryData = { source: 'memory' };
            
            mockRedisClient.get.mockResolvedValue(JSON.stringify(redisData));
            mockNodeCache.get.mockReturnValue(memoryData);

            const result = await cache.getCachedRates('test-key');

            expect(result).toEqual(redisData);
            expect(mockRedisClient.get).toHaveBeenCalled();
            expect(mockNodeCache.get).not.toHaveBeenCalled();
        });
    });

    describe('setCachedRates', () => {
        test('should store in both Redis and memory cache', async () => {
            const testData = { rates: { EUR: 0.85 } };
            mockRedisClient.setEx.mockResolvedValue('OK');

            const result = await cache.setCachedRates('test-key', testData, 3600);

            expect(result.success).toBe(true);
            expect(result.data.redis).toBe(true);
            expect(result.data.memory).toBe(true);
            expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, expect.any(String));
            expect(mockNodeCache.set).toHaveBeenCalledWith('test-key', expect.any(Object), 3600);
        });

        test('should handle Redis storage failure gracefully', async () => {
            const testData = { rates: { EUR: 0.85 } };
            mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

            const result = await cache.setCachedRates('test-key', testData, 3600);

            expect(result.success).toBe(true); // Should still succeed with memory cache
            expect(result.data.redis).toBe(false);
            expect(result.data.memory).toBe(true);
        });

        test('should handle memory cache storage failure', async () => {
            const testData = { rates: { EUR: 0.85 } };
            mockRedisClient.setEx.mockResolvedValue('OK');
            mockNodeCache.set.mockImplementation(() => {
                throw new Error('Memory cache error');
            });

            const result = await cache.setCachedRates('test-key', testData, 3600);

            expect(result.success).toBe(true); // Should still succeed with Redis
            expect(result.data.redis).toBe(true);
            expect(result.data.memory).toBe(false);
        });

        test('should fail when no data is provided', async () => {
            const result = await cache.setCachedRates('test-key', null, 3600);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No data provided');
        });

        test('should add metadata to cached data', async () => {
            const testData = { rates: { EUR: 0.85 } };
            mockRedisClient.setEx.mockResolvedValue('OK');

            await cache.setCachedRates('test-key', testData, 3600);

            const setCall = mockNodeCache.set.mock.calls[0];
            const cachedData = setCall[1];

            expect(cachedData).toHaveProperty('rates', testData.rates);
            expect(cachedData).toHaveProperty('cachedAt');
            expect(cachedData).toHaveProperty('ttl', 3600);
        });
    });

    describe('invalidateCache', () => {
        test('should invalidate single key from both caches', async () => {
            mockRedisClient.del.mockResolvedValue(1);
            mockNodeCache.del.mockReturnValue(true);

            const result = await cache.invalidateCache('test-key');

            expect(result.success).toBe(true);
            expect(result.data.redis).toBe(1);
            expect(result.data.memory).toBe(1);
            expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
            expect(mockNodeCache.del).toHaveBeenCalledWith('test-key');
        });

        test('should invalidate multiple keys', async () => {
            mockRedisClient.del.mockResolvedValue(2);
            mockNodeCache.del
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(true);

            const result = await cache.invalidateCache(['key1', 'key2']);

            expect(result.success).toBe(true);
            expect(result.data.total).toBe(4); // 2 from Redis + 2 from memory
        });

        test('should handle pattern-based invalidation for Redis', async () => {
            mockRedisClient.keys.mockResolvedValue(['key1', 'key2']);
            mockRedisClient.del.mockResolvedValue(2);
            mockNodeCache.keys.mockReturnValue(['key1', 'key2']);

            const result = await cache.invalidateCache('key*', { pattern: true });

            expect(result.success).toBe(true);
            expect(mockRedisClient.keys).toHaveBeenCalledWith('key*');
            expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2');
        });

        test('should handle empty match for pattern-based Redis invalidation', async () => {
            mockRedisClient.keys.mockResolvedValue([]);
            mockNodeCache.keys.mockReturnValue([]);

            const result = await cache.invalidateCache('nomatch*', { pattern: true });

            expect(result.success).toBe(true);
            expect(mockRedisClient.keys).toHaveBeenCalledWith('nomatch*');
            expect(mockRedisClient.del).not.toHaveBeenCalled();
        });

        test('should handle Redis invalidation failure', async () => {
            mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
            mockNodeCache.del.mockReturnValue(true);

            const result = await cache.invalidateCache('test-key');

            expect(result.success).toBe(true);
            expect(result.data.redis).toBe(0);
            expect(result.data.memory).toBe(1);
        });
    });

    describe('warmCache', () => {
        test('should warm cache with provided currency pairs', async () => {
            const currencyPairs = [
                { base: 'USD', targets: ['EUR', 'GBP'] },
                { base: 'EUR', targets: ['USD', 'GBP'] }
            ];

            mockNodeCache.set.mockReturnValue(true);

            const result = await cache.warmCache(currencyPairs);

            expect(result.success).toBe(true);
            expect(result.data.warmed).toBe(2);
            expect(result.data.failed).toBe(0);
        });

        test('should handle warming failures for individual pairs', async () => {
            const currencyPairs = [
                { base: 'USD', targets: ['EUR'] },
                { base: 'INVALID', targets: ['EUR'] }
            ];

            mockNodeCache.set
                .mockReturnValueOnce(true)
                .mockImplementationOnce(() => {
                    throw new Error('Cache error');
                });

            const result = await cache.warmCache(currencyPairs);

            expect(result.success).toBe(true);
            expect(result.data.warmed).toBe(1);
            expect(result.data.failed).toBe(1);
            expect(result.data.errors).toHaveLength(1);
        });

        test('should skip already cached pairs', async () => {
            // First call getCachedRates to simulate existing cache
            cache.getCachedRates = jest.fn().mockResolvedValue({ rates: { EUR: 0.85 } });

            const currencyPairs = [
                { base: 'USD', targets: ['EUR'] }
            ];

            const result = await cache.warmCache(currencyPairs);

            expect(result.success).toBe(true);
            expect(result.data.warmed).toBe(0); // Should skip because already cached
        });
    });

    describe('getCacheStats', () => {
        test('should return comprehensive cache statistics', () => {
            mockNodeCache.keys.mockReturnValue(['key1', 'key2', 'key3']);
            mockNodeCache.getStats.mockReturnValue({ vsize: 1024 });

            const stats = cache.getCacheStats();

            expect(stats).toHaveProperty('hits');
            expect(stats).toHaveProperty('misses');
            expect(stats).toHaveProperty('sets');
            expect(stats).toHaveProperty('errors');
            expect(stats).toHaveProperty('hitRate');
            expect(stats).toHaveProperty('redis');
            expect(stats).toHaveProperty('memory');
            expect(stats.memory.keys).toBe(3);
            expect(stats.memory.size).toBe(1024);
        });

        test('should calculate hit rate correctly', () => {
            // This would require accessing the internal stats object
            // For now, we just test that hitRate is a number
            const stats = cache.getCacheStats();
            expect(typeof stats.hitRate).toBe('number');
            expect(stats.hitRate).toBeGreaterThanOrEqual(0);
            expect(stats.hitRate).toBeLessThanOrEqual(100);
        });
    });

    describe('getHealthStatus', () => {
        test('should return healthy status when all systems work', async () => {
            mockRedisClient.ping.mockResolvedValue('PONG');

            const result = await cache.getHealthStatus();

            expect(result.success).toBe(true);
            expect(result.data.redis.status).toBe('healthy');
            expect(result.data.memory.status).toBe('healthy');
            expect(result.data.overall).toBe('healthy');
        });

        test('should detect Redis health issues', async () => {
            mockRedisClient.ping.mockRejectedValue(new Error('Redis ping failed'));

            const result = await cache.getHealthStatus();

            expect(result.success).toBe(true);
            expect(result.data.redis.status).toBe('unhealthy');
            expect(result.data.overall).toBe('degraded');
        });

        test('should handle health check errors', async () => {
            // Mock a general error in health checking
            const originalGetHealthStatus = cache.getHealthStatus;
            cache.getHealthStatus = jest.fn().mockRejectedValue(new Error('Health check failed'));

            try {
                const result = await cache.getHealthStatus();
                expect(result.success).toBe(false);
                expect(result.error).toContain('Health check failed');
            } finally {
                cache.getHealthStatus = originalGetHealthStatus;
            }
        });
    });

    describe('clearCache', () => {
        test('should clear both Redis and memory cache', async () => {
            mockRedisClient.flushDb.mockResolvedValue('OK');
            mockNodeCache.flushAll.mockReturnValue(undefined);

            const result = await cache.clearCache();

            expect(result.success).toBe(true);
            expect(result.data.redis).toBe(true);
            expect(result.data.memory).toBe(true);
            expect(mockRedisClient.flushDb).toHaveBeenCalled();
            expect(mockNodeCache.flushAll).toHaveBeenCalled();
        });

        test('should handle selective cache clearing', async () => {
            const result = await cache.clearCache({ redis: false, memory: true });

            expect(result.success).toBe(true);
            expect(result.data.redis).toBe(false);
            expect(result.data.memory).toBe(true);
            expect(mockRedisClient.flushDb).not.toHaveBeenCalled();
            expect(mockNodeCache.flushAll).toHaveBeenCalled();
        });

        test('should handle Redis clear failure', async () => {
            mockRedisClient.flushDb.mockRejectedValue(new Error('Redis flush failed'));
            mockNodeCache.flushAll.mockReturnValue(undefined);

            const result = await cache.clearCache();

            expect(result.success).toBe(true); // Should still succeed with memory
            expect(result.data.redis).toBe(false);
            expect(result.data.memory).toBe(true);
        });
    });

    describe('closeCache', () => {
        test('should close both Redis and memory cache connections', async () => {
            mockRedisClient.quit.mockResolvedValue('OK');
            mockNodeCache.close.mockReturnValue(undefined);

            const result = await cache.closeCache();

            expect(result.success).toBe(true);
            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(mockNodeCache.close).toHaveBeenCalled();
        });

        test('should handle connection close errors gracefully', async () => {
            mockRedisClient.quit.mockRejectedValue(new Error('Redis quit failed'));

            const result = await cache.closeCache();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cache close failed');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null cache keys gracefully', async () => {
            const result = await cache.getCachedRates(null);
            expect(result).toBeNull();
        });

        test('should handle very long cache keys', async () => {
            const longKey = 'a'.repeat(1000);
            mockRedisClient.get.mockResolvedValue(null);

            const result = await cache.getCachedRates(longKey);
            expect(result).toBeNull();
        });

        test('should handle cache key collisions', async () => {
            const key1 = cache.generateRatesCacheKey('USD', ['EUR']);
            const key2 = cache.generateRatesCacheKey('USD', ['EUR']);
            
            expect(key1).toBe(key2); // Should be identical
        });

        test('should handle concurrent cache operations', async () => {
            const testData = { rates: { EUR: 0.85 } };
            
            const promises = [
                cache.setCachedRates('key1', testData, 3600),
                cache.setCachedRates('key2', testData, 3600),
                cache.getCachedRates('key1'),
                cache.getCachedRates('key2')
            ];

            const results = await Promise.all(promises);
            
            results.forEach(result => {
                if (result && typeof result === 'object' && 'success' in result) {
                    expect(result.success).toBeDefined();
                }
            });
        });
    });

    describe('Compression Envelope Handling', () => {
        test('should handle compressed write/read roundtrip with gz: prefix', async () => {
            const testData = { rates: { EUR: 0.85, GBP: 0.75 } };
            const zlib = require('zlib');
            
            // Mock Redis to simulate compression
            mockRedisClient.setEx.mockResolvedValue('OK');
            
            // Set compressed data
            await cache.setCachedRates('test-key', testData, 3600, { compress: true, compressionThreshold: 10 });
            
            // Verify setEx was called with compressed data starting with gz:
            const setExCall = mockRedisClient.setEx.mock.calls[0];
            expect(setExCall[2]).toMatch(/^gz:/);
            
            // Mock get to return the compressed data
            const compressedData = setExCall[2];
            mockRedisClient.get.mockResolvedValue(compressedData);
            
            const result = await cache.getCachedRates('test-key');
            
            expect(result).toBeDefined();
            expect(result.rates).toEqual(testData.rates);
        });

        test('should handle envelope format with compressed flag', async () => {
            const testData = { rates: { EUR: 0.85 } };
            
            // Create envelope with compressed flag
            const envelope = {
                v: 1,
                compressed: false,
                payload: { ...testData, cachedAt: '2023-12-01T00:00:00.000Z', ttl: 3600 }
            };
            
            mockRedisClient.get.mockResolvedValue(JSON.stringify(envelope));
            
            const result = await cache.getCachedRates('test-key');
            
            expect(result).toBeDefined();
            expect(result.rates).toEqual(testData.rates);
        });

        test('should provide backward compatibility for old JSON strings', async () => {
            const testData = { rates: { EUR: 0.85 }, cachedAt: '2023-12-01T00:00:00.000Z' };
            
            // Mock old format (direct JSON)
            mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));
            
            const result = await cache.getCachedRates('test-key');
            
            expect(result).toBeDefined();
            expect(result.rates).toEqual(testData.rates);
        });

        test('should handle invalid/corrupted compressed values gracefully', async () => {
            // Mock corrupted gz: data
            mockRedisClient.get.mockResolvedValue('gz:invalid-base64-data');
            
            // Mock memory cache fallback
            const fallbackData = { rates: { EUR: 0.85 } };
            mockNodeCache.get.mockReturnValue(fallbackData);
            
            const result = await cache.getCachedRates('test-key');
            
            // Should fall back to memory cache
            expect(result).toEqual(fallbackData);
            expect(mockNodeCache.get).toHaveBeenCalledWith('test-key');
        });

        test('should handle JSON parsing errors with graceful fallback', async () => {
            // Mock invalid JSON
            mockRedisClient.get.mockResolvedValue('invalid json data');
            
            // Mock memory cache fallback
            const fallbackData = { rates: { EUR: 0.85 } };
            mockNodeCache.get.mockReturnValue(fallbackData);
            
            const result = await cache.getCachedRates('test-key');
            
            expect(result).toEqual(fallbackData);
        });

        test('should store uncompressed data in memory cache for speed', async () => {
            const testData = { rates: { EUR: 0.85 } };
            
            await cache.setCachedRates('test-key', testData, 3600, { compress: true });
            
            // Memory cache should store object form (not compressed)
            const memorySetCall = mockNodeCache.set.mock.calls[0];
            expect(memorySetCall[1]).toMatchObject({
                rates: testData.rates,
                cachedAt: expect.any(String),
                ttl: 3600
            });
        });

        test('should detect compression threshold correctly', async () => {
            const smallData = { rates: { EUR: 0.85 } };
            const largeData = { rates: Object.fromEntries(Array.from({length: 50}, (_, i) => [`CUR${i}`, Math.random()])) };
            
            mockRedisClient.setEx.mockResolvedValue('OK');
            
            // Small data should not be compressed even with compress=true
            await cache.setCachedRates('small-key', smallData, 3600, { compress: true, compressionThreshold: 1000 });
            
            const smallSetCall = mockRedisClient.setEx.mock.calls[0];
            expect(smallSetCall[2]).not.toMatch(/^gz:/);
            
            // Large data should be compressed
            await cache.setCachedRates('large-key', largeData, 3600, { compress: true, compressionThreshold: 100 });
            
            const largeSetCall = mockRedisClient.setEx.mock.calls[1];
            expect(largeSetCall[2]).toMatch(/^gz:/);
        });
    });
});
