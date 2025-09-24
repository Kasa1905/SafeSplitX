/**
 * Currency validation utilities for SafeSplitX
 * Provides comprehensive validation for currency codes, amounts, dates, and API responses
 */

/**
 * ISO 4217 currency codes with their properties
 * Comprehensive list of supported currencies with symbols, decimal places, and names
 */
const SUPPORTED_CURRENCIES = {
    // Major currencies
    'USD': { name: 'US Dollar', symbol: '$', decimals: 2, code: 'USD' },
    'EUR': { name: 'Euro', symbol: '€', decimals: 2, code: 'EUR' },
    'GBP': { name: 'British Pound Sterling', symbol: '£', decimals: 2, code: 'GBP' },
    'JPY': { name: 'Japanese Yen', symbol: '¥', decimals: 0, code: 'JPY' },
    'CNY': { name: 'Chinese Yuan', symbol: '¥', decimals: 2, code: 'CNY' },
    'CHF': { name: 'Swiss Franc', symbol: 'Fr', decimals: 2, code: 'CHF' },
    'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimals: 2, code: 'CAD' },
    'AUD': { name: 'Australian Dollar', symbol: 'A$', decimals: 2, code: 'AUD' },
    'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, code: 'NZD' },
    'SEK': { name: 'Swedish Krona', symbol: 'kr', decimals: 2, code: 'SEK' },
    'NOK': { name: 'Norwegian Krone', symbol: 'kr', decimals: 2, code: 'NOK' },
    'DKK': { name: 'Danish Krone', symbol: 'kr', decimals: 2, code: 'DKK' },
    
    // Asian currencies
    'KRW': { name: 'South Korean Won', symbol: '₩', decimals: 0, code: 'KRW' },
    'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, code: 'HKD' },
    'SGD': { name: 'Singapore Dollar', symbol: 'S$', decimals: 2, code: 'SGD' },
    'INR': { name: 'Indian Rupee', symbol: '₹', decimals: 2, code: 'INR' },
    'THB': { name: 'Thai Baht', symbol: '฿', decimals: 2, code: 'THB' },
    'MYR': { name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, code: 'MYR' },
    'PHP': { name: 'Philippine Peso', symbol: '₱', decimals: 2, code: 'PHP' },
    'IDR': { name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, code: 'IDR' },
    'VND': { name: 'Vietnamese Dong', symbol: '₫', decimals: 0, code: 'VND' },
    
    // Middle Eastern currencies
    'AED': { name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, code: 'AED' },
    'SAR': { name: 'Saudi Riyal', symbol: '﷼', decimals: 2, code: 'SAR' },
    'QAR': { name: 'Qatari Riyal', symbol: '﷼', decimals: 2, code: 'QAR' },
    'KWD': { name: 'Kuwaiti Dinar', symbol: 'د.ك', decimals: 3, code: 'KWD' },
    'BHD': { name: 'Bahraini Dinar', symbol: '.د.ب', decimals: 3, code: 'BHD' },
    'OMR': { name: 'Omani Rial', symbol: '﷼', decimals: 3, code: 'OMR' },
    'JOD': { name: 'Jordanian Dinar', symbol: 'د.ا', decimals: 3, code: 'JOD' },
    'ILS': { name: 'Israeli New Shekel', symbol: '₪', decimals: 2, code: 'ILS' },
    
    // African currencies
    'ZAR': { name: 'South African Rand', symbol: 'R', decimals: 2, code: 'ZAR' },
    'EGP': { name: 'Egyptian Pound', symbol: '£', decimals: 2, code: 'EGP' },
    'NGN': { name: 'Nigerian Naira', symbol: '₦', decimals: 2, code: 'NGN' },
    'KES': { name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2, code: 'KES' },
    
    // Latin American currencies
    'BRL': { name: 'Brazilian Real', symbol: 'R$', decimals: 2, code: 'BRL' },
    'MXN': { name: 'Mexican Peso', symbol: '$', decimals: 2, code: 'MXN' },
    'ARS': { name: 'Argentine Peso', symbol: '$', decimals: 2, code: 'ARS' },
    'CLP': { name: 'Chilean Peso', symbol: '$', decimals: 0, code: 'CLP' },
    'COP': { name: 'Colombian Peso', symbol: '$', decimals: 2, code: 'COP' },
    'PEN': { name: 'Peruvian Sol', symbol: 'S/', decimals: 2, code: 'PEN' },
    
    // European currencies (non-EUR)
    'PLN': { name: 'Polish Złoty', symbol: 'zł', decimals: 2, code: 'PLN' },
    'CZK': { name: 'Czech Koruna', symbol: 'Kč', decimals: 2, code: 'CZK' },
    'HUF': { name: 'Hungarian Forint', symbol: 'Ft', decimals: 2, code: 'HUF' },
    'RON': { name: 'Romanian Leu', symbol: 'lei', decimals: 2, code: 'RON' },
    'BGN': { name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, code: 'BGN' },
    'HRK': { name: 'Croatian Kuna', symbol: 'kn', decimals: 2, code: 'HRK' },
    'RUB': { name: 'Russian Ruble', symbol: '₽', decimals: 2, code: 'RUB' },
    'UAH': { name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, code: 'UAH' },
    'TRY': { name: 'Turkish Lira', symbol: '₺', decimals: 2, code: 'TRY' }
};

/**
 * Validate currency code
 * @param {string} currencyCode - Currency code to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowEmpty - Whether empty values are allowed (default: false)
 * @param {string[]} options.allowedCurrencies - Specific allowed currencies (default: all supported)
 * @returns {Object} Validation result with success flag and error details
 */
function validateCurrencyCode(currencyCode, options = {}) {
    const { allowEmpty = false, allowedCurrencies = Object.keys(SUPPORTED_CURRENCIES) } = options;

    // Handle empty/null values
    if (!currencyCode || (typeof currencyCode === 'string' && currencyCode.trim() === '')) {
        return {
            success: allowEmpty,
            error: allowEmpty ? null : 'Currency code is required',
            data: null
        };
    }

    // Type validation
    if (typeof currencyCode !== 'string') {
        return {
            success: false,
            error: 'Currency code must be a string',
            data: null
        };
    }

    // Normalize and validate format
    const normalized = normalizeCurrencyCode(currencyCode);
    
    if (!normalized || normalized.length !== 3) {
        return {
            success: false,
            error: 'Currency code must be exactly 3 characters long',
            data: null
        };
    }

    if (!/^[A-Z]{3}$/.test(normalized)) {
        return {
            success: false,
            error: 'Currency code must contain only uppercase letters',
            data: null
        };
    }

    // Check if currency is supported
    if (!SUPPORTED_CURRENCIES[normalized]) {
        const supportedList = Object.keys(SUPPORTED_CURRENCIES).slice(0, 10).join(', ');
        return {
            success: false,
            error: `Unsupported currency code: ${normalized}. Supported currencies include: ${supportedList}...`,
            data: null
        };
    }

    // Check against allowed currencies if specified
    if (allowedCurrencies.length > 0 && !allowedCurrencies.includes(normalized)) {
        return {
            success: false,
            error: `Currency ${normalized} is not allowed. Allowed currencies: ${allowedCurrencies.join(', ')}`,
            data: null
        };
    }

    return {
        success: true,
        error: null,
        data: {
            normalized,
            currency: SUPPORTED_CURRENCIES[normalized]
        }
    };
}

/**
 * Normalize currency code to standard format
 * @param {string} currencyCode - Currency code to normalize
 * @returns {string} Normalized currency code (uppercase, trimmed)
 */
function normalizeCurrencyCode(currencyCode) {
    if (!currencyCode || typeof currencyCode !== 'string') {
        return '';
    }
    return currencyCode.trim().toUpperCase();
}

/**
 * Check if a currency code is supported
 * @param {string} currencyCode - Currency code to check
 * @returns {boolean} True if supported, false otherwise
 */
function isSupportedCurrency(currencyCode) {
    const normalized = normalizeCurrencyCode(currencyCode);
    return normalized in SUPPORTED_CURRENCIES;
}

/**
 * Validate provider configuration
 * @param {string} providerName - Name of the provider (exchangerate-api, fixer, currencyapi)
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with success flag and specific error messages
 */
function validateProviderConfig(providerName, config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
        return {
            success: false,
            error: `${providerName}: Configuration object is required`
        };
    }

    // Validate API key
    if (!config.apiKey) {
        errors.push(`${providerName}: API key is required. Set the ${providerName.toUpperCase()}_API_KEY environment variable.`);
    } else if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
        errors.push(`${providerName}: API key must be a non-empty string`);
    }

    // Validate base URL
    if (config.baseUrl && typeof config.baseUrl !== 'string') {
        errors.push(`${providerName}: Base URL must be a string`);
    }

    if (config.baseUrl && !config.baseUrl.match(/^https?:\/\/.+/)) {
        errors.push(`${providerName}: Base URL must start with http:// or https://`);
    }

    // Validate timeout
    if (config.timeout !== undefined) {
        if (!Number.isInteger(config.timeout) || config.timeout <= 0) {
            errors.push(`${providerName}: Timeout must be a positive integer (milliseconds)`);
        } else if (config.timeout > 60000) {
            errors.push(`${providerName}: Timeout should not exceed 60000ms (1 minute)`);
        }
    }

    // Validate rate limiting parameters
    if (config.requestsPerSecond !== undefined) {
        if (!Number.isFinite(config.requestsPerSecond) || config.requestsPerSecond <= 0) {
            errors.push(`${providerName}: requestsPerSecond must be a positive number`);
        } else if (config.requestsPerSecond > 100) {
            errors.push(`${providerName}: requestsPerSecond should not exceed 100 (most APIs have lower limits)`);
        }
    }

    if (config.burstCapacity !== undefined) {
        if (!Number.isInteger(config.burstCapacity) || config.burstCapacity <= 0) {
            errors.push(`${providerName}: burstCapacity must be a positive integer`);
        } else if (config.burstCapacity > 50) {
            errors.push(`${providerName}: burstCapacity should not exceed 50`);
        }
    }

    // Provider-specific validation
    switch (providerName) {
        case 'exchangerate-api':
            if (config.apiKey && !config.apiKey.match(/^[a-f0-9]{24}$/)) {
                errors.push(`${providerName}: API key should be a 24-character hexadecimal string`);
            }
            break;

        case 'fixer':
            if (config.apiKey && !config.apiKey.match(/^[a-f0-9]{32}$/)) {
                errors.push(`${providerName}: API key should be a 32-character hexadecimal string`);
            }
            break;

        case 'currencyapi':
            if (config.apiKey && !config.apiKey.match(/^cur_[a-zA-Z0-9]{32}$/)) {
                errors.push(`${providerName}: API key should start with 'cur_' followed by 32 alphanumeric characters`);
            }
            break;

        default:
            errors.push(`${providerName}: Unknown provider name`);
            break;
    }

    return {
        success: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : null,
        errors
    };
}

module.exports = {
    validateCurrencyCode,
    normalizeCurrencyCode,
    isSupportedCurrency,
    validateProviderConfig,
    SUPPORTED_CURRENCIES
};