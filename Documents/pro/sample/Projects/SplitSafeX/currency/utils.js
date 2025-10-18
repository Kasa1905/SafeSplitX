/**
 * Currency utility functions for SafeSplitX
 * Provides precise decimal arithmetic, currency formatting, and conversion calculations
 */

const Decimal = require('decimal.js');
const validation = require('./validation');

// Configure Decimal.js for precise arithmetic
Decimal.set({
    precision: 20,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -9,
    toExpPos: 21,
    minE: -9e15,
    maxE: 9e15,
    crypto: false,
    modulo: Decimal.ROUND_DOWN
});

/**
 * Currency precision mapping for different currencies
 * Based on ISO 4217 standards and common practice
 */
const CURRENCY_PRECISION = {
    // No decimal places
    'JPY': 0, // Japanese Yen
    'KRW': 0, // South Korean Won  
    'VND': 0, // Vietnamese Dong
    'IDR': 0, // Indonesian Rupiah
    'CLP': 0, // Chilean Peso
    'ISK': 0, // Icelandic Krona
    
    // 3 decimal places
    'KWD': 3, // Kuwaiti Dinar
    'BHD': 3, // Bahraini Dinar
    'OMR': 3, // Omani Rial
    'JOD': 3, // Jordanian Dinar
    
    // Default 2 decimal places for most currencies
    // Including USD, EUR, GBP, CAD, AUD, CHF, etc.
};

/**
 * Get currency precision (decimal places) for a given currency
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'JPY')
 * @returns {number} Number of decimal places for the currency
 * 
 * @example
 * const precision = getCurrencyPrecision('USD'); // Returns 2
 * const yenPrecision = getCurrencyPrecision('JPY'); // Returns 0
 */
function getCurrencyPrecision(currencyCode) {
    const normalizedCode = validation.normalizeCurrencyCode(currencyCode);
    return CURRENCY_PRECISION[normalizedCode] || 2; // Default to 2 decimal places
}

/**
 * Perform precise currency conversion calculation
 * @param {number} amount - Amount to convert
 * @param {number} exchangeRate - Exchange rate to apply
 * @param {number} precision - Decimal precision for result (optional)
 * @returns {number} Converted amount with proper precision
 * 
 * @example
 * const result = calculateConversion(100, 0.85, 2); // Returns 85.00
 * const yenResult = calculateConversion(100, 110.50, 0); // Returns 11050
 */
function calculateConversion(amount, exchangeRate, precision = 2) {
    try {
        const amountDecimal = new Decimal(amount);
        const rateDecimal = new Decimal(exchangeRate);
        const result = amountDecimal.mul(rateDecimal);
        
        return parseFloat(result.toFixed(precision));
    } catch (error) {
        throw new Error(`Conversion calculation failed: ${error.message}`);
    }
}

/**
 * Round amount to specified decimal places using banker's rounding
 * @param {number} amount - Amount to round
 * @param {number} decimalPlaces - Number of decimal places
 * @param {string} roundingMode - Rounding mode ('ROUND_HALF_UP', 'ROUND_HALF_EVEN', etc.)
 * @returns {number} Rounded amount
 * 
 * @example
 * const rounded = roundToDecimalPlaces(123.456, 2); // Returns 123.46
 * const bankerRounded = roundToDecimalPlaces(2.5, 0, 'ROUND_HALF_EVEN'); // Returns 2
 */
function roundToDecimalPlaces(amount, decimalPlaces = 2, roundingMode = 'ROUND_HALF_UP') {
    try {
        const decimal = new Decimal(amount);
        const roundingModeValue = Decimal[roundingMode] || Decimal.ROUND_HALF_UP;
        
        return parseFloat(decimal.toDecimalPlaces(decimalPlaces, roundingModeValue).toString());
    } catch (error) {
        throw new Error(`Rounding failed: ${error.message}`);
    }
}

/**
 * Format currency amount with proper symbol and locale formatting
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code for formatting
 * @param {Object} options - Formatting options
 * @param {string} options.locale - Locale for number formatting (default: 'en-US')
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @param {boolean} options.showCode - Whether to show currency code (default: false)
 * @param {boolean} options.useGrouping - Whether to use thousands separators (default: true)
 * @returns {Object} Formatting result with success flag and formatted string
 * 
 * @example
 * const result = formatCurrency(1234.56, 'USD');
 * // Returns: { success: true, data: { formatted: '$1,234.56', ... } }
 * 
 * const euroResult = formatCurrency(1234.56, 'EUR', { locale: 'de-DE' });
 * // Returns: { success: true, data: { formatted: '1.234,56 €', ... } }
 */
function formatCurrency(amount, currencyCode, options = {}) {
    const {
        locale = 'en-US',
        showSymbol = true,
        showCode = false,
        useGrouping = true
    } = options;

    try {
        // Validate currency code
        const currencyInfo = validation.getCurrencyInfo(currencyCode);
        if (!currencyInfo) {
            return {
                success: false,
                error: `Unsupported currency code: ${currencyCode}`
            };
        }

        // Validate amount
        const amountValidation = validation.validateAmount(amount, { allowZero: true, allowNegative: true });
        if (!amountValidation.success) {
            return {
                success: false,
                error: `Invalid amount: ${amountValidation.error}`
            };
        }

        const validAmount = amountValidation.data.amount;
        const precision = currencyInfo.decimals;

        // Create number formatter
        const formatter = new Intl.NumberFormat(locale, {
            style: showSymbol ? 'currency' : 'decimal',
            currency: showSymbol ? currencyCode : undefined,
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
            useGrouping
        });

        let formatted = formatter.format(validAmount);

        // Add currency code if requested
        if (showCode && !showSymbol) {
            formatted = `${formatted} ${currencyCode}`;
        } else if (showCode && showSymbol) {
            formatted = `${formatted} ${currencyCode}`;
        }

        return {
            success: true,
            data: {
                formatted,
                amount: validAmount,
                currency: currencyCode,
                symbol: currencyInfo.symbol,
                precision,
                locale
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Currency formatting failed: ${error.message}`
        };
    }
}

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - Currency code
 * @returns {Object} Result with currency symbol information
 * 
 * @example
 * const result = getCurrencySymbol('USD');
 * // Returns: { success: true, data: { symbol: '$', name: 'US Dollar' } }
 */
function getCurrencySymbol(currencyCode) {
    try {
        const currencyInfo = validation.getCurrencyInfo(currencyCode);
        if (!currencyInfo) {
            return {
                success: false,
                error: `Unsupported currency code: ${currencyCode}`
            };
        }

        return {
            success: true,
            data: {
                symbol: currencyInfo.symbol,
                code: currencyInfo.code,
                name: currencyInfo.name,
                decimals: currencyInfo.decimals
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Symbol lookup failed: ${error.message}`
        };
    }
}

/**
 * Parse currency amount from string, removing symbols and formatting
 * @param {string} currencyString - Currency string to parse (e.g., '$1,234.56', '€1.234,56')
 * @param {string} currencyCode - Expected currency code (optional)
 * @param {string} locale - Locale for parsing (default: 'en-US')
 * @returns {Object} Parsing result with extracted amount
 * 
 * @example
 * const result = parseCurrencyAmount('$1,234.56', 'USD');
 * // Returns: { success: true, data: { amount: 1234.56, currency: 'USD' } }
 * 
 * const euroResult = parseCurrencyAmount('1.234,56 €', 'EUR', 'de-DE');
 * // Returns: { success: true, data: { amount: 1234.56, currency: 'EUR' } }
 */
function parseCurrencyAmount(currencyString, currencyCode = null, locale = 'en-US') {
    try {
        if (!currencyString || typeof currencyString !== 'string') {
            return {
                success: false,
                error: 'Currency string is required'
            };
        }

        let cleanString = currencyString.trim();
        let detectedCurrency = null;

        // Remove common currency symbols and detect currency
        const symbolPatterns = [
            { pattern: /^\$/, currency: 'USD' },
            { pattern: /^€/, currency: 'EUR' },
            { pattern: /^£/, currency: 'GBP' },
            { pattern: /^¥/, currency: 'JPY' },
            { pattern: /^₹/, currency: 'INR' },
            { pattern: /^₽/, currency: 'RUB' },
            { pattern: /^₦/, currency: 'NGN' },
            { pattern: /^₱/, currency: 'PHP' },
            { pattern: /^₩/, currency: 'KRW' },
            { pattern: /^₫/, currency: 'VND' },
            { pattern: /^₴/, currency: 'UAH' },
            { pattern: /^₺/, currency: 'TRY' },
            { pattern: /^₵/, currency: 'GHS' }
        ];

        for (const { pattern, currency } of symbolPatterns) {
            if (pattern.test(cleanString)) {
                cleanString = cleanString.replace(pattern, '').trim();
                detectedCurrency = currency;
                break;
            }
        }

        // Remove currency codes from end of string
        const codePattern = /\s+([A-Z]{3})$/;
        const codeMatch = cleanString.match(codePattern);
        if (codeMatch) {
            detectedCurrency = detectedCurrency || codeMatch[1];
            cleanString = cleanString.replace(codePattern, '').trim();
        }

        // Parse based on locale
        let amount;
        if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es')) {
            // European format: 1.234,56
            cleanString = cleanString.replace(/\./g, '').replace(',', '.');
            amount = parseFloat(cleanString);
        } else {
            // US/UK format: 1,234.56
            cleanString = cleanString.replace(/,/g, '');
            amount = parseFloat(cleanString);
        }

        if (isNaN(amount)) {
            return {
                success: false,
                error: 'Invalid currency amount format'
            };
        }

        // Validate detected/expected currency
        const finalCurrency = currencyCode || detectedCurrency;
        if (finalCurrency) {
            const currencyValidation = validation.validateCurrencyCode(finalCurrency);
            if (!currencyValidation.success) {
                return {
                    success: false,
                    error: `Invalid currency: ${currencyValidation.error}`
                };
            }
        }

        return {
            success: true,
            data: {
                amount,
                currency: finalCurrency,
                original: currencyString,
                detected: detectedCurrency,
                locale
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Currency parsing failed: ${error.message}`
        };
    }
}

/**
 * Calculate percentage of an amount
 * @param {number} amount - Base amount
 * @param {number} percentage - Percentage (e.g., 15 for 15%)
 * @param {number} precision - Decimal precision for result (default: 2)
 * @returns {Object} Calculation result
 * 
 * @example
 * const result = calculatePercentage(100, 15); // 15% of 100
 * // Returns: { success: true, data: { result: 15.00, percentage: 15, base: 100 } }
 */
function calculatePercentage(amount, percentage, precision = 2) {
    try {
        const amountValidation = validation.validateAmount(amount, { allowZero: true });
        if (!amountValidation.success) {
            return {
                success: false,
                error: `Invalid amount: ${amountValidation.error}`
            };
        }

        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return {
                success: false,
                error: 'Percentage must be a valid number'
            };
        }

        const baseAmount = new Decimal(amountValidation.data.amount);
        const percentDecimal = new Decimal(percentage).div(100);
        const result = baseAmount.mul(percentDecimal);

        return {
            success: true,
            data: {
                result: parseFloat(result.toFixed(precision)),
                percentage,
                base: amountValidation.data.amount,
                precision
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Percentage calculation failed: ${error.message}`
        };
    }
}

/**
 * Add amounts with precise decimal arithmetic
 * @param {number[]} amounts - Array of amounts to add
 * @param {number} precision - Decimal precision for result (default: 2)
 * @returns {Object} Addition result
 * 
 * @example
 * const result = addAmounts([10.1, 20.2, 30.3], 2);
 * // Returns: { success: true, data: { result: 60.60, amounts: [...], precision: 2 } }
 */
function addAmounts(amounts, precision = 2) {
    try {
        if (!Array.isArray(amounts) || amounts.length === 0) {
            return {
                success: false,
                error: 'Amounts array is required and cannot be empty'
            };
        }

        let sum = new Decimal(0);
        const validAmounts = [];

        for (const amount of amounts) {
            const validation_result = validation.validateAmount(amount, { allowZero: true, allowNegative: true });
            if (!validation_result.success) {
                return {
                    success: false,
                    error: `Invalid amount ${amount}: ${validation_result.error}`
                };
            }
            
            validAmounts.push(validation_result.data.amount);
            sum = sum.plus(validation_result.data.amount);
        }

        return {
            success: true,
            data: {
                result: parseFloat(sum.toFixed(precision)),
                amounts: validAmounts,
                count: validAmounts.length,
                precision
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Addition failed: ${error.message}`
        };
    }
}

/**
 * Compare two currency amounts for equality within tolerance
 * @param {number} amount1 - First amount
 * @param {number} amount2 - Second amount  
 * @param {number} tolerance - Tolerance for comparison (default: 0.01)
 * @returns {boolean} True if amounts are equal within tolerance
 * 
 * @example
 * const isEqual = compareAmounts(10.001, 10.002, 0.01); // Returns true
 * const isNotEqual = compareAmounts(10.1, 10.2, 0.01); // Returns false
 */
function compareAmounts(amount1, amount2, tolerance = 0.01) {
    try {
        const decimal1 = new Decimal(amount1);
        const decimal2 = new Decimal(amount2);
        const diff = decimal1.minus(decimal2).abs();
        const toleranceDecimal = new Decimal(tolerance);

        return diff.lte(toleranceDecimal);
    } catch (error) {
        return false;
    }
}

/**
 * Convert amount between different currency precisions
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Object} Precision conversion result
 * 
 * @example
 * const result = convertPrecision(100.00, 'USD', 'JPY');
 * // Returns: { success: true, data: { amount: 100, fromPrecision: 2, toPrecision: 0 } }
 */
function convertPrecision(amount, fromCurrency, toCurrency) {
    try {
        const fromPrecision = getCurrencyPrecision(fromCurrency);
        const toPrecision = getCurrencyPrecision(toCurrency);

        const amountValidation = validation.validateAmount(amount, { allowZero: true, allowNegative: true });
        if (!amountValidation.success) {
            return {
                success: false,
                error: `Invalid amount: ${amountValidation.error}`
            };
        }

        const convertedAmount = roundToDecimalPlaces(amountValidation.data.amount, toPrecision);

        return {
            success: true,
            data: {
                amount: convertedAmount,
                fromPrecision,
                toPrecision,
                fromCurrency,
                toCurrency,
                original: amountValidation.data.amount
            }
        };

    } catch (error) {
        return {
            success: false,
            error: `Precision conversion failed: ${error.message}`
        };
    }
}

/**
 * Escape special regex characters to prevent regex injection
 * @param {string} string - String to escape for safe regex use
 * @returns {string} Escaped string safe for use in regex patterns
 * 
 * @example
 * const escaped = escapeRegex('Hello (world)'); // Returns 'Hello \\(world\\)'
 * const regex = new RegExp(escaped); // Safe to use
 */
function escapeRegex(string) {
    if (typeof string !== 'string') {
        return '';
    }
    // Escape all special regex characters: ^$.*+?()[]{}|\
    return string.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

module.exports = {
    getCurrencyPrecision,
    calculateConversion,
    roundToDecimalPlaces,
    formatCurrency,
    getCurrencySymbol,
    parseCurrencyAmount,
    calculatePercentage,
    addAmounts,
    compareAmounts,
    convertPrecision,
    escapeRegex,
    
    // Export constants for testing
    CURRENCY_PRECISION
};
