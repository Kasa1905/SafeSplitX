/**
 * Caching utilities for SafeSplitX forex operations
 * Provides Redis-based caching with in-memory fallback for exchange rates
 */

const redis = require('redis');
const NodeCache = require('node-cache');
const config = require('./config');

// In-memory cache fallback
let memoryCache = null;
let redisClient = null;
let isRedisConnected = false;

// Cache statistics
const stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    errors: 0,
    redisHits: 0,
    memoryHits: 0
};

/**
 * Initialize caching system
 * Sets up Redis client with fallback to in-memory cache
 * @returns {Promise<Object>} Initialization result
 */
async function initializeCache() {
    try {
        // Initialize in-memory cache as fallback
        memoryCache = new NodeCache({ 
            stdTTL: config.cache.defaultTTL,
            checkperiod: config.cache.cleanupInterval || 600,
            useClones: false
        });

        // Try to initialize Redis if configured
        if (config.redis.enabled) {
            try {
                redisClient = redis.createClient({
                    url: config.redis.url,
                    password: config.redis.password,
                    database: config.redis.database,
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 3,
                    lazyConnect: true,
                    connectTimeout: 5000,
                    commandTimeout: 3000
                });

                // Redis event handlers
                redisClient.on('error', (error) => {
                    console.warn('Redis connection error:', error.message);
                    isRedisConnected = false;
                    stats.errors++;
                });

                redisClient.on('connect', () => {
                    console.log('Redis client connected');
                    isRedisConnected = true;
                });

                redisClient.on('disconnect', () => {
                    console.warn('Redis client disconnected');
                    isRedisConnected = false;
                });

                // Attempt connection
                await redisClient.connect();
                
                return {
                    success: true,
                    data: {
                        redis: isRedisConnected,
                        memory: true,
                        message: isRedisConnected ? 'Redis and memory cache initialized' : 'Memory cache initialized (Redis unavailable)'
                    }
                };

            } catch (redisError) {
                console.warn('Redis cache connection failed, falling back to in-memory cache only:', redisError.message, '- Performance may be reduced in multi-instance deployments');
                isRedisConnected = false;
                redisClient = null;
            }
        }

        return {
            success: true,
            data: {
                redis: false,
                memory: true,
                message: 'Memory cache initialized'
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Currency cache system failed - ${error.message}. Check Redis connection, memory limits, and cache configuration.`
        };
    }
}

/**
 * Generate cache key for exchange rates
 * @param {string} baseCurrency - Base currency code
 * @param {string[]} targetCurrencies - Target currency codes
 * @param {string} provider - Provider name (e.g., 'fixer', 'exchangerate-api')
 * @returns {string} Cache key
 */
function generateRatesCacheKey(baseCurrency, targetCurrencies = [], provider = 'default') {
    const targets = Array.isArray(targetCurrencies) ? targetCurrencies.sort().join(',') : '';
    return `forex:rates:${provider}:${baseCurrency}:${targets}`;
}

/**
 * Generate cache key for historical rates
 * @param {string} baseCurrency - Base currency code
 * @param {string[]} targetCurrencies - Target currency codes
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} provider - Provider name (e.g., 'fixer', 'exchangerate-api')
 * @returns {string} Cache key
 */
function generateHistoricalCacheKey(baseCurrency, targetCurrencies = [], date, provider = 'default') {
    const targets = Array.isArray(targetCurrencies) ? targetCurrencies.sort().join(',') : '';
    return `forex:historical:${provider}:${baseCurrency}:${targets}:${date}`;
}

/**
 * Get cached exchange rates
 * @param {string} cacheKey - Cache key
 * @param {Object} options - Options for cache retrieval
 * @param {boolean} options.preferRedis - Prefer Redis over memory cache (default: true)
 * @returns {Promise<Object|null>} Cached data or null if not found
 */
async function getCachedRates(cacheKey, options = {}) {
    const { preferRedis = true } = options;

    try {
        // Try Redis first if available and preferred
        if (preferRedis && isRedisConnected && redisClient) {
            try {
                const redisData = await redisClient.get(cacheKey);
                if (redisData) {
                    stats.hits++;
                    stats.redisHits++;
                    
                    // Handle compressed data with gz: prefix
                    if (typeof redisData === 'string' && redisData.startsWith('gz:')) {
                        try {
                            const zlib = require('zlib');
                            const base64Data = redisData.slice(3); // Remove 'gz:' prefix
                            const compressedBuffer = Buffer.from(base64Data, 'base64');
                            const decompressedData = zlib.gunzipSync(compressedBuffer).toString();
                            const envelope = JSON.parse(decompressedData);
                            return envelope.payload;
                        } catch (decompressError) {
                            console.warn('Decompression error, falling back to memory cache:', decompressError.message);
                            stats.errors++;
                            // Continue to memory cache fallback
                        }
                    } else {
                        try {
                            // Try to parse as envelope format
                            const parsed = JSON.parse(redisData);
                            if (parsed && typeof parsed === 'object' && parsed.v === 1 && parsed.payload) {
                                // New envelope format
                                if (parsed.compressed) {
                                    try {
                                        const zlib = require('zlib');
                                        const compressedBuffer = Buffer.from(parsed.payload, 'base64');
                                        const decompressedData = zlib.gunzipSync(compressedBuffer).toString();
                                        return JSON.parse(decompressedData);
                                    } catch (decompressError) {
                                        console.warn('Envelope decompression error:', decompressError.message);
                                        stats.errors++;
                                        // Continue to memory cache fallback
                                    }
                                } else {
                                    return parsed.payload;
                                }
                            } else {
                                // Backward compatibility - old format (direct JSON)
                                return parsed;
                            }
                        } catch (jsonError) {
                            console.warn('JSON parse error, falling back to memory cache:', jsonError.message);
                            stats.errors++;
                            // Continue to memory cache fallback
                        }
                    }
                }
            } catch (redisError) {
                console.warn('Redis get error:', redisError.message);
                stats.errors++;
            }
        }

        // Fallback to memory cache (stored as objects for speed)
        if (memoryCache) {
            const memoryData = memoryCache.get(cacheKey);
            if (memoryData) {
                stats.hits++;
                stats.memoryHits++;
                return memoryData;
            }
        }

        stats.misses++;
        return null;

    } catch (error) {
        console.warn('Cache retrieval error:', error.message);
        stats.errors++;
        stats.misses++;
        return null;
    }
}

/**
 * Set cached exchange rates
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @param {Object} options - Caching options
 * @param {boolean} options.setRedis - Set in Redis (default: true)
 * @param {boolean} options.setMemory - Set in memory (default: true)
 * @param {boolean} options.compress - Compress data for Redis (default: false)
 * @param {number} options.compressionThreshold - Size threshold for compression (default: 1024)
 * @returns {Promise<Object>} Set operation result
 */
async function setCachedRates(cacheKey, data, ttl = config.cache.defaultTTL, options = {}) {
    const { setRedis = true, setMemory = true, compress = false, compressionThreshold = 1024 } = options;
    const results = { redis: false, memory: false };

    if (!data) {
        return { success: false, error: 'No data provided for caching' };
    }

    try {
        // Add metadata to the payload
        const payload = {
            ...data,
            cachedAt: new Date().toISOString(),
            ttl
        };

        // Set in Redis if available and requested
        if (setRedis && isRedisConnected && redisClient) {
            try {
                // Create envelope format
                const envelope = {
                    v: 1,
                    compressed: false,
                    payload: payload
                };

                let dataToCache = JSON.stringify(envelope);
                
                // Apply compression if enabled and size exceeds threshold
                if (compress && dataToCache.length > compressionThreshold) {
                    const zlib = require('zlib');
                    const compressedBuffer = zlib.gzipSync(Buffer.from(dataToCache));
                    const base64Compressed = compressedBuffer.toString('base64');
                    dataToCache = `gz:${base64Compressed}`;
                } else if (compress) {
                    // Still use envelope but mark as uncompressed if under threshold
                    envelope.compressed = false;
                    dataToCache = JSON.stringify(envelope);
                }

                await redisClient.setEx(cacheKey, ttl, dataToCache);
                results.redis = true;
            } catch (redisError) {
                console.warn('Redis set error:', redisError.message);
                stats.errors++;
            }
        }

        // Set in memory cache if requested (store object form for speed)
        if (setMemory && memoryCache) {
            try {
                memoryCache.set(cacheKey, payload, ttl);
                results.memory = true;
            } catch (memoryError) {
                console.warn('Memory cache set error:', memoryError.message);
                stats.errors++;
            }
        }

        stats.sets++;

        return {
            success: results.redis || results.memory,
            data: {
                redis: results.redis,
                memory: results.memory,
                key: cacheKey,
                ttl,
                compressed: compress && results.redis
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Cache set failed: ${error.message}`
        };
    }
}

/**
 * Invalidate cached data
 * @param {string|string[]} cacheKeys - Cache key(s) to invalidate
 * @param {Object} options - Invalidation options
 * @param {boolean} options.pattern - Treat keys as patterns (Redis only)
 * @returns {Promise<Object>} Invalidation result
 */
async function invalidateCache(cacheKeys, options = {}) {
    const { pattern = false } = options;
    const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
    const results = { redis: 0, memory: 0 };

    try {
        for (const key of keys) {
            // Redis invalidation
            if (isRedisConnected && redisClient) {
                try {
                    if (pattern) {
                        // Pattern-based deletion for Redis
                        const matchingKeys = await redisClient.keys(key);
                        if (matchingKeys.length > 0) {
                            await redisClient.del(...matchingKeys);
                            results.redis += matchingKeys.length;
                        }
                    } else {
                        const deleted = await redisClient.del(key);
                        results.redis += deleted;
                    }
                } catch (redisError) {
                    console.warn('Redis invalidation error:', redisError.message);
                    stats.errors++;
                }
            }

            // Memory cache invalidation
            if (memoryCache) {
                try {
                    if (pattern) {
                        // Pattern-based deletion for memory cache
                        const allKeys = memoryCache.keys();
                        // Escape special regex characters to prevent injection
                        const utils = require('./utils');
                        const escapedKey = utils.escapeRegex(key);
                        const regex = new RegExp(escapedKey.replace(/\\\*/g, '.*'));
                        const matchingKeys = allKeys.filter(k => regex.test(k));
                        
                        for (const matchingKey of matchingKeys) {
                            memoryCache.del(matchingKey);
                            results.memory++;
                        }
                    } else {
                        const deleted = memoryCache.del(key);
                        results.memory += deleted ? 1 : 0;
                    }
                } catch (memoryError) {
                    console.warn('Memory cache invalidation error:', memoryError.message);
                    stats.errors++;
                }
            }
        }

        return {
            success: true,
            data: {
                redis: results.redis,
                memory: results.memory,
                total: results.redis + results.memory
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Cache invalidation failed: ${error.message}`
        };
    }
}

/**
 * Unified cache warming for both current and historical rates
 * @param {Object} options - Warming configuration
 * @param {Array} options.currencyPairs - Array of {base, targets} objects
 * @param {string[]} options.dates - Optional dates for historical rate warming (YYYY-MM-DD format)
 * @param {string} options.provider - Provider to use for cache keys
 * @param {boolean} options.fetchRealData - Whether to fetch real data or use placeholders
 * @param {Function} options.getRatesFunction - Function to fetch current rates
 * @param {Function} options.getHistoricalRatesFunction - Function to fetch historical rates
 * @returns {Promise<Object>} Unified warming result
 */
async function _warmCacheInternal(options = {}) {
    const {
        currencyPairs = [],
        dates = [],
        provider = 'default',
        fetchRealData = false,
        getRatesFunction = null,
        getHistoricalRatesFunction = null
    } = options;

    const results = { 
        currentRates: { success: 0, failed: 0, errors: [] },
        historicalRates: { success: 0, failed: 0, errors: [] }
    };

    try {
        // Warm current rates
        for (const pair of currencyPairs) {
            try {
                const { base, targets } = pair;
                const cacheKey = generateRatesCacheKey(base, targets, provider);
                
                // Check if already cached
                const existing = await getCachedRates(cacheKey);
                if (existing) {
                    continue; // Skip if already cached
                }

                let rateData;
                if (fetchRealData && getRatesFunction) {
                    // Fetch real data using provided function
                    const apiResult = await getRatesFunction(base, targets);
                    if (apiResult.success) {
                        rateData = {
                            baseCurrency: base,
                            rates: apiResult.data.rates,
                            timestamp: apiResult.data.timestamp || new Date().toISOString(),
                            provider: apiResult.data.provider || provider
                        };
                    } else {
                        throw new Error(apiResult.error);
                    }
                } else {
                    // Create placeholder data
                    rateData = {
                        baseCurrency: base,
                        rates: targets.reduce((acc, target) => {
                            acc[target] = 1.0; // Placeholder rate
                            return acc;
                        }, {}),
                        timestamp: new Date().toISOString(),
                        provider: provider
                    };
                }

                await setCachedRates(cacheKey, rateData, config.cache.warmupTTL || 3600);
                results.currentRates.success++;

            } catch (pairError) {
                results.currentRates.failed++;
                results.currentRates.errors.push(`${pair.base}->[${pair.targets.join(',')}]: ${pairError.message}`);
            }
        }

        // Warm historical rates if dates are provided
        if (dates.length > 0 && currencyPairs.length > 0) {
            for (const date of dates) {
                for (const pair of currencyPairs) {
                    try {
                        const { base, targets } = pair;
                        const cacheKey = generateHistoricalCacheKey(base, targets, date, provider);
                        
                        // Check if already cached
                        const existing = await getCachedRates(cacheKey);
                        if (existing) {
                            continue; // Skip if already cached
                        }

                        let rateData;
                        if (fetchRealData && getHistoricalRatesFunction) {
                            // Fetch real historical data
                            const apiResult = await getHistoricalRatesFunction(base, targets, date);
                            if (apiResult.success) {
                                rateData = {
                                    baseCurrency: base,
                                    rates: apiResult.data.rates,
                                    timestamp: apiResult.data.timestamp || date,
                                    provider: apiResult.data.provider || provider,
                                    date: date
                                };
                            } else {
                                throw new Error(apiResult.error);
                            }
                        } else {
                            // Create placeholder historical data
                            rateData = {
                                baseCurrency: base,
                                rates: targets.reduce((acc, target) => {
                                    acc[target] = 1.0 + (Math.random() * 0.1 - 0.05); // Slight variation for historical data
                                    return acc;
                                }, {}),
                                timestamp: date,
                                provider: provider,
                                date: date
                            };
                        }

                        await setCachedRates(cacheKey, rateData, config.cache.warmupTTL || 3600);
                        results.historicalRates.success++;

                    } catch (pairError) {
                        results.historicalRates.failed++;
                        results.historicalRates.errors.push(`${pair.base}->[${pair.targets.join(',')}] on ${date}: ${pairError.message}`);
                    }
                }
            }
        }

        return {
            success: true,
            data: {
                currentRates: {
                    warmed: results.currentRates.success,
                    failed: results.currentRates.failed,
                    errors: results.currentRates.errors
                },
                historicalRates: {
                    warmed: results.historicalRates.success,
                    failed: results.historicalRates.failed,
                    errors: results.historicalRates.errors
                },
                totalWarmed: results.currentRates.success + results.historicalRates.success,
                totalFailed: results.currentRates.failed + results.historicalRates.failed
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Cache warming failed: ${error.message}`
        };
    }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
    const memoryStats = memoryCache ? {
        keys: memoryCache.keys().length,
        size: memoryCache.getStats().vsize
    } : { keys: 0, size: 0 };

    return {
        hits: stats.hits,
        misses: stats.misses,
        sets: stats.sets,
        errors: stats.errors,
        hitRate: stats.hits + stats.misses > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0,
        redis: {
            connected: isRedisConnected,
            hits: stats.redisHits
        },
        memory: {
            hits: stats.memoryHits,
            ...memoryStats
        }
    };
}

/**
 * Get cache health status
 * @returns {Promise<Object>} Health status
 */
async function getHealthStatus() {
    try {
        const health = {
            redis: {
                available: isRedisConnected,
                status: 'unknown'
            },
            memory: {
                available: memoryCache !== null,
                status: 'unknown'
            },
            overall: 'unknown'
        };

        // Check Redis health
        if (isRedisConnected && redisClient) {
            try {
                await redisClient.ping();
                health.redis.status = 'healthy';
            } catch (error) {
                health.redis.status = 'unhealthy';
                health.redis.error = error.message;
            }
        } else {
            health.redis.status = 'unavailable';
        }

        // Check memory cache health
        if (memoryCache) {
            health.memory.status = 'healthy';
        } else {
            health.memory.status = 'unavailable';
        }

        // Determine overall status
        health.overall = (health.redis.status === 'healthy' || health.redis.status === 'unavailable') && 
                        health.memory.status === 'healthy' ? 'healthy' : 'degraded';

        return {
            success: true,
            data: health
        };

    } catch (error) {
        return {
            success: false,
            error: `Health check failed: ${error.message}`
        };
    }
}

/**
 * Clear all cached data
 * @param {Object} options - Clear options
 * @param {boolean} options.redis - Clear Redis cache (default: true)
 * @param {boolean} options.memory - Clear memory cache (default: true)
 * @returns {Promise<Object>} Clear result
 */
async function clearCache(options = {}) {
    const { redis = true, memory = true } = options;
    const results = { redis: false, memory: false };

    try {
        // Clear Redis
        if (redis && isRedisConnected && redisClient) {
            try {
                await redisClient.flushDb();
                results.redis = true;
            } catch (redisError) {
                console.warn('Redis clear error:', redisError.message);
            }
        }

        // Clear memory cache
        if (memory && memoryCache) {
            try {
                memoryCache.flushAll();
                results.memory = true;
            } catch (memoryError) {
                console.warn('Memory cache clear error:', memoryError.message);
            }
        }

        // Reset statistics
        Object.keys(stats).forEach(key => {
            stats[key] = 0;
        });

        return {
            success: results.redis || results.memory,
            data: results
        };

    } catch (error) {
        return {
            success: false,
            error: `Cache clear failed: ${error.message}`
        };
    }
}

/**
 * Close cache connections
 * @returns {Promise<Object>} Close result
 */
async function closeCache() {
    try {
        if (redisClient) {
            await redisClient.quit();
            redisClient = null;
            isRedisConnected = false;
        }

        if (memoryCache) {
            memoryCache.close();
            memoryCache = null;
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: `Cache close failed: ${error.message}`
        };
    }
}

module.exports = {
    initializeCache,
    generateRatesCacheKey,
    generateHistoricalCacheKey,
    getCachedRates,
    setCachedRates,
    invalidateCache,
    getCacheStats,
    getHealthStatus,
    clearCache,
    closeCache,
    _warmCacheInternal
};
