/**
 * Configuration management for SafeSplitX currency module
 * Loads environment variables and provides validated configuration objects
 */

require('dotenv').config();

/**
 * Load configuration from environment variables with validation
 */
const config = {
    // Redis configuration for caching
    redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || null,
        database: parseInt(process.env.REDIS_DATABASE || '0', 10),
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10)
    },

    // Cache configuration
    cache: {
        enabled: process.env.CACHE_ENABLED !== 'false', // Default to true
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10), // 1 hour
        warmupTTL: parseInt(process.env.CACHE_WARMUP_TTL || '7200', 10), // 2 hours
        cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '600', 10), // 10 minutes
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10), // Max cache entries
        warmupCurrencies: (process.env.CACHE_WARMUP_CURRENCIES || 'USD,EUR,GBP,JPY,CNY,CAD,AUD').split(',').map(c => c.trim()),
        warmupBaseCurrencies: (process.env.CACHE_WARMUP_BASE_CURRENCIES || 'USD,EUR,GBP').split(',').map(c => c.trim())
    },

    // Forex API providers configuration
    providers: {
        // Provider priority order (first = highest priority)
        priority: (process.env.FOREX_PROVIDER_PRIORITY || 'exchangerate-api,currencyapi,fixer').split(',').map(p => p.trim()),

        // ExchangeRate-API configuration
        exchangerateapi: {
            enabled: process.env.EXCHANGERATE_API_ENABLED === 'true',
            apiKey: process.env.EXCHANGERATE_API_KEY,
            baseUrl: process.env.EXCHANGERATE_API_URL || 'https://v6.exchangerate-api.com/v6',
            timeout: parseInt(process.env.EXCHANGERATE_API_TIMEOUT || '10000', 10),
            rateLimit: parseInt(process.env.EXCHANGERATE_API_RATE_LIMIT || '1500', 10), // Requests per month
            rateLimitWindow: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
            requestsPerSecond: parseFloat(process.env.EXCHANGERATE_API_REQUESTS_PER_SECOND || '0.5'), // 0.5 RPS for free tier
            burstCapacity: parseInt(process.env.EXCHANGERATE_API_BURST_CAPACITY || '5', 10) // Allow 5 burst requests
        },

        // Fixer.io configuration
        fixer: {
            enabled: process.env.FIXER_API_ENABLED === 'true',
            apiKey: process.env.FIXER_API_KEY,
            baseUrl: process.env.FIXER_API_URL || 'http://data.fixer.io/api',
            timeout: parseInt(process.env.FIXER_API_TIMEOUT || '10000', 10),
            rateLimit: parseInt(process.env.FIXER_API_RATE_LIMIT || '100', 10), // Requests per month
            rateLimitWindow: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
            requestsPerSecond: parseFloat(process.env.FIXER_API_REQUESTS_PER_SECOND || '0.2'), // 0.2 RPS for free tier
            burstCapacity: parseInt(process.env.FIXER_API_BURST_CAPACITY || '3', 10) // Allow 3 burst requests
        },

        // CurrencyAPI configuration
        currencyapi: {
            enabled: process.env.CURRENCY_API_ENABLED === 'true',
            apiKey: process.env.CURRENCY_API_KEY,
            baseUrl: process.env.CURRENCY_API_URL || 'https://api.currencyapi.com/v3',
            timeout: parseInt(process.env.CURRENCY_API_TIMEOUT || '10000', 10),
            rateLimit: parseInt(process.env.CURRENCY_API_RATE_LIMIT || '300', 10), // Requests per month
            rateLimitWindow: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
            requestsPerSecond: parseFloat(process.env.CURRENCY_API_REQUESTS_PER_SECOND || '0.3'), // 0.3 RPS for free tier
            burstCapacity: parseInt(process.env.CURRENCY_API_BURST_CAPACITY || '4', 10) // Allow 4 burst requests
        }
    },

    // Default currency settings
    currency: {
        defaultBaseCurrency: process.env.DEFAULT_BASE_CURRENCY || 'USD',
        defaultTargetCurrencies: (process.env.DEFAULT_TARGET_CURRENCIES || 'EUR,GBP,JPY').split(',').map(c => c.trim()),
        maxConversionAmount: parseFloat(process.env.MAX_CONVERSION_AMOUNT || '1000000000'),
        minConversionAmount: parseFloat(process.env.MIN_CONVERSION_AMOUNT || '0.01'),
        defaultPrecision: parseInt(process.env.DEFAULT_PRECISION || '2', 10),
        maxPrecision: parseInt(process.env.MAX_PRECISION || '8', 10)
    },

    // Rate limiting and request management
    rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false', // Default to true
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableApiLogs: process.env.ENABLE_API_LOGS === 'true',
        enableCacheLogs: process.env.ENABLE_CACHE_LOGS === 'true',
        enableProviderLogs: process.env.ENABLE_PROVIDER_LOGS === 'true',
        logFormat: process.env.LOG_FORMAT || 'json'
    },

    // Health check configuration
    health: {
        enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000', 10), // 5 minutes
        timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
        retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10)
    },

    // Development and testing
    development: {
        mockProviders: process.env.MOCK_PROVIDERS === 'true',
        useTestData: process.env.USE_TEST_DATA === 'true',
        enableDebug: process.env.ENABLE_DEBUG === 'true',
        disableCache: process.env.DISABLE_CACHE === 'true'
    }
};

/**
 * Validate configuration and check for required values
 * @returns {Object} Validation result with any missing or invalid configurations
 */
function validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Check if at least one provider is enabled and configured
    const enabledProviders = Object.entries(config.providers)
        .filter(([key, provider]) => key !== 'priority' && provider.enabled)
        .map(([key]) => key);

    if (enabledProviders.length === 0) {
        errors.push('No forex providers are enabled. At least one provider must be configured.');
    }

    // Validate provider API keys
    for (const providerName of enabledProviders) {
        const provider = config.providers[providerName];
        if (!provider.apiKey) {
            errors.push(`API key missing for enabled provider: ${providerName}`);
        }
    }

    // Validate Redis configuration if enabled
    if (config.redis.enabled) {
        if (!config.redis.url) {
            errors.push('Redis URL is required when Redis is enabled');
        }

        try {
            const url = new URL(config.redis.url);
            if (!['redis:', 'rediss:'].includes(url.protocol)) {
                warnings.push('Redis URL should use redis:// or rediss:// protocol');
            }
        } catch (e) {
            errors.push('Invalid Redis URL format');
        }
    }

    // Validate cache configuration
    if (config.cache.defaultTTL < 60) {
        warnings.push('Cache TTL is very low (< 60 seconds), this may impact performance');
    }

    if (config.cache.maxSize > 10000) {
        warnings.push('Cache max size is very high (> 10,000), this may impact memory usage');
    }

    // Validate currency limits
    if (config.currency.minConversionAmount >= config.currency.maxConversionAmount) {
        errors.push('Min conversion amount must be less than max conversion amount');
    }

    if (config.currency.defaultPrecision > config.currency.maxPrecision) {
        errors.push('Default precision cannot exceed max precision');
    }

    // Validate base currency
    const baseCurrencyPattern = /^[A-Z]{3}$/;
    if (!baseCurrencyPattern.test(config.currency.defaultBaseCurrency)) {
        errors.push('Default base currency must be a 3-letter currency code');
    }

    // Validate target currencies
    for (const currency of config.currency.defaultTargetCurrencies) {
        if (!baseCurrencyPattern.test(currency)) {
            errors.push(`Invalid target currency code: ${currency}`);
        }
    }

    // Validate rate limiting
    if (config.rateLimit.enabled) {
        if (config.rateLimit.maxRequests <= 0) {
            errors.push('Rate limit max requests must be greater than 0');
        }

        if (config.rateLimit.windowMs < 1000) {
            warnings.push('Rate limit window is very short (< 1 second)');
        }
    }

    return {
        success: errors.length === 0,
        errors,
        warnings,
        enabledProviders,
        summary: {
            providersEnabled: enabledProviders.length,
            redisEnabled: config.redis.enabled,
            cacheEnabled: config.cache.enabled,
            rateLimitEnabled: config.rateLimit.enabled,
            healthCheckEnabled: config.health.enabled
        }
    };
}

/**
 * Get configuration for a specific provider
 * @param {string} providerName - Provider name
 * @returns {Object|null} Provider configuration or null if not found
 */
function getProviderConfig(providerName) {
    return config.providers[providerName] || null;
}

/**
 * Get list of enabled providers in priority order
 * @returns {Array} Array of enabled provider names
 */
function getEnabledProviders() {
    return config.providers.priority.filter(providerName => {
        const provider = config.providers[providerName];
        return provider && provider.enabled && provider.apiKey;
    });
}

/**
 * Check if a provider is enabled and properly configured
 * @param {string} providerName - Provider name
 * @returns {boolean} True if provider is enabled and configured
 */
function isProviderEnabled(providerName) {
    const provider = config.providers[providerName];
    return provider && provider.enabled && provider.apiKey;
}

/**
 * Get environment-specific configuration overrides
 * @returns {Object} Environment-specific overrides
 */
function getEnvironmentOverrides() {
    const env = process.env.NODE_ENV || 'development';
    
    const overrides = {
        development: {
            logging: { level: 'debug', enableDebug: true },
            cache: { defaultTTL: 300 }, // 5 minutes for faster testing
            health: { interval: 60000 } // 1 minute for faster feedback
        },
        
        test: {
            redis: { enabled: false }, // Use memory cache only
            cache: { defaultTTL: 60 }, // 1 minute for testing
            providers: { 
                // Use mock providers in test
                mockProviders: true 
            },
            logging: { level: 'error' } // Reduce logging noise
        },
        
        production: {
            logging: { level: 'warn' },
            cache: { defaultTTL: 3600 }, // 1 hour for production stability
            health: { interval: 300000 }, // 5 minutes
            rateLimit: { enabled: true } // Always enforce in production
        }
    };

    return overrides[env] || {};
}

/**
 * Apply environment-specific overrides to configuration
 * @returns {Object} Configuration with environment overrides applied
 */
function getConfigWithEnvironmentOverrides() {
    const overrides = getEnvironmentOverrides();
    return mergeDeep(config, overrides);
}

/**
 * Deep merge configuration objects
 * @param {Object} target - Target configuration object
 * @param {Object} source - Source configuration object
 * @returns {Object} Merged configuration
 */
function mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = mergeDeep(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

/**
 * Get configuration summary for diagnostics
 * @returns {Object} Configuration summary
 */
function getConfigSummary() {
    const validation = validateConfiguration();
    const enabledProviders = getEnabledProviders();
    
    return {
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        providers: {
            enabled: enabledProviders,
            priority: config.providers.priority,
            total: enabledProviders.length
        },
        cache: {
            enabled: config.cache.enabled,
            redis: config.redis.enabled,
            defaultTTL: config.cache.defaultTTL
        },
        currency: {
            baseCurrency: config.currency.defaultBaseCurrency,
            targetCurrencies: config.currency.defaultTargetCurrencies,
            precision: config.currency.defaultPrecision
        },
        rateLimit: {
            enabled: config.rateLimit.enabled,
            maxRequests: config.rateLimit.maxRequests,
            windowMs: config.rateLimit.windowMs
        },
        validation: {
            isValid: validation.success,
            errors: validation.errors.length,
            warnings: validation.warnings.length
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Initialize configuration and run validation
 * @returns {Object} Initialization result
 */
function initializeConfig() {
    try {
        const validation = validateConfiguration();
        
        if (!validation.success) {
            console.error('Configuration validation failed:');
            validation.errors.forEach(error => console.error(`  ERROR: ${error}`));
            
            return {
                success: false,
                error: validation.errors.join('; '),
                data: getConfigSummary(),
                validation
            };
        }
        
        if (validation.warnings.length > 0) {
            console.warn('Configuration warnings:');
            validation.warnings.forEach(warning => console.warn(`  WARNING: ${warning}`));
        }

        return {
            success: validation.success,
            data: getConfigSummary(),
            validation
        };

    } catch (error) {
        return {
            success: false,
            error: `Currency configuration loading failed - ${error.message}. Check environment variables, config files, and provider API key formats.`
        };
    }
}

// Export configuration and utility functions
module.exports = config;
module.exports.validateConfiguration = validateConfiguration;
module.exports.getProviderConfig = getProviderConfig;
module.exports.getEnabledProviders = getEnabledProviders;
module.exports.isProviderEnabled = isProviderEnabled;
module.exports.getEnvironmentOverrides = getEnvironmentOverrides;
module.exports.getConfigWithEnvironmentOverrides = getConfigWithEnvironmentOverrides;
module.exports.getConfigSummary = getConfigSummary;
module.exports.initializeConfig = initializeConfig;
