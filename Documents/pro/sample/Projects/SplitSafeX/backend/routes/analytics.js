/**
 * Analytics Routes for SafeSplitX
 * Handles spending patterns, group insights, and export functionality
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

const router = express.Router();

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

// Validation middleware
const validateAnalyticsQuery = [
  query('startDate')
    .optional()
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
      if (req.query.startDate && value <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      if (value > new Date()) {
        throw new Error('End date cannot be in the future');
      }
      return true;
    }),
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year', 'all'])
    .withMessage('Period must be week, month, quarter, year, or all'),
  query('currency')
    .optional()
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid currency'),
  query('groupId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  query('category')
    .optional()
    .isIn(['food', 'transportation', 'accommodation', 'entertainment', 'shopping', 'utilities', 'healthcare', 'education', 'travel', 'other'])
    .withMessage('Invalid category')
];

const validateComparisonQuery = [
  query('period1Start')
    .isISO8601()
    .toDate(),
  query('period1End')
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (value <= new Date(req.query.period1Start)) {
        throw new Error('Period 1 end date must be after start date');
      }
      return true;
    }),
  query('period2Start')
    .isISO8601()
    .toDate(),
  query('period2End')
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (value <= new Date(req.query.period2Start)) {
        throw new Error('Period 2 end date must be after start date');
      }
      return true;
    }),
  query('currency')
    .optional()
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage('Invalid currency'),
  query('groupId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid group ID')
];

const validateExportQuery = [
  query('format')
    .isIn(['csv', 'json', 'pdf', 'excel'])
    .withMessage('Format must be csv, json, pdf, or excel'),
  query('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('includeCharts must be a boolean'),
  query('includeRawData')
    .optional()
    .isBoolean()
    .withMessage('includeRawData must be a boolean')
];

const validateBudgetQuery = [
  query('budgetType')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly', 'custom'])
    .withMessage('Budget type must be monthly, quarterly, yearly, or custom'),
  query('categories')
    .optional()
    .custom((value) => {
      if (value) {
        const categories = value.split(',');
        const validCategories = ['food', 'transportation', 'accommodation', 'entertainment', 'shopping', 'utilities', 'healthcare', 'education', 'travel', 'other'];
        for (const category of categories) {
          if (!validCategories.includes(category)) {
            throw new Error(`Invalid category: ${category}`);
          }
        }
      }
      return true;
    })
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

// All routes require authentication
router.use(auth);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get user's spending overview
 * @access  Private
 */
router.get('/overview',
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getSpendingOverview
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get spending trends over time
 * @access  Private
 */
router.get('/trends',
  validateAnalyticsQuery,
  query('granularity').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Granularity must be daily, weekly, or monthly'),
  handleValidationErrors,
  analyticsController.getSpendingTrends
);

/**
 * @route   GET /api/analytics/categories
 * @desc    Get spending breakdown by category
 * @access  Private
 */
router.get('/categories',
  validateAnalyticsQuery,
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  handleValidationErrors,
  analyticsController.getCategoryAnalysis
);

/**
 * @route   GET /api/analytics/groups
 * @desc    Get spending analysis by groups
 * @access  Private
 */
router.get('/groups',
  validateAnalyticsQuery,
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('includeInactive').optional().isBoolean().withMessage('includeInactive must be a boolean'),
  handleValidationErrors,
  analyticsController.getGroupAnalysis
);

/**
 * @route   GET /api/analytics/groups/:id
 * @desc    Get detailed analytics for a specific group
 * @access  Private
 */
router.get('/groups/:id',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getGroupDetailedAnalysis
);

/**
 * @route   GET /api/analytics/balance-history
 * @desc    Get user's balance history across all groups
 * @access  Private
 */
router.get('/balance-history',
  validateAnalyticsQuery,
  query('granularity').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Granularity must be daily, weekly, or monthly'),
  handleValidationErrors,
  analyticsController.getBalanceHistory
);

/**
 * @route   GET /api/analytics/payment-methods
 * @desc    Get payment method usage analytics
 * @access  Private
 */
router.get('/payment-methods',
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getPaymentMethodAnalysis
);

/**
 * @route   GET /api/analytics/compare
 * @desc    Compare spending between two time periods
 * @access  Private
 */
router.get('/compare',
  validateComparisonQuery,
  handleValidationErrors,
  analyticsController.compareTimePeriods
);

/**
 * @route   GET /api/analytics/insights
 * @desc    Get AI-generated spending insights and recommendations
 * @access  Private
 */
router.get('/insights',
  validateAnalyticsQuery,
  query('insightTypes').optional().custom((value) => {
    if (value) {
      const types = value.split(',');
      const validTypes = ['spending_patterns', 'budget_recommendations', 'group_optimization', 'fraud_alerts', 'seasonal_trends'];
      for (const type of types) {
        if (!validTypes.includes(type)) {
          throw new Error(`Invalid insight type: ${type}`);
        }
      }
    }
    return true;
  }),
  handleValidationErrors,
  analyticsController.getSpendingInsights
);

/**
 * @route   GET /api/analytics/budget
 * @desc    Get budget analysis and tracking
 * @access  Private
 */
router.get('/budget',
  validateBudgetQuery,
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getBudgetAnalysis
);

/**
 * @route   GET /api/analytics/forecasting
 * @desc    Get spending forecasts
 * @access  Private
 */
router.get('/forecasting',
  query('forecastPeriod').isIn(['month', 'quarter', 'year']).withMessage('Forecast period must be month, quarter, or year'),
  query('confidence').optional().isIn(['low', 'medium', 'high']).withMessage('Confidence level must be low, medium, or high'),
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getSpendingForecast
);

/**
 * @route   GET /api/analytics/seasonal
 * @desc    Get seasonal spending patterns
 * @access  Private
 */
router.get('/seasonal',
  query('years').optional().isInt({ min: 1, max: 5 }).withMessage('Years must be between 1 and 5'),
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getSeasonalAnalysis
);

/**
 * @route   GET /api/analytics/peer-comparison
 * @desc    Get anonymized peer spending comparison
 * @access  Private
 */
router.get('/peer-comparison',
  query('demographic').optional().isIn(['age_group', 'location', 'income_bracket', 'all']).withMessage('Invalid demographic filter'),
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getPeerComparison
);

/**
 * @route   GET /api/analytics/efficiency
 * @desc    Get group efficiency metrics
 * @access  Private
 */
router.get('/efficiency',
  validateAnalyticsQuery,
  query('metrics').optional().custom((value) => {
    if (value) {
      const metrics = value.split(',');
      const validMetrics = ['settlement_speed', 'dispute_rate', 'participation_rate', 'payment_success_rate'];
      for (const metric of metrics) {
        if (!validMetrics.includes(metric)) {
          throw new Error(`Invalid efficiency metric: ${metric}`);
        }
      }
    }
    return true;
  }),
  handleValidationErrors,
  analyticsController.getEfficiencyMetrics
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @access  Private
 */
router.get('/export',
  validateAnalyticsQuery,
  validateExportQuery,
  query('dataTypes').custom((value) => {
    if (value) {
      const types = value.split(',');
      const validTypes = ['overview', 'trends', 'categories', 'groups', 'balance_history', 'insights'];
      for (const type of types) {
        if (!validTypes.includes(type)) {
          throw new Error(`Invalid data type: ${type}`);
        }
      }
    } else {
      throw new Error('At least one data type is required');
    }
    return true;
  }),
  handleValidationErrors,
  analyticsController.exportAnalytics
);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard data with key metrics
 * @access  Private
 */
router.get('/dashboard',
  query('widgets').optional().custom((value) => {
    if (value) {
      const widgets = value.split(',');
      const validWidgets = ['spending_summary', 'recent_expenses', 'pending_settlements', 'group_balances', 'budget_status', 'monthly_trends'];
      for (const widget of widgets) {
        if (!validWidgets.includes(widget)) {
          throw new Error(`Invalid dashboard widget: ${widget}`);
        }
      }
    }
    return true;
  }),
  handleValidationErrors,
  analyticsController.getDashboardData
);

/**
 * @route   GET /api/analytics/reports/monthly
 * @desc    Generate monthly spending report
 * @access  Private
 */
router.get('/reports/monthly',
  query('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').isInt({ min: 2020, max: new Date().getFullYear() }).withMessage('Invalid year'),
  query('currency').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid currency'),
  query('format').optional().isIn(['json', 'pdf']).withMessage('Format must be json or pdf'),
  handleValidationErrors,
  analyticsController.generateMonthlyReport
);

/**
 * @route   GET /api/analytics/reports/yearly
 * @desc    Generate yearly spending report
 * @access  Private
 */
router.get('/reports/yearly',
  query('year').isInt({ min: 2020, max: new Date().getFullYear() }).withMessage('Invalid year'),
  query('currency').optional().isIn(SUPPORTED_CURRENCIES).withMessage('Invalid currency'),
  query('format').optional().isIn(['json', 'pdf']).withMessage('Format must be json or pdf'),
  query('includeComparison').optional().isBoolean().withMessage('includeComparison must be a boolean'),
  handleValidationErrors,
  analyticsController.generateYearlyReport
);

/**
 * @route   GET /api/analytics/leaderboard
 * @desc    Get group spending leaderboards
 * @access  Private
 */
router.get('/leaderboard',
  param('groupId').optional().custom(isValidId).withMessage('Invalid group ID'),
  query('metric').optional().isIn(['total_spent', 'expenses_count', 'settlement_speed', 'participation_rate']).withMessage('Invalid leaderboard metric'),
  validateAnalyticsQuery,
  handleValidationErrors,
  analyticsController.getLeaderboard
);

/**
 * @route   GET /api/analytics/alerts
 * @desc    Get spending alerts and notifications
 * @access  Private
 */
router.get('/alerts',
  query('alertTypes').optional().custom((value) => {
    if (value) {
      const types = value.split(',');
      const validTypes = ['budget_exceeded', 'unusual_spending', 'high_fraud_score', 'overdue_payments'];
      for (const type of types) {
        if (!validTypes.includes(type)) {
          throw new Error(`Invalid alert type: ${type}`);
        }
      }
    }
    return true;
  }),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid alert severity'),
  handleValidationErrors,
  analyticsController.getSpendingAlerts
);

module.exports = router;