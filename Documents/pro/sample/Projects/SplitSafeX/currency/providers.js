/**
 * Forex API provider implementations for SafeSplitX
 * Supports multiple providers: ExchangeRate-API, Fixer.io, and CurrencyAPI
 * with standardized interfaces and automatic failover
 */

const axios = require('axios');
const config = require('./config');
const validation = require('./validation');

// Provider instances
const providers = new Map();

/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
    constructor(capacity = 10, refillRate = 1) {
        this.capacity = capacity;        // Maximum number of tokens
        this.tokens = capacity;          // Current token count
        this.refillRate = refillRate;    // Tokens added per second
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on elapsed time
     */
    refill() {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
        const tokensToAdd = Math.floor(timePassed * this.refillRate);
        
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }

    /**
     * Consume tokens for a request
     * @param {number} tokens - Number of tokens to consume (default: 1)
     * @returns {boolean} - True if tokens were consumed, false if insufficient
     */
    consume(tokens = 1) {
        this.refill();
        
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }

    /**
     * Wait until tokens are available
     * @param {number} tokens - Number of tokens needed
     * @returns {Promise<void>} - Resolves when tokens are available
     */
    async waitForTokens(tokens = 1) {
        if (this.consume(tokens)) {
            return; // Tokens available immediately
        }

        // Calculate wait time
        const tokensNeeded = tokens - this.tokens;
        const waitTime = Math.ceil(tokensNeeded / this.refillRate) * 1000; // Convert to ms
        
        return new Promise(resolve => {
            setTimeout(() => {
                this.consume(tokens); // Should succeed after waiting
                resolve();
            }, waitTime);
        });
    }
}

/**
 * Base provider class with common functionality
 */
class BaseProvider {
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.lastHealthCheck = null;
        this.isHealthy = true;
        this.requestCount = 0;
        this.errorCount = 0;
        this.lastError = null;

        // Initialize rate limiting with token bucket
        const requestsPerSecond = config.requestsPerSecond || 1; // Default: 1 request per second
        const burstCapacity = config.burstCapacity || 5; // Default: 5 burst requests
        this.rateLimiter = new TokenBucket(burstCapacity, requestsPerSecond);

        // Create axios instance with common config
        this.client = axios.create({
            timeout: config.timeout || 10000,
            headers: {
                'User-Agent': 'SafeSplitX-Currency-Module/1.0'
            }
        });

        // Request interceptor for rate limiting
        this.client.interceptors.request.use(async (config) => {
            // Wait for rate limit tokens before making request
            await this.rateLimiter.waitForTokens(1);
            this.requestCount++;
            return config;
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                this.errorCount++;
                this.lastError = error;
                throw error;
            }
        );
    }

    /**
     * Perform health check for the provider
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck() {
        try {
            this.lastHealthCheck = new Date();
            
            // Simple test request with USD to EUR (most common pair)
            const result = await this.getRates('USD', ['EUR']);
            
            this.isHealthy = result.success;
            
            return {
                success: result.success,
                provider: this.name,
                timestamp: this.lastHealthCheck.toISOString(),
                responseTime: Date.now() - this.lastHealthCheck.getTime(),
                requestCount: this.requestCount,
                errorCount: this.errorCount,
                errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
            };

        } catch (error) {
            this.isHealthy = false;
            return {
                success: false,
                provider: this.name,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get provider statistics
     * @returns {Object} Provider statistics
     */
    getStats() {
        return {
            provider: this.name,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
            isHealthy: this.isHealthy,
            lastHealthCheck: this.lastHealthCheck,
            lastError: this.lastError?.message,
            rateLimiting: {
                tokensRemaining: this.rateLimiter.tokens,
                tokensCapacity: this.rateLimiter.capacity,
                refillRate: this.rateLimiter.refillRate,
                nextRefillIn: Math.max(0, 1000 - (Date.now() - this.rateLimiter.lastRefill))
            }
        };
    }
}

/**
 * ExchangeRate-API provider implementation
 * Free tier: 1,500 requests/month
 * Documentation: https://exchangerate-api.com/docs
 */
class ExchangeRateAPIProvider extends BaseProvider {
    constructor(config) {
        // Validate configuration before calling parent constructor
        const validation = require('./validation');
        const validationResult = validation.validateProviderConfig('exchangerate-api', config);
        
        if (!validationResult.success) {
            throw new Error(validationResult.error);
        }
        
        super('exchangerate-api', config);
        this.baseUrl = config.baseUrl || 'https://v6.exchangerate-api.com/v6';
        this.apiKey = config.apiKey;
    }

    async getRates(baseCurrency, targetCurrencies = []) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'ExchangeRate-API key not configured'
                };
            }

            const url = `${this.baseUrl}/${this.apiKey}/latest/${baseCurrency}`;
            const response = await this.client.get(url);

            if (response.data.result !== 'success') {
                return {
                    success: false,
                    error: response.data['error-type'] || 'API request failed'
                };
            }

            const rates = response.data.conversion_rates;
            
            // Filter to requested currencies if specified
            const filteredRates = targetCurrencies.length > 0 
                ? Object.fromEntries(
                    targetCurrencies.map(currency => [currency, rates[currency]])
                        .filter(([, rate]) => rate !== undefined)
                  )
                : rates;

            return {
                success: true,
                data: {
                    baseCurrency,
                    rates: filteredRates,
                    timestamp: new Date(response.data.time_last_update_unix * 1000).toISOString(),
                    provider: this.name,
                    nextUpdate: new Date(response.data.time_next_update_unix * 1000).toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `ExchangeRate-API request failed: ${error.message}`
            };
        }
    }

    async getHistoricalRates(baseCurrency, targetCurrencies, date) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'ExchangeRate-API key not configured'
                };
            }

            // Convert date format (YYYY-MM-DD to YYYY/MM/DD)
            const formattedDate = date.replace(/-/g, '/');
            const url = `${this.baseUrl}/${this.apiKey}/history/${baseCurrency}/${formattedDate}`;
            
            const response = await this.client.get(url);

            if (response.data.result !== 'success') {
                return {
                    success: false,
                    error: response.data['error-type'] || 'Historical data request failed'
                };
            }

            const rates = response.data.conversion_rates;
            
            // Filter to requested currencies if specified
            const filteredRates = targetCurrencies.length > 0 
                ? Object.fromEntries(
                    targetCurrencies.map(currency => [currency, rates[currency]])
                        .filter(([, rate]) => rate !== undefined)
                  )
                : rates;

            return {
                success: true,
                data: {
                    baseCurrency,
                    rates: filteredRates,
                    date,
                    timestamp: new Date().toISOString(),
                    provider: this.name
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `ExchangeRate-API historical request failed: ${error.message}`
            };
        }
    }

    async getSupportedCurrencies() {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'ExchangeRate-API key not configured'
                };
            }

            const url = `${this.baseUrl}/${this.apiKey}/codes`;
            const response = await this.client.get(url);

            if (response.data.result !== 'success') {
                return {
                    success: false,
                    error: response.data['error-type'] || 'Supported currencies request failed'
                };
            }

            const currencies = response.data.supported_codes.map(([code, name]) => ({
                code,
                name
            }));

            return {
                success: true,
                data: {
                    currencies,
                    provider: this.name,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `ExchangeRate-API supported currencies request failed: ${error.message}`
            };
        }
    }
}

/**
 * Fixer.io provider implementation  
 * Free tier: 100 requests/month
 * Documentation: https://fixer.io/documentation
 */
class FixerProvider extends BaseProvider {
    constructor(config) {
        // Validate configuration before calling parent constructor
        const validation = require('./validation');
        const validationResult = validation.validateProviderConfig('fixer', config);
        
        if (!validationResult.success) {
            throw new Error(validationResult.error);
        }
        
        super('fixer', config);
        this.baseUrl = config.baseUrl || 'http://data.fixer.io/api';
        this.apiKey = config.apiKey;
    }

    async getRates(baseCurrency, targetCurrencies = []) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'Fixer.io API key not configured'
                };
            }

            const params = new URLSearchParams({
                access_key: this.apiKey,
                base: 'EUR' // Fixer free tier always uses EUR as base
            });

            // Always include the requested base currency if it's not EUR
            const symbolsToFetch = baseCurrency !== 'EUR' ? [...targetCurrencies, baseCurrency] : targetCurrencies;
            if (symbolsToFetch.length > 0) {
                params.append('symbols', [...new Set(symbolsToFetch)].join(','));
            }

            const url = `${this.baseUrl}/latest?${params}`;
            const response = await this.client.get(url);

            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.error?.info || 'Fixer.io API request failed'
                };
            }

            const rates = response.data.rates;
            let rebasedRates = rates;

            // Re-base rates if base currency is not EUR
            if (baseCurrency !== 'EUR') {
                if (!rates[baseCurrency]) {
                    return {
                        success: false,
                        error: `Base currency ${baseCurrency} not available in Fixer.io response`
                    };
                }

                const baseRate = rates[baseCurrency];
                const rebased = {};
                
                for (const [ccy, rate] of Object.entries(rates)) {
                    if (rate != null) {
                        rebased[ccy] = rate / baseRate;
                    }
                }
                rebased[baseCurrency] = 1; // Base currency always has rate of 1
                
                // Optionally limit to requested target currencies
                if (targetCurrencies.length > 0) {
                    rebasedRates = {};
                    for (const target of targetCurrencies) {
                        if (rebased[target] != null) {
                            rebasedRates[target] = rebased[target];
                        }
                    }
                } else {
                    rebasedRates = rebased;
                }
            }

            return {
                success: true,
                data: {
                    baseCurrency,
                    rates: rebasedRates,
                    timestamp: response.data.date + 'T00:00:00.000Z',
                    provider: this.name
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Fixer.io request failed: ${error.message}`
            };
        }
    }

    async getHistoricalRates(baseCurrency, targetCurrencies, date) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'Fixer.io API key not configured'
                };
            }

            const params = new URLSearchParams({
                access_key: this.apiKey,
                base: 'EUR' // Fixer free tier always uses EUR as base
            });

            // Always include the requested base currency if it's not EUR
            const symbolsToFetch = baseCurrency !== 'EUR' ? [...targetCurrencies, baseCurrency] : targetCurrencies;
            if (symbolsToFetch.length > 0) {
                params.append('symbols', [...new Set(symbolsToFetch)].join(','));
            }

            const url = `${this.baseUrl}/${date}?${params}`;
            const response = await this.client.get(url);

            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.error?.info || 'Fixer.io historical request failed'
                };
            }

            const rates = response.data.rates;
            let rebasedRates = rates;

            // Re-base rates if base currency is not EUR
            if (baseCurrency !== 'EUR') {
                if (!rates[baseCurrency]) {
                    return {
                        success: false,
                        error: `Base currency ${baseCurrency} not available in Fixer.io historical response for ${date}`
                    };
                }

                const baseRate = rates[baseCurrency];
                const rebased = {};
                
                for (const [ccy, rate] of Object.entries(rates)) {
                    if (rate != null) {
                        rebased[ccy] = rate / baseRate;
                    }
                }
                rebased[baseCurrency] = 1; // Base currency always has rate of 1
                
                // Optionally limit to requested target currencies
                if (targetCurrencies.length > 0) {
                    rebasedRates = {};
                    for (const target of targetCurrencies) {
                        if (rebased[target] != null) {
                            rebasedRates[target] = rebased[target];
                        }
                    }
                } else {
                    rebasedRates = rebased;
                }
            }

            return {
                success: true,
                data: {
                    baseCurrency,
                    rates: rebasedRates,
                    date,
                    timestamp: response.data.date + 'T00:00:00.000Z',
                    provider: this.name
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Fixer.io historical request failed: ${error.message}`
            };
        }
    }

    async getSupportedCurrencies() {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'Fixer.io API key not configured'
                };
            }

            const url = `${this.baseUrl}/symbols?access_key=${this.apiKey}`;
            const response = await this.client.get(url);

            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.error?.info || 'Fixer.io symbols request failed'
                };
            }

            const currencies = Object.entries(response.data.symbols).map(([code, name]) => ({
                code,
                name
            }));

            return {
                success: true,
                data: {
                    currencies,
                    provider: this.name,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Fixer.io symbols request failed: ${error.message}`
            };
        }
    }
}

/**
 * CurrencyAPI provider implementation
 * Free tier: 300 requests/month  
 * Documentation: https://currencyapi.com/docs
 */
class CurrencyAPIProvider extends BaseProvider {
    constructor(config) {
        // Validate configuration before calling parent constructor
        const validation = require('./validation');
        const validationResult = validation.validateProviderConfig('currencyapi', config);
        
        if (!validationResult.success) {
            throw new Error(validationResult.error);
        }
        
        super('currencyapi', config);
        this.baseUrl = config.baseUrl || 'https://api.currencyapi.com/v3';
        this.apiKey = config.apiKey;
    }

    async getRates(baseCurrency, targetCurrencies = []) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'CurrencyAPI key not configured'
                };
            }

            const params = new URLSearchParams({
                apikey: this.apiKey,
                base_currency: baseCurrency
            });

            if (targetCurrencies.length > 0) {
                params.append('currencies', targetCurrencies.join(','));
            }

            const url = `${this.baseUrl}/latest?${params}`;
            const response = await this.client.get(url);

            if (response.data.error) {
                return {
                    success: false,
                    error: response.data.error.message || 'CurrencyAPI request failed'
                };
            }

            // Transform response format
            const rates = {};
            Object.entries(response.data.data).forEach(([code, info]) => {
                rates[code] = info.value;
            });

            return {
                success: true,
                data: {
                    baseCurrency,
                    rates,
                    timestamp: new Date().toISOString(),
                    provider: this.name
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `CurrencyAPI request failed: ${error.message}`
            };
        }
    }

    async getHistoricalRates(baseCurrency, targetCurrencies, date) {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'CurrencyAPI key not configured'
                };
            }

            const params = new URLSearchParams({
                apikey: this.apiKey,
                base_currency: baseCurrency,
                date
            });

            if (targetCurrencies.length > 0) {
                params.append('currencies', targetCurrencies.join(','));
            }

            const url = `${this.baseUrl}/historical?${params}`;
            const response = await this.client.get(url);

            if (response.data.error) {
                return {
                    success: false,
                    error: response.data.error.message || 'CurrencyAPI historical request failed'
                };
            }

            // Transform response format
            const rates = {};
            const dateData = response.data.data[date];
            if (dateData) {
                Object.entries(dateData).forEach(([code, info]) => {
                    rates[code] = info.value;
                });
            }

            return {
                success: true,
                data: {
                    baseCurrency,
                    rates,
                    date,
                    timestamp: new Date().toISOString(),
                    provider: this.name
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `CurrencyAPI historical request failed: ${error.message}`
            };
        }
    }

    async getSupportedCurrencies() {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'CurrencyAPI key not configured'
                };
            }

            const url = `${this.baseUrl}/currencies?apikey=${this.apiKey}`;
            const response = await this.client.get(url);

            if (response.data.error) {
                return {
                    success: false,
                    error: response.data.error.message || 'CurrencyAPI currencies request failed'
                };
            }

            const currencies = Object.entries(response.data.data).map(([code, info]) => ({
                code,
                name: info.name,
                symbol: info.symbol
            }));

            return {
                success: true,
                data: {
                    currencies,
                    provider: this.name,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `CurrencyAPI currencies request failed: ${error.message}`
            };
        }
    }
}

/**
 * Initialize all configured providers
 * @returns {Object} Initialization result
 */
function initializeProviders() {
    try {
        providers.clear();

        // Initialize each configured provider
        if (config.providers.exchangerateapi.enabled) {
            providers.set('exchangerate-api', new ExchangeRateAPIProvider(config.providers.exchangerateapi));
        }

        if (config.providers.fixer.enabled) {
            providers.set('fixer', new FixerProvider(config.providers.fixer));
        }

        if (config.providers.currencyapi.enabled) {
            providers.set('currencyapi', new CurrencyAPIProvider(config.providers.currencyapi));
        }

        return {
            success: true,
            data: {
                initialized: Array.from(providers.keys()),
                count: providers.size
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Exchange rate providers setup failed - ${error.message}. Verify API keys, network access, and provider service availability.`
        };
    }
}

/**
 * Get provider instance by name
 * @param {string} providerName - Provider name
 * @returns {BaseProvider|null} Provider instance or null
 */
function getProvider(providerName) {
    return providers.get(providerName) || null;
}

/**
 * Get all available providers
 * @returns {Array} Array of provider names
 */
function getAvailableProviders() {
    return Array.from(providers.keys());
}

/**
 * Get provider statistics for all providers
 * @returns {Object} Statistics for all providers
 */
function getAllProviderStats() {
    const stats = {};
    for (const [name, provider] of providers) {
        stats[name] = provider.getStats();
    }
    return stats;
}

/**
 * Run health checks on all providers
 * @returns {Promise<Object>} Health check results
 */
async function runHealthChecks() {
    const results = {};
    
    for (const [name, provider] of providers) {
        try {
            results[name] = await provider.healthCheck();
        } catch (error) {
            results[name] = {
                success: false,
                provider: name,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    return {
        success: true,
        data: results,
        summary: {
            total: Object.keys(results).length,
            healthy: Object.values(results).filter(r => r.success).length,
            unhealthy: Object.values(results).filter(r => !r.success).length
        }
    };
}

/**
 * Get the best available provider based on health and priority
 * @param {string[]} preferredOrder - Preferred provider order (optional)
 * @returns {Promise<string|null>} Best provider name or null
 */
async function getBestProvider(preferredOrder = config.providers.priority) {
    const healthResults = await runHealthChecks();
    
    // Check providers in preferred order
    for (const providerName of preferredOrder) {
        if (providers.has(providerName) && healthResults.data[providerName]?.success) {
            return providerName;
        }
    }

    // If no preferred provider is healthy, find any healthy provider
    for (const [name, result] of Object.entries(healthResults.data)) {
        if (result.success) {
            return name;
        }
    }

    return null;
}

// Initialize providers when module loads
initializeProviders();

module.exports = {
    initializeProviders,
    getProvider,
    getAvailableProviders,
    getAllProviderStats,
    runHealthChecks,
    getBestProvider,
    
    // Export provider classes for testing
    ExchangeRateAPIProvider,
    FixerProvider,
    CurrencyAPIProvider,
    BaseProvider
};
