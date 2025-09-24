/**
 * SafeSplitX Currency Package
 * Multi-currency support and conversion utilities
 * @version 1.0.0
 */

const forex = require('./forex');
const validation = require('./validation');
const utils = require('./utils');
const config = require('./config');
const cache = require('./cache');
const providers = require('./providers');

// Module version
const VERSION = '1.0.0';

/**
 * Initialize the currency module
 * Sets up providers, cache, and configuration
 * @returns {Promise<Object>} Initialization result
 */
async function initialize() {
    try {
        console.log(`Initializing SafeSplitX Currency Module v${VERSION}`);

        // Initialize configuration
        const configResult = config.initializeConfig();
        if (!configResult.success) {
            return {
                success: false,
                error: `Currency module configuration failed - ${configResult.error}. Check environment variables and provider API keys.`
            };
        }

        // Initialize providers
        const providersResult = providers.initializeProviders();
        if (!providersResult.success) {
            return {
                success: false,
                error: `Currency providers setup failed - ${providersResult.error}. Verify API credentials and network connectivity.`
            };
        }

        // Initialize cache
        const cacheResult = await cache.initializeCache();
        if (!cacheResult.success) {
            console.warn('Currency cache initialization failed, continuing with reduced performance:', cacheResult.error);
        }

        // Warm up cache with common currency pairs if configured
        if (config.cache.enabled && config.cache.warmupCurrencies.length > 0) {
            try {
                await forex.warmCache(config.cache.warmupCurrencies);
                console.log('Cache warmed up with common currency pairs');
            } catch (warmupError) {
                console.warn('Cache warmup failed:', warmupError.message);
            }
        }

        return {
            success: true,
            data: {
                version: VERSION,
                providers: providersResult.data,
                cache: cacheResult.data,
                config: configResult.data
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Currency module startup failure - ${error.message}. Check system prerequisites and configuration files.`
        };
    }
}

/**
 * Get module health status
 * @returns {Promise<Object>} Health status of all components
 */
async function getHealthStatus() {
    try {
        const [forexHealth, cacheHealth, providersHealth] = await Promise.all([
            forex.getHealthStatus(),
            cache.getHealthStatus(),
            providers.runHealthChecks()
        ]);

        return {
            success: true,
            data: {
                version: VERSION,
                timestamp: new Date().toISOString(),
                forex: forexHealth.data,
                cache: cacheHealth.data,
                providers: providersHealth.data,
                overall: forexHealth.success && cacheHealth.success && providersHealth.success ? 'healthy' : 'degraded'
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Health check failed: ${error.message}`
        };
    }
}

/**
 * Get module information and statistics
 * @returns {Object} Module information
 */
function getModuleInfo() {
    return {
        name: 'SafeSplitX Currency Module',
        version: VERSION,
        description: 'Multi-currency support and conversion utilities with forex API integration',
        features: [
            'Multiple forex provider support (ExchangeRate-API, Fixer.io, CurrencyAPI)',
            'Redis-based caching with in-memory fallback',
            'Precise decimal arithmetic for currency calculations',
            'Comprehensive currency validation (ISO 4217)',
            'Historical exchange rates',
            'Automatic provider failover',
            'Rate limiting and health monitoring',
            'Support for 80+ currencies'
        ],
        supportedCurrencies: validation.getSupportedCurrencies().length,
        availableProviders: providers.getAvailableProviders(),
        configuration: config.getConfigSummary()
    };
}

/**
 * Gracefully shutdown the currency module
 * @returns {Promise<Object>} Shutdown result
 */
async function shutdown() {
    try {
        console.log('Shutting down SafeSplitX Currency Module...');

        // Close cache connections
        await cache.closeCache();

        return {
            success: true,
            message: 'Currency module shut down successfully'
        };

    } catch (error) {
        return {
            success: false,
            error: `Shutdown failed: ${error.message}`
        };
    }
}

// Export all currency module functions and utilities
module.exports = {
    // Module management
    initialize,
    getHealthStatus,
    getModuleInfo,
    shutdown,
    VERSION,

    // Core forex functions
    getExchangeRates: forex.getExchangeRates,
    convertCurrency: forex.convertCurrency,
    getHistoricalRates: forex.getHistoricalRates,
    getSupportedCurrencies: forex.getSupportedCurrencies,

    // Validation functions
    validateCurrencyCode: validation.validateCurrencyCode,
    validateAmount: validation.validateAmount,
    validateDate: validation.validateDate,
    validateApiResponse: validation.validateApiResponse,
    normalizeCurrencyCode: validation.normalizeCurrencyCode,
    formatCurrencyAmount: validation.formatCurrencyAmount,
    getCurrencyInfo: validation.getCurrencyInfo,
    isSupportedCurrency: validation.isSupportedCurrency,

    // Utility functions
    getCurrencyPrecision: utils.getCurrencyPrecision,
    calculateConversion: utils.calculateConversion,
    roundToDecimalPlaces: utils.roundToDecimalPlaces,
    formatCurrency: utils.formatCurrency,
    getCurrencySymbol: utils.getCurrencySymbol,
    parseCurrencyAmount: utils.parseCurrencyAmount,
    calculatePercentage: utils.calculatePercentage,
    addAmounts: utils.addAmounts,
    compareAmounts: utils.compareAmounts,
    convertPrecision: utils.convertPrecision,

    // Cache functions
    warmCache: forex.warmCache,
    getCacheStats: cache.getCacheStats,
    clearCache: cache.clearCache,
    invalidateCache: cache.invalidateCache,

    // Provider functions
    getAvailableProviders: providers.getAvailableProviders,
    getBestProvider: providers.getBestProvider,
    getAllProviderStats: providers.getAllProviderStats,

    // Configuration
    config: {
        getProviderConfig: config.getProviderConfig,
        getEnabledProviders: config.getEnabledProviders,
        isProviderEnabled: config.isProviderEnabled,
        getConfigSummary: config.getConfigSummary,
        validateConfiguration: config.validateConfiguration
    },

    // Constants and reference data
    SUPPORTED_CURRENCIES: validation.SUPPORTED_CURRENCIES,
    CURRENCY_PRECISION: utils.CURRENCY_PRECISION
};