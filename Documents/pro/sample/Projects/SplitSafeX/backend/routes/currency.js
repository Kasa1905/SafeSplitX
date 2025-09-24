/**
 * Currency Routes for SafeSplitX
 * Handles real-time forex rates, conversion, and historical data
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const currencyController = require('../controllers/currencyController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

const router = express.Router();

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

// Validation middleware
const validateConversion = [
  body('from')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid source currency'),
  body('to')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid target currency'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
];

const validateBatchConversion = [
  body('from')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid source currency'),
  body('conversions')
    .isArray({ min: 1 })
    .withMessage('At least one conversion is required'),
  body('conversions.*.to')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid target currency'),
  body('conversions.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
];

const validateHistoricalQuery = [
  query('from')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid source currency'),
  query('to')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid target currency'),
  query('startDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - 5); // Max 5 years back
      if (value < maxDate) {
        throw new Error('Start date cannot be more than 5 years ago');
      }
      return true;
    }),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (value <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      if (value > new Date()) {
        throw new Error('End date cannot be in the future');
      }
      return true;
    }),
  query('interval')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Interval must be daily, weekly, or monthly')
];

const validateRateAlert = [
  body('from')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid source currency'),
  body('to')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid target currency'),
  body('targetRate')
    .isFloat({ min: 0.000001 })
    .withMessage('Target rate must be greater than 0'),
  body('condition')
    .isIn(['above', 'below'])
    .withMessage('Condition must be above or below'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const validateCurrencyPreference = [
  body('baseCurrency')
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid base currency'),
  body('preferredCurrencies')
    .optional()
    .isArray()
    .withMessage('Preferred currencies must be an array'),
  body('preferredCurrencies.*')
    .optional()
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid preferred currency'),
  body('autoConvert')
    .optional()
    .isBoolean()
    .withMessage('autoConvert must be a boolean'),
  body('rateUpdateFrequency')
    .optional()
    .isIn(['realtime', 'hourly', 'daily'])
    .withMessage('Rate update frequency must be realtime, hourly, or daily')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      requestId: req.requestId
    });
  }
  next();
};

// Add request ID to all routes
router.use(generateRequestId);

/**
 * @route   GET /api/currency/rates
 * @desc    Get current exchange rates
 * @access  Public
 */
router.get('/rates',
  query('base').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid base currency'),
  query('symbols').optional().custom((value) => {
    if (value) {
      const symbols = value.split(',');
      for (const symbol of symbols) {
        if (!SUPPORTED_CURRENCIES.includes(symbol.toUpperCase())) {
          throw new Error(`Invalid currency symbol: ${symbol}`);
        }
      }
    }
    return true;
  }),
  handleValidationErrors,
  currencyController.getCurrentRates
);

/**
 * @route   POST /api/currency/convert
 * @desc    Convert currency amount
 * @access  Public
 */
router.post('/convert',
  validateConversion,
  handleValidationErrors,
  currencyController.convertCurrency
);

/**
 * @route   POST /api/currency/convert-batch
 * @desc    Convert multiple amounts/currencies in one request
 * @access  Public
 */
router.post('/convert-batch',
  validateBatchConversion,
  handleValidationErrors,
  currencyController.batchConvert
);

/**
 * @route   GET /api/currency/historical
 * @desc    Get historical exchange rates
 * @access  Public
 */
router.get('/historical',
  validateHistoricalQuery,
  handleValidationErrors,
  currencyController.getHistoricalRates
);

/**
 * @route   GET /api/currency/supported
 * @desc    Get list of supported currencies
 * @access  Public
 */
router.get('/supported', currencyController.getSupportedCurrencies);

/**
 * @route   GET /api/currency/rate/:from/:to
 * @desc    Get specific exchange rate between two currencies
 * @access  Public
 */
router.get('/rate/:from/:to',
  param('from').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid source currency'),
  param('to').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid target currency'),
  handleValidationErrors,
  currencyController.getSpecificRate
);

// Authentication required for user-specific features
router.use(auth);

/**
 * @route   GET /api/currency/preferences
 * @desc    Get user's currency preferences
 * @access  Private
 */
router.get('/preferences', currencyController.getCurrencyPreferences);

/**
 * @route   PUT /api/currency/preferences
 * @desc    Update user's currency preferences
 * @access  Private
 */
router.put('/preferences',
  validateCurrencyPreference,
  handleValidationErrors,
  currencyController.updateCurrencyPreferences
);

/**
 * @route   POST /api/currency/alerts
 * @desc    Create currency rate alert
 * @access  Private
 */
router.post('/alerts',
  validateRateAlert,
  handleValidationErrors,
  currencyController.createRateAlert
);

/**
 * @route   GET /api/currency/alerts
 * @desc    Get user's rate alerts
 * @access  Private
 */
router.get('/alerts',
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('from').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid source currency'),
  query('to').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid target currency'),
  handleValidationErrors,
  currencyController.getRateAlerts
);

/**
 * @route   PUT /api/currency/alerts/:id
 * @desc    Update rate alert
 * @access  Private
 */
router.put('/alerts/:id',
  param('id').custom(isValidId).withMessage('Invalid alert ID'),
  body('targetRate').optional().isFloat({ min: 0.000001 }).withMessage('Target rate must be greater than 0'),
  body('condition').optional().isIn(['above', 'below']).withMessage('Condition must be above or below'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
  currencyController.updateRateAlert
);

/**
 * @route   DELETE /api/currency/alerts/:id
 * @desc    Delete rate alert
 * @access  Private
 */
router.delete('/alerts/:id',
  param('id').custom(isValidId).withMessage('Invalid alert ID'),
  handleValidationErrors,
  currencyController.deleteRateAlert
);

/**
 * @route   GET /api/currency/portfolio
 * @desc    Get user's multi-currency portfolio summary
 * @access  Private
 */
router.get('/portfolio',
  query('baseCurrency').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid base currency'),
  handleValidationErrors,
  currencyController.getCurrencyPortfolio
);

/**
 * @route   POST /api/currency/portfolio/rebalance
 * @desc    Get portfolio rebalancing suggestions
 * @access  Private
 */
router.post('/portfolio/rebalance',
  body('targetCurrency').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid target currency'),
  body('strategy').optional().isIn(['conservative', 'balanced', 'aggressive']).withMessage('Invalid rebalancing strategy'),
  handleValidationErrors,
  currencyController.getRebalancingSuggestions
);

/**
 * @route   GET /api/currency/trends
 * @desc    Get currency trend analysis
 * @access  Private
 */
router.get('/trends',
  query('currencies').custom((value) => {
    if (value) {
      const currencies = value.split(',');
      for (const currency of currencies) {
        if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
          throw new Error(`Invalid currency: ${currency}`);
        }
      }
    }
    return true;
  }),
  query('period').optional().isIn(['1D', '7D', '30D', '90D', '1Y']).withMessage('Invalid period'),
  query('baseCurrency').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid base currency'),
  handleValidationErrors,
  currencyController.getCurrencyTrends
);

/**
 * @route   POST /api/currency/forecast
 * @desc    Get currency rate forecast
 * @access  Private
 */
router.post('/forecast',
  body('from').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid source currency'),
  body('to').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid target currency'),
  body('period').isIn(['7D', '30D', '90D']).withMessage('Forecast period must be 7D, 30D, or 90D'),
  body('confidence').optional().isIn(['low', 'medium', 'high']).withMessage('Confidence level must be low, medium, or high'),
  handleValidationErrors,
  currencyController.getForecast
);

/**
 * @route   GET /api/currency/volatility
 * @desc    Get currency volatility analysis
 * @access  Private
 */
router.get('/volatility',
  query('currencies').custom((value) => {
    if (value) {
      const currencies = value.split(',');
      for (const currency of currencies) {
        if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
          throw new Error(`Invalid currency: ${currency}`);
        }
      }
    } else {
      throw new Error('At least one currency is required');
    }
    return true;
  }),
  query('period').optional().isIn(['7D', '30D', '90D', '1Y']).withMessage('Invalid period'),
  query('baseCurrency').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid base currency'),
  handleValidationErrors,
  currencyController.getVolatilityAnalysis
);

/**
 * @route   POST /api/currency/hedge
 * @desc    Get currency hedging recommendations
 * @access  Private
 */
router.post('/hedge',
  body('exposures').isArray({ min: 1 }).withMessage('At least one exposure is required'),
  body('exposures.*.currency').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid exposure currency'),
  body('exposures.*.amount').isFloat({ min: 0.01 }).withMessage('Exposure amount must be greater than 0'),
  body('baseCurrency').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid base currency'),
  body('riskTolerance').optional().isIn(['low', 'medium', 'high']).withMessage('Risk tolerance must be low, medium, or high'),
  handleValidationErrors,
  currencyController.getHedgingRecommendations
);

/**
 * @route   GET /api/currency/analytics
 * @desc    Get currency analytics for user's transactions
 * @access  Private
 */
router.get('/analytics',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('groupId').optional().custom(isValidId).withMessage('Invalid group ID'),
  query('baseCurrency').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid base currency'),
  handleValidationErrors,
  currencyController.getCurrencyAnalytics
);

/**
 * @route   POST /api/currency/webhook
 * @desc    Register webhook for rate updates
 * @access  Private
 */
router.post('/webhook',
  body('url').isURL().withMessage('Valid webhook URL is required'),
  body('currencies').isArray({ min: 1 }).withMessage('At least one currency pair is required'),
  body('currencies.*.from').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid source currency'),
  body('currencies.*.to').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid target currency'),
  body('threshold').optional().isFloat({ min: 0.001, max: 1 }).withMessage('Threshold must be between 0.001 and 1'),
  handleValidationErrors,
  currencyController.registerWebhook
);

module.exports = router;