# SafeSplitX Currency Module Documentation

## Overview

The SafeSplitX Currency Module provides comprehensive multi-currency support for the expense splitting application. It includes real-time and historical exchange rate retrieval, precise currency conversion, validation utilities, intelligent caching, and robust error handling.

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## Features

### ✅ Multi-Provider Support
- **ExchangeRate-API**: Free tier with 1,500 requests/month
- **Fixer.io**: Reliable forex data with historical rates
- **CurrencyAPI**: High-performance API with global coverage
- Automatic failover between providers

### ✅ Intelligent Caching
- **Redis** primary caching for production environments
- **In-memory** fallback caching for development
- Configurable TTL (Time To Live) settings
- Cache warming for frequently used currency pairs

### ✅ Precise Calculations
- **Decimal.js** integration for financial precision
- Currency-specific rounding rules
- Support for high-precision currencies (BHD, KWD, etc.)

### ✅ Comprehensive Validation
- **ISO 4217** currency code validation
- Amount and date validation for historical rates
- API response validation and sanitization

### ✅ Health Monitoring
- Provider health checks and statistics
- Cache performance monitoring
- Automatic error recovery and logging

## Installation

### Dependencies

Add the following dependencies to your `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "decimal.js": "^10.4.3",
    "redis": "^4.6.0",
    "node-cache": "^5.1.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

### Environment Variables

Create a `.env` file in your project root:

```bash
# Forex API Provider Keys (at least one required)
EXCHANGERATE_API_KEY=your_exchangerate_api_key
FIXER_API_KEY=your_fixer_api_key
CURRENCYAPI_KEY=your_currencyapi_key

# Cache Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
CACHE_TTL=3600
ENABLE_CACHE_WARMING=true

# Provider Configuration
PRIMARY_PROVIDER=exchangerate-api
PROVIDER_TIMEOUT=5000
RETRY_COUNT=3
```

## Quick Start

```javascript
const currency = require('./currency');

async function example() {
    // Initialize the currency module
    const initResult = await currency.initialize();
    if (!initResult.success) {
        console.error('Failed to initialize currency module:', initResult.error);
        return;
    }

    // Get current exchange rates
    const rates = await currency.getExchangeRates('USD', ['EUR', 'GBP', 'JPY']);
    console.log('Current rates:', rates.data);

    // Convert currency
    const conversion = await currency.convertCurrency(100, 'USD', 'EUR');
    console.log(`$100 USD = €${conversion.data.convertedAmount} EUR`);

    // Format currency for display
    const formatted = currency.formatCurrency(123.456, 'EUR');
    console.log('Formatted:', formatted.data.formatted); // €123.46
}

example();
```

## API Reference

### Core Functions

#### `initialize(options?)`
Initializes the currency module with cache and provider setup.

**Parameters:**
- `options` (Object, optional): Configuration overrides

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        cache: { redis: boolean, memory: boolean },
        providers: string[],
        config: Object
    },
    error?: string
}
```

**Example:**
```javascript
const result = await currency.initialize({
    cacheEnabled: true,
    providers: ['exchangerate-api', 'fixer']
});
```

#### `getExchangeRates(baseCurrency, targetCurrencies, date?)`
Retrieves exchange rates from base currency to target currencies.

**Parameters:**
- `baseCurrency` (string): ISO 4217 currency code (e.g., 'USD')
- `targetCurrencies` (string[]): Array of target currency codes
- `date` (string, optional): Date for historical rates (YYYY-MM-DD format)

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        base: string,
        rates: { [currency: string]: number },
        timestamp: string,
        source: string,
        cached: boolean,
        provider?: string
    },
    error?: string
}
```

**Example:**
```javascript
// Current rates
const current = await currency.getExchangeRates('USD', ['EUR', 'GBP']);

// Historical rates
const historical = await currency.getExchangeRates('USD', ['EUR'], '2023-12-01');
```

#### `convertCurrency(amount, fromCurrency, toCurrency, date?)`
Converts an amount from one currency to another.

**Parameters:**
- `amount` (number): Amount to convert
- `fromCurrency` (string): Source currency code
- `toCurrency` (string): Target currency code
- `date` (string, optional): Date for historical conversion

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        originalAmount: number,
        convertedAmount: number,
        originalCurrency: string,
        targetCurrency: string,
        exchangeRate: number,
        calculation: string,
        timestamp: string,
        source: string
    },
    error?: string
}
```

**Example:**
```javascript
const conversion = await currency.convertCurrency(100, 'USD', 'EUR');
console.log(`Converted: ${conversion.data.convertedAmount} EUR`);
```

### Validation Functions

#### `validateCurrencyCode(code)`
Validates ISO 4217 currency codes.

**Parameters:**
- `code` (string): Currency code to validate

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        code: string,
        name: string,
        symbol: string,
        valid: boolean
    },
    error?: string
}
```

#### `validateAmount(amount, options?)`
Validates monetary amounts.

**Parameters:**
- `amount` (number|string): Amount to validate
- `options` (Object, optional): Validation options

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        amount: number,
        valid: boolean,
        formatted: string
    },
    error?: string
}
```

### Utility Functions

#### `formatCurrency(amount, currency, options?)`
Formats amounts according to currency conventions.

**Parameters:**
- `amount` (number): Amount to format
- `currency` (string): Currency code
- `options` (Object, optional): Intl.NumberFormat options

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        formatted: string,
        amount: number,
        currency: string,
        locale: string,
        options: Object
    },
    error?: string
}
```

#### `parseCurrencyAmount(input)`
Parses formatted currency strings into numeric values.

**Parameters:**
- `input` (string): Formatted currency string

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        amount: number,
        currency: string | null,
        original: string
    },
    error?: string
}
```

### Cache Management

#### `getCacheStats()`
Returns cache performance statistics.

**Returns:**
```javascript
{
    hits: number,
    misses: number,
    sets: number,
    errors: number,
    hitRate: number,
    redis: { status: string, keys: number },
    memory: { keys: number, size: number }
}
```

#### `clearCache(options?)`
Clears cached exchange rate data.

**Parameters:**
- `options` (Object, optional): Cache clearing options

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        redis: boolean,
        memory: boolean,
        cleared: number
    },
    error?: string
}
```

### Health Monitoring

#### `getHealthStatus()`
Returns the health status of all currency module components.

**Returns:**
```javascript
{
    success: boolean,
    data?: {
        overall: 'healthy' | 'degraded' | 'unhealthy',
        providers: Array<{
            name: string,
            status: string,
            lastCheck: string,
            stats: Object
        }>,
        cache: {
            redis: { status: string, latency: number },
            memory: { status: string, usage: Object }
        }
    },
    error?: string
}
```

## Configuration

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EXCHANGERATE_API_KEY` | ExchangeRate-API key | - | No* |
| `FIXER_API_KEY` | Fixer.io API key | - | No* |
| `CURRENCYAPI_KEY` | CurrencyAPI key | - | No* |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | No |
| `REDIS_PASSWORD` | Redis password | - | No |
| `CACHE_TTL` | Cache TTL in seconds | `3600` | No |
| `ENABLE_CACHE_WARMING` | Enable cache warming | `true` | No |
| `PRIMARY_PROVIDER` | Primary provider | `exchangerate-api` | No |
| `PROVIDER_TIMEOUT` | Provider timeout (ms) | `5000` | No |
| `RETRY_COUNT` | Retry attempts | `3` | No |

*At least one API key is required for the module to function.

### Provider Configuration

You can configure provider-specific settings:

```javascript
const config = {
    providers: {
        'exchangerate-api': {
            apiKey: 'your_key',
            baseUrl: 'https://v6.exchangerate-api.com/v6',
            timeout: 5000,
            retryCount: 3
        },
        'fixer': {
            apiKey: 'your_key',
            baseUrl: 'http://data.fixer.io/api',
            timeout: 8000,
            retryCount: 2
        },
        'currencyapi': {
            apiKey: 'your_key',
            baseUrl: 'https://api.currencyapi.com/v3',
            timeout: 6000,
            retryCount: 3
        }
    }
};

const result = await currency.initialize(config);
```

## Usage Examples

### Basic Currency Conversion

```javascript
// Simple conversion
async function convertUSDToEUR(amount) {
    const result = await currency.convertCurrency(amount, 'USD', 'EUR');
    
    if (result.success) {
        console.log(`$${amount} = €${result.data.convertedAmount}`);
        console.log(`Rate: ${result.data.exchangeRate}`);
        console.log(`Source: ${result.data.source}`);
    } else {
        console.error('Conversion failed:', result.error);
    }
}

await convertUSDToEUR(100);
```

### Multi-Currency Dashboard

```javascript
async function createCurrencyDashboard(baseCurrency, targetCurrencies) {
    const rates = await currency.getExchangeRates(baseCurrency, targetCurrencies);
    
    if (!rates.success) {
        throw new Error(`Failed to fetch rates: ${rates.error}`);
    }

    console.log(`Exchange Rates (Base: ${rates.data.base})`);
    console.log(`Updated: ${new Date(rates.data.timestamp).toLocaleString()}`);
    console.log(`Source: ${rates.data.source}`);
    console.log('---');

    for (const [currency, rate] of Object.entries(rates.data.rates)) {
        const formatted = currency.formatCurrency(rate, currency);
        console.log(`1 ${baseCurrency} = ${formatted.data.formatted} ${currency}`);
    }
}

await createCurrencyDashboard('USD', ['EUR', 'GBP', 'JPY', 'CAD']);
```

### Historical Rate Analysis

```javascript
async function analyzeRateTrend(baseCurrency, targetCurrency, days = 7) {
    const rates = [];
    const endDate = new Date();
    
    for (let i = 0; i < days; i++) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const result = await currency.getExchangeRates(
            baseCurrency, 
            [targetCurrency], 
            dateString
        );
        
        if (result.success) {
            rates.push({
                date: dateString,
                rate: result.data.rates[targetCurrency]
            });
        }
    }
    
    rates.reverse(); // Chronological order
    
    console.log(`${baseCurrency}/${targetCurrency} Rate Trend:`);
    rates.forEach((entry, index) => {
        const change = index > 0 
            ? ((entry.rate - rates[index - 1].rate) / rates[index - 1].rate * 100).toFixed(2)
            : '0.00';
        console.log(`${entry.date}: ${entry.rate} (${change > 0 ? '+' : ''}${change}%)`);
    });
}

await analyzeRateTrend('USD', 'EUR', 7);
```

### Expense Splitting with Multi-Currency

```javascript
async function splitMultiCurrencyExpense(expense, participants) {
    const { amount, currency: expenseCurrency } = expense;
    const splitAmount = amount / participants.length;
    
    const conversions = [];
    
    for (const participant of participants) {
        const { name, preferredCurrency } = participant;
        
        if (preferredCurrency === expenseCurrency) {
            conversions.push({
                participant: name,
                amount: splitAmount,
                currency: expenseCurrency,
                exchangeRate: 1,
                original: { amount: splitAmount, currency: expenseCurrency }
            });
        } else {
            const conversion = await currency.convertCurrency(
                splitAmount, 
                expenseCurrency, 
                preferredCurrency
            );
            
            if (conversion.success) {
                conversions.push({
                    participant: name,
                    amount: conversion.data.convertedAmount,
                    currency: preferredCurrency,
                    exchangeRate: conversion.data.exchangeRate,
                    original: { amount: splitAmount, currency: expenseCurrency }
                });
            }
        }
    }
    
    return conversions;
}

const expense = { amount: 120, currency: 'USD' };
const participants = [
    { name: 'Alice', preferredCurrency: 'USD' },
    { name: 'Bob', preferredCurrency: 'EUR' },
    { name: 'Charlie', preferredCurrency: 'GBP' }
];

const splits = await splitMultiCurrencyExpense(expense, participants);
```

### Cache Performance Monitoring

```javascript
async function monitorCachePerformance() {
    const stats = currency.getCacheStats();
    
    console.log('Cache Performance:');
    console.log(`Hit Rate: ${stats.hitRate.toFixed(1)}%`);
    console.log(`Total Requests: ${stats.hits + stats.misses}`);
    console.log(`Cache Hits: ${stats.hits}`);
    console.log(`Cache Misses: ${stats.misses}`);
    console.log(`Cache Sets: ${stats.sets}`);
    console.log(`Errors: ${stats.errors}`);
    
    console.log('\nCache Status:');
    console.log(`Redis: ${stats.redis.status} (${stats.redis.keys} keys)`);
    console.log(`Memory: ${stats.memory.keys} keys, ${stats.memory.size} bytes`);
}

// Run monitoring every 5 minutes
setInterval(monitorCachePerformance, 5 * 60 * 1000);
```

## Error Handling

The currency module uses a consistent error response format:

```javascript
{
    success: false,
    error: "Human-readable error message",
    code?: "ERROR_CODE",
    details?: {
        // Additional error context
    }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_CURRENCY_CODE` | Currency code not supported | Use valid ISO 4217 codes |
| `INVALID_AMOUNT` | Amount format invalid | Ensure numeric values |
| `PROVIDER_ERROR` | API provider failure | Check API keys/network |
| `CACHE_ERROR` | Cache operation failed | Check Redis connection |
| `RATE_LIMIT_EXCEEDED` | API rate limit hit | Implement retry logic |
| `NETWORK_ERROR` | Network connectivity issue | Check internet connection |
| `CONFIG_ERROR` | Configuration invalid | Verify environment variables |

### Error Handling Best Practices

```javascript
async function safeConversion(amount, from, to) {
    try {
        const result = await currency.convertCurrency(amount, from, to);
        
        if (result.success) {
            return result.data;
        }
        
        // Handle specific error codes
        switch (result.code) {
            case 'INVALID_CURRENCY_CODE':
                console.warn(`Invalid currency: ${from} or ${to}`);
                break;
            case 'PROVIDER_ERROR':
                console.warn('Provider issues, trying with fallback...');
                // Implement fallback logic
                break;
            case 'RATE_LIMIT_EXCEEDED':
                console.warn('Rate limit hit, will retry later');
                // Implement exponential backoff
                break;
            default:
                console.error('Conversion error:', result.error);
        }
        
        return null;
    } catch (error) {
        console.error('Unexpected error:', error.message);
        return null;
    }
}
```

## Best Practices

### 1. Initialization

Always initialize the currency module before using other functions:

```javascript
// ✅ Good
const initResult = await currency.initialize();
if (!initResult.success) {
    throw new Error('Currency module initialization failed');
}

// ❌ Bad
await currency.convertCurrency(100, 'USD', 'EUR'); // May fail
```

### 2. Error Handling

Always check the `success` field in responses:

```javascript
// ✅ Good
const result = await currency.getExchangeRates('USD', ['EUR']);
if (result.success) {
    console.log(result.data.rates);
} else {
    console.error(result.error);
}

// ❌ Bad
const result = await currency.getExchangeRates('USD', ['EUR']);
console.log(result.data.rates); // May throw if result.data is undefined
```

### 3. Caching Strategy

Utilize caching for frequently accessed data:

```javascript
// ✅ Good - Cache warm-up for common pairs
await currency.warmCache([
    { base: 'USD', targets: ['EUR', 'GBP', 'JPY'] },
    { base: 'EUR', targets: ['USD', 'GBP'] }
]);

// ✅ Good - Monitor cache performance
const stats = currency.getCacheStats();
if (stats.hitRate < 50) {
    console.warn('Low cache hit rate, consider warming more pairs');
}
```

### 4. Provider Management

Monitor provider health and implement fallbacks:

```javascript
// ✅ Good
const health = await currency.getHealthStatus();
if (health.data.overall !== 'healthy') {
    console.warn('Currency service degraded:', health.data);
    // Implement appropriate fallback behavior
}
```

### 5. Precision Handling

Be aware of currency precision requirements:

```javascript
// ✅ Good
const formatted = currency.formatCurrency(123.456789, 'JPY');
// Returns "¥123" (no decimals for JPY)

const precision = currency.getCurrencyPrecision('BHD');
// Returns 3 (Bahraini Dinar uses 3 decimal places)

// ❌ Bad
const amount = 123.456789;
console.log(`${amount.toFixed(2)} JPY`); // Shows unnecessary decimals
```

## Troubleshooting

### Common Issues

#### 1. "No providers available" Error

**Symptoms:**
```
Error: No providers available or all providers failed
```

**Solutions:**
- Check that at least one API key is configured
- Verify API keys are valid and active
- Check network connectivity
- Review provider status at their websites

#### 2. Cache Connection Issues

**Symptoms:**
```
Warning: Redis connection failed, falling back to memory cache
```

**Solutions:**
- Verify Redis server is running
- Check Redis connection URL and credentials
- Ensure Redis port (default 6379) is accessible
- Review firewall settings

#### 3. Invalid Currency Code Errors

**Symptoms:**
```
Error: Invalid currency code: XYZ
```

**Solutions:**
- Use only ISO 4217 standard currency codes
- Check for typos in currency codes
- Use `validateCurrencyCode()` to verify codes before use

#### 4. Rate Limit Exceeded

**Symptoms:**
```
Error: Rate limit exceeded for provider
```

**Solutions:**
- Implement caching to reduce API calls
- Use cache warming for frequently accessed pairs
- Consider upgrading to higher API tier
- Implement exponential backoff retry logic

### Debug Mode

Enable debug logging for troubleshooting:

```bash
DEBUG=currency:* node your-app.js
```

Or programmatically:

```javascript
const currency = require('./currency');

// Enable debug mode
process.env.DEBUG = 'currency:*';

// Initialize with debug logging
const result = await currency.initialize({ debug: true });
```

### Performance Optimization

#### Monitor and Optimize Cache Usage

```javascript
// Regular cache monitoring
setInterval(async () => {
    const stats = currency.getCacheStats();
    
    if (stats.hitRate < 80) {
        console.warn('Cache hit rate below 80%, consider optimization');
        
        // Warm cache for popular pairs
        await currency.warmCache([
            { base: 'USD', targets: ['EUR', 'GBP', 'CAD', 'AUD'] },
            { base: 'EUR', targets: ['USD', 'GBP'] }
        ]);
    }
    
    if (stats.errors > 0) {
        console.warn(`${stats.errors} cache errors detected`);
        // Consider clearing and reinitializing cache
    }
}, 300000); // Every 5 minutes
```

#### Provider Performance Tuning

```javascript
// Custom provider configuration for performance
const customConfig = {
    providers: {
        'exchangerate-api': {
            timeout: 3000, // Faster timeout
            retryCount: 1,  // Fewer retries
            priority: 1     // Highest priority
        },
        'fixer': {
            timeout: 5000,
            retryCount: 2,
            priority: 2
        }
    }
};

await currency.initialize(customConfig);
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your API keys
4. Run tests: `npm test`
5. Run development mode: `npm run dev`

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- forex.test.js

# Run tests in watch mode
npm run test:watch
```

### Test Coverage Requirements

- Minimum 90% code coverage
- All core functions must have unit tests
- Integration tests for provider interactions
- Error scenario testing required

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix

# Format code
npm run format
```

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Commit using conventional commits: `git commit -m "feat: add new feature"`
6. Push to your fork and create a pull request

### Architecture Decisions

The currency module follows these principles:

- **Fail-safe**: Multiple provider support with automatic failover
- **Performance**: Intelligent caching with warming strategies
- **Precision**: Financial-grade decimal arithmetic
- **Reliability**: Comprehensive error handling and health monitoring
- **Extensibility**: Plugin-based provider architecture

---

## Support

For issues, questions, or contributions:

- **Issues**: [GitHub Issues](https://github.com/safesplitx/currency/issues)
- **Discussions**: [GitHub Discussions](https://github.com/safesplitx/currency/discussions)
- **Documentation**: This file and inline JSDoc comments
- **Examples**: See the `examples/` directory

---

**Last Updated**: December 2023
**Version**: 1.0.0
**License**: MIT