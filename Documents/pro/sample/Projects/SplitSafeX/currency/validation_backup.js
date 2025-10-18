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
    'GHS': { name: 'Ghanaian Cedi', symbol: '₵', decimals: 2, code: 'GHS' },
    
    // Latin American currencies
    'BRL': { name: 'Brazilian Real', symbol: 'R$', decimals: 2, code: 'BRL' },
    'MXN': { name: 'Mexican Peso', symbol: '$', decimals: 2, code: 'MXN' },
    'ARS': { name: 'Argentine Peso', symbol: '$', decimals: 2, code: 'ARS' },
    'CLP': { name: 'Chilean Peso', symbol: '$', decimals: 0, code: 'CLP' },
    'COP': { name: 'Colombian Peso', symbol: '$', decimals: 2, code: 'COP' },
    'PEN': { name: 'Peruvian Sol', symbol: 'S/', decimals: 2, code: 'PEN' },
    'UYU': { name: 'Uruguayan Peso', symbol: '$U', decimals: 2, code: 'UYU' },
    
    // Eastern European currencies
    'RUB': { name: 'Russian Ruble', symbol: '₽', decimals: 2, code: 'RUB' },
    'PLN': { name: 'Polish Zloty', symbol: 'zł', decimals: 2, code: 'PLN' },
    'CZK': { name: 'Czech Koruna', symbol: 'Kč', decimals: 2, code: 'CZK' },
    'HUF': { name: 'Hungarian Forint', symbol: 'Ft', decimals: 2, code: 'HUF' },
    'RON': { name: 'Romanian Leu', symbol: 'lei', decimals: 2, code: 'RON' },
    'BGN': { name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, code: 'BGN' },
    'HRK': { name: 'Croatian Kuna', symbol: 'kn', decimals: 2, code: 'HRK' },
    'UAH': { name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, code: 'UAH' },
    
    // Other currencies
    'TRY': { name: 'Turkish Lira', symbol: '₺', decimals: 2, code: 'TRY' },
    'ISK': { name: 'Icelandic Krona', symbol: 'kr', decimals: 0, code: 'ISK' }
};

/**
 * Validate currency code against ISO 4217 standards
 * @param {string} currencyCode - Currency code to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.caseSensitive - Whether validation is case sensitive (default: false)
 * @param {boolean} options.allowUnsupported - Whether to allow unsupported but valid ISO codes (default: false)
 * @returns {Object} Validation result with success flag and error message
 * 
 * @example
 * const result = validateCurrencyCode('USD');
 * // Returns: { success: true, data: { code: 'USD', ...currencyInfo } }
 * 
 * const invalidResult = validateCurrencyCode('XYZ');
 * // Returns: { success: false, error: 'Currency code XYZ is not supported' }
 */
function validateCurrencyCode(currencyCode, options = {}) {
    const { caseSensitive = false, allowUnsupported = false } = options;

    // Basic validation
    if (!currencyCode) {
        return { success: false, error: 'Currency code is required' };
    }

    if (typeof currencyCode !== 'string') {
        return { success: false, error: 'Currency code must be a string' };
    }

    // Normalize case
    const normalizedCode = caseSensitive ? currencyCode : currencyCode.toUpperCase();

    // Check format (3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(normalizedCode)) {
        return { success: false, error: 'Currency code must be exactly 3 uppercase letters' };
    }

    // Check if supported
    const currencyInfo = SUPPORTED_CURRENCIES[normalizedCode];
    if (currencyInfo) {
        return { 
            success: true, 
            data: { 
                code: normalizedCode,
                ...currencyInfo
            }
        };
    }

    // If not supported but allowUnsupported is true, validate against basic ISO format
    if (allowUnsupported) {
        return { 
            success: true, 
            data: { 
                code: normalizedCode,
                name: `${normalizedCode} Currency`,
                symbol: normalizedCode,
                decimals: 2,
                supported: false
            }
        };
    }

    return { 
        success: false, 
        error: `Currency code ${normalizedCode} is not supported` 
    };
}

/**
 * Validate currency amount for conversion
 * @param {number|string} amount - Amount to validate
 * @param {Object} options - Validation options
 * @param {number} options.minAmount - Minimum allowed amount (default: 0.01)
 * @param {number} options.maxAmount - Maximum allowed amount (default: 1000000000)
 * @param {boolean} options.allowZero - Whether zero amounts are allowed (default: false)
 * @param {boolean} options.allowNegative - Whether negative amounts are allowed (default: false)
 * @returns {Object} Validation result with normalized amount
 * 
 * @example
 * const result = validateAmount(100.50);
 * // Returns: { success: true, data: { amount: 100.50, formatted: '100.50' } }
 * 
 * const invalidResult = validateAmount(-50);
 * // Returns: { success: false, error: 'Amount cannot be negative' }
 */
function validateAmount(amount, options = {}) {
    const { 
        minAmount = 0.01,
        maxAmount = 1000000000,
        allowZero = false,
        allowNegative = false
    } = options;

    // Basic validation
    if (amount === null || amount === undefined) {
        return { success: false, error: 'Amount is required' };
    }

    // Convert string to number
    let numAmount;
    if (typeof amount === 'string') {
        // Remove any currency symbols or spaces
        const cleanAmount = amount.replace(/[^0-9.-]/g, '');
        numAmount = parseFloat(cleanAmount);
    } else if (typeof amount === 'number') {
        numAmount = amount;
    } else {
        return { success: false, error: 'Amount must be a number or numeric string' };
    }

    // Check if valid number
    if (isNaN(numAmount) || !isFinite(numAmount)) {
        return { success: false, error: 'Amount must be a valid number' };
    }

    // Check negative values
    if (numAmount < 0 && !allowNegative) {
        return { success: false, error: 'Amount cannot be negative' };
    }

    // Check zero values
    if (numAmount === 0 && !allowZero) {
        return { success: false, error: 'Amount cannot be zero' };
    }

    // Check minimum amount
    if (numAmount > 0 && numAmount < minAmount) {
        return { success: false, error: `Amount must be at least ${minAmount}` };
    }

    // Check maximum amount
    if (numAmount > maxAmount) {
        return { success: false, error: `Amount cannot exceed ${maxAmount}` };
    }

    // Check decimal precision (max 8 decimal places)
    const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 8) {
        return { success: false, error: 'Amount cannot have more than 8 decimal places' };
    }

    return { 
        success: true, 
        data: { 
            amount: numAmount,
            formatted: numAmount.toFixed(Math.min(decimalPlaces, 2)),
            original: amount
        }
    };
}

/**
 * Validate date for historical rate requests
 * @param {string|Date} date - Date to validate
 * @param {Object} options - Validation options
 * @param {string} options.format - Expected date format (default: 'YYYY-MM-DD')
 * @param {Date} options.minDate - Minimum allowed date (default: 1999-01-01)
 * @param {Date} options.maxDate - Maximum allowed date (default: today)
 * @param {boolean} options.allowFuture - Whether future dates are allowed (default: false)
 * @returns {Object} Validation result with normalized date
 * 
 * @example
 * const result = validateDate('2023-12-01');
 * // Returns: { success: true, data: { date: '2023-12-01', timestamp: '...' } }
 * 
 * const invalidResult = validateDate('2025-01-01');
 * // Returns: { success: false, error: 'Future dates are not allowed' }
 */
function validateDate(date, options = {}) {
    const { 
        format = 'YYYY-MM-DD',
        minDate = new Date('1999-01-01'),
        maxDate = new Date(),
        allowFuture = false
    } = options;

    // Basic validation
    if (!date) {
        return { success: false, error: 'Date is required' };
    }

    let dateObj;
    let dateString;

    // Handle different input types
    if (date instanceof Date) {
        dateObj = date;
        dateString = dateObj.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
        dateString = date.trim();
        
        // Validate format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return { success: false, error: 'Date must be in YYYY-MM-DD format' };
        }

        dateObj = new Date(dateString + 'T00:00:00.000Z');
    } else {
        return { success: false, error: 'Date must be a string in YYYY-MM-DD format or Date object' };
    }

    // Check if valid date
    if (isNaN(dateObj.getTime())) {
        return { success: false, error: 'Invalid date provided' };
    }

    // Check future dates
    if (!allowFuture && dateObj > maxDate) {
        return { success: false, error: 'Future dates are not allowed' };
    }

    // Check minimum date
    if (dateObj < minDate) {
        return { success: false, error: `Date cannot be earlier than ${minDate.toISOString().split('T')[0]}` };
    }

    // Check maximum date
    if (dateObj > maxDate) {
        return { success: false, error: `Date cannot be later than ${maxDate.toISOString().split('T')[0]}` };
    }

    return { 
        success: true, 
        data: { 
            date: dateString,
            dateObject: dateObj,
            timestamp: dateObj.toISOString(),
            formatted: dateObj.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        }
    };
}

/**
 * Validate API response from forex providers
 * @param {Object} response - API response to validate
 * @param {Object} schema - Expected response schema
 * @returns {Object} Validation result with normalized response
 * 
 * @example
 * const result = validateApiResponse(response, { requiredFields: ['rates', 'base'] });
 * // Returns: { success: true, data: normalizedResponse }
 */
function validateApiResponse(response, schema = {}) {
    const { requiredFields = [], optionalFields = [] } = schema;

    // Basic validation
    if (!response || typeof response !== 'object') {
        return { success: false, error: 'Response must be an object' };
    }

    // Check required fields
    for (const field of requiredFields) {
        if (!(field in response)) {
            return { success: false, error: `Missing required field: ${field}` };
        }
    }

    // Validate rates object if present
    if (response.rates && typeof response.rates === 'object') {
        for (const [currency, rate] of Object.entries(response.rates)) {
            // Validate currency code
            const currencyValidation = validateCurrencyCode(currency, { allowUnsupported: true });
            if (!currencyValidation.success) {
                return { success: false, error: `Invalid currency in rates: ${currency}` };
            }

            // Validate rate value
            if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
                return { success: false, error: `Invalid rate for ${currency}: ${rate}` };
            }
        }
    }

    // Validate base currency if present
    if (response.base) {
        const baseValidation = validateCurrencyCode(response.base, { allowUnsupported: true });
        if (!baseValidation.success) {
            return { success: false, error: `Invalid base currency: ${response.base}` };
        }
    }

    // Validate timestamp if present
    if (response.timestamp) {
        const timestamp = new Date(response.timestamp);
        if (isNaN(timestamp.getTime())) {
            return { success: false, error: 'Invalid timestamp in response' };
        }
    }

    return { success: true, data: response };
}

/**
 * Normalize currency code to standard format
 * @param {string} currencyCode - Currency code to normalize
 * @returns {string} Normalized currency code (uppercase, trimmed)
 * 
 * @example
 * const normalized = normalizeCurrencyCode('  usd  ');
 * // Returns: 'USD'
 */
function normalizeCurrencyCode(currencyCode) {
    if (!currencyCode || typeof currencyCode !== 'string') {
        return '';
    }
    return currencyCode.trim().toUpperCase();
}

/**
 * Format currency amount according to currency rules
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code for formatting rules
 * @param {Object} options - Formatting options
 * @param {boolean} options.showSymbol - Whether to include currency symbol (default: true)
 * @param {boolean} options.showCode - Whether to include currency code (default: false)
 * @param {string} options.locale - Locale for number formatting (default: 'en-US')
 * @returns {Object} Formatting result
 * 
 * @example
 * const result = formatCurrencyAmount(1234.56, 'USD');
 * // Returns: { success: true, data: { formatted: '$1,234.56', ... } }
 */
function formatCurrencyAmount(amount, currencyCode, options = {}) {
    const { showSymbol = true, showCode = false, locale = 'en-US' } = options;

    // Validate inputs
    const amountValidation = validateAmount(amount, { allowZero: true, allowNegative: true });
    if (!amountValidation.success) {
        return { success: false, error: `Invalid amount: ${amountValidation.error}` };
    }

    const currencyValidation = validateCurrencyCode(currencyCode);
    if (!currencyValidation.success) {
        return { success: false, error: `Invalid currency: ${currencyValidation.error}` };
    }

    const currency = currencyValidation.data;
    const validAmount = amountValidation.data.amount;

    try {
        // Format with appropriate decimal places
        const formatted = new Intl.NumberFormat(locale, {
            style: 'decimal',
            minimumFractionDigits: currency.decimals,
            maximumFractionDigits: currency.decimals
        }).format(validAmount);

        let result = formatted;

        // Add symbol
        if (showSymbol && currency.symbol) {
            result = `${currency.symbol}${formatted}`;
        }

        // Add code
        if (showCode) {
            result = showSymbol ? `${result} ${currency.code}` : `${formatted} ${currency.code}`;
        }

        return {
            success: true,
            data: {
                formatted: result,
                amount: validAmount,
                currency: currency.code,
                symbol: currency.symbol,
                decimals: currency.decimals
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Formatting failed: ${error.message}`
        };
    }
}

/**
 * Get list of all supported currencies
 * @returns {Array} Array of currency objects
 */
function getSupportedCurrencies() {
    return Object.values(SUPPORTED_CURRENCIES);
}

/**
 * Get currency information by code
 * @param {string} currencyCode - Currency code
 * @returns {Object|null} Currency information or null if not found
 */
function getCurrencyInfo(currencyCode) {
    const normalized = normalizeCurrencyCode(currencyCode);
    return SUPPORTED_CURRENCIES[normalized] || null;
}

/**
 * Check if currency code is supported
 * @param {string} currencyCode - Currency code to check
 * @returns {boolean} True if supported, false otherwise
 */
function isSupportedCurrency(currencyCode) {
    const normalized = normalizeCurrencyCode(currencyCode);
    return normalized in SUPPORTED_CURRENCIES;
}

module.exports = {
    validateCurrencyCode,
    validateAmount,
    validateDate,
    validateApiResponse,
    normalizeCurrencyCode,
    formatCurrencyAmount,
    getSupportedCurrencies,
    getCurrencyInfo,
    isSupportedCurrency,
    SUPPORTED_CURRENCIES
};
