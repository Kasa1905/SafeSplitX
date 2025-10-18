/**
 * Core forex module for SafeSplitX currency operations
 * Provides exchange rate retrieval and currency conversion functionality
 * with multi-provider support and robust error handling
 */

const providers = require('./providers');
const cache = require('./cache');
const config = require('./config');
const validation = require('./validation');
const utils = require('./utils');

/**
 * Get current exchange rates for specified currencies
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @param {string[]} targetCurrencies - Array of target currency codes
 * @param {Object} options - Optional parameters
 * @param {boolean} options.useCache - Whether to use cached rates (default: true)
 * @param {string} options.provider - Preferred provider name
 * @returns {Promise<Object>} Response object with success flag and data/error
 * 
 * @example
 * const result = await getExchangeRates('USD', ['EUR', 'GBP']);
 * if (result.success) {
 *   console.log(result.data.rates); // { EUR: 0.85, GBP: 0.73 }
 * }
 */
async function getExchangeRates(baseCurrency, targetCurrencies = [], options = {}) {
    try {
        // Validate inputs
        const validation_result = validation.validateCurrencyCode(baseCurrency);
        if (!validation_result.success) {
            return { success: false, error: `Invalid base currency: ${validation_result.error}` };
        }

        for (const currency of targetCurrencies) {
            const target_validation = validation.validateCurrencyCode(currency);
            if (!target_validation.success) {
                return { success: false, error: `Invalid target currency ${currency}: ${target_validation.error}` };
            }
        }

        const {
            useCache = true,
            provider = null,
            maxAge = config.cache.defaultTTL
        } = options;

        // First try cache with preferred provider, then with default
        let cachedResult = null;
        if (useCache) {
            try {
                // Try cache with specific provider first
                if (provider) {
                    const providerCacheKey = cache.generateRatesCacheKey(baseCurrency, targetCurrencies, provider);
                    cachedResult = await cache.getCachedRates(providerCacheKey);
                }
                
                // Fallback to default provider cache if no specific provider cache found
                if (!cachedResult) {
                    const defaultCacheKey = cache.generateRatesCacheKey(baseCurrency, targetCurrencies, 'default');
                    cachedResult = await cache.getCachedRates(defaultCacheKey);
                }

                if (cachedResult) {
                    return {
                        success: true,
                        data: {
                            baseCurrency,
                            rates: cachedResult.rates,
                            timestamp: cachedResult.timestamp,
                            source: 'cache',
                            provider: cachedResult.provider
                        }
                    };
                }
            } catch (cacheError) {
                // Log cache error but continue with API call
                console.warn('Cache retrieval failed:', cacheError.message);
            }
        }

        // Get rates from providers with fallback
        const result = await fetchRatesWithFallback(baseCurrency, targetCurrencies, provider);

        if (!result.success) {
            return result;
        }

        // Cache successful results using the actual provider that returned data
        if (useCache && result.data.rates) {
            try {
                const actualProvider = result.data.provider || 'default';
                const cacheKey = cache.generateRatesCacheKey(baseCurrency, targetCurrencies, actualProvider);
                
                await cache.setCachedRates(cacheKey, {
                    rates: result.data.rates,
                    timestamp: result.data.timestamp,
                    provider: result.data.provider
                }, maxAge);
            } catch (cacheError) {
                // Log cache error but don't fail the request
                console.warn('Cache storage failed:', cacheError.message);
            }
        }

        return result;

    } catch (error) {
        return {
            success: false,
            error: `Failed to get exchange rates: ${error.message}`
        };
    }
}

/**
 * Convert currency amount using current exchange rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} options - Optional parameters
 * @param {boolean} options.useCache - Whether to use cached rates (default: true)
 * @param {string} options.provider - Preferred provider name
 * @param {number} options.precision - Decimal precision for result (default: 2)
 * @returns {Promise<Object>} Response object with conversion result
 * 
 * @example
 * const result = await convertCurrency(100, 'USD', 'EUR');
 * if (result.success) {
 *   console.log(`${result.data.originalAmount} ${result.data.fromCurrency} = ${result.data.convertedAmount} ${result.data.toCurrency}`);
 * }
 */
async function convertCurrency(amount, fromCurrency, toCurrency, options = {}) {
    try {
        // Validate inputs
        const amountValidation = validation.validateAmount(amount);
        if (!amountValidation.success) {
            return { success: false, error: `Invalid amount: ${amountValidation.error}` };
        }

        const fromValidation = validation.validateCurrencyCode(fromCurrency);
        if (!fromValidation.success) {
            return { success: false, error: `Invalid from currency: ${fromValidation.error}` };
        }

        const toValidation = validation.validateCurrencyCode(toCurrency);
        if (!toValidation.success) {
            return { success: false, error: `Invalid to currency: ${toValidation.error}` };
        }

        // Same currency conversion
        if (fromCurrency === toCurrency) {
            return {
                success: true,
                data: {
                    originalAmount: amount,
                    convertedAmount: amount,
                    fromCurrency,
                    toCurrency,
                    exchangeRate: 1.0,
                    timestamp: new Date().toISOString(),
                    source: 'direct'
                }
            };
        }

        const {
            useCache = true,
            provider = null,
            precision = utils.getCurrencyPrecision(toCurrency)
        } = options;

        // Get exchange rates
        const ratesResult = await getExchangeRates(fromCurrency, [toCurrency], { useCache, provider });

        if (!ratesResult.success) {
            return {
                success: false,
                error: `Failed to get exchange rate: ${ratesResult.error}`
            };
        }

        const exchangeRate = ratesResult.data.rates[toCurrency];
        if (!exchangeRate) {
            return {
                success: false,
                error: `Exchange rate not available for ${fromCurrency} to ${toCurrency}`
            };
        }

        // Perform conversion with precision handling
        const convertedAmount = utils.calculateConversion(amount, exchangeRate, precision);

        return {
            success: true,
            data: {
                originalAmount: amount,
                convertedAmount,
                fromCurrency,
                toCurrency,
                exchangeRate,
                timestamp: ratesResult.data.timestamp,
                source: ratesResult.data.source,
                provider: ratesResult.data.provider,
                precision
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Currency conversion failed: ${error.message}`
        };
    }
}

/**
 * Get historical exchange rates for a specific date
 * @param {string} baseCurrency - Base currency code
 * @param {string[]} targetCurrencies - Target currency codes
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Response object with historical rates
 */
async function getHistoricalRates(baseCurrency, targetCurrencies, date, options = {}) {
    try {
        // Validate inputs
        const dateValidation = validation.validateDate(date);
        if (!dateValidation.success) {
            return { success: false, error: `Invalid date: ${dateValidation.error}` };
        }

        const validation_result = validation.validateCurrencyCode(baseCurrency);
        if (!validation_result.success) {
            return { success: false, error: `Invalid base currency: ${validation_result.error}` };
        }

        // Use provider-specific historical data fetching
        const result = await fetchHistoricalRatesWithFallback(baseCurrency, targetCurrencies, date, options.provider);
        return result;

    } catch (error) {
        return {
            success: false,
            error: `Failed to get historical rates: ${error.message}`
        };
    }
}

/**
 * Get list of supported currencies from providers
 * @param {string} provider - Optional specific provider name
 * @returns {Promise<Object>} Response object with supported currencies
 */
async function getSupportedCurrencies(provider = null) {
    try {
        const availableProviders = provider ? [provider] : config.providers.priority;
        
        for (const providerName of availableProviders) {
            try {
                const providerInstance = providers.getProvider(providerName);
                if (!providerInstance) continue;

                const result = await providerInstance.getSupportedCurrencies();
                if (result.success) {
                    return {
                        success: true,
                        data: {
                            currencies: result.data.currencies,
                            provider: providerName,
                            timestamp: new Date().toISOString()
                        }
                    };
                }
            } catch (providerError) {
                console.warn(`Provider ${providerName} failed:`, providerError.message);
                continue;
            }
        }

        return {
            success: false,
            error: 'No providers available for currency list retrieval'
        };

    } catch (error) {
        return {
            success: false,
            error: `Failed to get supported currencies: ${error.message}`
        };
    }
}

// Provider health tracking for optimized failover
const providerHealthTracker = {
    lastSuccess: {},
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes
    
    isHealthy(providerName) {
        const lastSuccessTime = this.lastSuccess[providerName];
        if (!lastSuccessTime) return false;
        
        return (Date.now() - lastSuccessTime) < this.healthCheckInterval;
    },
    
    markSuccess(providerName) {
        this.lastSuccess[providerName] = Date.now();
    },
    
    markFailure(providerName) {
        delete this.lastSuccess[providerName];
    }
};

/**
 * Fetch exchange rates with automatic provider fallback
 * @private
 * @param {string} baseCurrency - Base currency code
 * @param {string[]} targetCurrencies - Target currency codes
 * @param {string} preferredProvider - Preferred provider name
 * @returns {Promise<Object>} Response object with rates
 */
async function fetchRatesWithFallback(baseCurrency, targetCurrencies, preferredProvider = null) {
    const available = preferredProvider
        ? [preferredProvider, ...config.providers.priority.filter(p => p !== preferredProvider)]
        : config.providers.priority;
    const ordered = [...available].sort((a, b) => (providerHealthTracker.isHealthy(b) ? 1 : 0) - (providerHealthTracker.isHealthy(a) ? 1 : 0));

    let lastError = null;

    for (const providerName of ordered) {
        try {
            const providerInstance = providers.getProvider(providerName);
            if (!providerInstance) {
                lastError = new Error(`Provider ${providerName} not available`);
                continue;
            }

            // Optimistic fetching: call getRates directly without health check
            const result = await providerInstance.getRates(baseCurrency, targetCurrencies);
            
            if (result.success) {
                // Mark provider as successful for future optimizations
                providerHealthTracker.markSuccess(providerName);
                
                return {
                    success: true,
                    data: {
                        baseCurrency,
                        rates: result.data.rates,
                        timestamp: result.data.timestamp || new Date().toISOString(),
                        source: 'api',
                        provider: providerName
                    }
                };
            } else {
                providerHealthTracker.markFailure(providerName);
                lastError = new Error(`Provider ${providerName} returned error: ${result.error}`);
            }

        } catch (error) {
            providerHealthTracker.markFailure(providerName);
            lastError = error;
            console.warn(`Provider ${providerName} failed:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    };
}

/**
 * Fetch historical rates with provider fallback
 * @private
 * @param {string} baseCurrency - Base currency code
 * @param {string[]} targetCurrencies - Target currency codes
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} preferredProvider - Preferred provider name
 * @returns {Promise<Object>} Response object with historical rates
 */
async function fetchHistoricalRatesWithFallback(baseCurrency, targetCurrencies, date, preferredProvider = null) {
    const available = preferredProvider
        ? [preferredProvider, ...config.providers.priority.filter(p => p !== preferredProvider)]
        : config.providers.priority;
    const ordered = [...available].sort((a, b) => (providerHealthTracker.isHealthy(b) ? 1 : 0) - (providerHealthTracker.isHealthy(a) ? 1 : 0));

    let lastError = null;

    for (const providerName of ordered) {
        try {
            const providerInstance = providers.getProvider(providerName);
            if (!providerInstance) {
                lastError = new Error(`Provider ${providerName} not available`);
                continue;
            }

            // Optimistic fetching: call getHistoricalRates directly without health check
            const result = await providerInstance.getHistoricalRates(baseCurrency, targetCurrencies, date);
            
            if (result.success) {
                // Mark provider as successful for future optimizations
                providerHealthTracker.markSuccess(providerName);
                
                return {
                    success: true,
                    data: {
                        baseCurrency,
                        rates: result.data.rates,
                        timestamp: result.data.timestamp || date,
                        source: 'api',
                        provider: providerName
                    }
                };
            } else {
                providerHealthTracker.markFailure(providerName);
                lastError = new Error(`Provider ${providerName} returned error: ${result.error}`);
            }

        } catch (error) {
            providerHealthTracker.markFailure(providerName);
            lastError = error;
            console.warn(`Historical rates provider ${providerName} failed:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: `All historical rates providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    };
}

/**
 * Warm up cache with commonly used currency pairs
 * Uses the unified cache warming method with real data fetching
 * @param {string[]} currencies - List of currencies to warm up
 * @param {Object} options - Additional warming options
 * @returns {Promise<Object>} Response object with warming results
 */
async function warmCache(currencies = config.cache.warmupCurrencies, options = {}) {
    try {
        if (!currencies || currencies.length === 0) {
            return {
                success: false,
                error: 'No currencies provided for cache warming'
            };
        }

        // Generate currency pairs from the provided currencies with multiple base currencies
        const baseCurrencies = options.baseCurrencies || config.cache.warmupBaseCurrencies || ['USD', 'EUR', 'GBP'];
        const currencyPairs = [];
        
        // Prioritize major trading pairs first (USD, EUR, GBP bases)
        const majorBaseCurrencies = ['USD', 'EUR', 'GBP'].filter(base => baseCurrencies.includes(base));
        const minorBaseCurrencies = baseCurrencies.filter(base => !['USD', 'EUR', 'GBP'].includes(base));
        const orderedBaseCurrencies = [...majorBaseCurrencies, ...minorBaseCurrencies];
        
        for (const base of orderedBaseCurrencies) {
            const targets = currencies.filter(c => c !== base);
            if (targets.length > 0) {
                // For major currencies, include all targets; for minor currencies, limit to major targets
                const optimizedTargets = majorBaseCurrencies.includes(base) 
                    ? targets 
                    : targets.filter(t => ['USD', 'EUR', 'GBP', 'JPY', 'CHF'].includes(t));
                    
                if (optimizedTargets.length > 0) {
                    currencyPairs.push({ base, targets: optimizedTargets });
                }
            }
        }

        if (currencyPairs.length === 0) {
            return {
                success: false,
                error: 'No valid currency pairs generated for warming'
            };
        }

        console.log(`Warming cache for ${currencyPairs.length} base currencies: ${baseCurrencies.join(', ')}`);
        console.log(`Target currencies: ${currencies.join(', ')}`);

        // Use unified cache warming with real data fetching
        const result = await cache._warmCacheInternal({
            currencyPairs,
            dates: options.historicalDates || [],
            provider: options.provider || 'default',
            fetchRealData: true,
            getRatesFunction: async (base, targets) => {
                return await getExchangeRates(base, targets, { useCache: false });
            },
            getHistoricalRatesFunction: options.historicalDates ? async (base, targets, date) => {
                return await getHistoricalRates(base, targets, date, { useCache: false });
            } : null
        });

        // Transform the unified result to match the expected forex warmCache format
        if (result.success) {
            return {
                success: true,
                data: {
                    warmedPairs: result.data.totalWarmed,
                    failedPairs: result.data.totalFailed,
                    currentRates: result.data.currentRates,
                    historicalRates: result.data.historicalRates,
                    baseCurrencies: orderedBaseCurrencies,
                    baseCurrencyCount: orderedBaseCurrencies.length,
                    targetCurrencies: currencies,
                    optimization: {
                        majorBaseCurrencies: majorBaseCurrencies.length,
                        minorBaseCurrencies: minorBaseCurrencies.length,
                        totalPairsGenerated: currencyPairs.length
                    }
                }
            };
        } else {
            return result;
        }

    } catch (error) {
        return {
            success: false,
            error: `Cache warming failed: ${error.message}`
        };
    }
}

/**
 * Get forex module health status
 * @returns {Promise<Object>} Response object with health information
 */
async function getHealthStatus() {
    try {
        const providerStatuses = [];
        const cacheStatus = await cache.getHealthStatus();

        for (const providerName of config.providers.priority) {
            try {
                const providerInstance = providers.getProvider(providerName);
                if (providerInstance) {
                    const health = await providerInstance.healthCheck();
                    providerStatuses.push({
                        provider: providerName,
                        status: health.success ? 'healthy' : 'unhealthy',
                        error: health.error
                    });
                }
            } catch (error) {
                providerStatuses.push({
                    provider: providerName,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return {
            success: true,
            data: {
                providers: providerStatuses,
                cache: cacheStatus,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Health check failed: ${error.message}`
        };
    }
}

module.exports = {
    getExchangeRates,
    convertCurrency,
    getHistoricalRates,
    getSupportedCurrencies,
    warmCache,
    getHealthStatus
};
